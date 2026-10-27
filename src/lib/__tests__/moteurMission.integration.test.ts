import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { creerOrdreMission } from "@/lib/moteurMission";
import { validerOrdreMission, annulerOrdreMission } from "@/lib/statutOM";
import { BusinessError } from "@/lib/errors";
import {
  reinitialiserDb,
  seedReferentielsMinimal,
  creerEmployeTest,
} from "@/lib/__tests__/testUtils";

function d(iso: string): Date {
  return new Date(iso + "Z");
}

beforeEach(async () => {
  await reinitialiserDb();
  await seedReferentielsMinimal();
});

describe("Regle 5 - conflits de dates", () => {
  it("autorise deux missions qui se suivent exactement (fin A == debut B)", async () => {
    const employe = await creerEmployeTest();

    await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission A",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-03T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    const missionB = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission B",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-03T18:00:00"),
      dateHeureRetour: d("2026-09-05T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    expect(missionB.id).toBeDefined();
  });

  it("refuse une mission qui chevauche de 1 minute", async () => {
    const employe = await creerEmployeTest();

    await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission A",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-03T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    await expect(
      creerOrdreMission({
        employeId: employe.id,
        objetMission: "Mission B",
        villeDepart: "Tanger",
        villeArrivee: "Rabat",
        dateHeureDepart: d("2026-09-03T17:59:00"),
        dateHeureRetour: d("2026-09-05T18:00:00"),
        moyenTransport: "TRANSPORT_PUBLIC",
      })
    ).rejects.toThrow(BusinessError);
  });

  it("une mission ANNULEE ne bloque plus une nouvelle mission", async () => {
    const employe = await creerEmployeTest();

    const missionA = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission A",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-03T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });
    // BROUILLON -> annulation directe impossible (regle stricte des
    // transitions : BROUILLON -> VALIDE uniquement). On valide puis annule.
    await validerOrdreMission(missionA.id);
    await annulerOrdreMission(missionA.id);

    const missionB = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission B chevauchante",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-02T08:00:00"),
      dateHeureRetour: d("2026-09-04T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    expect(missionB.id).toBeDefined();
  });
});

describe("Regle 3 - cumul 15/16 jours meme agent + meme localite", () => {
  it("exemple valide : 12 jours historiques + mission de 5 jours -> jours 13-15 taux1, 16-17 taux2", async () => {
    const employe = await creerEmployeTest();

    // Historique : 12 jours deja VALIDES a Rabat.
    const historique = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Historique 12 jours",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-08-01T08:00:00"),
      dateHeureRetour: d("2026-08-12T18:00:00"), // 12 jours calendaires
      moyenTransport: "TRANSPORT_PUBLIC",
    });
    await validerOrdreMission(historique.id);

    // Nouvelle mission de 5 jours, 08:00 -> 18:00 chaque jour (mission
    // continue) : repas midi eligible les 5 jours, repas soir eligible les
    // 4 premiers jours (le dernier jour se termine a 18:00, avant 21:00),
    // decoucher eligible a partir de la 2e nuit (le 1er jour part a 08:00,
    // apres le debut de la fenetre 00:00-05:00).
    const nouvelle = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Nouvelle mission 5 jours",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-05T18:00:00"), // 5 jours calendaires
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    // L'historique (12 jours) est deja VALIDE avant la creation de cette
    // mission -> deja comptabilise, meme pendant que "nouvelle" est encore
    // au statut BROUILLON.
    expect(nouvelle.nbJoursCumulesAvantMission).toBe(12);
    const validee = await validerOrdreMission(nouvelle.id);

    // Au moment de la validation, l'historique (12 jours, VALIDE) est deja
    // comptabilise -> jours 13,14,15 = taux1 (3 jours), jours 16,17 = taux2 (2 jours).
    expect(validee.nbJoursCumulesAvantMission).toBe(12);
    expect(validee.nbRepasMidi).toBe(5);
    expect(validee.nbRepasSoir).toBe(4);
    expect(validee.nbDecouchers).toBe(4);

    // Bareme ECHELLE_8_9_10 (mapping TECHNICIEN -> echelle 8) : taux1=60, taux2=48.
    // Jour1(taux1):midi+soir=120 | Jour2(taux1):midi+soir+decoucher=180 |
    // Jour3(taux1):180 | Jour4(taux2):midi+soir+decoucher=144 |
    // Jour5(taux2):midi+decoucher=96 -> total 720.
    expect(validee.montantIndemniteMissionSnapshot).toBe(720);
  });
});

