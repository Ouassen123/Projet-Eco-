"use client";

import { Calendar } from "lucide-react";
import { useExercice } from "@/components/layout/ExerciceContext";

export function ExerciceSelector() {
  const { annee, setAnnee, exercices, chargement } = useExercice();

  if (chargement) {
    return (
      <div className="mx-3 mb-2 rounded-xl border border-pink-100 bg-white/60 px-3 py-2 text-xs text-slate-500">
        Chargement de l’exercice…
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 to-violet-50 px-3 py-3 shadow-sm shadow-pink-950/5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-pink-700">
        <Calendar size={13} />
        Exercice économique
      </label>
      <select
        value={annee ?? ""}
        onChange={(e) => setAnnee(Number(e.target.value))}
        className="mt-2 w-full rounded-xl border border-pink-200 bg-white/80 px-2.5 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
      >
        {exercices.map((ex) => (
          <option key={ex.id} value={ex.annee}>
            {ex.annee} {ex.actif ? "(actif)" : ""} {ex.archive ? "(archivé)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
