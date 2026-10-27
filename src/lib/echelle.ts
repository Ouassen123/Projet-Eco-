import { prisma } from "@/lib/prisma";
import { BusinessError, ErrorCodes } from "@/lib/errors";
import type { BaremeMission, Employe } from "@prisma/client";

export interface BaremeResolu {
  bareme: BaremeMission;
  echelleResolue: number | null; // null si regle basee sur l'indice (>=704)
  indiceUtilise: number | null;
}

/**
 * Determine le bareme d'indemnite de mission applicable a un employe.
 *
 * Priorite (regles validees) :
 * 1. Si echelonExceptionnel = true -> bareme ECHELLE_11 force (l'exclusion
 *    de la regle indice>=704 s'applique explicitement a ce cas).
 * 2. Sinon si indice >= 704 -> bareme INDICE_704.
 * 3. Sinon resolution via la table de correspondance CadreEchelleMapping
 *    (administrable) pour obtenir l'echelle, puis bareme correspondant.
 */
export async function resoudreBaremeMission(
  employe: Employe
): Promise<BaremeResolu> {
  if (employe.echelonExceptionnel) {
    const bareme = await prisma.baremeMission.findFirst({
      where: { code: "ECHELLE_11", actif: true },
    });
    if (!bareme) {
      throw new BusinessError(
        ErrorCodes.BAREME_MISSION_INTROUVABLE,
        "Bareme ECHELLE_11 introuvable (echelon exceptionnel)."
      );
    }
    return { bareme, echelleResolue: 11, indiceUtilise: employe.indice };
  }

  if (employe.indice !== null && employe.indice >= 704) {
    const bareme = await prisma.baremeMission.findFirst({
      where: { code: "INDICE_704", actif: true },
    });
    if (!bareme) {
      throw new BusinessError(
        ErrorCodes.BAREME_MISSION_INTROUVABLE,
        "Bareme INDICE_704 introuvable."
      );
    }
    return { bareme, echelleResolue: null, indiceUtilise: employe.indice };
  }

  // Cherche d'abord une correspondance specifique au grade (enseignant),
  // sinon une correspondance generique (grade = "", ex: administratif).
  const mapping = await prisma.cadreEchelleMapping.findFirst({
    where: {
      actif: true,
      type: employe.type,
      cadre: employe.cadre,
      OR: [{ grade: employe.grade ?? "" }, { grade: "" }],
    },
    orderBy: { grade: "desc" }, // priorite au mapping le plus specifique (grade non vide)
  });

  if (!mapping) {
    throw new BusinessError(
      ErrorCodes.MAPPING_ECHELLE_MANQUANT,
      `Aucune correspondance CADRE/GRADE -> ECHELLE configuree pour "${employe.cadre}"` +
        (employe.grade ? ` (grade ${employe.grade})` : "") +
        ". Contactez l'administrateur pour configurer cette correspondance."
    );
  }

  const bareme = await prisma.baremeMission.findFirst({
    where: {
      actif: true,
      echelleMin: { lte: mapping.echelle },
      echelleMax: { gte: mapping.echelle },
    },
  });

  if (!bareme) {
    throw new BusinessError(
      ErrorCodes.BAREME_MISSION_INTROUVABLE,
      `Aucun bareme de mission configure pour l'echelle ${mapping.echelle}.`
    );
  }

  return {
    bareme,
    echelleResolue: mapping.echelle,
    indiceUtilise: employe.indice,
  };
}

/**
 * Variante NON bloquante de resoudreBaremeMission, utilisee uniquement pour
 * l'AFFICHAGE (listes/fiches personnel). Ne doit jamais etre utilisee pour
 * un calcul financier - le moteur d'indemnites continue d'utiliser
 * resoudreBaremeMission (qui leve une erreur explicite si la configuration
 * est manquante, comportement volontaire et inchange).
 */
export async function resoudreEchelleAffichage(
  employe: Employe
): Promise<{ echelle: number | null; indiceUtilise: number | null }> {
  try {
    const { echelleResolue, indiceUtilise } = await resoudreBaremeMission(employe);
    return { echelle: echelleResolue, indiceUtilise };
  } catch {
    return { echelle: null, indiceUtilise: employe.indice };
  }
}
