"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TrajetsTab } from "@/components/referentiels/TrajetsTab";
import { BaremesMissionTab, BaremesKmTab } from "@/components/referentiels/BaremesTab";
import { JoursFeriesTab } from "@/components/referentiels/JoursFeriesTab";
import { CadreEchelleTab } from "@/components/referentiels/CadreEchelleTab";

const ONGLETS = [
  { id: "trajets", label: "Trajets" },
  { id: "baremes-mission", label: "Barèmes mission" },
  { id: "baremes-km", label: "Barèmes kilométriques" },
  { id: "jours-feries", label: "Jours fériés" },
  { id: "cadre-echelle", label: "Cadre → Échelle" },
] as const;

type OngletId = (typeof ONGLETS)[number]["id"];

export default function ReferentielsPage() {
  const [onglet, setOnglet] = useState<OngletId>("trajets");

  return (
    <div>
      <PageHeader titre="Référentiels" description="Configuration administrable — réservée aux administrateurs." />

      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 to-violet-50 px-4 py-3 text-sm text-pink-800 shadow-sm shadow-pink-950/5">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-pink-600" />
        <p>Ces référentiels influencent directement les calculs d&apos;indemnités. Toute modification s&apos;applique aux prochaines créations/validations d&apos;Ordres de Mission.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-pink-100 bg-white/70 p-2 shadow-sm shadow-pink-950/5 backdrop-blur">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              onglet === o.id
                ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-950/15"
                : "text-slate-600 hover:bg-pink-50 hover:text-pink-700"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === "trajets" && <TrajetsTab />}
      {onglet === "baremes-mission" && <BaremesMissionTab />}
      {onglet === "baremes-km" && <BaremesKmTab />}
      {onglet === "jours-feries" && <JoursFeriesTab />}
      {onglet === "cadre-echelle" && <CadreEchelleTab />}
    </div>
  );
}
