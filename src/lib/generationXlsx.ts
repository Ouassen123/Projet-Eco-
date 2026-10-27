import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { BusinessError, ErrorCodes } from "@/lib/errors";
import { convertMontantEnLettres } from "@/lib/montantLettres";
import type { OrdreMission, Employe } from "@prisma/client";
import { formaterDateFr } from "@/lib/dateUtils";
import * as path from "path";
import * as fs from "fs";

function chargerModeleXlsx(nomFichier: string): string {
  const templatePath = path.join(process.cwd(), "templates", nomFichier);
  if (!fs.existsSync(templatePath)) {
    throw new BusinessError(
      "MODELE_INTROUVABLE",
      `Modèle de document introuvable: ${nomFichier}`
    );
  }
  return templatePath;
}

function formaterNomComplet(employe: Employe): string {
  return `M.${employe.nomFr} ${employe.prenomFr}`;
}

function formaterFonction(employe: Employe): string {
  const gradeStr = employe.grade ? ` ${employe.grade}` : "";
  return `${employe.cadre}${gradeStr}`;
}

function formaterPuissanceFiscale(pf: number | null | undefined): string {
  if (!pf) return "";
  return `${pf}CV`;
}

function formaterEchelle(echelle: number | null | undefined): string {
  if (!echelle) return "";
  const echelles: Record<number, string> = {
    1: "A", 2: "B", 3: "C", 4: "D", 5: "E",
    6: "F", 7: "G", 8: "H", 9: "I", 10: "J", 11: "K",
  };
  return echelles[echelle] ?? `Ech${echelle}`;
}

function excelDateSerial(date: Date): number {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const diffMs = date.getTime() - epoch.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface DonneesEtatKilometrique {
  om: OrdreMission;
  employe: Employe;
}

export async function chargerDonneesOM(
  ordreMissionId: string
): Promise<DonneesEtatKilometrique> {
  const om = await prisma.ordreMission.findUnique({
    where: { id: ordreMissionId },
    include: { employe: true },
  });
  if (!om) {
    throw new BusinessError(
      ErrorCodes.EMPLOYE_INTROUVABLE,
      `Ordre de mission ${ordreMissionId} introuvable.`
    );
  }
  if (om.moyenTransport !== "VOITURE_PERSONNELLE") {
    throw new BusinessError(
      "TRANSPORT_INCOMPATIBLE",
      "L'état kilométrique n'est applicable qu'aux missions en voiture personnelle."
    );
  }
  return { om, employe: om.employe };
}

export async function genererEtatKilometriqueXlsx(
  donnees: DonneesEtatKilometrique
): Promise<Buffer> {
  const { om, employe } = donnees;

  if (om.moyenTransport !== "VOITURE_PERSONNELLE") {
    throw new BusinessError(
      "TRANSPORT_INCOMPATIBLE",
      "L'\u00e9tat kilom\u00e9trique ne peut \u00eatre g\u00e9n\u00e9r\u00e9 que pour une mission en voiture personnelle."
    );
  }

  const templatePath = chargerModeleXlsx("etat-kilometrique.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new BusinessError(
      "MODELE_INVALIDE",
      "Structure du modèle XLSX invalide."
    );
  }

  const nomComplet = formaterNomComplet(employe);
  const fonction = formaterFonction(employe);
  const echelle = formaterEchelle(om.echelleSnapshot);
  const indice = om.indiceSnapshot ?? employe.indice ?? null;
  const puissanceFiscale = formaterPuissanceFiscale(om.vehiculePuissanceFiscaleSnapshot);
  const matricule = employe.matricule;
  const vehiculeMatricule = om.vehiculeMatriculeSnapshot ?? "";
  const trajet = `${om.villeDepart}-${om.villeArrivee} et Retour`;
  const distanceKm = om.kilometrageSnapshot ?? 0;
  const tauxKm = om.tauxKmSnapshot ?? 0;
  const montantKm = om.montantKilometriqueSnapshot ?? 0;
  const montantTotal = om.montantTotalSnapshot ?? 0;
  const montantEnLettres = convertMontantEnLettres(montantTotal);
  const dateDepartSerial = excelDateSerial(om.dateHeureDepart);
  const dateRetourSerial = excelDateSerial(om.dateHeureRetour);

  // F12: Nom complet
  const cellF12 = sheet.getCell("F12");
  cellF12.value = nomComplet;

  // F13: Echelle
  const cellF13 = sheet.getCell("F13");
  cellF13.value = echelle;

  // F14: Indice (D14:E14 is label "Indice", F14:G14 is value)
  if (indice !== null) {
    const cellF14 = sheet.getCell("F14");
    cellF14.value = indice;
  }

  // F15: Fonction
  const cellF15 = sheet.getCell("F15");
  cellF15.value = fonction;

  // F16: Voiture Personnelle (immatriculation)
  const cellF16 = sheet.getCell("F16");
  cellF16.value = vehiculeMatricule;

  // F17: Matricule
  const cellF17 = sheet.getCell("F17");
  cellF17.value = matricule;

  // F18: Puissance fiscale
  const cellF18 = sheet.getCell("F18");
  cellF18.value = puissanceFiscale;

  // Row 23: Data row for this mission
  // A23: OM number, B23: date depart, C23: date retour, D23: trajet,
  // E23: moyen transport, F23: km, G23: taux, H23: montant
  const row23 = sheet.getRow(23);
  row23.getCell(1).value = om.numero ?? om.numeroSequence;
  row23.getCell(2).value = dateDepartSerial;
  row23.getCell(2).numFmt = "DD/MM/YYYY";
  row23.getCell(3).value = dateRetourSerial;
  row23.getCell(3).numFmt = "DD/MM/YYYY";
  row23.getCell(4).value = trajet;
  row23.getCell(5).value = "Voiture Personnelle";
  row23.getCell(6).value = distanceKm;
  row23.getCell(7).value = tauxKm;
  row23.getCell(8).value = montantKm;
  row23.getCell(8).numFmt = '#,##0.00';

  // Clear rows 24-30 (extra data rows from template)
  for (let r = 24; r <= 30; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= 8; c++) {
      row.getCell(c).value = null;
    }
  }

  // B32:G32 merged - Total label stays, H32: total amount
  const cellH32 = sheet.getCell("H32");
  cellH32.value = montantTotal;
  cellH32.numFmt = '#,##0.00';

  // B35: Amount in letters
  const cellB35 = sheet.getCell("B35");
  cellB35.value = `# ${montantEnLettres} #`;

  // G36: Date
  const cellG36 = sheet.getCell("G36");
  cellG36.value = `Tanger le : ${formaterDateFr(new Date())}`;

  // H46: CIN
  const cellH46 = sheet.getCell("H46");
  cellH46.value = `CIN N° : ${employe.matricule}`;

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function genererNomFichierXlsx(
  om: OrdreMission,
  employe: Employe
): string {
  const numSeq = String(om.numeroSequence).padStart(6, "0");
  const nom = employe.nomFr.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prenom = employe.prenomFr.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return `ETAT-KM-${numSeq}-${nom}-${prenom}.xlsx`;
}
