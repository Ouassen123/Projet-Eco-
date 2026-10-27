import { describe, it, expect, beforeEach } from "vitest";
import PizZip from "pizzip";
import { prisma } from "@/lib/prisma";
import { creerOrdreMission } from "@/lib/moteurMission";
import { validerOrdreMission } from "@/lib/statutOM";
import { BusinessError } from "@/lib/errors";
import {
  reinitialiserDb,
  seedReferentielsMinimal,
  creerEmployeTest,
} from "@/lib/__tests__/testUtils";
import {
  chargerDonneesOM,
  genererOrdreMissionDocx,
  genererEtatSommesDuesDocx,
  genererNomFichierOM,
} from "@/lib/generationDocx";
import {
  genererEtatKilometriqueXlsx,
  genererNomFichierXlsx,
} from "@/lib/generationXlsx";

function d(iso: string): Date {
  return new Date(iso + "Z");
}

function extraireTexteDocx(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  const docXml = zip.file("word/document.xml");
  if (!docXml) throw new Error("document.xml non trouvé dans le DOCX");
  return docXml.asText();
}

beforeEach(async () => {
  await reinitialiserDb();
  await seedReferentielsMinimal();
});

describe("Génération Ordre de Mission DOCX", () => {
  it("génère un DOCX valide contenant les données de l'agent", async () => {
    const employe = await creerEmployeTest({
      matricule: "M999",
      vehiculePuissanceFiscale: null,
    });
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Réunion stratégique au ministère",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    const donnees = await chargerDonneesOM(om.id);
    const buffer = genererOrdreMissionDocx(donnees);

    expect(buffer.length).toBeGreaterThan(0);
    const texte = extraireTexteDocx(buffer);
    expect(texte).toContain("Test Agent");
    expect(texte).toContain("Réunion stratégique au ministère");
    expect(texte).toContain("Tanger- Rabat et Retour");
    expect(texte).toContain("10/09/2026");
    expect(texte).toContain("Transport Public");
  });

  it("n'affiche pas le matricule pour un transport public", async () => {
    const employe = await creerEmployeTest({
      vehiculeMatricule: "1296116",
      vehiculePuissanceFiscale: 6,
    });
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Test transport public",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    const donnees = await chargerDonneesOM(om.id);
    const buffer = genererOrdreMissionDocx(donnees);
    const texte = extraireTexteDocx(buffer);

    expect(texte).not.toContain("Matricule");
    expect(texte).toContain("Transport Public");
  });

  it("remplace le numéro d'OM dans le document", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Test numérotation",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    const donnees = await chargerDonneesOM(om.id);
    const buffer = genererOrdreMissionDocx(donnees);
    const texte = extraireTexteDocx(buffer);

    expect(texte).toContain("Test numérotation");
    expect(texte).toContain("Transport Public");
  });

  it("génère un fichier reproductible (même contenu pour même OM)", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Test reproductibilité",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    const donnees = await chargerDonneesOM(om.id);
    const buf1 = genererOrdreMissionDocx(donnees);
    const buf2 = genererOrdreMissionDocx(donnees);

    expect(buf1.length).toBe(buf2.length);
    expect(buf1.equals(buf2)).toBe(true);
  });

  it("génère un nom de fichier déterministe", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Test nom fichier",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    const nom = genererNomFichierOM(om, employe, "OM");
    expect(nom).toMatch(/^OM-\d{6}-TEST-AGENT\.docx$/);
  });
});

describe("Génération État des Sommes Dues DOCX", () => {
  it("génère un DOCX avec le montant total pour un OM validé", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission validée",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });
    await validerOrdreMission(om.id);

    const donnees = await chargerDonneesOM(om.id);
    const buffer = genererEtatSommesDuesDocx(donnees);

    expect(buffer.length).toBeGreaterThan(0);
    const texte = extraireTexteDocx(buffer);
    expect(texte).toContain("Test Agent");
    expect(texte).toContain("Etat des Sommes Dues");
  });
});

describe("Génération État Kilométrique XLSX", () => {
  it("génère un XLSX valide pour un OM en voiture personnelle", async () => {
    const employe = await creerEmployeTest({
      vehiculePuissanceFiscale: 6,
      vehiculeMatricule: "12345-A-6",
    });
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission kilométrique",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "VOITURE_PERSONNELLE",
      vehiculeMatricule: "12345-A-6",
      vehiculePuissanceFiscale: 6,
    });
    await validerOrdreMission(om.id);

    const { chargerDonneesOM: chargerKm } = await import("@/lib/generationXlsx");
    const donnees = await chargerKm(om.id);
    const buffer = await genererEtatKilometriqueXlsx(donnees);

    expect(buffer.length).toBeGreaterThan(0);
  });

  it("refuse la génération pour un OM en transport public", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Mission transport public",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    const { chargerDonneesOM: chargerKm } = await import("@/lib/generationXlsx");
    await expect(chargerKm(om.id)).rejects.toThrow(BusinessError);
  });

  it("génère un nom de fichier XLSX déterministe", async () => {
    const employe = await creerEmployeTest({
      vehiculePuissanceFiscale: 6,
      vehiculeMatricule: "12345-A-6",
    });
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Test nom fichier xlsx",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "VOITURE_PERSONNELLE",
      vehiculeMatricule: "12345-A-6",
      vehiculePuissanceFiscale: 6,
    });

    const nom = genererNomFichierXlsx(om, employe);
    expect(nom).toMatch(/^ETAT-KM-\d{6}-TEST-AGENT\.xlsx$/);
  });
});

describe("Utilisation des snapshots financiers", () => {
  it("utilise le montantTotalSnapshot et non un recalcul", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Test snapshot",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });
    const omValide = await validerOrdreMission(om.id);
    const montantSnapshot = omValide.montantTotalSnapshot;

    expect(montantSnapshot).not.toBeNull();
    expect(montantSnapshot).toBeDefined();

    const donnees = await chargerDonneesOM(om.id);
    expect(donnees.om.montantTotalSnapshot).toBe(montantSnapshot);
  });

  it("génère l'état des sommes dues avec le montant en lettres du snapshot", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Test montant lettres",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-12T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });
    await validerOrdreMission(om.id);

    const donnees = await chargerDonneesOM(om.id);
    const buffer = genererEtatSommesDuesDocx(donnees);

    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe("Gestion des erreurs", () => {
  it("lève une erreur si l'OM n'existe pas", async () => {
    await expect(chargerDonneesOM("id-inexistant")).rejects.toThrow(BusinessError);
  });

  it("génère un DOCX même pour un OM avec montant zéro", async () => {
    const employe = await creerEmployeTest();
    const om = await creerOrdreMission({
      employeId: employe.id,
      objetMission: "Montant zéro",
      villeDepart: "Tanger",
      villeArrivee: "Rabat",
      dateHeureDepart: d("2026-09-10T08:00:00"),
      dateHeureRetour: d("2026-09-10T18:00:00"),
      moyenTransport: "TRANSPORT_PUBLIC",
    });

    const donnees = await chargerDonneesOM(om.id);
    const buffer = genererOrdreMissionDocx(donnees);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
