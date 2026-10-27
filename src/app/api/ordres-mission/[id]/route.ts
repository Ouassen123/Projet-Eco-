import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const { id } = await params;
    const ordreMission = await prisma.ordreMission.findUnique({
      where: { id },
      include: {
        employe: true,
        historique: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!ordreMission) {
      return NextResponse.json(
        { message: "Ordre de mission introuvable." },
        { status: 404 }
      );
    }
    return NextResponse.json(ordreMission);
  } catch (e) {
    return gererErreurApi(e);
  }
}
