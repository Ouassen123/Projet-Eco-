import { prisma } from "@/lib/prisma";
import { BusinessError, ErrorCodes } from "@/lib/errors";

function memeJourCalendaire(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function memeMoisJour(a: Date, b: Date): boolean {
  return a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

/** Retourne la liste des dates calendaires (00:00 UTC) couvertes par une mission, bornes incluses. */
export function listerJoursCalendaires(debut: Date, fin: Date): Date[] {
  const jours: Date[] = [];
  const cursor = new Date(
    Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth(), debut.getUTCDate())
  );
  const finJour = new Date(
    Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate())
  );
  while (cursor.getTime() <= finJour.getTime()) {
    jours.push(new Date(cursor.getTime()));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return jours;
}

export interface JourFerieMatch {
  date: Date;
  libelle: string;
}

/**
 * Verifie si une periode de mission (bornes incluses, jour par jour) touche
 * un jour ferie configure. Regle V1 validee : le moindre jour ferie dans la
 * periode bloque la creation de l'OM.
 */
export async function verifierAucunJourFerie(
  dateHeureDepart: Date,
  dateHeureRetour: Date
): Promise<void> {
  const feries = await prisma.jourFerie.findMany({ where: { actif: true } });
  const joursMission = listerJoursCalendaires(dateHeureDepart, dateHeureRetour);

  const rencontres: JourFerieMatch[] = [];

  for (const jourMission of joursMission) {
    for (const ferie of feries) {
      const correspond = ferie.recurrentAnnuel
        ? memeMoisJour(ferie.date, jourMission)
        : memeJourCalendaire(ferie.date, jourMission);
      if (correspond) {
        rencontres.push({ date: jourMission, libelle: ferie.libelle });
      }
    }
  }

  if (rencontres.length > 0) {
    throw new BusinessError(
      ErrorCodes.JOUR_FERIE,
      `La periode de mission inclut ${rencontres.length} jour(s) ferie(s): ` +
        rencontres
          .map(
            (r) => `${r.date.toISOString().slice(0, 10)} (${r.libelle})`
          )
          .join(", "),
      rencontres
    );
  }
}

/**
 * Variante NON bloquante de verifierAucunJourFerie, utilisee uniquement pour
 * un precheck en LECTURE SEULE cote frontend (retour immediat, sans lever
 * d'erreur). L'autorite finale reste verifierAucunJourFerie, appelee dans la
 * transaction de creation/validation.
 */
export async function listerJoursFeriesDansPeriode(
  dateHeureDepart: Date,
  dateHeureRetour: Date
): Promise<JourFerieMatch[]> {
  try {
    await verifierAucunJourFerie(dateHeureDepart, dateHeureRetour);
    return [];
  } catch (e) {
    if (e instanceof BusinessError && e.code === ErrorCodes.JOUR_FERIE) {
      return (e.details as JourFerieMatch[]) ?? [];
    }
    throw e;
  }
}
