"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  Clock3,
  PlusCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Spinner";
import { apiGet, apiPatch, apiPost, messageErreur } from "@/lib/apiClient";
import { useToast } from "@/components/toast/ToastProvider";

const CLE_CLIENT_ID = "om_client_id";

type RoleUtilisateur = "ADMIN" | "GESTIONNAIRE" | "CONSULTATION";

interface UtilisateurAdmin {
  id: string;
  login: string;
  nomComplet: string;
  role: RoleUtilisateur;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PresenceSession {
  login: string;
  nomComplet: string;
  role: RoleUtilisateur;
  clientId: string;
  soiMeme: boolean;
  derniereVisite: string;
}

interface PresenceResponse {
  total: number;
  sessions: PresenceSession[];
}

interface JournalEntry {
  id: string;
  action: string;
  auteur: string | null;
  detail: string | null;
  createdAt: string;
  utilisateur: { login: string; nomComplet: string; role: RoleUtilisateur } | null;
  ordreMission: { numero: string | null; statut: string } | null;
}

interface DraftUtilisateur {
  login: string;
  nomComplet: string;
  motDePasse: string;
  role: RoleUtilisateur;
  actif: boolean;
}

const ROLE_OPTIONS: { value: RoleUtilisateur; label: string; className: string }[] = [
  { value: "ADMIN", label: "Admin", className: "bg-indigo-100 text-indigo-700" },
  { value: "GESTIONNAIRE", label: "Gestionnaire", className: "bg-sky-100 text-sky-700" },
  { value: "CONSULTATION", label: "Consultation", className: "bg-emerald-100 text-emerald-700" },
];

const ACTION_STYLES: Record<string, string> = {
  CREATION: "bg-emerald-100 text-emerald-700",
  MODIFICATION: "bg-sky-100 text-sky-700",
  VALIDATION: "bg-indigo-100 text-indigo-700",
  ANNULATION: "bg-rose-100 text-rose-700",
  PAIEMENT: "bg-amber-100 text-amber-700",
  IMPRESSION: "bg-slate-100 text-slate-700",
  EXPORT: "bg-violet-100 text-violet-700",
  MODIFICATION_REFERENTIEL: "bg-fuchsia-100 text-fuchsia-700",
  MODIFICATION_PERSONNEL: "bg-cyan-100 text-cyan-700",
  MODIFICATION_VEHICULE: "bg-teal-100 text-teal-700",
};

function getClientId(): string {
  let id = localStorage.getItem(CLE_CLIENT_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLE_CLIENT_ID, id);
  }
  return id;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function timeAgo(iso: string): string {
  const secondes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secondes < 5) return "à l'instant";
  if (secondes < 60) return `il y a ${secondes}s`;
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const heures = Math.round(minutes / 60);
  return `il y a ${heures}h`;
}

function roleLabel(role: RoleUtilisateur): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function roleClass(role: RoleUtilisateur): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.className ?? "bg-slate-100 text-slate-700";
}

function actionLabel(action: string): string {
  return action.replaceAll("_", " ").toLowerCase();
}

function emptyDraft(role: RoleUtilisateur = "GESTIONNAIRE"): DraftUtilisateur {
  return {
    login: "",
    nomComplet: "",
    motDePasse: "",
    role,
    actif: true,
  };
}

