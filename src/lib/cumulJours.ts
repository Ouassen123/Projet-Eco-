import type { Prisma } from "@prisma/client";
import { compterJoursMission } from "@/lib/repasDecouchers";

// Statuts comptabilises dans le cumul financier (regle validee) :
// BROUILLON exclu tant que non valide, ANNULE exclu definitivement.
export const STATUTS_COMPTABILISES = ["VALIDE", "PAYE"] as const;

/**
 * Calcule le nombre de jours de mission deja effectues par un employe dans
 * la meme localite (ville d'arrivee), toutes missions VALIDE/PAYE
 * confondues, EXCLUANT la mission en cours de creation.
 *
 * Ce cumul determine le seuil des 15/16 jours (regle validee : cumul
 * historique, pas seulement la mission en cours).
 */
export async function calculerJoursCumulesAvantMission(
  tx: Prisma.TransactionClient,
  employeId: string,
  villeArrivee: string,
  excludeOrdreMissionId?: string
): Promise<number> {
  const missionsAnterieures = await tx.ordreMission.findMany({
    where: {
      employeId,
      villeArrivee,
      statut: { in: [...STATUTS_COMPTABILISES] },
      id: excludeOrdreMissionId ? { not: excludeOrdreMissionId } : undefined,
    },
    select: { dateHeureDepart: true, dateHeureRetour: true },
  });

  return missionsAnterieures.reduce(
    (total, m) =>
      total + compterJoursMission(m.dateHeureDepart, m.dateHeureRetour),
    0
  );
}

/**
 * Determine, pour un jour donne de la mission courante (index 1-based au
 * sein de cette mission), l'index cumule global (incluant l'historique) et
 * si ce jour releve du taux "1 a 15" ou "16 et plus".
 */
export function indexJourCumule(
  indexJourMission: number,
  joursCumulesAvantMission: number
): { indexCumule: number; utiliseTauxReduit: boolean } {
  const indexCumule = joursCumulesAvantMission + indexJourMission;
  return { indexCumule, utiliseTauxReduit: indexCumule > 15 };
}
