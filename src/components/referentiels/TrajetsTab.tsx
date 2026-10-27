"use client";

import { useEffect, useState } from "react";
import { Route } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiPost, messageErreur } from "@/lib/apiClient";
import { useToast } from "@/components/toast/ToastProvider";
import type { Trajet } from "@/lib/types";

export function TrajetsTab() {
  const [trajets, setTrajets] = useState<Trajet[] | null>(null);
  const [villeDepart, setVilleDepart] = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const { succes, erreur } = useToast();

  const charger = () => apiGet<Trajet[]>("/api/referentiels/trajets").then(setTrajets).catch(() => setTrajets([]));

  useEffect(() => {
    charger();
  }, []);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!villeDepart.trim() || !villeArrivee.trim() || !distanceKm) return;
    setEnvoi(true);
    try {
      await apiPost("/api/referentiels/trajets", {
        villeDepart: villeDepart.trim(),
        villeArrivee: villeArrivee.trim(),
        distanceKm: Number(distanceKm),
      });
      succes("Trajet enregistré.");
      setVilleDepart("");
      setVilleArrivee("");
      setDistanceKm("");
      charger();
    } catch (e) {
      erreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <p className="mb-3 text-sm font-medium text-slate-700">Ajouter / mettre à jour un trajet</p>
          <form onSubmit={soumettre} className="flex flex-wrap items-end gap-3">
            <Field label="Ville de départ" enfant={<Input value={villeDepart} onChange={(e) => setVilleDepart(e.target.value)} className="w-40" />} />
            <Field label="Ville d'arrivée" enfant={<Input value={villeArrivee} onChange={(e) => setVilleArrivee(e.target.value)} className="w-40" />} />
            <Field label="Distance aller-retour (km)" enfant={<Input type="number" min="0" step="0.1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} className="w-48" />} />
            <Button type="submit" chargement={envoi}>Enregistrer</Button>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            La distance représente le total ALLER-RETOUR (et non l&apos;aller simple).
          </p>
        </CardBody>
      </Card>

      {trajets === null ? null : trajets.length === 0 ? (
        <EmptyState icone={Route} titre="Aucun trajet configuré" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Ville de départ</th>
                <th className="px-4 py-3">Ville d&apos;arrivée</th>
                <th className="px-4 py-3">Distance aller-retour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trajets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.villeDepart}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.villeArrivee}</td>
                  <td className="px-4 py-3 text-slate-600">{t.distanceKm} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
