import { prisma } from "@/lib/prisma";
import { BusinessError, ErrorCodes } from "@/lib/errors";

export interface ResultatKilometrique {
  trajetId: string;
  distanceKm: number;
  tauxDhKm: number;
  montant: number;
}

/**
 * Resout le trajet configure (referentiel administre) et calcule le montant
 * de l'indemnite kilometrique pour un vehicule personnel.
 *
 * IMPORTANT : Trajet.distanceKm represente la distance ALLER-RETOUR totale
 * (regle validee, confirmee par l'historique reel "Etat des sommes dues" :
 * Tanger-Rabat et Retour = 556 km, Tanger-Tetouan et Retour = 167 km). Le
 * moteur ne multiplie PAS par 2 : la valeur stockee est deja le total a
 * payer en km.
 *
 * Regle validee : un utilisateur normal ne peut pas creer un trajet a la
 * volee -> si absent du referentiel, erreur explicite demandant a
 * l'administrateur de le configurer.
 */
export async function calculerIndemniteKilometrique(
  villeDepart: string,
  villeArrivee: string,
  puissanceFiscale: number
): Promise<ResultatKilometrique> {
  const trajet = await prisma.trajet.findFirst({
    where: {
      actif: true,
      OR: [
        { villeDepart, villeArrivee },
        { villeDepart: villeArrivee, villeArrivee: villeDepart },
      ],
    },
  });

  if (!trajet) {
    throw new BusinessError(
      ErrorCodes.TRAJET_INTROUVABLE,
      `Le trajet "${villeDepart} -> ${villeArrivee}" n'est pas configure. ` +
        "Merci de demander au Service Economique / administrateur de configurer ce trajet."
    );
  }

  const baremeKm = await prisma.baremeKilometrique.findFirst({
    where: { puissanceFiscale, actif: true },
  });

  if (!baremeKm) {
    throw new BusinessError(
      ErrorCodes.BAREME_KM_INTROUVABLE,
      `Aucun taux kilometrique configure pour une puissance fiscale de ${puissanceFiscale} CV.`
    );
  }

  const montant = trajet.distanceKm * baremeKm.tauxDhKm;

  return {
    trajetId: trajet.id,
    distanceKm: trajet.distanceKm,
    tauxDhKm: baremeKm.tauxDhKm,
    montant,
  };
}
