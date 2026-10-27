import PizZip from "pizzip";
import * as path from "path";
import * as fs from "fs";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { prisma } from "@/lib/prisma";
import { BusinessError, ErrorCodes } from "@/lib/errors";
import { convertMontantEnLettres } from "@/lib/montantLettres";
import type { OrdreMission, Employe } from "@prisma/client";
import { formaterDateFr, formaterHeureFr } from "@/lib/dateUtils";

const ZIP_ENTRY_DATE = new Date("2000-01-01T00:00:00.000Z");

function chargerModele(nomFichier: string): Buffer {
  const templatePath = path.join(process.cwd(), "templates", nomFichier);
  if (!fs.existsSync(templatePath)) {
    throw new BusinessError(
      "MODELE_INTROUVABLE",
      `Modèle de document introuvable: ${nomFichier}`
    );
  }
  return fs.readFileSync(templatePath);
}

function remplacerDansDocument(
  docXml: string,
  remplacements: { recherche: string; remplacement: string }[]
): string {
  const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  return docXml.replace(paraRegex, (paraXml) => {
    let result = paraXml;
    for (const { recherche, remplacement } of remplacements) {
      result = remplacerTexteDansParagrapheRegex(result, recherche, remplacement);
    }
    return result;
  });
}

function remplacerTexteDansParagrapheRegex(
  paraXml: string,
  recherche: string,
  remplacement: string
): string {
  const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const matches: { full: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tRegex.exec(paraXml)) !== null) {
    matches.push({ full: m[0], text: decodeXmlEntities(m[1]) });
  }
  if (matches.length === 0) return paraXml;

  const texteConcatene = matches.map((x) => x.text).join("");
  if (!texteConcatene.includes(recherche)) return paraXml;

  const nouveauTexte = texteConcatene.split(recherche).join(remplacement);
  const encoded = encodeXmlEntities(nouveauTexte);

  if (matches.length === 1) {
    return paraXml.replace(
      matches[0].full,
      matches[0].full.replace(matches[0].text, nouveauTexte)
    );
  }

  let result = paraXml;
  result = result.replace(matches[0].full, `<w:t>${encoded}</w:t>`);
  for (let i = 1; i < matches.length; i++) {
    result = result.replace(matches[i].full, "<w:t></w:t>");
  }
  return result;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function encodeXmlEntities(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formaterMoyenTransport(moyen: string): string {
  switch (moyen) {
    case "TRANSPORT_PUBLIC":
      return "Transport Public";
    case "VOITURE_PERSONNELLE":
      return "Voiture Personnelle";
    case "VOITURE_SERVICE":
      return "Voiture de service";
    default:
      return moyen;
  }
}

function formaterMontant(montant: number): string {
  return montant.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formaterNomComplet(employe: Employe): string {
  return `${employe.nomFr} ${employe.prenomFr}`;
}

function formaterFonction(employe: Employe): string {
  const gradeStr = employe.grade ? ` ${employe.grade}` : "";
  return `${employe.cadre}${gradeStr}`;
}

function formaterDatePourDocx(date: Date): string {
  return formaterDateFr(date);
}

function formaterHeurePourDocx(date: Date): string {
  return formaterHeureFr(date);
}

function supprimerBlocMatricule(docXml: string): string {
  return docXml.replace(/<w:p[\s\S]*?Matricule[\s\S]*?<\/w:p>\s*<w:p[\s\S]*?<\/w:p>\s*/g, "");
}

function texteParagraphe(paraXml: string): string {
  const matches = paraXml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) || [];
  return matches.map((m) => m.replace(/<\/?w:t[^>]*>/g, "")).join("").toLowerCase();
}

function reorganiserEnTete(docXml: string): string {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const doc = parser.parseFromString(docXml, "application/xml") as any;
  const body = doc.getElementsByTagName("w:body")[0] as any;
  if (!body) return docXml;

  const signatureMotifs = ["les autorités", "a tanger le", "le doyen"];
  const paragraphs = Array.from(body.getElementsByTagName("w:p")) as any[];
  const aDeplacer: any[] = [];

  for (const p of paragraphs) {
    const texte = Array.from(p.getElementsByTagName("w:t"))
      .map((n: any) => n.textContent ?? "")
      .join("")
      .toLowerCase();

    if (texte.includes("الأمر بمهمة")) {
      p.parentNode?.removeChild(p);
      continue;
    }

    if (signatureMotifs.some((m) => texte.includes(m))) {
      for (const r of Array.from(p.getElementsByTagName("w:r")) as any[]) {
        let rPr = r.getElementsByTagName("w:rPr")[0] as any;
        if (!rPr) {
          rPr = doc.createElementNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "w:rPr"
          );
          r.insertBefore(rPr, r.firstChild);
        }
        if (!Array.from(rPr.getElementsByTagName("w:b")).length) {
          const b = doc.createElementNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "w:b"
          );
          rPr.appendChild(b);
        }
      }

      let pPr = p.getElementsByTagName("w:pPr")[0] as any;
      if (!pPr) {
        pPr = doc.createElementNS(
          "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "w:pPr"
        );
        p.insertBefore(pPr, p.firstChild);
      }
      const spacing = doc.createElementNS(
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        "w:spacing"
      );
      spacing.setAttribute("w:after", "240");
      spacing.setAttribute("w:line", "360");
      spacing.setAttribute("w:lineRule", "auto");
      pPr.appendChild(spacing);

      aDeplacer.push(p);
    }
  }

  for (const p of aDeplacer) {
    p.parentNode?.removeChild(p);
  }

  const sectPr = body.getElementsByTagName("w:sectPr")[0] as any;
  for (const p of aDeplacer) {
    if (sectPr) {
      body.insertBefore(p, sectPr);
    } else {
      body.appendChild(p);
    }
  }

  return serializer.serializeToString(doc);
}

