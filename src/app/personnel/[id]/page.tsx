"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Car, IdCard, History as HistoryIcon, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatutBadge, TransportBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiGet, messageErreur } from "@/lib/apiClient";
import { formaterDateHeureFr, formaterMontant } from "@/lib/dateUtils";
import { useToast } from "@/components/toast/ToastProvider";
import { useExercice } from "@/components/layout/ExerciceContext";
import type { Employe, OrdreMission } from "@/lib/types";

type EmployeDetail = Employe & {
  echelleAffichage: number | null;
  ordresMission: OrdreMission[];
};

type StatsEmploye = {
  exerciceEconomique: number;
  stats: {
    employeId: string;
    missionsValideesOuPayees: number;
    totalMissionEtKm: number;
    totalIndemnitesMission: number;
    totalIndemnitesKm: number;
    missionsPayees: number;
    totalPaye: number;
  }[];
};

export default function PersonnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [employe, setEmploye] = useState<EmployeDetail | null>(null);
  const [stats, setStats] = useState<StatsEmploye["stats"][number] | null>(null);
  const [exercice, setExercice] = useState<number | null>(null);
  const [chargement, setChargement] = useState(true);
  const { annee } = useExercice();
  const { erreur } = useToast();

  useEffect(() => {
    if (!annee) return;
    let actif = true;
    apiGet<EmployeDetail>(`/api/personnel/${id}?anneeEconomique=${annee}`)
      .then((d) => actif && setEmploye(d))
      .catch((e) => erreur(messageErreur(e)));

    apiGet<StatsEmploye>(`/api/personnel/stats?employeId=${id}&anneeEconomique=${annee}`)
      .then((d) => {
        if (!actif) return;
        setExercice(d.exerciceEconomique);
        setStats(d.stats[0] ?? null);
      })
      .catch((e) => erreur(messageErreur(e)))
      .finally(() => actif && setChargement(false));
    return () => {
      actif = false;
    };
  }, [id, annee, erreur]);

  if (chargement) return <PageLoader label="Chargement de la fiche..." />;
  if (!employe) {
    return (
      <EmptyState
        icone={IdCard}
        titre="Personne introuvable"
        description="Cette fiche n'existe pas ou a été supprimée."
      />
    );
  }

  return (
    <div>
      <Link href="/personnel" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft size={15} />
        Retour au personnel
      </Link>

      <PageHeader
        titre={`${employe.nomFr} ${employe.prenomFr}`}
        description={`Matricule ${employe.matricule} · ${employe.type === "ADMINISTRATIF" ? "Administratif" : "Enseignant"}`}
        actions={
          <Link href={`/ordres-mission/nouveau?employeId=${employe.id}`}>
            <Button variant="primary">Nouvel Ordre de Mission</Button>
          </Link>
        }
      />

      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total reçu" value={formaterMontant(stats.totalPaye)} icon={Wallet} tone="from-pink-500 to-violet-500" />
          <StatCard label="Missions payées" value={String(stats.missionsPayees)} tone="from-fuchsia-500 to-pink-500" />
          <StatCard label="Missions validées" value={String(stats.missionsValideesOuPayees)} tone="from-sky-500 to-cyan-500" />
          <StatCard label="Exercice" value={String(exercice ?? "-")} tone="from-violet-500 to-indigo-500" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations administratives</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Champ label="Matricule" valeur={employe.matricule} />
            <Champ label="Nom" valeur={employe.nomFr} />
            <Champ label="Prénom" valeur={employe.prenomFr} />
            {employe.nomAr && <Champ label="Nom (ar)" valeur={employe.nomAr} />}
            {employe.prenomAr && <Champ label="Prénom (ar)" valeur={employe.prenomAr} />}
            <Champ label="Type" valeur={employe.type === "ADMINISTRATIF" ? "Administratif" : "Enseignant"} />
            <Champ label="Cadre" valeur={employe.cadre} />
            {employe.grade && <Champ label="Grade" valeur={employe.grade} />}
            <Champ label="Échelon" valeur={employe.echelon ?? "-"} />
            <Champ label="Indice" valeur={employe.indice ?? "-"} />
            <Champ label="Échelle" valeur={employe.echelleAffichage ?? "Non déterminée"} />
            <Champ label="Échelon exceptionnel" valeur={employe.echelonExceptionnel ? "Oui" : "Non"} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Car size={15} /> Véhicule personnel
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            {employe.vehiculeMatricule ? (
              <>
                <Champ label="Matricule véhicule" valeur={employe.vehiculeMatricule} />
                <Champ label="Puissance fiscale" valeur={`${employe.vehiculePuissanceFiscale} CV`} />
              </>
            ) : (
              <p className="text-slate-400">Aucun véhicule personnel enregistré.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <HistoryIcon size={15} /> Historique des missions
          </CardTitle>
        </CardHeader>
        {employe.ordresMission.length === 0 ? (
          <CardBody>
            <p className="text-sm text-slate-400">Aucune mission enregistrée pour cette personne.</p>
          </CardBody>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3">Trajet</th>
                <th className="px-4 py-3">Départ</th>
                <th className="px-4 py-3">Retour</th>
                <th className="px-4 py-3">Transport</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employe.ordresMission.map((om) => (
                <tr key={om.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/ordres-mission/${om.id}`} className="font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                      {om.objetMission}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{om.villeDepart} → {om.villeArrivee}</td>
                  <td className="px-4 py-3 text-slate-600">{formaterDateHeureFr(om.dateHeureDepart)}</td>
                  <td className="px-4 py-3 text-slate-600">{formaterDateHeureFr(om.dateHeureRetour)}</td>
                  <td className="px-4 py-3"><TransportBadge moyen={om.moyenTransport} /></td>
                  <td className="px-4 py-3 text-slate-700">{formaterMontant(om.montantTotalSnapshot)}</td>
                  <td className="px-4 py-3"><StatutBadge statut={om.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white via-white to-pink-50 p-4 shadow-sm shadow-pink-950/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {Icon && <Icon size={16} className={`bg-gradient-to-r ${tone} bg-clip-text text-transparent`} />}
        <p className={`bg-gradient-to-r ${tone} bg-clip-text text-xl font-semibold text-transparent`}>
          {value}
        </p>
      </div>
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
