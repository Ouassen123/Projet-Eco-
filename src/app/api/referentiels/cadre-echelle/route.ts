import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

export async function GET() {
  try {
    // Lecture publique pour tous les roles authentifies (middleware garantit l'auth)
    const mappings = await prisma.cadreEchelleMapping.findMany({
      where: { actif: true },
      orderBy: [{ type: "asc" }, { cadre: "asc" }],
    });
    return NextResponse.json(mappings);
  } catch (e) {
    return gererErreurApi(e);
  }
}

const CreerMappingSchema = z.object({
  cadre: z.string().min(1),
  // "" = pas de distinction de grade (voir schema.prisma).
  grade: z.string().nullable().optional(),
  type: z.enum(["ADMINISTRATIF", "ENSEIGNANT"]),
  echelle: z.number().int().min(1).max(11),
});

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const body = CreerMappingSchema.parse(await request.json());
    const grade = body.grade ?? "";
    const mapping = await prisma.cadreEchelleMapping.upsert({
      where: {
        cadre_grade_type: {
          cadre: body.cadre,
          grade,
          type: body.type,
        },
      },
      update: { echelle: body.echelle, actif: true },
      create: {
        cadre: body.cadre,
        grade,
        type: body.type,
        echelle: body.echelle,
      },
    });
    return NextResponse.json(mapping, { status: 201 });
  } catch (e) {
    return gererErreurApi(e);
  }
}
