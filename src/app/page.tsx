"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Users,
  CalendarDays,
  History,
  FileText,
  FileCheck2,
  Wallet,
  Ban,
  Car,
  Route,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLoader } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { apiGet, messageErreur } from "@/lib/apiClient";
import { formaterMontant, moisEtAnneeFr } from "@/lib/dateUtils";
import { useToast } from "@/components/toast/ToastProvider";
import { useExercice } from "@/components/layout/ExerciceContext";

interface DonneesDashboard {
  periode: { annee: number; mois: number; exerciceEconomique: number };
  nbOMCeMois: number;
  nbBrouillon: number;
  nbValide: number;
  nbPaye: number;
  nbAnnule: number;
  nbPersonnesEnDeplacement: number;
  totalIndemnitesMission: number;
  totalIndemnitesKilometrique: number;
}

function KpiCard({
  icone: Icone,
  gradient,
  label,
  valeur,
}: {
  icone: typeof Users;
  gradient: string;
  label: string;
  valeur: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/50 bg-gradient-to-br from-white via-white to-pink-50 p-5 shadow-lg shadow-pink-950/5 transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
          <Icone size={21} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold text-slate-900">{valeur}</p>
        </div>
      </div>
    </div>
  );
}

export default function TableauDeBordPage() {
  const [donnees, setDonnees] = useState<DonneesDashboard | null>(null);
  const [chargement, setChargement] = useState(true);
  const { annee } = useExercice();
  const { erreur } = useToast();

  useEffect(() => {
    if (!annee) return;
    let actif = true;
    apiGet<DonneesDashboard>(`/api/dashboard?anneeEconomique=${annee}`)
      .then((d) => {
        if (actif) setDonnees(d);
      })
      .catch((e) => erreur(messageErreur(e)))
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [annee, erreur]);

  if (chargement) return <PageLoader label="Chargement du tableau de bord..." />;
  if (!donnees) return null;

  const nomMois = moisEtAnneeFr(new Date(Date.UTC(donnees.periode.annee, donnees.periode.mois - 1, 1)));

  return (
    <div>
      <PageHeader
        titre="Tableau de bord"
        description={`Vue d'ensemble · ${nomMois} · Exercice ${donnees.periode.exerciceEconomique}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icone={FileText}
          gradient="from-indigo-500 to-violet-500"
          label="OM ce mois"
          valeur={donnees.nbOMCeMois}
        />
        <KpiCard
          icone={Users}
          gradient="from-sky-500 to-cyan-500"
          label="Personnes en déplacement"
          valeur={donnees.nbPersonnesEnDeplacement}
        />
        <KpiCard
          icone={Wallet}
          gradient="from-emerald-500 to-teal-500"
          label="Total indemnités"
          valeur={formaterMontant(donnees.totalIndemnitesMission)}
        />
        <KpiCard
          icone={Car}
          gradient="from-amber-500 to-orange-500"
          label="Total indemnités kilométriques"
          valeur={formaterMontant(donnees.totalIndemnitesKilometrique)}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icone={FileText}
          gradient="from-amber-500 to-yellow-500"
          label="OM en brouillon"
          valeur={donnees.nbBrouillon}
        />
        <KpiCard
          icone={Route}
          gradient="from-sky-500 to-blue-500"
          label="OM validés"
          valeur={donnees.nbValide}
        />
        <KpiCard
          icone={FileCheck2}
          gradient="from-emerald-500 to-green-500"
          label="OM payés"
          valeur={donnees.nbPaye}
        />
        <KpiCard
          icone={Ban}
          gradient="from-rose-500 to-red-500"
          label="OM annulés"
          valeur={donnees.nbAnnule}
        />
      </div>

      <Card className="mt-6">
        <CardBody className="flex flex-wrap items-center gap-3">
          <Link href="/ordres-mission/nouveau">
            <Button variant="primary">
              <PlusCircle size={16} />
              Nouvel Ordre de Mission
            </Button>
          </Link>
          <Link href="/personnel">
            <Button variant="outline">
              <Users size={16} />
              Personnel
            </Button>
          </Link>
          <Link href="/calendrier">
            <Button variant="outline">
              <CalendarDays size={16} />
              Calendrier
            </Button>
          </Link>
          <Link href="/ordres-mission">
            <Button variant="outline">
              <History size={16} />
              Historique
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
