import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";
import { exerciceEconomiqueActif } from "@/lib/exerciceEconomique";

export async function GET(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;

    const [tous, actif] = await Promise.all([
      prisma.exerciceEconomique.findMany({
        orderBy: { annee: "desc" },
      }),
      exerciceEconomiqueActif(),
    ]);

    return NextResponse.json({
      exercices: tous.map((e) => ({
        id: e.id,
        annee: e.annee,
        actif: e.actif,
        archive: e.archive,
        dateDebut: e.dateDebut.toISOString(),
        dateFin: e.dateFin.toISOString(),
      })),
      actif: { annee: actif.annee },
    });
  } catch (e) {
    return gererErreurApi(e);
  }
}
