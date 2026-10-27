import type { MoyenTransport, OrdreMission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError, ErrorCodes } from "@/lib/errors";
import { resoudreBaremeMission } from "@/lib/echelle";
import { verifierAucunJourFerie } from "@/lib/joursFeries";
import { verifierAucunConflitDates } from "@/lib/conflits";
import {
  calculerOccurrences,
  compterJoursMission,
} from "@/lib/repasDecouchers";
import {
  calculerJoursCumulesAvantMission,
  indexJourCumule,
} from "@/lib/cumulJours";
import { calculerIndemniteKilometrique } from "@/lib/kilometrique";
import { genererNumeroSequenceOM } from "@/lib/numerotation";
import { exerciceEconomiqueActif } from "@/lib/exerciceEconomique";

export interface CreerOrdreMissionInput {
  employeId: string;
  objetMission: string;
  villeDepart: string;
  villeArrivee: string;
  dateHeureDepart: Date;
  dateHeureRetour: Date;
  moyenTransport: MoyenTransport;
  vehiculeMatricule?: string;
  vehiculePuissanceFiscale?: number;
  createdBy?: string;
}

export interface CalculIndemniteMission {
  bareme: {
    code: string;
    tauxJour1a15: number;
    tauxJour16Plus: number;
  };
  echelleResolue: number | null;
  indiceUtilise: number | null;
  joursCumulesAvantMission: number;
  nbJoursMission: number;
  nbRepasMidi: number;
  nbRepasSoir: number;
  nbDecouchers: number;
  montantIndemniteMission: number;
}

/**
 * Calcule l'indemnite de mission (repas midi / repas soir / decoucher) en
 * tenant compte du cumul historique agent+localite (seuil 15/16 jours).
 * Doit etre appele avec un client de transaction pour la coherence du
 * cumul en cas de creations concurrentes.
 */
export async function calculerIndemniteMission(
  tx: Parameters<typeof calculerJoursCumulesAvantMission>[0],
  employeId: string,
  villeArrivee: string,
  dateHeureDepart: Date,
  dateHeureRetour: Date,
  excludeOrdreMissionId?: string
): Promise<CalculIndemniteMission> {
  const employe = await tx.employe.findUnique({ where: { id: employeId } });
  if (!employe) {
    throw new BusinessError(
      ErrorCodes.EMPLOYE_INTROUVABLE,
      `Employe ${employeId} introuvable.`
    );
  }

  const { bareme, echelleResolue, indiceUtilise } = await resoudreBaremeMission(
    employe
  );

  const joursCumulesAvantMission = await calculerJoursCumulesAvantMission(
    tx,
    employeId,
    villeArrivee,
    excludeOrdreMissionId
  );

  const occurrences = calculerOccurrences(dateHeureDepart, dateHeureRetour);

  let montantIndemniteMission = 0;
  let nbRepasMidi = 0;
  let nbRepasSoir = 0;
  let nbDecouchers = 0;

  for (const occ of occurrences) {
    const { utiliseTauxReduit } = indexJourCumule(
      occ.indexJourMission,
      joursCumulesAvantMission
    );
    const taux = utiliseTauxReduit ? bareme.tauxJour16Plus : bareme.tauxJour1a15;
    montantIndemniteMission += taux;

    if (occ.type === "REPAS_MIDI") nbRepasMidi += 1;
    else if (occ.type === "REPAS_SOIR") nbRepasSoir += 1;
    else nbDecouchers += 1;
  }

  return {
    bareme: {
      code: bareme.code,
      tauxJour1a15: bareme.tauxJour1a15,
      tauxJour16Plus: bareme.tauxJour16Plus,
    },
    echelleResolue,
    indiceUtilise,
    joursCumulesAvantMission,
    nbJoursMission: compterJoursMission(dateHeureDepart, dateHeureRetour),
    nbRepasMidi,
    nbRepasSoir,
    nbDecouchers,
    montantIndemniteMission,
  };
}

