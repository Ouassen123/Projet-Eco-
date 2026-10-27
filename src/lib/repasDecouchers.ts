import { listerJoursCalendaires } from "@/lib/joursFeries";

export type TypeOccurrence = "REPAS_MIDI" | "REPAS_SOIR" | "DECOUCHER";

export interface OccurrenceIndemnite {
  type: TypeOccurrence;
  jour: Date; // jour calendaire (00:00 UTC) auquel se rattache l'occurrence
  indexJourMission: number; // 1-based, position du jour au sein de CETTE mission
}

function fenetreCouverte(
  jour: Date,
  heureDebut: number,
  heureFin: number,
  dateHeureDepart: Date,
  dateHeureRetour: Date
): boolean {
  const debutFenetre = new Date(jour.getTime());
  debutFenetre.setUTCHours(heureDebut, 0, 0, 0);
  const finFenetre = new Date(jour.getTime());
  finFenetre.setUTCHours(heureFin, 0, 0, 0);

  return (
    dateHeureDepart.getTime() <= debutFenetre.getTime() &&
    dateHeureRetour.getTime() >= finFenetre.getTime()
  );
}

/**
 * Calcule toutes les occurrences eligibles de repas midi / repas soir /
 * decoucher pour une mission donnee. Condition stricte validee : l'agent
 * doit couvrir la TOTALITE de chaque fenetre horaire.
 *
 * Fenetres (heures locales, regle validee) :
 *  - Repas midi : 11:00 -> 14:00
 *  - Repas soir : 18:00 -> 21:00
 *  - Decoucher  : 00:00 -> 05:00
 */
export function calculerOccurrences(
  dateHeureDepart: Date,
  dateHeureRetour: Date
): OccurrenceIndemnite[] {
  const jours = listerJoursCalendaires(dateHeureDepart, dateHeureRetour);
  const occurrences: OccurrenceIndemnite[] = [];

  jours.forEach((jour, idx) => {
    const indexJourMission = idx + 1;

    if (fenetreCouverte(jour, 11, 14, dateHeureDepart, dateHeureRetour)) {
      occurrences.push({ type: "REPAS_MIDI", jour, indexJourMission });
    }
    if (fenetreCouverte(jour, 18, 21, dateHeureDepart, dateHeureRetour)) {
      occurrences.push({ type: "REPAS_SOIR", jour, indexJourMission });
    }
    if (fenetreCouverte(jour, 0, 5, dateHeureDepart, dateHeureRetour)) {
      occurrences.push({ type: "DECOUCHER", jour, indexJourMission });
    }
  });

  return occurrences;
}

export function compterJoursMission(
  dateHeureDepart: Date,
  dateHeureRetour: Date
): number {
  return listerJoursCalendaires(dateHeureDepart, dateHeureRetour).length;
}
