import { prisma } from "@/lib/prisma";

export async function reinitialiserDb() {
  await prisma.historiqueAction.deleteMany();
  await prisma.ordreMission.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.employe.deleteMany();
  await prisma.cadreEchelleMapping.deleteMany();
  await prisma.baremeMission.deleteMany();
  await prisma.baremeKilometrique.deleteMany();
  await prisma.trajet.deleteMany();
  await prisma.jourFerie.deleteMany();
}

export async function seedReferentielsMinimal() {
  await prisma.baremeMission.createMany({
    data: [
      {
        code: "INDICE_704",
        libelle: "Indice >= 704",
        priorite: 1,
        indiceMin: 704,
        tauxJour1a15: 100,
        tauxJour16Plus: 80,
      },
      {
        code: "ECHELLE_11",
        libelle: "Echelle 11",
        priorite: 2,
        echelleMin: 11,
        echelleMax: 11,
        tauxJour1a15: 80,
        tauxJour16Plus: 65,
      },
      {
        code: "ECHELLE_8_9_10",
        libelle: "Echelles 8-10",
        priorite: 2,
        echelleMin: 8,
        echelleMax: 10,
        tauxJour1a15: 60,
        tauxJour16Plus: 48,
      },
      {
        code: "ECHELLE_6_7",
        libelle: "Echelles 6-7",
        priorite: 2,
        echelleMin: 6,
        echelleMax: 7,
        tauxJour1a15: 40,
        tauxJour16Plus: 35,
      },
      {
        code: "ECHELLE_1_5",
        libelle: "Echelles 1-5",
        priorite: 2,
        echelleMin: 1,
        echelleMax: 5,
        tauxJour1a15: 30,
        tauxJour16Plus: 24,
      },
    ],
  });

  await prisma.baremeKilometrique.createMany({
    data: [
      { puissanceFiscale: 6, tauxDhKm: 1.2 },
      { puissanceFiscale: 7, tauxDhKm: 1.75 },
      { puissanceFiscale: 8, tauxDhKm: 1.75 },
      { puissanceFiscale: 9, tauxDhKm: 1.75 },
      { puissanceFiscale: 10, tauxDhKm: 2.3 },
      { puissanceFiscale: 11, tauxDhKm: 2.3 },
    ],
  });

  // distanceKm = aller-retour total (confirme par l'historique reel).
  await prisma.trajet.create({
    data: { villeDepart: "Tanger", villeArrivee: "Rabat", distanceKm: 556 },
  });

  await prisma.cadreEchelleMapping.create({
    data: { cadre: "TECHNICIEN", type: "ADMINISTRATIF", echelle: 8 },
  });
}

export async function creerEmployeTest(overrides: Partial<{
  matricule: string;
  cadre: string;
  type: "ADMINISTRATIF" | "ENSEIGNANT";
  indice: number | null;
  echelonExceptionnel: boolean;
  vehiculePuissanceFiscale: number | null;
  vehiculeMatricule: string | null;
}> = {}) {
  return prisma.employe.create({
    data: {
      matricule: overrides.matricule ?? "M001",
      nomFr: "Test",
      prenomFr: "Agent",
      type: overrides.type ?? "ADMINISTRATIF",
      cadre: overrides.cadre ?? "TECHNICIEN",
      indice: overrides.indice ?? null,
      echelonExceptionnel: overrides.echelonExceptionnel ?? false,
      vehiculePuissanceFiscale: overrides.vehiculePuissanceFiscale ?? null,
      vehiculeMatricule: overrides.vehiculeMatricule ?? null,
    },
  });
}
