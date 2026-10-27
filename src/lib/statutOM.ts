import type { OrdreMission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError, ErrorCodes } from "@/lib/errors";
import { verifierAucunJourFerie } from "@/lib/joursFeries";
import { verifierAucunConflitDates } from "@/lib/conflits";
import { calculerIndemniteMission } from "@/lib/moteurMission";
import { calculerIndemniteKilometrique } from "@/lib/kilometrique";

// Machine a etats stricte (regle validee) - aucune autre transition autorisee.
const TRANSITIONS_AUTORISEES: Record<string, string[]> = {
  BROUILLON: ["VALIDE"],
  VALIDE: ["PAYE", "ANNULE"],
  ANNULE: [],
  PAYE: [],
};

function verifierTransition(statutActuel: string, statutCible: string) {
  const autorisees = TRANSITIONS_AUTORISEES[statutActuel] ?? [];
  if (!autorisees.includes(statutCible)) {
    throw new BusinessError(
      ErrorCodes.TRANSITION_STATUT_INVALIDE,
      `Transition ${statutActuel} -> ${statutCible} non autorisee.`
    );
  }
}

/**
 * Valide un Ordre de Mission (BROUILLON -> VALIDE).
 * Recalcule et verrouille integralement le snapshot financier (rule 12) :
 * une modification future des baremes ne doit jamais impacter cet OM.
 * Re-verifie conflits/jours feries au cas ou l'etat aurait change depuis la
 * creation du brouillon.
 */
export async function validerOrdreMission(
  ordreMissionId: string,
  auteur?: string
): Promise<OrdreMission> {
  return prisma.$transaction(async (tx) => {
    const om = await tx.ordreMission.findUnique({
      where: { id: ordreMissionId },
    });
    if (!om) {
      throw new BusinessError(
        ErrorCodes.EMPLOYE_INTROUVABLE,
        `Ordre de mission ${ordreMissionId} introuvable.`
      );
    }
    verifierTransition(om.statut, "VALIDE");

    await verifierAucunJourFerie(om.dateHeureDepart, om.dateHeureRetour);
    await verifierAucunConflitDates(
      tx,
      om.employeId,
      om.dateHeureDepart,
      om.dateHeureRetour,
      om.id
    );

    const calculMission = await calculerIndemniteMission(
      tx,
      om.employeId,
      om.villeArrivee,
      om.dateHeureDepart,
      om.dateHeureRetour,
      om.id
    );

    let montantKilometriqueSnapshot = om.montantKilometriqueSnapshot;
    let tauxKmSnapshot = om.tauxKmSnapshot;
    let kilometrageSnapshot = om.kilometrageSnapshot;
    let trajetId = om.trajetId;

    if (om.moyenTransport === "VOITURE_PERSONNELLE") {
      if (!om.vehiculePuissanceFiscaleSnapshot) {
        throw new BusinessError(
          ErrorCodes.VEHICULE_MANQUANT,
          "Puissance fiscale du vehicule manquante sur cet OM."
        );
      }
      const resultatKm = await calculerIndemniteKilometrique(
        om.villeDepart,
        om.villeArrivee,
        om.vehiculePuissanceFiscaleSnapshot
      );
      tauxKmSnapshot = resultatKm.tauxDhKm;
      kilometrageSnapshot = resultatKm.distanceKm;
      montantKilometriqueSnapshot = resultatKm.montant;
      trajetId = resultatKm.trajetId;
    }

    const montantTotalSnapshot =
      calculMission.montantIndemniteMission + (montantKilometriqueSnapshot ?? 0);

    const updated = await tx.ordreMission.update({
      where: { id: ordreMissionId },
      data: {
        statut: "VALIDE",
        validatedAt: new Date(),
        echelleSnapshot: calculMission.echelleResolue,
        indiceSnapshot: calculMission.indiceUtilise,
        categorieTauxSnapshot: calculMission.bareme.code,
        tauxJour1a15Snapshot: calculMission.bareme.tauxJour1a15,
        tauxJour16PlusSnapshot: calculMission.bareme.tauxJour16Plus,
        nbJoursCumulesAvantMission: calculMission.joursCumulesAvantMission,
        nbRepasMidi: calculMission.nbRepasMidi,
        nbRepasSoir: calculMission.nbRepasSoir,
        nbDecouchers: calculMission.nbDecouchers,
        montantIndemniteMissionSnapshot: calculMission.montantIndemniteMission,
        tauxKmSnapshot,
        kilometrageSnapshot,
        montantKilometriqueSnapshot,
        trajetId,
        montantTotalSnapshot,
      },
    });

    await tx.historiqueAction.create({
      data: {
        ordreMissionId: om.id,
        action: "VALIDATION",
        auteur,
        detail: JSON.stringify({ montantTotalSnapshot }),
      },
    });

    return updated;
  });
}

export async function annulerOrdreMission(
  ordreMissionId: string,
  auteur?: string,
  motif?: string
): Promise<OrdreMission> {
  return prisma.$transaction(async (tx) => {
    const om = await tx.ordreMission.findUnique({
      where: { id: ordreMissionId },
    });
    if (!om) {
      throw new BusinessError(
        ErrorCodes.EMPLOYE_INTROUVABLE,
        `Ordre de mission ${ordreMissionId} introuvable.`
      );
    }
    verifierTransition(om.statut, "ANNULE");

    const updated = await tx.ordreMission.update({
      where: { id: ordreMissionId },
      data: { statut: "ANNULE", canceledAt: new Date() },
    });

    await tx.historiqueAction.create({
      data: {
        ordreMissionId: om.id,
        action: "ANNULATION",
        auteur,
        detail: motif,
      },
    });

    return updated;
  });
}

export async function payerOrdreMission(
  ordreMissionId: string,
  auteur?: string
): Promise<OrdreMission> {
  return prisma.$transaction(async (tx) => {
    const om = await tx.ordreMission.findUnique({
      where: { id: ordreMissionId },
    });
    if (!om) {
      throw new BusinessError(
        ErrorCodes.EMPLOYE_INTROUVABLE,
        `Ordre de mission ${ordreMissionId} introuvable.`
      );
    }
    verifierTransition(om.statut, "PAYE");

    const updated = await tx.ordreMission.update({
      where: { id: ordreMissionId },
      data: { statut: "PAYE", paidAt: new Date() },
    });

    await tx.historiqueAction.create({
      data: {
        ordreMissionId: om.id,
        action: "PAIEMENT",
        auteur,
      },
    });

    return updated;
  });
}
