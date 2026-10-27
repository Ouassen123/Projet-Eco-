"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Receipt, Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatutBadge } from "@/components/ui/Badge";
import { apiGet, messageErreur } from "@/lib/apiClient";
import { formaterDateHeureFr, formaterMontant } from "@/lib/dateUtils";
import { useToast } from "@/components/toast/ToastProvider";
import type { OrdreMissionAvecEmploye } from "@/lib/types";

export default function EtatsSommesDuesPage() {
  const [ordres, setOrdres] = useState<OrdreMissionAvecEmploye[] | null>(null);
  const [statut, setStatut] = useState("VALIDE");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const { erreur } = useToast();

  useEffect(() => {
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    if (dateDebut) params.set("dateDebut", `${dateDebut}T00:00:00.000Z`);
    if (dateFin) params.set("dateFin", `${dateFin}T23:59:59.000Z`);
    apiGet<OrdreMissionAvecEmploye[]>(`/api/ordres-mission?${params.toString()}`)
      .then(setOrdres)
      .catch((e) => erreur(messageErreur(e)));
  }, [statut, dateDebut, dateFin, erreur]);

  const total = useMemo(
    () => (ordres ?? []).reduce((s, om) => s + (om.montantTotalSnapshot ?? 0), 0),
    [ordres]
  );

  return (
    <div>
      <PageHeader
        titre="États des sommes dues"
        description="Synthèse des indemnités validées et/ou payées."
        actions={
          <>
            <Button variant="outline" disabled title="Bientôt disponible">
              <Printer size={16} /> Imprimer
            </Button>
            <Button variant="outline" disabled title="Bientôt disponible">
              <Download size={16} /> Exporter
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 p-4">
          <Select value={statut} onChange={(e) => setStatut(e.target.value)} className="w-52">
            <option value="VALIDE">Validés (à payer)</option>
            <option value="PAYE">Payés</option>
            <option value="">Tous (validés + payés)</option>
          </Select>
          <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-40" />
          <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-40" />
        </div>
      </Card>

      {ordres === null ? (
        <PageLoader label="Chargement..." />
      ) : ordres.length === 0 ? (
        <EmptyState icone={Receipt} titre="Aucun montant à afficher" description="Aucun Ordre de Mission ne correspond à ces filtres." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3">Départ</th>
                <th className="px-4 py-3">Retour</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordres.map((om) => (
                <tr key={om.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{om.numeroSequence}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/ordres-mission/${om.id}`} className="hover:text-indigo-600 hover:underline">
                      {om.employe.nomFr} {om.employe.prenomFr}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{om.employe.matricule}</td>
                  <td className="px-4 py-3 text-slate-600">{om.objetMission}</td>
                  <td className="px-4 py-3 text-slate-600">{formaterDateHeureFr(om.dateHeureDepart)}</td>
                  <td className="px-4 py-3 text-slate-600">{formaterDateHeureFr(om.dateHeureRetour)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{formaterMontant(om.montantTotalSnapshot)}</td>
                  <td className="px-4 py-3"><StatutBadge statut={om.statut} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={6} className="px-4 py-3 text-right font-semibold text-slate-600">Total</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formaterMontant(total)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}
