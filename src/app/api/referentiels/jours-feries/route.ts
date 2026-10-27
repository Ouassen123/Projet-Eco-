import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

export async function GET() {
  try {
    // Lecture publique pour tous les roles authentifies (middleware garantit l'auth)
    const feries = await prisma.jourFerie.findMany({
      where: { actif: true },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(feries);
  } catch (e) {
    return gererErreurApi(e);
  }
}

const CreerFerieSchema = z.object({
  date: z.string().datetime().or(z.string()), // ISO date
  libelle: z.string().min(1),
  recurrentAnnuel: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const body = CreerFerieSchema.parse(await request.json());
    const ferie = await prisma.jourFerie.create({
      data: {
        date: new Date(body.date),
        libelle: body.libelle,
        recurrentAnnuel: body.recurrentAnnuel,
      },
    });
    return NextResponse.json(ferie, { status: 201 });
  } catch (e) {
    return gererErreurApi(e);
  }
}