/**
 * Cree un Ordre de Mission de bout en bout : validations (conflits, jours
 * feries), calcul du bareme et des indemnites (mission + kilometrique le
 * cas echeant), snapshot financier, numerotation atomique, et journalisation
 * dans l'historique. Le frontend n'est jamais la source de verite pour les
 * montants : tout est recalcule ici.
 */
export async function creerOrdreMission(
  input: CreerOrdreMissionInput
): Promise<OrdreMission> {
  // Verification jours feries (lecture seule, hors transaction acceptable)
  await verifierAucunJourFerie(input.dateHeureDepart, input.dateHeureRetour);

  // Exercice economique determine hors transaction pour eviter un timeout.
  const exercice = await exerciceEconomiqueActif();

  return prisma.$transaction(async (tx) => {
    const employe = await tx.employe.findUnique({
      where: { id: input.employeId },
    });
    if (!employe) {
      throw new BusinessError(
        ErrorCodes.EMPLOYE_INTROUVABLE,
        `Employe ${input.employeId} introuvable.`
      );
    }

    // Controle de conflit de dates (dans la transaction => protege contre
    // les creations concurrentes).
    await verifierAucunConflitDates(
      tx,
      input.employeId,
      input.dateHeureDepart,
      input.dateHeureRetour
    );

    // Indemnite de mission (repas / decouchers) - toujours calculee, quel
    // que soit le moyen de transport (regle validee).
    const calculMission = await calculerIndemniteMission(
      tx,
      input.employeId,
      input.villeArrivee,
      input.dateHeureDepart,
      input.dateHeureRetour
    );

    // Indemnite kilometrique - uniquement si voiture personnelle.
    let vehiculeMatriculeSnapshot: string | null = null;
    let vehiculePuissanceFiscaleSnapshot: number | null = null;
    let tauxKmSnapshot: number | null = null;
    let kilometrageSnapshot: number | null = null;
    let montantKilometriqueSnapshot: number | null = null;
    let trajetId: string | null = null;

    if (input.moyenTransport === "VOITURE_PERSONNELLE") {
      const matricule = input.vehiculeMatricule ?? employe.vehiculeMatricule;
      const puissance =
        input.vehiculePuissanceFiscale ?? employe.vehiculePuissanceFiscale;

      if (!matricule || !puissance) {
        throw new BusinessError(
          ErrorCodes.VEHICULE_MANQUANT,
          "Matricule et puissance fiscale du vehicule personnel requis pour ce moyen de transport."
        );
      }

      const resultatKm = await calculerIndemniteKilometrique(
        input.villeDepart,
        input.villeArrivee,
        puissance
      );

      vehiculeMatriculeSnapshot = matricule;
      vehiculePuissanceFiscaleSnapshot = puissance;
      tauxKmSnapshot = resultatKm.tauxDhKm;
      kilometrageSnapshot = resultatKm.distanceKm;
      montantKilometriqueSnapshot = resultatKm.montant;
      trajetId = resultatKm.trajetId;
    }

    const montantTotalSnapshot =
      calculMission.montantIndemniteMission +
      (montantKilometriqueSnapshot ?? 0);

    const numeroSequence = await genererNumeroSequenceOM(tx);

    const ordreMission = await tx.ordreMission.create({
      data: {
        numeroSequence,
        anneeEconomique: exercice.annee,
        employeId: input.employeId,
        objetMission: input.objetMission,
        villeDepart: input.villeDepart,
        villeArrivee: input.villeArrivee,
        trajetId,
        dateHeureDepart: input.dateHeureDepart,
        dateHeureRetour: input.dateHeureRetour,
        moyenTransport: input.moyenTransport,
        vehiculeMatriculeSnapshot,
        vehiculePuissanceFiscaleSnapshot,
        tauxKmSnapshot,
        kilometrageSnapshot,
        montantKilometriqueSnapshot,
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
        montantTotalSnapshot,
        statut: "BROUILLON",
        createdBy: input.createdBy,
      },
    });

    await tx.historiqueAction.create({
      data: {
        ordreMissionId: ordreMission.id,
        action: "CREATION",
        auteur: input.createdBy,
        detail: JSON.stringify({
          numeroSequence,
          montantTotalSnapshot,
        }),
      },
    });

    return ordreMission;
  });
}
