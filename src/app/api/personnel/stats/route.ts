import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";
import { exerciceEconomiqueActif } from "@/lib/exerciceEconomique";

export async function GET(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;

    const { searchParams } = new URL(request.url);
    const employeId = searchParams.get("employeId");
    const inclureArchives = searchParams.get("toutesAnnees") === "true";
    const anneeExerciceParam = searchParams.get("anneeEconomique");

    const exercice = anneeExerciceParam
      ? await prisma.exerciceEconomique.findUniqueOrThrow({ where: { annee: Number(anneeExerciceParam) } })
      : await exerciceEconomiqueActif();

    const whereBase = {
      anneeEconomique: inclureArchives ? undefined : exercice.annee,
      employeId: employeId ?? undefined,
    };

    const stats = await prisma.ordreMission.groupBy({
      by: ["employeId"],
      where: {
        ...whereBase,
        statut: { in: ["PAYE", "VALIDE"] },
      },
      _count: { id: true },
      _sum: {
        montantTotalSnapshot: true,
        montantIndemniteMissionSnapshot: true,
        montantKilometriqueSnapshot: true,
      },
    });

    const paye = await prisma.ordreMission.groupBy({
      by: ["employeId"],
      where: {
        ...whereBase,
        statut: "PAYE",
      },
      _count: { id: true },
      _sum: {
        montantTotalSnapshot: true,
      },
    });

    const mapPaye = new Map(paye.map((p) => [p.employeId, p]));

    return NextResponse.json({
      exerciceEconomique: exercice.annee,
      stats: stats.map((s) => {
        const p = mapPaye.get(s.employeId);
        return {
          employeId: s.employeId,
          missionsValideesOuPayees: s._count.id,
          totalMissionEtKm: s._sum.montantTotalSnapshot ?? 0,
          totalIndemnitesMission: s._sum.montantIndemniteMissionSnapshot ?? 0,
          totalIndemnitesKm: s._sum.montantKilometriqueSnapshot ?? 0,
          missionsPayees: p?._count.id ?? 0,
          totalPaye: p?._sum.montantTotalSnapshot ?? 0,
        };
      }),
    });
  } catch (e) {
    return gererErreurApi(e);
  }
}
