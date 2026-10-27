"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Ban,
  ClipboardList,
  Eye,
  PlusCircle,
  Search,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatutBadge, TransportBadge } from "@/components/ui/Badge";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiGet, apiPost, messageErreur } from "@/lib/apiClient";
import { formaterDateHeureFr, formaterMontant } from "@/lib/dateUtils";
import { useToast } from "@/components/toast/ToastProvider";
import { useExercice } from "@/components/layout/ExerciceContext";
import type { OrdreMissionAvecEmploye } from "@/lib/types";

const PAR_PAGE = 15;

type TriColonne = "dateHeureDepart" | "montantTotalSnapshot" | "numeroSequence";

export default function OrdresMissionPage() {
  const [ordres, setOrdres] = useState<OrdreMissionAvecEmploye[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("");
  const [transport, setTransport] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [page, setPage] = useState(1);
  const [tri, setTri] = useState<{ colonne: TriColonne; ordre: "asc" | "desc" }>({
    colonne: "dateHeureDepart",
    ordre: "desc",
  });

  const router = useRouter();
  const { annee } = useExercice();
  const { succes, erreur: toastErreur } = useToast();
  const { demanderConfirmation, dialog } = useConfirmDialog();

  const charger = () => {
    if (!annee) return;
    const params = new URLSearchParams();
    params.set("anneeEconomique", String(annee));
    if (statut) params.set("statut", statut);
    if (transport) params.set("moyenTransport", transport);
    if (dateDebut) params.set("dateDebut", dateDebut);
    if (dateFin) params.set("dateFin", dateFin);
    apiGet<OrdreMissionAvecEmploye[]>(`/api/ordres-mission?${params.toString()}`)
      .then(setOrdres)
      .catch((e) => toastErreur(messageErreur(e)));
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annee, statut, transport, dateDebut, dateFin]);

  const filtres = useMemo(() => {
    if (!ordres) return [];
    const q = recherche.trim().toLowerCase();
    let liste = !q
      ? ordres
      : ordres.filter(
          (om) =>
            om.employe.nomFr.toLowerCase().includes(q) ||
            om.employe.prenomFr.toLowerCase().includes(q) ||
            om.employe.matricule.toLowerCase().includes(q) ||
            om.objetMission.toLowerCase().includes(q)
        );
    liste = [...liste].sort((a, b) => {
      const dir = tri.ordre === "asc" ? 1 : -1;
      if (tri.colonne === "dateHeureDepart") {
        return dir * (new Date(a.dateHeureDepart).getTime() - new Date(b.dateHeureDepart).getTime());
      }
      if (tri.colonne === "montantTotalSnapshot") {
        return dir * ((a.montantTotalSnapshot ?? 0) - (b.montantTotalSnapshot ?? 0));
      }
      return dir * (a.numeroSequence - b.numeroSequence);
    });
    return liste;
  }, [ordres, recherche, tri]);

  const totalPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageActuelle = Math.min(page, totalPages);
  const pageItems = filtres.slice((pageActuelle - 1) * PAR_PAGE, pageActuelle * PAR_PAGE);

  function basculerTri(colonne: TriColonne) {
    setTri((prev) =>
      prev.colonne === colonne
        ? { colonne, ordre: prev.ordre === "asc" ? "desc" : "asc" }
        : { colonne, ordre: "asc" }
    );
  }

  async function executerTransition(id: string, action: "valider" | "annuler" | "payer") {
    try {
      await apiPost(`/api/ordres-mission/${id}/${action}`, {});
      succes("Statut mis à jour avec succès.");
      charger();
    } catch (e) {
      toastErreur(messageErreur(e));
    }
  }

  function ouvrirDetail(id: string) {
    router.push(`/ordres-mission/${id}`);
  }

  return (
    <div>
      <PageHeader
        titre="Ordres de Mission"
        description={ordres ? `${filtres.length} résultat(s)` : undefined}
        actions={
          <Link href="/ordres-mission/nouveau">
            <Button variant="primary">
              <PlusCircle size={16} /> Nouvel Ordre de Mission
            </Button>
          </Link>
        }
      />

      <Card className="mb-4 border-pink-100">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher un agent, un objet..."
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1); }} className="w-44">
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="VALIDE">Validé</option>
            <option value="PAYE">Payé</option>
            <option value="ANNULE">Annulé</option>
          </Select>
          <Select value={transport} onChange={(e) => { setTransport(e.target.value); setPage(1); }} className="w-52">
            <option value="">Tous les transports</option>
            <option value="TRANSPORT_PUBLIC">Transport public</option>
            <option value="VOITURE_PERSONNELLE">Voiture personnelle</option>
            <option value="VOITURE_SERVICE">Voiture de service</option>
          </Select>
          <Input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setPage(1); }} className="w-40" />
          <Input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setPage(1); }} className="w-40" />
        </div>
      </Card>

      {ordres === null ? (
        <PageLoader label="Chargement des ordres de mission..." />
      ) : filtres.length === 0 ? (
        <EmptyState icone={ClipboardList} titre="Aucun ordre de mission" description="Aucun résultat ne correspond à ces filtres." />
      ) : (
        <>
          <Card className="overflow-hidden border-pink-100">
            <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-sm">
              <thead className="bg-gradient-to-r from-pink-50 via-white to-violet-50 text-left text-xs font-semibold uppercase tracking-wide text-pink-700">
                <tr>
                  <Th onClick={() => basculerTri("numeroSequence")}>N°</Th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Matricule</th>
                  <th className="px-4 py-3">Fonction</th>
                  <th className="px-4 py-3">Objet</th>
                  <th className="px-4 py-3">Départ</th>
                  <th className="px-4 py-3">Arrivée</th>
                  <Th onClick={() => basculerTri("dateHeureDepart")}>Date départ</Th>
                  <th className="px-4 py-3">Date retour</th>
                  <th className="px-4 py-3">Transport</th>
                  <Th onClick={() => basculerTri("montantTotalSnapshot")}>Montant</Th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100">
                {pageItems.map((om) => (
                  <tr
                    key={om.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Ouvrir l'ordre de mission ${om.numeroSequence}`}
                    onClick={() => ouvrirDetail(om.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        ouvrirDetail(om.id);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-pink-50/80 focus:bg-pink-50/80"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{om.numeroSequence}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{om.employe.nomFr} {om.employe.prenomFr}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{om.employe.matricule}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{om.employe.cadre}</td>
                    <td className="max-w-[240px] px-4 py-3 text-slate-600">{om.objetMission}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{om.villeDepart}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{om.villeArrivee}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formaterDateHeureFr(om.dateHeureDepart)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formaterDateHeureFr(om.dateHeureRetour)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><TransportBadge moyen={om.moyenTransport} /></td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{formaterMontant(om.montantTotalSnapshot)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatutBadge statut={om.statut} /></td>
                    <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Link href={`/ordres-mission/${om.id}`} className="rounded-md p-1.5 text-pink-500 hover:bg-pink-100 hover:text-pink-700" title="Voir">
                          <Eye size={16} />
                        </Link>
                        {om.statut === "BROUILLON" && (
                          <button
                            className="rounded-md p-1.5 text-slate-500 hover:bg-pink-100 hover:text-sky-600"
                            title="Valider"
                            onClick={() =>
                              demanderConfirmation({
                                titre: "Valider l'Ordre de Mission",
                                message: `Confirmer la validation de l'OM N° ${om.numeroSequence} ? Le montant sera définitivement verrouillé.`,
                                libelleConfirmer: "Valider",
                                onConfirmer: () => executerTransition(om.id, "valider"),
                              })
                            }
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {om.statut === "VALIDE" && (
                          <>
                            <button
                              className="rounded-md p-1.5 text-slate-500 hover:bg-pink-100 hover:text-emerald-600"
                              title="Payer"
                              onClick={() =>
                                demanderConfirmation({
                                  titre: "Marquer comme payé",
                                  message: `Confirmer le paiement de l'OM N° ${om.numeroSequence} ?`,
                                  libelleConfirmer: "Payer",
                                  onConfirmer: () => executerTransition(om.id, "payer"),
                                })
                              }
                            >
                              <Wallet size={16} />
                            </button>
                            <button
                              className="rounded-md p-1.5 text-slate-500 hover:bg-pink-100 hover:text-rose-600"
                              title="Annuler"
                              onClick={() =>
                                demanderConfirmation({
                                  titre: "Annuler l'Ordre de Mission",
                                  message: `Confirmer l'annulation de l'OM N° ${om.numeroSequence} ?`,
                                  libelleConfirmer: "Annuler",
                                  variantConfirmer: "danger",
                                  onConfirmer: () => executerTransition(om.id, "annuler"),
                                })
                              }
                            >
                              <Ban size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>

          <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
            <p>
              Page {pageActuelle} sur {totalPages} · {filtres.length} résultat(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" taille="sm" disabled={pageActuelle <= 1} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <Button variant="outline" taille="sm" disabled={pageActuelle >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <th className="whitespace-nowrap px-4 py-3">
      <button onClick={onClick} className="flex items-center gap-1 text-pink-700 hover:text-pink-900">
        {children}
        <ArrowUpDown size={12} />
      </button>
    </th>
  );
}
