import type { Prisma } from "@prisma/client";

// Portee par defaut du compteur technique interne. Le format d'AFFICHAGE
// officiel (numero) sera decide plus tard (global / annuel / prefixe) sans
// impacter ce compteur qui garantit deja l'unicite (regle validee: pas de
// doublon, pas de creation concurrente avec le meme numero).
export const SCOPE_SEQUENCE_OM = "OM_GLOBAL";

/**
 * Incremente atomiquement le compteur technique interne. Doit etre appele
 * DANS la meme transaction que la creation de l'OrdreMission pour garantir
 * l'unicite meme en cas de creation concurrente (SQLite serialise les
 * ecritures au sein d'une transaction).
 */
export async function genererNumeroSequenceOM(
  tx: Prisma.TransactionClient,
  scope: string = SCOPE_SEQUENCE_OM
): Promise<number> {
  const sequence = await tx.sequence.upsert({
    where: { scope },
    update: { valeur: { increment: 1 } },
    create: { scope, valeur: 1 },
  });
  return sequence.valeur;
}
