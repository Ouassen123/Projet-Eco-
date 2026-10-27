// Utilitaires de date/heure cote FRONTEND.
//
// CONVENTION CRITIQUE (doit rester coherente avec le backend, voir
// src/lib/joursFeries.ts et les tests d'integration) : toutes les dates de
// mission sont des horaires "naifs" (sans fuseau) stockees en utilisant les
// getters/heures UTC comme si elles etaient l'heure locale de l'agent. Il ne
// faut JAMAIS utiliser toLocaleDateString/toLocaleTimeString ou les getters
// locaux (getHours, getDate...) qui appliqueraient le fuseau du navigateur
// et decaleraient l'affichage. On utilise systematiquement les getters UTC.

/** Combine une date (YYYY-MM-DD) et une heure (HH:mm) d'un formulaire en ISO "naif" (suffixe Z). */
export function combinerDateHeureEnIso(date: string, heure: string): string {
  const h = heure && heure.length > 0 ? heure : "00:00";
  return `${date}T${h}:00.000Z`;
}

/** Extrait la partie date (YYYY-MM-DD) d'une Date/ISO pour un input[type=date], en UTC. */
export function versValeurInputDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Extrait la partie heure (HH:mm) d'une Date/ISO pour un input[type=time], en UTC. */
export function versValeurInputHeure(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Formate une date en JJ/MM/AAAA (UTC). */
export function formaterDateFr(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const jj = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const aaaa = d.getUTCFullYear();
  return `${jj}/${mm}/${aaaa}`;
}

/** Formate une heure en HH:mm (UTC). */
export function formaterHeureFr(date: string | Date): string {
  return versValeurInputHeure(date);
}

/** Formate date + heure : "JJ/MM/AAAA a HH:mm". */
export function formaterDateHeureFr(date: string | Date): string {
  return `${formaterDateFr(date)} à ${formaterHeureFr(date)}`;
}

const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Formate une date en "lundi 5 janvier 2026" (UTC). */
export function formaterDateLongueFr(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const jourSemaine = JOURS_FR[d.getUTCDay()];
  const jour = d.getUTCDate();
  const mois = MOIS_FR[d.getUTCMonth()];
  const annee = d.getUTCFullYear();
  return `${jourSemaine} ${jour} ${mois} ${annee}`;
}

export function moisEtAnneeFr(date: Date): string {
  return `${MOIS_FR[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Cle jour stable AAAA-MM-JJ (UTC) pour regrouper des evenements par jour. */
export function cleJourUtc(date: string | Date): string {
  return versValeurInputDate(date);
}

/** Formate un montant en dirhams avec separateur de milliers "espace" et 2 decimales. */
export function formaterMontant(montant: number | null | undefined): string {
  if (montant === null || montant === undefined) return "-";
  return (
    montant.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " DH"
  );
}

/** true si la date de retour est strictement posterieure a la date de depart. */
export function periodeValide(depart: string, retour: string): boolean {
  return new Date(retour).getTime() > new Date(depart).getTime();
}
