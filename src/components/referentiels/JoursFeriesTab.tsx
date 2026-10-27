"use client";

import { useEffect, useState } from "react";
import { Trash2, CalendarOff } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiDelete, messageErreur } from "@/lib/apiClient";
import { formaterDateFr } from "@/lib/dateUtils";
import { useToast } from "@/components/toast/ToastProvider";
import type { JourFerie } from "@/lib/types";

export function JoursFeriesTab() {
  const [feries, setFeries] = useState<JourFerie[] | null>(null);
  const [date, setDate] = useState("");
  const [libelle, setLibelle] = useState("");
  const [recurrentAnnuel, setRecurrentAnnuel] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const { succes, erreur } = useToast();

  const charger = () => apiGet<JourFerie[]>("/api/referentiels/jours-feries").then(setFeries).catch(() => setFeries([]));

  useEffect(() => {
    charger();
  }, []);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !libelle.trim()) return;
    setEnvoi(true);
    try {
      await apiPost("/api/referentiels/jours-feries", { date: `${date}T00:00:00.000Z`, libelle: libelle.trim(), recurrentAnnuel });
      succes("Jour férié ajouté.");
      setDate("");
      setLibelle("");
      setRecurrentAnnuel(false);
      charger();
    } catch (e) {
      erreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(id: string) {
    try {
      await apiDelete(`/api/referentiels/jours-feries/${id}`);
      succes("Jour férié supprimé.");
      charger();
    } catch (e) {
      erreur(messageErreur(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <p className="mb-3 text-sm font-medium text-slate-700">Ajouter un jour férié</p>
          <form onSubmit={soumettre} className="flex flex-wrap items-end gap-3">
            <Field label="Date" enfant={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />} />
            <Field label="Libellé" enfant={<Input value={libelle} onChange={(e) => setLibelle(e.target.value)} className="w-56" placeholder="Ex : Fête du Travail" />} />
            <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-600">
              <input type="checkbox" checked={recurrentAnnuel} onChange={(e) => setRecurrentAnnuel(e.target.checked)} />
              Récurrent chaque année
            </label>
            <Button type="submit" chargement={envoi}>Ajouter</Button>
          </form>
        </CardBody>
      </Card>

      {feries === null ? null : feries.length === 0 ? (
        <EmptyState icone={CalendarOff} titre="Aucun jour férié configuré" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Libellé</th>
                <th className="px-4 py-3">Récurrent</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feries.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{formaterDateFr(f.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{f.libelle}</td>
                  <td className="px-4 py-3 text-slate-500">{f.recurrentAnnuel ? "Oui" : "Non"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => supprimer(f.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Supprimer">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
