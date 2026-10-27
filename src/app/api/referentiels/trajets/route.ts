import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

export async function GET() {
  try {
    // Lecture publique pour tous les roles authentifies (middleware garantit l'auth)
    const trajets = await prisma.trajet.findMany({
      where: { actif: true },
      orderBy: [{ villeDepart: "asc" }, { villeArrivee: "asc" }],
    });
    return NextResponse.json(trajets);
  } catch (e) {
    return gererErreurApi(e);
  }
}

const CreerTrajetSchema = z.object({
  villeDepart: z.string().min(1),
  villeArrivee: z.string().min(1),
  distanceKm: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const body = CreerTrajetSchema.parse(await request.json());
    const trajet = await prisma.trajet.upsert({
      where: {
        villeDepart_villeArrivee: {
          villeDepart: body.villeDepart,
          villeArrivee: body.villeArrivee,
        },
      },
      update: { distanceKm: body.distanceKm, actif: true },
      create: body,
    });
    return NextResponse.json(trajet, { status: 201 });
  } catch (e) {
    return gererErreurApi(e);
  }
}
