"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, messageErreur } from "@/lib/apiClient";
import { formaterMontant } from "@/lib/dateUtils";
import { useToast } from "@/components/toast/ToastProvider";
import { useExercice } from "@/components/layout/ExerciceContext";
import type { Employe } from "@/lib/types";

type EmployeAvecEchelle = Employe & { echelleAffichage: number | null };

type StatsEmploye = {
  employeId: string;
  missionsValideesOuPayees: number;
  totalMissionEtKm: number;
  totalIndemnitesMission: number;
  totalIndemnitesKm: number;
  missionsPayees: number;
  totalPaye: number;
};

export default function PersonnelPage() {
  const [employes, setEmployes] = useState<EmployeAvecEchelle[] | null>(null);
  const [stats, setStats] = useState<Record<string, StatsEmploye>>({});
  const [exercice, setExercice] = useState<number | null>(null);
  const [recherche, setRecherche] = useState("");
  const [type, setType] = useState("");
  const { annee } = useExercice();
  const { erreur } = useToast();

  useEffect(() => {
    if (!annee) return;
    let actif = true;
    const params = new URLSearchParams();
    if (recherche) params.set("q", recherche);
    if (type) params.set("type", type);
    apiGet<EmployeAvecEchelle[]>(`/api/personnel?${params.toString()}`)
      .then((d) => actif && setEmployes(d))
      .catch((e) => erreur(messageErreur(e)));

    apiGet<{ exerciceEconomique: number; stats: StatsEmploye[] }>(`/api/personnel/stats?anneeEconomique=${annee}`)
      .then((d) => {
        if (!actif) return;
        setExercice(d.exerciceEconomique);
        setStats(Object.fromEntries(d.stats.map((s) => [s.employeId, s])));
      })
      .catch((e) => erreur(messageErreur(e)));

    return () => {
      actif = false;
    };
  }, [annee, recherche, type, erreur]);

  const total = employes?.length ?? 0;

  return (
    <div>
      <PageHeader
        titre="Personnel"
        description={`${total} personne(s) référencée(s)${exercice ? ` · Exercice ${exercice}` : ""}`}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[260px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, prénom, matricule..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-56">
            <option value="">Tous les types</option>
            <option value="ADMINISTRATIF">Administratif</option>
            <option value="ENSEIGNANT">Enseignant</option>
          </Select>
        </div>
      </Card>

      {employes === null ? (
        <PageLoader label="Chargement du personnel..." />
      ) : employes.length === 0 ? (
        <EmptyState icone={Users} titre="Aucun résultat" description="Aucune personne ne correspond à ces critères." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Prénom</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Cadre</th>
                <th className="px-4 py-3">Échelon</th>
                <th className="px-4 py-3">Indice</th>
                <th className="px-4 py-3">Échelle</th>
                <th className="px-4 py-3 text-right">Total reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employes.map((emp) => {
                const s = stats[emp.id];
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.matricule}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/personnel/${emp.id}`} className="hover:text-indigo-600 hover:underline">
                        {emp.nomFr}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{emp.prenomFr}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {emp.type === "ADMINISTRATIF" ? "Administratif" : "Enseignant"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{emp.cadre}</td>
                    <td className="px-4 py-3 text-slate-700">{emp.echelon ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{emp.indice ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{emp.echelleAffichage ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      {s ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700">
                          <Wallet size={12} />
                          {formaterMontant(s.totalPaye)} DH
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