function nettoyerParagraphesVides(docXml: string): string {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const doc = parser.parseFromString(docXml, "application/xml");
  const body = doc.getElementsByTagName("w:body")[0];
  if (!body) return docXml;

  const paragraphs = Array.from(body.getElementsByTagName("w:p"));
  for (const p of paragraphs) {
    const texteVisible = Array.from(p.getElementsByTagName("w:t")).some((n) => (n.textContent ?? "").trim().length > 0);
    const contenuGraphique = p.getElementsByTagName("w:drawing").length > 0 || p.getElementsByTagName("w:object").length > 0;
    if (!texteVisible && !contenuGraphique) {
      p.parentNode?.removeChild(p);
    }
  }

  return serializer.serializeToString(doc);
}

export interface DonneesOrdreMission {
  om: OrdreMission;
  employe: Employe;
}

export async function chargerDonneesOM(
  ordreMissionId: string
): Promise<DonneesOrdreMission> {
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
  return { om, employe: om.employe };
}

export function genererOrdreMissionDocx(
  donnees: DonneesOrdreMission
): Buffer {
  const { om, employe } = donnees;
  const templateBuffer = chargerModele("ordre-mission.docx");

  const zip = new PizZip(templateBuffer);
  const docXml = zip.file("word/document.xml");
  if (!docXml) {
    throw new BusinessError(
      "MODELE_INVALIDE",
      "Structure du modèle DOCX invalide."
    );
  }

  const nomComplet = formaterNomComplet(employe);
  const fonction = formaterFonction(employe);
  const trajet = `${om.villeDepart}- ${om.villeArrivee} et Retour`;
  const dateDepart = formaterDatePourDocx(om.dateHeureDepart);
  const heureDepart = formaterHeurePourDocx(om.dateHeureDepart);
  const dateRetour = formaterDatePourDocx(om.dateHeureRetour);
  const heureRetour = formaterHeurePourDocx(om.dateHeureRetour);
  const moyenTransport = formaterMoyenTransport(om.moyenTransport);
  const numOM = om.numero ?? String(om.numeroSequence);

  const remplacements = [
    { recherche: "AZOUGARH ABDELAZIZ", remplacement: nomComplet },
    { recherche: "Technicien 2\u00e8me Grade", remplacement: fonction },
    { recherche: "Tanger- Rabat et Retour", remplacement: trajet },
    { recherche: "Traitement des r\u00e9clamations concernant la bourse au Minist\u00e8re de l\u2019Ens.Sup", remplacement: om.objetMission },
    { recherche: "19/10/2022 \u00e0 05H00", remplacement: `${dateDepart} \u00e0 ${heureDepart}` },
    { recherche: "20/10/2022 \u00e0 23H00", remplacement: `${dateRetour} \u00e0 ${heureRetour}` },
    { recherche: "Transport Public / Voiture Personnelle / Voiture de service", remplacement: moyenTransport },
    { recherche: "Transport Public", remplacement: moyenTransport },
    { recherche: "N \u00b01", remplacement: `N\u00b0${numOM}` },
    { recherche: "Ordre de Mission", remplacement: `Ordre de Mission N\u00b0${numOM}` },
    { recherche: "Matricule\u00a0: ", remplacement: `Matricule\u00a0: ${employe.matricule}` },
    { recherche: "18/10/2022", remplacement: formaterDatePourDocx(new Date()) },
  ];

  let nouveauDocXml = remplacerDansDocument(
    docXml.asText(),
    remplacements
  );

  nouveauDocXml = reorganiserEnTete(nouveauDocXml);

  if (om.moyenTransport === "TRANSPORT_PUBLIC") {
    nouveauDocXml = supprimerBlocMatricule(nouveauDocXml);
  }

  nouveauDocXml = nettoyerParagraphesVides(nouveauDocXml);

  zip.file("word/document.xml", nouveauDocXml, { date: ZIP_ENTRY_DATE });

  return zip.generate({ type: "nodebuffer" });
}

