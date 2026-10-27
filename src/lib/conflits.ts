import type { Prisma } from "@prisma/client";
import { BusinessError, ErrorCodes } from "@/lib/errors";

// Statuts qui bloquent la creation d'une nouvelle mission chevauchante.
// ANNULE est explicitement exclu (regle validee).
export const STATUTS_BLOQUANTS_CONFLIT = ["BROUILLON", "VALIDE", "PAYE"] as const;

/**
 * Verifie l'absence de chevauchement de dates/heures pour un meme employe.
 * Semantique intervalle semi-ouvert : deux missions qui se suivent exactement
 * (fin de A == debut de B) sont autorisees. Doit etre appele DANS la meme
 * transaction que la creation/validation pour eviter les conditions de
 * concurrence (SQLite serialise les ecritures par transaction).
 */
export async function verifierAucunConflitDates(
  tx: Prisma.TransactionClient,
  employeId: string,
  dateHeureDepart: Date,
  dateHeureRetour: Date,
  excludeOrdreMissionId?: string
): Promise<void> {
  const conflits = await tx.ordreMission.findMany({
    where: {
      employeId,
      statut: { in: [...STATUTS_BLOQUANTS_CONFLIT] },
      id: excludeOrdreMissionId ? { not: excludeOrdreMissionId } : undefined,
      dateHeureDepart: { lt: dateHeureRetour },
      dateHeureRetour: { gt: dateHeureDepart },
    },
    select: {
      id: true,
      numero: true,
      numeroSequence: true,
      dateHeureDepart: true,
      dateHeureRetour: true,
    },
  });

  if (conflits.length > 0) {
    throw new BusinessError(
      ErrorCodes.CONFLIT_DATES,
      `Conflit de dates detecte avec ${conflits.length} mission(s) existante(s) pour cet agent.`,
      conflits
    );
  }
}
