/**
 * Test réel complet : créer un OM avec agent réel, valider, générer documents.
 * Scénario: Tanger → Rabat, 556 km, véhicule personnel 6CV, taux 1.20 DH/km.
 * Vérifie: 556 × 1.20 = 667.20 DH
 */
import { PrismaClient } from "@prisma/client";
import { creerOrdreMission } from "../src/lib/moteurMission";
import { validerOrdreMission } from "../src/lib/statutOM";
import {
  chargerDonneesOM,
  genererOrdreMissionDocx,
  genererEtatSommesDuesDocx,
  genererNomFichierOM,
} from "../src/lib/generationDocx";
import {
  genererEtatKilometriqueXlsx,
  genererNomFichierXlsx,
} from "../src/lib/generationXlsx";
import PizZip from "pizzip";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

function d(iso: string): Date {
  return new Date(iso + "Z");
}

function extraireTexteDocx(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  return zip.file("word/document.xml")!.asText();
}

async function main() {
  console.log("=== TEST RÉEL COMPLET ===\n");

  // 1. Trouver un agent avec indice >= 704
  const agent = await prisma.employe.findFirst({
    where: { indice: { gte: 704 } },
  });
  if (!agent) throw new Error("Aucun agent avec indice >= 704");
  console.log(`Agent: ${agent.nomFr} ${agent.prenomFr} (mat=${agent.matricule}, cadre=${agent.cadre}, indice=${agent.indice})`);

  // 2. Assigner temporairement un véhicule 6CV
  await prisma.employe.update({
    where: { id: agent.id },
    data: { vehiculePuissanceFiscale: 6, vehiculeMatricule: "12345-A-6" },
  });
  console.log("Véhicule assigné: 6CV, matricule=12345-A-6");

  // Use dynamic dates to avoid conflicts with previous test OMs
  const now = new Date();
  const year = now.getFullYear() + 2;
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateDepart = `${year}-${month}-${day}T08:00:00`;
  const dayRetour = String(Math.min(now.getDate() + 2, 28)).padStart(2, "0");
  const dateRetour = `${year}-${month}-${dayRetour}T18:00:00`;

  // 3. Créer l'OM
  const om = await creerOrdreMission({
    employeId: agent.id,
    objetMission: "Réunion de travail au Ministère de l'Enseignement Supérieur",
    villeDepart: "Tanger",
    villeArrivee: "Rabat",
    dateHeureDepart: d(dateDepart),
    dateHeureRetour: d(dateRetour),
    moyenTransport: "VOITURE_PERSONNELLE",
    vehiculeMatricule: "12345-A-6",
    vehiculePuissanceFiscale: 6,
  });
  console.log(`\nOM créé: id=${om.id}, numSeq=${om.numeroSequence}, statut=${om.statut}`);
  console.log(`  Montant total (brouillon): ${om.montantTotalSnapshot}`);
  console.log(`  Kilométrage: ${om.kilometrageSnapshot} km`);
  console.log(`  Taux KM: ${om.tauxKmSnapshot} DH/km`);
  console.log(`  Montant KM: ${om.montantKilometriqueSnapshot} DH`);
  console.log(`  Montant mission: ${om.montantIndemniteMissionSnapshot} DH`);

  // Vérification: 556 × 1.20 = 667.20
  const expectedKm = 556 * 1.20;
  console.log(`\n  Vérification: 556 × 1.20 = ${expectedKm} DH (attendu)`);
  console.log(`  Montant KM snapshot: ${om.montantKilometriqueSnapshot} DH (actuel)`);
  if (Math.abs(om.montantKilometriqueSnapshot! - expectedKm) < 0.01) {
    console.log("  ✅ Montant kilométrique correct");
  } else {
    console.log("  ❌ Montant kilométrique incorrect!");
  }

  // 4. Valider l'OM
  const omValide = await validerOrdreMission(om.id);
  console.log(`\nOM validé: statut=${omValide.statut}`);
  console.log(`  Montant total (validé): ${omValide.montantTotalSnapshot}`);
  console.log(`  Montant mission: ${omValide.montantIndemniteMissionSnapshot}`);
  console.log(`  Montant KM: ${omValide.montantKilometriqueSnapshot}`);
  console.log(`  Kilométrage: ${omValide.kilometrageSnapshot}`);
  console.log(`  Taux KM: ${omValide.tauxKmSnapshot}`);
  console.log(`  Échelle: ${omValide.echelleSnapshot}`);
  console.log(`  Indice: ${omValide.indiceSnapshot}`);
  console.log(`  Catégorie: ${omValide.categorieTauxSnapshot}`);
  console.log(`  Repas midi: ${omValide.nbRepasMidi}, soir: ${omValide.nbRepasSoir}, découchers: ${omValide.nbDecouchers}`);

  // 5. Générer les documents
  const outputDir = path.join(process.cwd(), "_test-output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const donnees = await chargerDonneesOM(om.id);

  // 5a. Ordre de Mission DOCX
  const omBuffer = genererOrdreMissionDocx(donnees);
  const omFilename = genererNomFichierOM(omValide, agent, "OM");
  const omPath = path.join(outputDir, omFilename);
  fs.writeFileSync(omPath, omBuffer);
  console.log(`\n✅ OM DOCX généré: ${omPath} (${omBuffer.length} bytes)`);

  // Vérifier le contenu
  const omText = extraireTexteDocx(omBuffer);
  console.log(`  Contient nom agent: ${omText.includes(agent.nomFr)}`);
  console.log(`  Contient "Ordre de Mission": ${omText.includes("Ordre de Mission")}`);
  console.log(`  Contient "Tanger- Rabat": ${omText.includes("Tanger- Rabat")}`);
  console.log(`  Contient "Voiture Personnelle": ${omText.includes("Voiture Personnelle")}`);

  // 5b. État des Sommes Dues DOCX
  const esdBuffer = genererEtatSommesDuesDocx(donnees);
  const esdFilename = genererNomFichierOM(omValide, agent, "ETAT-SOMMES-DUES");
  const esdPath = path.join(outputDir, esdFilename);
  fs.writeFileSync(esdPath, esdBuffer);
  console.log(`\n✅ État des Sommes Dues DOCX généré: ${esdPath} (${esdBuffer.length} bytes)`);

  const esdText = extraireTexteDocx(esdBuffer);
  console.log(`  Contient "Etat des Sommes Dues": ${esdText.includes("Etat des Sommes Dues")}`);
  console.log(`  Contient nom agent: ${esdText.includes(agent.nomFr)}`);

  // 5c. État Kilométrique XLSX
  const ekBuffer = await genererEtatKilometriqueXlsx(donnees);
  const ekFilename = genererNomFichierXlsx(omValide, agent);
  const ekPath = path.join(outputDir, ekFilename);
  fs.writeFileSync(ekPath, ekBuffer);
  console.log(`\n✅ État Kilométrique XLSX généré: ${ekPath} (${ekBuffer.length} bytes)`);

  // 6. Vérifier le contenu XLSX
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ekPath);
  const sheet = wb.worksheets[0];
  if (sheet) {
    console.log(`\n  XLSX F12 (nom): ${sheet.getCell("F12").value}`);
    console.log(`  XLSX F13 (échelle): ${sheet.getCell("F13").value}`);
    console.log(`  XLSX F15 (fonction): ${sheet.getCell("F15").value}`);
    console.log(`  XLSX F17 (matricule): ${sheet.getCell("F17").value}`);
    console.log(`  XLSX F18 (PF): ${sheet.getCell("F18").value}`);
    console.log(`  XLSX A23 (OM#): ${sheet.getRow(23).getCell(1).value}`);
    console.log(`  XLSX D23 (trajet): ${sheet.getRow(23).getCell(4).value}`);
    console.log(`  XLSX F23 (km): ${sheet.getRow(23).getCell(6).value}`);
    console.log(`  XLSX G23 (taux): ${sheet.getRow(23).getCell(7).value}`);
    console.log(`  XLSX H23 (montant): ${sheet.getRow(23).getCell(8).value}`);
    console.log(`  XLSX H32 (total): ${sheet.getCell("H32").value}`);
    console.log(`  XLSX B35 (lettres): ${sheet.getCell("B35").value}`);
  }

  // 7. Test reproductibilité
  const omBuffer2 = genererOrdreMissionDocx(donnees);
  console.log(`\n=== Reproductibilité ===`);
  console.log(`  OM DOCX identique: ${omBuffer.equals(omBuffer2)}`);

  // 8. Test numéro OM cohérent
  console.log(`\n=== Numéro OM ===`);
  console.log(`  Numéro séquence: ${omValide.numeroSequence}`);
  console.log(`  Numéro officiel: ${omValide.numero}`);
  // Générer un 2e document et vérifier même numéro
  const omBuffer3 = genererOrdreMissionDocx(donnees);
  const omText3 = extraireTexteDocx(omBuffer3);
  const omText1 = extraireTexteDocx(omBuffer);
  console.log(`  Numéro identique entre 2 générations: ${omText1 === omText3}`);

  // 9. Nettoyer: retirer le véhicule de l'agent
  await prisma.employe.update({
    where: { id: agent.id },
    data: { vehiculePuissanceFiscale: null, vehiculeMatricule: null },
  });
  console.log(`\nVéhicule retiré de l'agent (nettoyage)`);

  // 10. Régénérer après nettoyage → snapshot doit être préservé
  const donnees2 = await chargerDonneesOM(om.id);
  console.log(`\n=== Test snapshot véhicule ===`);
  console.log(`  Véhicule PF snapshot: ${donnees2.om.vehiculePuissanceFiscaleSnapshot} (devrait être 6)`);
  console.log(`  Véhicule matricule snapshot: ${donnees2.om.vehiculeMatriculeSnapshot} (devrait être 12345-A-6)`);
  console.log(`  Taux KM snapshot: ${donnees2.om.tauxKmSnapshot} (devrait être 1.20)`);
  console.log(`  Kilométrage snapshot: ${donnees2.om.kilometrageSnapshot} (devrait être 556)`);
  console.log(`  Montant KM snapshot: ${donnees2.om.montantKilometriqueSnapshot} (devrait être 667.20)`);

  await prisma.$disconnect();
  console.log("\n=== TEST RÉEL TERMINÉ ===");
  console.log(`Fichiers générés dans: ${outputDir}`);
}

main().catch((e) => {
  console.error("ERREUR:", e);
  process.exit(1);
});
