"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Car,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  History as HistoryIcon,
  Printer,
  User,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatutBadge, TransportBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiGet, apiPost, messageErreur } from "@/lib/apiClient";
import { formaterDateHeureFr, formaterMontant } from "@/lib/dateUtils";
import { useToast } from "@/components/toast/ToastProvider";
import type { OrdreMissionDetail } from "@/lib/types";

const ACTION_LABEL: Record<string, string> = {
  CREATION: "Création",
  MODIFICATION: "Modification",
  VALIDATION: "Validation",
  ANNULATION: "Annulation",
  PAIEMENT: "Paiement",
  IMPRESSION: "Impression",
  EXPORT: "Export",
};

export default function OrdreMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [om, setOm] = useState<OrdreMissionDetail | null>(null);
  const [chargement, setChargement] = useState(true);
  const [genDoc, setGenDoc] = useState(false);
  const { succes, erreur: toastErreur } = useToast();
  const { demanderConfirmation, dialog } = useConfirmDialog();

  const charger = () => {
    apiGet<OrdreMissionDetail>(`/api/ordres-mission/${id}`)
      .then(setOm)
      .catch((e) => toastErreur(messageErreur(e)))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function executerTransition(action: "valider" | "annuler" | "payer") {
    try {
      await apiPost(`/api/ordres-mission/${id}/${action}`, {});
      succes("Statut mis à jour avec succès.");
      charger();
    } catch (e) {
      toastErreur(messageErreur(e));
    }
  }

  async function telechargerDocument(type: "ordre-mission" | "etat-sommes-dues" | "etat-kilometrique") {
    setGenDoc(true);
    try {
      const res = await fetch(`/api/ordres-mission/${id}/documents/${type}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur de génération." }));
        throw new Error(err.message);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const nomFichier = match ? match[1] : `document-${type}.bin`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomFichier;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      succes("Document généré avec succès.");
    } catch (e) {
      toastErreur(e instanceof Error ? e.message : "Erreur de génération.");
    } finally {
      setGenDoc(false);
    }
  }

  async function imprimerDocument(type: "ordre-mission" | "etat-sommes-dues") {
    setGenDoc(true);
    try {
      const res = await fetch(`/api/ordres-mission/${id}/documents/${type}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur de génération." }));
        throw new Error(err.message);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(url);
        }, 1000);
      };
    } catch (e) {
      toastErreur(e instanceof Error ? e.message : "Erreur d'impression.");
      setGenDoc(false);
    }
  }

  if (chargement) return <PageLoader label="Chargement de l'ordre de mission..." />;
  if (!om) {
    return (
      <EmptyState icone={ClipboardList} titre="Ordre de Mission introuvable" description="Cet OM n'existe pas ou a été supprimé." />
    );
  }

  return (
    <div>
      <Link
        href="/ordres-mission"
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-pink-100 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700"
      >
        <ArrowLeft size={15} />
        Retour aux Ordres de Mission
      </Link>

      <div className="mb-4 overflow-hidden rounded-3xl border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-violet-50 shadow-sm shadow-pink-950/5">
        <div className="grid gap-4 p-5 lg:grid-cols-[1.3fr_0.9fr] lg:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatutBadge statut={om.statut} />
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                OM N° {om.numeroSequence}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Résumé visuel</p>
              <h1 className="mt-2 bg-gradient-to-r from-slate-900 via-pink-900 to-violet-900 bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl">
                {om.objetMission}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {om.employe.nomFr} {om.employe.prenomFr} · {om.employe.cadre} · {om.villeDepart} → {om.villeArrivee}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                taille="sm"
                onClick={() => telechargerDocument("ordre-mission")}
                chargement={genDoc}
              >
                <Download size={15} /> Télécharger l&apos;OM
              </Button>
              <Button
                variant="outline"
                taille="sm"
                onClick={() => imprimerDocument("ordre-mission")}
                disabled={genDoc}
              >
                <Printer size={15} /> Imprimer
              </Button>
              {om.statut !== "BROUILLON" && (
                <Button
                  variant="secondary"
                  taille="sm"
                  onClick={() => telechargerDocument("etat-sommes-dues")}
                  chargement={genDoc}
                >
                  <Wallet size={15} /> Sommes dues
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <StatCard label="Statut" value={om.statut === "BROUILLON" ? "Brouillon" : om.statut === "VALIDE" ? "Validé" : om.statut === "PAYE" ? "Payé" : "Annulé"} tone="from-pink-500 to-violet-500" />
            <StatCard label="Total" value={formaterMontant(om.montantTotalSnapshot)} tone="from-fuchsia-500 to-pink-500" />
            <StatCard label="Transport" value={om.moyenTransport === "TRANSPORT_PUBLIC" ? "Public" : om.moyenTransport === "VOITURE_PERSONNELLE" ? "Perso" : "Service"} tone="from-sky-500 to-cyan-500" />
            <StatCard label="Agent" value={`${om.employe.nomFr} ${om.employe.prenomFr}`} tone="from-violet-500 to-indigo-500" />
          </div>
        </div>
      </div>

      <PageHeader
        titre={`Ordre de Mission N° ${om.numeroSequence}`}
        description={om.objetMission}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatutBadge statut={om.statut} />
            {om.statut === "BROUILLON" && (
              <Button
                variant="primary"
                taille="sm"
                onClick={() =>
                  demanderConfirmation({
                    titre: "Valider l'Ordre de Mission",
                    message: "Confirmer la validation ? Le montant sera définitivement verrouillé.",
                    libelleConfirmer: "Valider",
                    onConfirmer: () => executerTransition("valider"),
                  })
                }
              >
                <CheckCircle2 size={15} /> Valider
              </Button>
            )}
            {om.statut === "VALIDE" && (
              <>
                <Button
                  variant="primary"
                  taille="sm"
                  onClick={() =>
                    demanderConfirmation({
                      titre: "Marquer comme payé",
                      message: "Confirmer le paiement de cet Ordre de Mission ?",
                      libelleConfirmer: "Payer",
                      onConfirmer: () => executerTransition("payer"),
                    })
                  }
                >
                  <Wallet size={15} /> Payer
                </Button>
                <Button
                  variant="danger"
                  taille="sm"
                  onClick={() =>
                    demanderConfirmation({
                      titre: "Annuler l'Ordre de Mission",
                      message: "Confirmer l'annulation de cet Ordre de Mission ?",
                      libelleConfirmer: "Annuler",
                      variantConfirmer: "danger",
                      onConfirmer: () => executerTransition("annuler"),
                    })
                  }
                >
                  <Ban size={15} /> Annuler
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl border-pink-100 bg-gradient-to-br from-white via-white to-pink-50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><User size={15} /> Informations agent</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Champ label="Nom" valeur={om.employe.nomFr} />
            <Champ label="Prénom" valeur={om.employe.prenomFr} />
            <Champ label="Matricule" valeur={om.employe.matricule} />
            <Champ label="Cadre" valeur={om.employe.cadre} />
            <Champ label="Échelle" valeur={om.echelleSnapshot ?? "-"} />
            <Champ label="Indice" valeur={om.indiceSnapshot ?? "-"} />
          </CardBody>
        </Card>

        <Card className="rounded-3xl border-pink-100 bg-gradient-to-br from-white via-white to-violet-50">
          <CardHeader>
            <CardTitle>Informations mission</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Champ label="Objet" valeur={om.objetMission} />
            <Champ label="Trajet" valeur={`${om.villeDepart} → ${om.villeArrivee}`} />
            <Champ label="Départ" valeur={formaterDateHeureFr(om.dateHeureDepart)} />
            <Champ label="Retour" valeur={formaterDateHeureFr(om.dateHeureRetour)} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Indemnités</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Champ label="Repas midi" valeur={om.nbRepasMidi ?? 0} />
            <Champ label="Repas soir" valeur={om.nbRepasSoir ?? 0} />
            <Champ label="Découchers" valeur={om.nbDecouchers ?? 0} />
            <Champ label="Taux 1-15j" valeur={om.tauxJour1a15Snapshot ? `${om.tauxJour1a15Snapshot} DH` : "-"} />
            <Champ label="Taux 16j+" valeur={om.tauxJour16PlusSnapshot ? `${om.tauxJour16PlusSnapshot} DH` : "-"} />
            <Champ label="Indemnité mission" valeur={formaterMontant(om.montantIndemniteMissionSnapshot)} />
            {om.moyenTransport === "VOITURE_PERSONNELLE" && (
              <>
                <Champ label="Kilométrage" valeur={om.kilometrageSnapshot ? `${om.kilometrageSnapshot} km` : "-"} />
                <Champ label="Taux km" valeur={om.tauxKmSnapshot ? `${om.tauxKmSnapshot} DH/km` : "-"} />
                <Champ label="Indemnité km" valeur={formaterMontant(om.montantKilometriqueSnapshot)} />
              </>
            )}
            <div className="col-span-full border-t border-slate-100 pt-3">
              <Champ label="Total général" valeur={formaterMontant(om.montantTotalSnapshot)} />
            </div>
          </CardBody>
        </Card>

        <Card className="rounded-3xl border-pink-100 bg-gradient-to-br from-white via-white to-violet-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Car size={15} /> Transport</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div><TransportBadge moyen={om.moyenTransport} /></div>
            {om.moyenTransport === "VOITURE_PERSONNELLE" && (
              <>
                <Champ label="Matricule véhicule" valeur={om.vehiculeMatriculeSnapshot ?? "-"} />
                <Champ label="Puissance fiscale" valeur={om.vehiculePuissanceFiscaleSnapshot ? `${om.vehiculePuissanceFiscaleSnapshot} CV` : "-"} />
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><HistoryIcon size={15} /> Historique</CardTitle>
          </CardHeader>
          {om.historique.length === 0 ? (
            <CardBody><p className="text-sm text-slate-400">Aucun évènement enregistré.</p></CardBody>
          ) : (
            <ul className="divide-y divide-slate-100">
              {om.historique.map((h) => (
                <li key={h.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{ACTION_LABEL[h.action] ?? h.action}</p>
                    {h.auteur && <p className="text-xs text-slate-400">Par {h.auteur}</p>}
                  </div>
                  <p className="text-xs text-slate-400">{formaterDateHeureFr(h.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-3xl border-pink-100 bg-gradient-to-br from-white via-white to-violet-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><FileText size={15} /> Documents</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={genDoc}
              onClick={() => telechargerDocument("ordre-mission")}
            >
              <Download size={15} /> Ordre de Mission (DOCX)
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={genDoc}
              onClick={() => imprimerDocument("ordre-mission")}
            >
              <Printer size={15} /> Imprimer l&apos;OM
            </Button>
            {om.statut !== "BROUILLON" && (
              <Button
                variant="outline"
                className="w-full"
                disabled={genDoc}
                onClick={() => telechargerDocument("etat-sommes-dues")}
              >
                <Download size={15} /> État des Sommes Dues (DOCX)
              </Button>
            )}
            {om.moyenTransport === "VOITURE_PERSONNELLE" && (
              <Button
                variant="outline"
                className="w-full"
                disabled={genDoc}
                onClick={() => telechargerDocument("etat-kilometrique")}
              >
                <Download size={15} /> État Kilométrique (XLSX)
              </Button>
            )}
          </CardBody>
        </Card>
      </div>
      {dialog}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm shadow-pink-950/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-1 bg-gradient-to-r ${tone} bg-clip-text text-lg font-semibold text-transparent`}>
        {value}
      </p>
    </div>
  );
}

function Champ({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{valeur}</p>
    </div>
  );
}