export function genererEtatSommesDuesDocx(
  donnees: DonneesOrdreMission
): Buffer {
  const { om, employe } = donnees;
  const templateBuffer = chargerModele("ordre-mission.docx");

  const zip = new PizZip(templateBuffer);
  const docXml = zip.file("word/document.xml");
  if (!docXml) {
    throw new BusinessError(
      "MODELE_INVALIDE",
      "Structure du modèle DOCX invalide."
    );
  }

  const nomComplet = formaterNomComplet(employe);
  const fonction = formaterFonction(employe);
  const trajet = `${om.villeDepart}- ${om.villeArrivee} et Retour`;
  const dateDepart = formaterDatePourDocx(om.dateHeureDepart);
  const heureDepart = formaterHeurePourDocx(om.dateHeureDepart);
  const dateRetour = formaterDatePourDocx(om.dateHeureRetour);
  const heureRetour = formaterHeurePourDocx(om.dateHeureRetour);
  const moyenTransport = formaterMoyenTransport(om.moyenTransport);
  const numOM = om.numero ?? String(om.numeroSequence);
  const montantTotal = om.montantTotalSnapshot ?? 0;
  const montantEnLettres = convertMontantEnLettres(montantTotal);

  const remplacements = [
    { recherche: "AZOUGARH ABDELAZIZ", remplacement: nomComplet },
    { recherche: "Technicien 2\u00e8me Grade", remplacement: fonction },
    { recherche: "Tanger- Rabat et Retour", remplacement: trajet },
    { recherche: "Traitement des r\u00e9clamations concernant la bourse au Minist\u00e8re de l\u2019Ens.Sup", remplacement: om.objetMission },
    { recherche: "19/10/2022 \u00e0 05H00", remplacement: `${dateDepart} \u00e0 ${heureDepart}` },
    { recherche: "20/10/2022 \u00e0 23H00", remplacement: `${dateRetour} \u00e0 ${heureRetour}` },
    { recherche: "Transport Public / Voiture Personnelle / Voiture de service", remplacement: moyenTransport },
    { recherche: "Transport Public", remplacement: moyenTransport },
    { recherche: "N \u00b01", remplacement: `N\u00b0${numOM}` },
    { recherche: "Ordre de Mission", remplacement: "Etat des Sommes Dues" },
    { recherche: "\u0627\u0644\u0627\u0645\u0631 \u0628\u0645\u0647\u0645\u0629", remplacement: "Etat des Sommes Dues" },
    { recherche: "Matricule\u00a0: ", remplacement: `Matricule\u00a0: ${employe.matricule}    -    Montant total : ${formaterMontant(montantTotal)} DH    -    ${montantEnLettres}` },
    { recherche: "18/10/2022", remplacement: formaterDatePourDocx(new Date()) },
  ];

  let nouveauDocXml = remplacerDansDocument(
    docXml.asText(),
    remplacements
  );

  if (om.moyenTransport === "TRANSPORT_PUBLIC") {
    nouveauDocXml = supprimerBlocMatricule(nouveauDocXml);
  }

  nouveauDocXml = nettoyerParagraphesVides(nouveauDocXml);

  zip.file("word/document.xml", nouveauDocXml, { date: ZIP_ENTRY_DATE });

  return zip.generate({ type: "nodebuffer" });
}

export function genererNomFichierOM(
  om: OrdreMission,
  employe: Employe,
  prefix: string
): string {
  const numSeq = String(om.numeroSequence).padStart(6, "0");
  const nom = employe.nomFr.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prenom = employe.prenomFr.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return `${prefix}-${numSeq}-${nom}-${prenom}.docx`;
}
