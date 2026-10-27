import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";
import { exerciceEconomiqueActif } from "@/lib/exerciceEconomique";

// Agregation en lecture seule pour le tableau de bord. Ne recalcule AUCUN
// montant : se contente de sommer les snapshots deja verrouilles par le
// moteur metier (src/lib/moteurMission.ts, src/lib/statutOM.ts).
export async function GET(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const { searchParams } = new URL(request.url);
    const moisParam = searchParams.get("mois"); // format YYYY-MM, optionnel

    const maintenant = new Date();
    const [anneeCalendrier, mois] = moisParam
      ? moisParam.split("-").map(Number)
      : [maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1];
    const anneeExerciceParam = searchParams.get("anneeEconomique");

    const exercice = anneeExerciceParam
      ? await prisma.exerciceEconomique.findUniqueOrThrow({ where: { annee: Number(anneeExerciceParam) } })
      : await exerciceEconomiqueActif();
    const debutMois = new Date(Date.UTC(anneeCalendrier, mois - 1, 1));
    const finMois = new Date(Date.UTC(anneeCalendrier, mois, 1));

    const baseWhere = { anneeEconomique: exercice.annee };

    const [
      nbOMCeMois,
      nbBrouillon,
      nbValide,
      nbPaye,
      nbAnnule,
      agregatMission,
      agregatKm,
      enDeplacement,
    ] = await Promise.all([
      prisma.ordreMission.count({
        where: {
          ...baseWhere,
          dateHeureDepart: { gte: debutMois, lt: finMois },
        },
      }),
      prisma.ordreMission.count({ where: { ...baseWhere, statut: "BROUILLON" } }),
      prisma.ordreMission.count({ where: { ...baseWhere, statut: "VALIDE" } }),
      prisma.ordreMission.count({ where: { ...baseWhere, statut: "PAYE" } }),
      prisma.ordreMission.count({ where: { ...baseWhere, statut: "ANNULE" } }),
      prisma.ordreMission.aggregate({
        where: {
          ...baseWhere,
          dateHeureDepart: { gte: debutMois, lt: finMois },
          statut: { in: ["VALIDE", "PAYE"] },
        },
        _sum: { montantIndemniteMissionSnapshot: true },
      }),
      prisma.ordreMission.aggregate({
        where: {
          ...baseWhere,
          dateHeureDepart: { gte: debutMois, lt: finMois },
          statut: { in: ["VALIDE", "PAYE"] },
        },
        _sum: { montantKilometriqueSnapshot: true },
      }),
      prisma.ordreMission.findMany({
        where: {
          ...baseWhere,
          statut: { in: ["VALIDE", "PAYE"] },
          dateHeureDepart: { lte: maintenant },
          dateHeureRetour: { gte: maintenant },
        },
        select: { employeId: true },
        distinct: ["employeId"],
      }),
    ]);

    return NextResponse.json({
      periode: { annee: anneeCalendrier, mois, exerciceEconomique: exercice.annee },
      nbOMCeMois,
      nbBrouillon,
      nbValide,
      nbPaye,
      nbAnnule,
      nbPersonnesEnDeplacement: enDeplacement.length,
      totalIndemnitesMission: agregatMission._sum.montantIndemniteMissionSnapshot ?? 0,
      totalIndemnitesKilometrique: agregatKm._sum.montantKilometriqueSnapshot ?? 0,
    });
  } catch (e) {
    return gererErreurApi(e);
  }
}
