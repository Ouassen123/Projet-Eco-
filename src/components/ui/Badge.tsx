import clsx from "clsx";
import type { StatutOM, MoyenTransport } from "@/lib/types";

const COULEURS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
  sky: "bg-sky-100 text-sky-800",
  indigo: "bg-violet-100 text-violet-800",
  violet: "bg-violet-100 text-violet-800",
  pink: "bg-pink-100 text-pink-800",
};

export function Badge({
  couleur = "slate",
  children,
}: {
  couleur?: keyof typeof COULEURS;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        COULEURS[couleur]
      )}
    >
      {children}
    </span>
  );
}

const STATUT_LABEL: Record<StatutOM, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Validé",
  ANNULE: "Annulé",
  PAYE: "Payé",
};

const STATUT_COULEUR: Record<StatutOM, keyof typeof COULEURS> = {
  BROUILLON: "pink",
  VALIDE: "sky",
  ANNULE: "rose",
  PAYE: "emerald",
};

export function StatutBadge({ statut }: { statut: StatutOM }) {
  return <Badge couleur={STATUT_COULEUR[statut]}>{STATUT_LABEL[statut]}</Badge>;
}

const TRANSPORT_LABEL: Record<MoyenTransport, string> = {
  TRANSPORT_PUBLIC: "Transport public",
  VOITURE_PERSONNELLE: "Voiture personnelle",
  VOITURE_SERVICE: "Voiture de service",
};

export function TransportBadge({ moyen }: { moyen: MoyenTransport }) {
  return <Badge couleur="violet">{TRANSPORT_LABEL[moyen]}</Badge>;
}

export { STATUT_LABEL, TRANSPORT_LABEL };
