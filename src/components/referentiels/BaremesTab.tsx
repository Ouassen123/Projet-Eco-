"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiGet, apiPatch, messageErreur } from "@/lib/apiClient";
import { useToast } from "@/components/toast/ToastProvider";
import type { BaremeMission, BaremeKilometrique } from "@/lib/types";

export function BaremesMissionTab() {
  const [baremes, setBaremes] = useState<BaremeMission[] | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, { tauxJour1a15: string; tauxJour16Plus: string }>>({});
  const [enregistrement, setEnregistrement] = useState<string | null>(null);
  const { succes, erreur } = useToast();

  const charger = () =>
    apiGet<BaremeMission[]>("/api/referentiels/baremes-mission").then((d) => {
      setBaremes(d);
      setValeurs(
        Object.fromEntries(
          d.map((b) => [b.id, { tauxJour1a15: String(b.tauxJour1a15), tauxJour16Plus: String(b.tauxJour16Plus) }])
        )
      );
    });

  useEffect(() => {
    charger();
  }, []);

  async function enregistrer(id: string) {
    const v = valeurs[id];
    if (!v) return;
    setEnregistrement(id);
    try {
      await apiPatch(`/api/referentiels/baremes-mission/${id}`, {
        tauxJour1a15: Number(v.tauxJour1a15),
        tauxJour16Plus: Number(v.tauxJour16Plus),
      });
      succes("Barème mis à jour.");
      charger();
    } catch (e) {
      erreur(messageErreur(e));
    } finally {
      setEnregistrement(null);
    }
  }

  if (!baremes) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Barèmes de mission (par échelle / indice)</CardTitle>
      </CardHeader>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Catégorie</th>
            <th className="px-4 py-3">Taux jours 1 à 15 (DH)</th>
            <th className="px-4 py-3">Taux jours 16 et plus (DH)</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {baremes.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3 font-medium text-slate-800">{b.libelle}</td>
              <td className="px-4 py-3">
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  value={valeurs[b.id]?.tauxJour1a15 ?? ""}
                  onChange={(e) =>
                    setValeurs((v) => ({ ...v, [b.id]: { ...v[b.id], tauxJour1a15: e.target.value } }))
                  }
                />
              </td>
              <td className="px-4 py-3">
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  value={valeurs[b.id]?.tauxJour16Plus ?? ""}
                  onChange={(e) =>
                    setValeurs((v) => ({ ...v, [b.id]: { ...v[b.id], tauxJour16Plus: e.target.value } }))
                  }
                />
              </td>
              <td className="px-4 py-3">
                <Button taille="sm" variant="outline" chargement={enregistrement === b.id} onClick={() => enregistrer(b.id)}>
                  Enregistrer
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function BaremesKmTab() {
  const [baremes, setBaremes] = useState<BaremeKilometrique[] | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [enregistrement, setEnregistrement] = useState<string | null>(null);
  const { succes, erreur } = useToast();

  const charger = () =>
    apiGet<BaremeKilometrique[]>("/api/referentiels/baremes-km").then((d) => {
      setBaremes(d);
      setValeurs(Object.fromEntries(d.map((b) => [b.id, String(b.tauxDhKm)])));
    });

  useEffect(() => {
    charger();
  }, []);

  async function enregistrer(id: string) {
    setEnregistrement(id);
    try {
      await apiPatch(`/api/referentiels/baremes-km/${id}`, { tauxDhKm: Number(valeurs[id]) });
      succes("Taux mis à jour.");
      charger();
    } catch (e) {
      erreur(messageErreur(e));
    } finally {
      setEnregistrement(null);
    }
  }

  if (!baremes) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Barèmes kilométriques (par puissance fiscale)</CardTitle>
      </CardHeader>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Puissance fiscale</th>
            <th className="px-4 py-3">Taux (DH/km)</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {baremes.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3 font-medium text-slate-800">{b.puissanceFiscale} CV</td>
              <td className="px-4 py-3">
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  value={valeurs[b.id] ?? ""}
                  onChange={(e) => setValeurs((v) => ({ ...v, [b.id]: e.target.value }))}
                />
              </td>
              <td className="px-4 py-3">
                <Button taille="sm" variant="outline" chargement={enregistrement === b.id} onClick={() => enregistrer(b.id)}>
                  Enregistrer
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
