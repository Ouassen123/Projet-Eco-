// Erreurs metier centralisees - permettent a l'API de renvoyer un code/message
// coherent au frontend sans dupliquer la logique de validation.

export class BusinessError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "BusinessError";
    this.code = code;
    this.details = details;
  }
}

export const ErrorCodes = {
  CONFLIT_DATES: "CONFLIT_DATES",
  JOUR_FERIE: "JOUR_FERIE",
  MAPPING_ECHELLE_MANQUANT: "MAPPING_ECHELLE_MANQUANT",
  BAREME_MISSION_INTROUVABLE: "BAREME_MISSION_INTROUVABLE",
  TRAJET_INTROUVABLE: "TRAJET_INTROUVABLE",
  BAREME_KM_INTROUVABLE: "BAREME_KM_INTROUVABLE",
  VEHICULE_MANQUANT: "VEHICULE_MANQUANT",
  EMPLOYE_INTROUVABLE: "EMPLOYE_INTROUVABLE",
  STATUT_INVALIDE: "STATUT_INVALIDE",
  TRANSITION_STATUT_INVALIDE: "TRANSITION_STATUT_INVALIDE",
  MODELE_INTROUVABLE: "MODELE_INTROUVABLE",
  MODELE_INVALIDE: "MODELE_INVALIDE",
  TRANSPORT_INCOMPATIBLE: "TRANSPORT_INCOMPATIBLE",
} as const;
