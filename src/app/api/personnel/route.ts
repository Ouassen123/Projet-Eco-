import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { resoudreEchelleAffichage } from "@/lib/echelle";
import { verifierRole } from "@/lib/authApi";

export async function GET(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // ADMINISTRATIF | ENSEIGNANT
    const recherche = searchParams.get("q");

    const employes = await prisma.employe.findMany({
      where: {
        actif: true,
        type: type ? (type as "ADMINISTRATIF" | "ENSEIGNANT") : undefined,
        OR: recherche
          ? [
              { nomFr: { contains: recherche } },
              { prenomFr: { contains: recherche } },
              { matricule: { contains: recherche } },
              { cadre: { contains: recherche } },
            ]
          : undefined,
      },
      orderBy: [{ nomFr: "asc" }, { prenomFr: "asc" }],
    });

    const employesAvecEchelle = await Promise.all(
      employes.map(async (emp) => ({
        ...emp,
        echelleAffichage: (await resoudreEchelleAffichage(emp)).echelle,
      }))
    );

    return NextResponse.json(employesAvecEchelle);
  } catch (e) {
    return gererErreurApi(e);
  }
}
