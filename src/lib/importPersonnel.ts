import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { TypePersonnel } from "@prisma/client";

export interface LigneImportResultat {
  matricule: string;
  action: "CREE" | "MAJ" | "ERREUR";
  erreur?: string;
}

export interface ResultatImportPersonnel {
  total: number;
  crees: number;
  misAJour: number;
  erreurs: LigneImportResultat[];
}

interface LigneBrute {
  [key: string]: unknown;
}

function normaliserCle(cle: string): string {
  return cle.trim().toLowerCase().replace(/[\s_-]/g, "");
}

function getChamp(ligne: LigneBrute, ...cles: string[]): unknown {
  const map: Record<string, unknown> = {};
  for (const k of Object.keys(ligne)) {
    map[normaliserCle(k)] = ligne[k];
  }
  for (const c of cles) {
    const v = map[normaliserCle(c)];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function versChaine(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v).trim();
}

function versEntier(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Determine le type de personnel selon le nom de la feuille Excel.
 * Convention du fichier source "PERSONNEL ENS ET ADM" :
 *  - feuille contenant "ADMIN" ou "TECHN" -> ADMINISTRATIF
 *  - feuille contenant "ENSEIGNANT" -> ENSEIGNANT
 */
function determinerTypeDepuisNomFeuille(nomFeuille: string): TypePersonnel | null {
  const nom = nomFeuille.toUpperCase();
  if (nom.includes("ENSEIGNANT")) return "ENSEIGNANT";
  if (nom.includes("ADMIN") || nom.includes("TECHN")) return "ADMINISTRATIF";
  return null;
}

/**
 * Importe le personnel depuis un fichier Excel (buffer). Chaque feuille est
 * traitee independamment ; le type ADMINISTRATIF/ENSEIGNANT est deduit du
 * nom de la feuille. Les lignes sont upsertees par matricule (DOTI).
 */
export async function importerPersonnelDepuisBuffer(
  buffer: Buffer
): Promise<ResultatImportPersonnel> {
  const classeur = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const resultat: ResultatImportPersonnel = {
    total: 0,
    crees: 0,
    misAJour: 0,
    erreurs: [],
  };

  for (const nomFeuille of classeur.SheetNames) {
    const type = determinerTypeDepuisNomFeuille(nomFeuille);
    if (!type) continue; // feuille non reconnue, ignoree

    const feuille = classeur.Sheets[nomFeuille];
    const lignes: LigneBrute[] = XLSX.utils.sheet_to_json(feuille, {
      defval: undefined,
    });

    for (const ligne of lignes) {
      resultat.total += 1;

      const matricule = versChaine(getChamp(ligne, "DOTI"));
      if (!matricule) {
        resultat.erreurs.push({
          matricule: "(inconnu)",
          action: "ERREUR",
          erreur: `Ligne sans matricule (DOTI) dans la feuille "${nomFeuille}".`,
        });
        continue;
      }

      const nomFr = versChaine(getChamp(ligne, "NOM-FR", "NOM"));
      const prenomFr = versChaine(getChamp(ligne, "PRENOM-FR", "prenomfr"));
      const nomAr = versChaine(getChamp(ligne, "NOM-AR", "nomar"));
      const prenomAr = versChaine(getChamp(ligne, "PRENOM-AR", "prenomar"));
      const cadre = versChaine(getChamp(ligne, "CADRE", "cadre"));
      const grade = versChaine(getChamp(ligne, "grade"));
      const echelon = versEntier(getChamp(ligne, "ECHELON", "echelon"));
      const indice = versEntier(getChamp(ligne, "INDICE", "indice"));

      if (!nomFr || !prenomFr || !cadre) {
        resultat.erreurs.push({
          matricule,
          action: "ERREUR",
          erreur: "Nom, prenom ou cadre manquant.",
        });
        continue;
      }

      try {
        const existant = await prisma.employe.findUnique({
          where: { matricule },
        });

        await prisma.employe.upsert({
          where: { matricule },
          update: {
            nomFr,
            prenomFr,
            nomAr,
            prenomAr,
            type,
            cadre,
            grade: grade ?? null,
            echelon: echelon ?? null,
            indice: indice ?? null,
          },
          create: {
            matricule,
            nomFr,
            prenomFr,
            nomAr,
            prenomAr,
            type,
            cadre,
            grade: grade ?? null,
            echelon: echelon ?? null,
            indice: indice ?? null,
          },
        });

        if (existant) {
          resultat.misAJour += 1;
        } else {
          resultat.crees += 1;
        }
      } catch (e) {
        resultat.erreurs.push({
          matricule,
          action: "ERREUR",
          erreur: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  return resultat;
}
