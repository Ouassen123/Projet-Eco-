"use client";

import { useEffect, useState } from "react";
import { Trash2, Layers } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiDelete, messageErreur } from "@/lib/apiClient";
import { useToast } from "@/components/toast/ToastProvider";
import type { CadreEchelleMapping, TypePersonnel } from "@/lib/types";

export function CadreEchelleTab() {
  const [mappings, setMappings] = useState<CadreEchelleMapping[] | null>(null);
  const [cadre, setCadre] = useState("");
  const [grade, setGrade] = useState("");
  const [type, setType] = useState<TypePersonnel>("ADMINISTRATIF");
  const [echelle, setEchelle] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const { succes, erreur } = useToast();

  const charger = () =>
    apiGet<CadreEchelleMapping[]>("/api/referentiels/cadre-echelle").then(setMappings).catch(() => setMappings([]));

  useEffect(() => {
    charger();
  }, []);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!cadre.trim() || !echelle) return;
    setEnvoi(true);
    try {
      await apiPost("/api/referentiels/cadre-echelle", {
        cadre: cadre.trim(),
        grade: grade.trim() || undefined,
        type,
        echelle: Number(echelle),
      });
      succes("Correspondance enregistrée.");
      setCadre("");
      setGrade("");
      setEchelle("");
      charger();
    } catch (e) {
      erreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(id: string) {
    try {
      await apiDelete(`/api/referentiels/cadre-echelle/${id}`);
      succes("Correspondance supprimée.");
      charger();
    } catch (e) {
      erreur(messageErreur(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <p className="mb-3 text-sm font-medium text-slate-700">Ajouter / mettre à jour une correspondance</p>
          <form onSubmit={soumettre} className="flex flex-wrap items-end gap-3">
            <Field label="Cadre" enfant={<Input value={cadre} onChange={(e) => setCadre(e.target.value)} className="w-56" />} />
            <Field label="Grade (optionnel)" enfant={<Input value={grade} onChange={(e) => setGrade(e.target.value)} className="w-36" placeholder="A / B / C" />} />
            <Field label="Type" enfant={
              <Select value={type} onChange={(e) => setType(e.target.value as TypePersonnel)} className="w-44">
                <option value="ADMINISTRATIF">Administratif</option>
                <option value="ENSEIGNANT">Enseignant</option>
              </Select>
            } />
            <Field label="Échelle" enfant={<Input type="number" min="1" max="11" value={echelle} onChange={(e) => setEchelle(e.target.value)} className="w-28" />} />
            <Button type="submit" chargement={envoi}>Enregistrer</Button>
          </form>
        </CardBody>
      </Card>

      {mappings === null ? null : mappings.length === 0 ? (
        <EmptyState icone={Layers} titre="Aucune correspondance configurée" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Cadre</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Échelle</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{m.cadre}</td>
                  <td className="px-4 py-3 text-slate-600">{m.grade || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{m.type === "ADMINISTRATIF" ? "Administratif" : "Enseignant"}</td>
                  <td className="px-4 py-3 text-slate-600">{m.echelle}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => supprimer(m.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Supprimer">
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
