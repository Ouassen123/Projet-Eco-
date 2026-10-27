import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UTILISATEURS_PAR_DEFAUT } from "../src/lib/defaultUsers";
import {
  initialiserExercicesEconomiques,
  associerAnneeEconomiqueParDefaut,
} from "../src/lib/exerciceEconomique";

const prisma = new PrismaClient();

async function main() {
  // -------------------------------------------------------------------------
  // BAREME INDEMNITE DE MISSION (Indemnite Deplacement.docx)
  // -------------------------------------------------------------------------
  const baremesMission = [
    {
      code: "INDICE_704",
      libelle:
        "Indice hierarchique >= 704 (hors echelon exceptionnel echelle 11)",
      priorite: 1,
      indiceMin: 704,
      echelleMin: null,
      echelleMax: null,
      tauxJour1a15: 100,
      tauxJour16Plus: 80,
      referenceJuridique: "DECISION_962_97",
    },
    {
      code: "ECHELLE_11",
      libelle: "Echelle de remuneration 11",
      priorite: 2,
      indiceMin: null,
      echelleMin: 11,
      echelleMax: 11,
      tauxJour1a15: 80,
      tauxJour16Plus: 65,
      referenceJuridique: "DECISION_962_97",
    },
    {
      code: "ECHELLE_8_9_10",
      libelle: "Echelles de remuneration 8, 9 et 10",
      priorite: 2,
      indiceMin: null,
      echelleMin: 8,
      echelleMax: 10,
      tauxJour1a15: 60,
      tauxJour16Plus: 48,
      referenceJuridique: "DECISION_962_97",
    },
    {
      code: "ECHELLE_6_7",
      libelle: "Echelles de remuneration 6 et 7",
      priorite: 2,
      indiceMin: null,
      echelleMin: 6,
      echelleMax: 7,
      tauxJour1a15: 40,
      tauxJour16Plus: 35,
      referenceJuridique: "DECISION_962_97",
    },
    {
      code: "ECHELLE_1_5",
      libelle: "Echelles de remuneration 1, 2, 3, 4 et 5",
      priorite: 2,
      indiceMin: null,
      echelleMin: 1,
      echelleMax: 5,
      tauxJour1a15: 30,
      tauxJour16Plus: 24,
      referenceJuridique: "DECISION_962_97",
    },
  ];

  for (const b of baremesMission) {
    await prisma.baremeMission.upsert({
      where: { code: b.code },
      update: b,
      create: b,
    });
  }

  // -------------------------------------------------------------------------
  // BAREME INDEMNITE KILOMETRIQUE
  // -------------------------------------------------------------------------
  const baremesKm = [
    { puissanceFiscale: 6, tauxDhKm: 1.2 },
    { puissanceFiscale: 7, tauxDhKm: 1.75 },
    { puissanceFiscale: 8, tauxDhKm: 1.75 },
    { puissanceFiscale: 9, tauxDhKm: 1.75 },
    { puissanceFiscale: 10, tauxDhKm: 2.3 },
    { puissanceFiscale: 11, tauxDhKm: 2.3 },
  ];

  for (const k of baremesKm) {
    await prisma.baremeKilometrique.upsert({
      where: { puissanceFiscale: k.puissanceFiscale },
      update: {
        tauxDhKm: k.tauxDhKm,
        referenceJuridique: "DECRET_2_97_1052",
      },
      create: {
        puissanceFiscale: k.puissanceFiscale,
        tauxDhKm: k.tauxDhKm,
        referenceJuridique: "DECRET_2_97_1052",
      },
    });
  }

  // -------------------------------------------------------------------------
  // TRAJETS INITIAUX - distanceKm = ALLER-RETOUR TOTAL (regle validee).
  // Tanger-Rabat (556) et Tanger-Tetouan (167) confirmes par l'historique
  // reel "Etat des sommes dues pour indemnite Kilometriques". Les autres
  // sont des estimations (aller simple x2) a verifier/ajuster par
  // l'administrateur.
  // -------------------------------------------------------------------------
  const trajets = [
    { villeDepart: "Tanger", villeArrivee: "Tetouan", distanceKm: 167 },
    { villeDepart: "Tanger", villeArrivee: "Agadir", distanceKm: 1880 },
    { villeDepart: "Tanger", villeArrivee: "Rabat", distanceKm: 556 },
    { villeDepart: "Tanger", villeArrivee: "Marrakech", distanceKm: 1180 },
    { villeDepart: "Tanger", villeArrivee: "Casablanca", distanceKm: 680 },
  ];

  for (const t of trajets) {
    await prisma.trajet.upsert({
      where: {
        villeDepart_villeArrivee: {
          villeDepart: t.villeDepart,
          villeArrivee: t.villeArrivee,
        },
      },
      update: { distanceKm: t.distanceKm },
      create: t,
    });
  }

  // -------------------------------------------------------------------------
  // REFERENCES JURIDIQUES
  // -------------------------------------------------------------------------
  const references = [
    {
      code: "NOMENCLATURE_PJ",
      titre:
        "Nomenclature des pieces justificatives pour le paiement des depenses des etablissements publics",
      texte:
        "Bulletin Officiel N\u00ba 6966 \u2013 20 rejeb 1442 (4-3-2021)",
    },
    {
      code: "DECISION_962_97",
      titre: "Decision relative aux indemnites de deplacement",
      texte: "Decision N\u00b0962.97 du 22 avril 1997 - 14 Dhul Hijja 1417",
    },
    {
      code: "DECRET_2_97_1052",
      titre: "Decret relatif a l'indemnite kilometrique",
      texte:
        "Decret N\u00b0 2.97.1052 du 4 chaoual 1418 (2 fevrier 1998)",
    },
  ];

  for (const r of references) {
    await prisma.referenceJuridique.upsert({
      where: { code: r.code },
      update: r,
      create: r,
    });
  }

  // -------------------------------------------------------------------------
  // CADRE ECHELLE MAPPING (correspondance cadre -> echelle de remuneration)
  // -------------------------------------------------------------------------
  const cadreMappings = [
    { cadre: "ADJOINT ADMINISTRATIF 3EME GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 6 },
    { cadre: "ADJOINT TECHNICIEN 3EME GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 5 },
    { cadre: "ADMINISTRATEUR 1ER GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 11 },
    { cadre: "ADMINISTRATEUR 2EME GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 11 },
    { cadre: "ADMINISTRATEUR 3EME GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 10 },
    { cadre: "INGENIEUR D ETAT 1ER GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 11 },
    { cadre: "INGENIEUR EN CHEF GRADE PRINCIPAL", grade: "", type: "ADMINISTRATIF" as const, echelle: 11 },
    { cadre: "INTENDANT 1ER GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 11 },
    { cadre: "TECHNICIEN DU 1ER GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 10 },
    { cadre: "TECHNICIEN DU 2EME GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 8 },
    { cadre: "TECHNICIEN DU 3EME GRADE", grade: "", type: "ADMINISTRATIF" as const, echelle: 5 },
    { cadre: "PROFESSEUR ENSEIGNEMENT SUPERIEUR", grade: "", type: "ENSEIGNANT" as const, echelle: 11 },
    { cadre: "PROFESSEUR HABILITE", grade: "", type: "ENSEIGNANT" as const, echelle: 11 },
    { cadre: "PROFESSEUR ASSISTANT", grade: "", type: "ENSEIGNANT" as const, echelle: 10 },
  ];

  for (const m of cadreMappings) {
    await prisma.cadreEchelleMapping.upsert({
      where: {
        cadre_grade_type: {
          cadre: m.cadre,
          grade: m.grade,
          type: m.type,
        },
      },
      update: { echelle: m.echelle },
      create: m,
    });
  }

  // -------------------------------------------------------------------------
  // JOURS FERIES FIXES (civils). Les fetes religieuses (lunaires) doivent
  // etre ajoutees chaque annee manuellement via l'administration.
  // -------------------------------------------------------------------------
  const feriesFixes = [
    { mmdd: "01-01", libelle: "Jour de l'An" },
    { mmdd: "01-11", libelle: "Manifeste de l'Independance" },
    { mmdd: "05-01", libelle: "Fete du Travail" },
    { mmdd: "07-30", libelle: "Fete du Trone" },
    { mmdd: "08-14", libelle: "Allegeance Oued Eddahab" },
    { mmdd: "08-20", libelle: "Revolution du Roi et du Peuple" },
    { mmdd: "08-21", libelle: "Fete de la Jeunesse" },
    { mmdd: "11-06", libelle: "Marche Verte" },
    { mmdd: "11-18", libelle: "Fete de l'Independance" },
  ];

  const anneeReference = 2026;
  for (const f of feriesFixes) {
    const [mm, dd] = f.mmdd.split("-").map(Number);
    const date = new Date(Date.UTC(anneeReference, mm - 1, dd));
    const existing = await prisma.jourFerie.findFirst({
      where: { libelle: f.libelle, recurrentAnnuel: true },
    });
    if (!existing) {
      await prisma.jourFerie.create({
        data: {
          date,
          libelle: f.libelle,
          recurrentAnnuel: true,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // UTILISATEURS PAR DEFAUT
  // -------------------------------------------------------------------------
  for (const utilisateur of UTILISATEURS_PAR_DEFAUT) {
    await prisma.utilisateur.upsert({
      where: { login: utilisateur.login },
      update: {
        motDePasse: await bcrypt.hash(utilisateur.motDePasse, 10),
        nomComplet: utilisateur.nomComplet,
        role: utilisateur.role,
        actif: true,
      },
      create: {
        login: utilisateur.login,
        motDePasse: await bcrypt.hash(utilisateur.motDePasse, 10),
        nomComplet: utilisateur.nomComplet,
        role: utilisateur.role,
        actif: true,
      },
    });
  }

  // -------------------------------------------------------------------------
  // EXERCICES ECONOMIQUES
  // -------------------------------------------------------------------------
  await initialiserExercicesEconomiques();
  await associerAnneeEconomiqueParDefaut(2026);

  console.log("Seed termine.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
