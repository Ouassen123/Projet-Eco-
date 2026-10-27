// Conversion d'un montant numerique en lettres francaises (dirhams / centimes).
// Fonction centralisee cote backend - ne jamais dupliquer cote frontend.

const UNITES = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
];
const DIX_A_SEIZE = [
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];
const DIZAINES = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
];
const TEENS = [
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];

function convertDeuxChiffres(n: number): string {
  if (n < 10) return UNITES[n];
  if (n < 20) return TEENS[n - 10];

  const dizaine = Math.floor(n / 10);
  const unite = n % 10;

  if (dizaine === 7) {
    // 70-79 : soixante-dix .. soixante-dix-neuf
    if (unite === 1) return "soixante et onze";
    return "soixante-" + TEENS[unite];
  }

  if (dizaine === 8) {
    // 80-89 : quatre-vingts .. quatre-vingt-neuf
    if (unite === 0) return "quatre-vingts";
    return "quatre-vingt-" + UNITES[unite];
  }

  if (dizaine === 9) {
    // 90-99 : quatre-vingt-dix .. quatre-vingt-dix-neuf
    return "quatre-vingt-" + TEENS[unite];
  }

  const mot = DIZAINES[dizaine];
  if (unite === 0) return mot;
  if (unite === 1) return mot + " et un";
  return mot + "-" + UNITES[unite];
}

function convertTroisChiffres(n: number): string {
  const centaine = Math.floor(n / 100);
  const reste = n % 100;

  let mot = "";
  if (centaine > 0) {
    mot += centaine === 1 ? "cent" : UNITES[centaine] + " cent";
    if (centaine > 1 && reste === 0) mot += "s";
  }
  if (reste > 0) {
    mot += (mot ? " " : "") + convertDeuxChiffres(reste);
  }
  return mot;
}

function convertEntier(n: number): string {
  if (n === 0) return "zero";

  const groupes = [
    { valeur: 1_000_000_000, mot: "milliard" },
    { valeur: 1_000_000, mot: "million" },
    { valeur: 1_000, mot: "mille" },
  ];

  let reste = n;
  const parts: string[] = [];

  for (const g of groupes) {
    const q = Math.floor(reste / g.valeur);
    if (q > 0) {
      if (g.mot === "mille") {
        parts.push(q === 1 ? "mille" : convertTroisChiffres(q) + " mille");
      } else {
        const motGroupe = convertTroisChiffres(q);
        parts.push(motGroupe + " " + g.mot + (q > 1 ? "s" : ""));
      }
      reste %= g.valeur;
    }
  }

  if (reste > 0) {
    parts.push(convertTroisChiffres(reste));
  }

  return parts.join(" ");
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convertit un montant en dirhams (avec centimes eventuels) en toutes lettres
 * francaises. Exemple: 4870.8 -> "Quatre mille huit cent soixante-dix
 * dirhams et quatre-vingts centimes"
 */
export function convertMontantEnLettres(montant: number): string {
  const arrondi = Math.round(montant * 100) / 100;
  const dirhams = Math.floor(arrondi);
  const centimes = Math.round((arrondi - dirhams) * 100);

  const partDirhams =
    convertEntier(dirhams) + " dirham" + (dirhams > 1 || dirhams === 0 ? "s" : "");

  if (centimes === 0) {
    return capitalizeFirst(partDirhams);
  }

  const partCentimes =
    convertEntier(centimes) + " centime" + (centimes > 1 ? "s" : "");

  return capitalizeFirst(partDirhams + " et " + partCentimes);
}