export function AdminPanel() {
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurAdmin[] | null>(null);
  const [presence, setPresence] = useState<PresenceResponse | null>(null);
  const [journal, setJournal] = useState<JournalEntry[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftUtilisateur>>({});
  const [nouveau, setNouveau] = useState<DraftUtilisateur>(emptyDraft());
  const [sauvegardeId, setSauvegardeId] = useState<string | null>(null);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [chargement, setChargement] = useState(true);
  const { succes, erreur } = useToast();

  const chargerUtilisateurs = async () => {
    const data = await apiGet<UtilisateurAdmin[]>("/api/admin/users");
    setUtilisateurs(data);
    setDrafts(
      Object.fromEntries(
        data.map((utilisateur) => [
          utilisateur.id,
          {
            login: utilisateur.login,
            nomComplet: utilisateur.nomComplet,
            motDePasse: "",
            role: utilisateur.role,
            actif: utilisateur.actif,
          },
        ])
      )
    );
  };

  const chargerJournal = async () => {
    const data = await apiGet<JournalEntry[]>("/api/admin/logs?limit=40");
    setJournal(data);
  };

  const chargerPresence = async () => {
    const clientId = getClientId();
    const res = await fetch("/api/presence", {
      cache: "no-store",
      headers: { "x-client-id": clientId },
    });
    const data = (await res.json()) as PresenceResponse | { message?: string };
    if (!res.ok) {
      throw new Error((data as { message?: string }).message ?? "Impossible de charger les connexions.");
    }
    setPresence(data as PresenceResponse);
  };

  const rafraichir = async () => {
    try {
      await Promise.all([chargerUtilisateurs(), chargerJournal(), chargerPresence()]);
    } catch (e) {
      erreur(messageErreur(e));
    }
  };

  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        await Promise.all([chargerUtilisateurs(), chargerJournal(), chargerPresence()]);
      } catch (e) {
        if (actif) erreur(messageErreur(e));
      } finally {
        if (actif) setChargement(false);
      }
    })();

    const timer = window.setInterval(() => {
      chargerPresence().catch(() => undefined);
    }, 20_000);

    return () => {
      actif = false;
      window.clearInterval(timer);
    };
  }, [erreur]);

  const statistiques = useMemo(() => {
    const total = utilisateurs?.length ?? 0;
    const actifs = utilisateurs?.filter((u) => u.actif).length ?? 0;
    const admins = utilisateurs?.filter((u) => u.role === "ADMIN").length ?? 0;
    const connectes = presence?.total ?? 0;
    const logs = journal?.length ?? 0;
    return { total, actifs, admins, connectes, logs };
  }, [journal, presence, utilisateurs]);

  async function sauvegarderUtilisateur(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSauvegardeId(id);
    try {
      await apiPatch(`/api/admin/users/${id}`, {
        login: draft.login.trim(),
        nomComplet: draft.nomComplet.trim(),
        role: draft.role,
        actif: draft.actif,
        ...(draft.motDePasse.trim() ? { motDePasse: draft.motDePasse.trim() } : {}),
      });
      succes("Utilisateur mis à jour.");
      await Promise.all([chargerUtilisateurs(), chargerJournal()]);
    } catch (e) {
      erreur(messageErreur(e));
    } finally {
      setSauvegardeId(null);
    }
  }

  async function creerUtilisateur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreationEnCours(true);
    try {
      await apiPost("/api/admin/users", {
        login: nouveau.login.trim(),
        nomComplet: nouveau.nomComplet.trim(),
        motDePasse: nouveau.motDePasse.trim(),
        role: nouveau.role,
        actif: nouveau.actif,
      });
      succes("Utilisateur créé.");
      setNouveau(emptyDraft());
      await Promise.all([chargerUtilisateurs(), chargerJournal()]);
    } catch (e) {
      erreur(messageErreur(e));
    } finally {
      setCreationEnCours(false);
    }
  }

  if (chargement && utilisateurs === null) {
    return <PageLoader label="Chargement de l'administration..." />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50">
        <CardBody className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <ShieldCheck size={14} />
              Comptes de départ
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Loubna · Loubna@0102 · Admin</span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Oumaima · Oumaima@0102 · Gestionnaire</span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Ikhlasse · Ikhlasse@0102 · Consultation</span>
            </div>
            <p className="max-w-3xl text-sm text-slate-600">
              Les trois comptes initiaux disposent actuellement de l'ensemble des droits de l'application.
              Vous pouvez les ajuster ici, visualiser les connexions actives et suivre l'historique des actions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:w-auto">
            <StatCard label="Utilisateurs" value={statistiques.total} tone="bg-indigo-100 text-indigo-700" />
            <StatCard label="Actifs" value={statistiques.actifs} tone="bg-emerald-100 text-emerald-700" />
            <StatCard label="Admins" value={statistiques.admins} tone="bg-violet-100 text-violet-700" />
            <StatCard label="En ligne" value={statistiques.connectes} tone="bg-sky-100 text-sky-700" />
            <StatCard label="Logs" value={statistiques.logs} tone="bg-amber-100 text-amber-700" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Créer un utilisateur</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Ajoutez un compte, puis ajustez son rôle et son activation directement dans le tableau.
            </p>
          </div>
          <Button variant="outline" onClick={() => void rafraichir()}>
            <RefreshCw size={16} />
            Rafraîchir
          </Button>
        </CardHeader>
        <CardBody>
          <form onSubmit={creerUtilisateur} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nom complet</label>
              <Input
                value={nouveau.nomComplet}
                onChange={(e) => setNouveau((v) => ({ ...v, nomComplet: e.target.value }))}
                placeholder="Ex. Nadia El Fassi"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Login</label>
              <Input
                value={nouveau.login}
                onChange={(e) => setNouveau((v) => ({ ...v, login: e.target.value }))}
                placeholder="Ex. nadia"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mot de passe</label>
              <Input
                type="password"
                value={nouveau.motDePasse}
                onChange={(e) => setNouveau((v) => ({ ...v, motDePasse: e.target.value }))}
                placeholder="Au moins 6 caractères"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Rôle</label>
              <Select
                value={nouveau.role}
                onChange={(e) => setNouveau((v) => ({ ...v, role: e.target.value as RoleUtilisateur }))}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Activation</label>
              <Select
                value={nouveau.actif ? "true" : "false"}
                onChange={(e) => setNouveau((v) => ({ ...v, actif: e.target.value === "true" }))}
              >
                <option value="true">Actif</option>
                <option value="false">Suspendu</option>
              </Select>
            </div>
            <div className="flex items-end md:col-span-2 xl:col-span-5">
              <Button type="submit" chargement={creationEnCours} className="w-full sm:w-auto">
                <PlusCircle size={16} />
                Créer le compte
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {utilisateurs === null ? null : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Utilisateurs et droits</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nom complet</th>
                  <th className="px-4 py-3">Login</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Nouveau mot de passe</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {utilisateurs.map((utilisateur) => {
                  const draft = drafts[utilisateur.id];
                  if (!draft) return null;
                  return (
                    <tr key={utilisateur.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div>{draft.nomComplet}</div>
                        <p className="mt-1 text-xs text-slate-400">Créé le {formatDate(utilisateur.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={draft.login}
                          onChange={(e) =>
                            setDrafts((current) => ({
                              ...current,
                              [utilisateur.id]: { ...draft, login: e.target.value },
                            }))
                          }
                          className="w-44"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={draft.role}
                          onChange={(e) =>
                            setDrafts((current) => ({
                              ...current,
                              [utilisateur.id]: { ...draft, role: e.target.value as RoleUtilisateur },
                            }))
                          }
                          className="w-40"
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleClass(draft.role)}`}>
                          {roleLabel(draft.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={draft.actif ? "true" : "false"}
                          onChange={(e) =>
                            setDrafts((current) => ({
                              ...current,
                              [utilisateur.id]: { ...draft, actif: e.target.value === "true" },
                            }))
                          }
                          className="w-32"
                        >
                          <option value="true">Actif</option>
                          <option value="false">Suspendu</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="password"
                          value={draft.motDePasse}
                          onChange={(e) =>
                            setDrafts((current) => ({
                              ...current,
                              [utilisateur.id]: { ...draft, motDePasse: e.target.value },
                            }))
                          }
                          placeholder="Laisser vide pour ne pas changer"
                          className="w-56"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          taille="sm"
                          chargement={sauvegardeId === utilisateur.id}
                          onClick={() => sauvegarderUtilisateur(utilisateur.id)}
                          type="button"
                        >
                          <Save size={16} />
                          Enregistrer
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Connexions en ligne</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Sessions actives détectées en temps réel.</p>
            </div>
            <Users size={18} className="text-slate-400" />
          </CardHeader>
          <CardBody>
            {presence === null ? (
              <p className="text-sm text-slate-400">Chargement des connexions...</p>
            ) : presence.sessions.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun utilisateur en ligne.</p>
            ) : (
              <ul className="space-y-3">
                {presence.sessions.map((session) => (
                  <li key={`${session.login}-${session.clientId}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {session.nomComplet}
                          {session.soiMeme ? <span className="ml-2 text-xs text-indigo-600">(vous)</span> : null}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {session.login} · {roleLabel(session.role)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleClass(session.role)}`}>
                        {timeAgo(session.derniereVisite)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Journal d'activité</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Dernières actions enregistrées dans l'application.</p>
            </div>
            <Activity size={18} className="text-slate-400" />
          </CardHeader>
          <CardBody>
            {journal === null ? (
              <p className="text-sm text-slate-400">Chargement du journal...</p>
            ) : journal.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune action enregistrée pour le moment.</p>
            ) : (
              <ul className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                {journal.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ACTION_STYLES[entry.action] ?? "bg-slate-100 text-slate-700"}`}>
                            {actionLabel(entry.action)}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            {entry.utilisateur?.nomComplet || entry.auteur || "Système"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{entry.detail || "Action enregistrée."}</p>
                        {entry.ordreMission ? (
                          <p className="text-xs text-slate-400">
                            OM {entry.ordreMission.numero ?? "—"} · {entry.ordreMission.statut}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock3 size={14} />
                        <span>{formatDate(entry.createdAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-3 py-3 text-center shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