describe("Regle 1/2 - resolution du bareme (echelle vs indice >= 704)", () => {
  it("priorise indice >= 704 sur l'echelle", async () => {
    const employe = await creerEmployeTest({ indice: 800 });

    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission indice eleve",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-01T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    expect(om.categorieTauxSnapshot).toBe("INDICE_704");
  });

  it("echelon exceptionnel echelle 11 court-circuite la regle indice>=704", async () => {
    const employe = await creerEmployeTest({
      indice: 900,
      echelonExceptionnel: true,
    });

    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission echelon exceptionnel",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-01T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    expect(om.categorieTauxSnapshot).toBe("ECHELLE_11");
    expect(om.echelleSnapshot).toBe(11);
  });

  it("sans indice>=704 ni echelon exceptionnel, utilise la table CADRE->ECHELLE", async () => {
    const employe = await creerEmployeTest({ indice: 300 });

    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission echelle mapping",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-01T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    expect(om.categorieTauxSnapshot).toBe("ECHELLE_8_9_10");
    expect(om.echelleSnapshot).toBe(8);
  });
});

describe("Regle 7 - voiture de service vs personnelle", () => {
  it("voiture de service donne droit aux indemnites mission mais pas au km", async () => {
    const employe = await creerEmployeTest();

    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission voiture de service",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-01T18:00:00"),
      moyenTransport: "VOITURE_SERVICE",
    });

    expect(om.montantIndemniteMissionSnapshot).toBeGreaterThan(0);
    expect(om.montantKilometriqueSnapshot).toBeNull();
  });

  it("voiture personnelle calcule le kilometrique en plus des indemnites", async () => {
    const employe = await creerEmployeTest({
      vehiculeMatricule: "12345-A-6",
      vehiculePuissanceFiscale: 7,
    });

    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission voiture personnelle",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-01T18:00:00"),
      moyenTransport: "VOITURE_PERSONNELLE",
    });

    expect(om.montantKilometriqueSnapshot).toBe(556 * 1.75);
    expect(om.tauxKmSnapshot).toBe(1.75);
    expect(om.kilometrageSnapshot).toBe(556);
  });

  it("rejette la voiture personnelle si le vehicule n'est pas renseigne", async () => {
    const employe = await creerEmployeTest();

    await expect(
      creerOrdreMission({
        employeId: employe.id,
        objetMission: "Mission sans vehicule",
        villeDepart: "Tanger",
        villeArrivee: "Rabat",
        dateHeureDepart: d("2026-09-01T08:00:00"),
        dateHeureRetour: d("2026-09-01T18:00:00"),
        moyenTransport: "VOITURE_PERSONNELLE",
      })
    ).rejects.toThrow(BusinessError);
  });
});

describe("Regle 6 - jours feries", () => {
  it("refuse la creation si un jour de la periode est ferie", async () => {
    await prisma.jourFerie.create({
      data: { date: d("2026-09-02T00:00:00"), libelle: "Test ferie" },
    });
    const employe = await creerEmployeTest();

    await expect(
      creerOrdreMission({
        employeId: employe.id,
        objetMission: "Mission traversant un jour ferie",
        villeDepart: "Tanger",
        villeArrivee: "Rabat",
        dateHeureDepart: d("2026-09-01T08:00:00"),
        dateHeureRetour: d("2026-09-03T18:00:00"),
        moyenTransport: "TRANSPORT_PUBLIC",
      })
    ).rejects.toThrow(BusinessError);
  });
});

describe("Regle 13 - verrouillage financier apres validation", () => {
  it("les transitions invalides sont rejetees", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-01T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    await expect(annulerOrdreMission(om.id)).rejects.toThrow(BusinessError);
  });

  it("une modification du bareme apres validation ne modifie pas l'OM existant", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-01T08:00:00"),
      dateHeureRetour: d("2026-09-01T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });
    const validee = await validerOrdreMission(om.id);
    const montantAvant = validee.montantTotalSnapshot;

    await prisma.baremeMission.update({
      where: { code: "ECHELLE_8_9_10" },
      data: { tauxJour1a15: 9999 },
    });

    const relue = await prisma.ordreMission.findUnique({ where: { id: om.id } });
    expect(relue?.montantTotalSnapshot).toBe(montantAvant);
  });
});
