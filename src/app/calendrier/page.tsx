"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Spinner";
import { EmployeSearchSelect } from "@/components/om/EmployeSearchSelect";
import { apiGet } from "@/lib/apiClient";
import { formaterHeureFr, moisEtAnneeFr } from "@/lib/dateUtils";
import { useExercice } from "@/components/layout/ExerciceContext";
import type { Employe, JourFerie, OrdreMissionAvecEmploye, StatutOM } from "@/lib/types";

type Vue = "mois" | "semaine" | "jour";

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const STATUT_COULEUR_PASTILLE: Record<StatutOM, string> = {
  BROUILLON: "bg-amber-500",
  VALIDE: "bg-sky-500",
  PAYE: "bg-emerald-500",
  ANNULE: "bg-red-500",
};

function utc(annee: number, mois: number, jour: number): Date {
  return new Date(Date.UTC(annee, mois, jour));
}

function ajouterJours(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86400000);
}

/** Lundi = 0 ... Dimanche = 6 (convention francaise), a partir du getUTCDay() (Dimanche=0). */
function indexJourSemaineFr(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function debutSemaine(date: Date): Date {
  return ajouterJours(date, -indexJourSemaineFr(date));
}

function memeJour(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function jourDansIntervalle(jour: Date, debut: Date, fin: Date): boolean {
  const j = utc(jour.getUTCFullYear(), jour.getUTCMonth(), jour.getUTCDate()).getTime();
  const d = utc(debut.getUTCFullYear(), debut.getUTCMonth(), debut.getUTCDate()).getTime();
  const f = utc(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate()).getTime();
  return j >= d && j <= f;
}

function estFerie(jour: Date, feries: JourFerie[]): JourFerie | undefined {
  return feries.find((f) => {
    const dateFerie = new Date(f.date);
    return f.recurrentAnnuel
      ? dateFerie.getUTCMonth() === jour.getUTCMonth() && dateFerie.getUTCDate() === jour.getUTCDate()
      : memeJour(dateFerie, jour);
  });
}

export default function CalendrierPage() {
  const router = useRouter();
  const [vue, setVue] = useState<Vue>("mois");
  const [curseur, setCurseur] = useState<Date>(() => {
    const n = new Date();
    return utc(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  });

  const { annee } = useExercice();

  const [employe, setEmploye] = useState<Employe | null>(null);
  const [statut, setStatut] = useState("");
  const [transport, setTransport] = useState("");

  const [missions, setMissions] = useState<OrdreMissionAvecEmploye[] | null>(null);
  const [feries, setFeries] = useState<JourFerie[]>([]);

  const { debutPlage, finPlage } = useMemo(() => {
    if (vue === "jour") return { debutPlage: curseur, finPlage: curseur };
    if (vue === "semaine") {
      const d = debutSemaine(curseur);
      return { debutPlage: d, finPlage: ajouterJours(d, 6) };
    }
    const premierJourMois = utc(curseur.getUTCFullYear(), curseur.getUTCMonth(), 1);
    const dernierJourMois = utc(curseur.getUTCFullYear(), curseur.getUTCMonth() + 1, 0);
    return { debutPlage: debutSemaine(premierJourMois), finPlage: ajouterJours(debutSemaine(dernierJourMois), 6) };
  }, [vue, curseur]);

  useEffect(() => {
    apiGet<JourFerie[]>("/api/referentiels/jours-feries").then(setFeries).catch(() => {});
  }, []);

  useEffect(() => {
    if (!annee) return;
    const params = new URLSearchParams();
    params.set("anneeEconomique", String(annee));
    if (employe) params.set("employeId", employe.id);
    if (statut) params.set("statut", statut);
    if (transport) params.set("moyenTransport", transport);
    params.set("dateDebut", debutPlage.toISOString());
    params.set("dateFin", ajouterJours(finPlage, 1).toISOString());
    apiGet<OrdreMissionAvecEmploye[]>(`/api/ordres-mission?${params.toString()}`)
      .then(setMissions)
      .catch(() => setMissions([]));
  }, [annee, employe, statut, transport, debutPlage, finPlage]);

  const joursGrille = useMemo(() => {
    const jours: Date[] = [];
    let cursor = debutPlage;
    while (cursor.getTime() <= finPlage.getTime()) {
      jours.push(cursor);
      cursor = ajouterJours(cursor, 1);
    }
    return jours;
  }, [debutPlage, finPlage]);

  function missionsDuJour(jour: Date): OrdreMissionAvecEmploye[] {
    if (!missions) return [];
    return missions.filter((om) =>
      jourDansIntervalle(jour, new Date(om.dateHeureDepart), new Date(om.dateHeureRetour))
    );
  }

  function naviguer(direction: 1 | -1) {
    if (vue === "jour") setCurseur((c) => ajouterJours(c, direction));
    else if (vue === "semaine") setCurseur((c) => ajouterJours(c, direction * 7));
    else setCurseur((c) => utc(c.getUTCFullYear(), c.getUTCMonth() + direction, 1));
  }

  function aujourdhui() {
    const n = new Date();
    setCurseur(utc(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  }

  const titrePeriode =
    vue === "jour"
      ? `${JOURS_SEMAINE[indexJourSemaineFr(curseur)]} ${curseur.getUTCDate()} ${moisEtAnneeFr(curseur)}`
      : vue === "semaine"
      ? `${debutPlage.getUTCDate()} - ${finPlage.getUTCDate()} ${moisEtAnneeFr(finPlage)}`
      : moisEtAnneeFr(curseur);

  return (
    <div>
      <PageHeader
        titre="Calendrier"
        description="Vue d'ensemble des missions et jours fériés."
        actions={
          <Link href="/ordres-mission/nouveau">
            <Button variant="primary">+ Nouvel Ordre de Mission</Button>
          </Link>
        }
      />

      <div className="mb-4 rounded-2xl border border-pink-100 bg-white/70 p-4 shadow-sm shadow-pink-950/5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px] flex-1">
            <EmployeSearchSelect employeSelectionne={employe} onSelectionner={setEmploye} />
          </div>
          <Select value={statut} onChange={(e) => setStatut(e.target.value)} className="w-44 rounded-xl border-pink-200 bg-white/80">
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="VALIDE">Validé</option>
            <option value="PAYE">Payé</option>
            <option value="ANNULE">Annulé</option>
          </Select>
          <Select value={transport} onChange={(e) => setTransport(e.target.value)} className="w-52 rounded-xl border-pink-200 bg-white/80">
            <option value="">Tous les transports</option>
            <option value="TRANSPORT_PUBLIC">Transport public</option>
            <option value="VOITURE_PERSONNELLE">Voiture personnelle</option>
            <option value="VOITURE_SERVICE">Voiture de service</option>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" taille="sm" onClick={() => naviguer(-1)}><ChevronLeft size={16} /></Button>
          <Button variant="outline" taille="sm" onClick={aujourdhui}>Aujourd&apos;hui</Button>
          <Button variant="outline" taille="sm" onClick={() => naviguer(1)}><ChevronRight size={16} /></Button>
          <p className="ml-2 text-base font-semibold capitalize text-slate-800">{titrePeriode}</p>
        </div>
        <div className="flex rounded-2xl border border-pink-100 bg-white/70 p-1 shadow-sm shadow-pink-950/5 backdrop-blur">
          {(["mois", "semaine", "jour"] as Vue[]).map((v) => (
            <button
              key={v}
              onClick={() => setVue(v)}
              className={`rounded-xl px-4 py-1.5 text-sm font-medium capitalize transition-all ${
                vue === v
                  ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-950/15"
                  : "text-slate-500 hover:bg-pink-50 hover:text-pink-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {missions === null ? (
        <PageLoader label="Chargement du calendrier..." />
      ) : vue === "mois" ? (
        <VueMois
          curseur={curseur}
          jours={joursGrille}
          missionsDuJour={missionsDuJour}
          feries={feries}
          onClicMission={(id) => router.push(`/ordres-mission/${id}`)}
        />
      ) : (
        <VueSemaineOuJour
          jours={joursGrille}
          missionsDuJour={missionsDuJour}
          feries={feries}
          onClicMission={(id) => router.push(`/ordres-mission/${id}`)}
        />
      )}
    </div>
  );
}

function VueMois({
  curseur,
  jours,
  missionsDuJour,
  feries,
  onClicMission,
}: {
  curseur: Date;
  jours: Date[];
  missionsDuJour: (jour: Date) => OrdreMissionAvecEmploye[];
  feries: JourFerie[];
  onClicMission: (id: string) => void;
}) {
  const moisCourant = curseur.getUTCMonth();
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
        {JOURS_SEMAINE.map((j) => (
          <div key={j} className="px-3 py-2">{j}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {jours.map((jour) => {
          const missions = missionsDuJour(jour);
          const ferie = estFerie(jour, feries);
          const horsMois = jour.getUTCMonth() !== moisCourant;
          const estAujourdhui = memeJour(jour, utc(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
          return (
            <div
              key={jour.toISOString()}
              className={`min-h-[110px] border-b border-r border-slate-100 p-2 ${horsMois ? "bg-slate-50/50" : "bg-white"}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  estAujourdhui ? "bg-indigo-600 text-white" : horsMois ? "text-slate-300" : "text-slate-600"
                }`}>
                  {jour.getUTCDate()}
                </span>
                {ferie && <span className="truncate rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">{ferie.libelle}</span>}
              </div>
              <div className="flex flex-col gap-1">
                {missions.slice(0, 3).map((om) => (
                  <button
                    key={om.id}
                    onClick={() => onClicMission(om.id)}
                    className="flex items-center gap-1 truncate rounded bg-slate-100 px-1.5 py-0.5 text-left text-[11px] text-slate-700 hover:bg-indigo-100"
                    title={`${om.employe.nomFr} ${om.employe.prenomFr} · ${om.objetMission}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUT_COULEUR_PASTILLE[om.statut]}`} />
                    <span className="truncate">{om.employe.nomFr} {om.employe.prenomFr}</span>
                  </button>
                ))}
                {missions.length > 3 && (
                  <p className="text-[11px] text-slate-400">+{missions.length - 3} autre(s)</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function VueSemaineOuJour({
  jours,
  missionsDuJour,
  feries,
  onClicMission,
}: {
  jours: Date[];
  missionsDuJour: (jour: Date) => OrdreMissionAvecEmploye[];
  feries: JourFerie[];
  onClicMission: (id: string) => void;
}) {
  return (
    <div className={`grid gap-3 ${jours.length > 1 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7" : "grid-cols-1"}`}>
      {jours.map((jour) => {
        const missions = missionsDuJour(jour);
        const ferie = estFerie(jour, feries);
        return (
          <Card key={jour.toISOString()}>
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800 capitalize">
                {JOURS_SEMAINE[indexJourSemaineFr(jour)]} {jour.getUTCDate()}
              </p>
              {ferie && <p className="text-xs font-medium text-red-600">{ferie.libelle}</p>}
            </div>
            <div className="flex flex-col gap-2 p-3">
              {missions.length === 0 ? (
                <p className="text-xs text-slate-400">Aucune mission.</p>
              ) : (
                missions.map((om) => (
                  <button
                    key={om.id}
                    onClick={() => onClicMission(om.id)}
                    className="rounded-lg border border-slate-100 p-2 text-left text-xs hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUT_COULEUR_PASTILLE[om.statut]}`} />
                      <span className="font-medium text-slate-800">{om.employe.nomFr} {om.employe.prenomFr}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-slate-500">
                      <MapPin size={11} /> {om.villeDepart} → {om.villeArrivee}
                    </p>
                    <p className="mt-0.5 text-slate-400">
                      {formaterHeureFr(om.dateHeureDepart)} - {formaterHeureFr(om.dateHeureRetour)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
