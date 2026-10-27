import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

export async function GET(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;

    const { searchParams } = new URL(request.url);
    const limite = Number(searchParams.get("limit") ?? "50");
    const take = Number.isFinite(limite) ? Math.min(Math.max(limite, 10), 200) : 50;

    const logs = await prisma.historiqueAction.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: {
        utilisateur: {
          select: {
            login: true,
            nomComplet: true,
            role: true,
          },
        },
        ordreMission: {
          select: {
            numero: true,
            statut: true,
          },
        },
      },
    });

    return NextResponse.json(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        auteur: log.auteur,
        detail: log.detail,
        ancienneValeur: log.ancienneValeur,
        nouvelleValeur: log.nouvelleValeur,
        createdAt: log.createdAt,
        utilisateur: log.utilisateur,
        ordreMission: log.ordreMission,
      }))
    );
  } catch (e) {
    return gererErreurApi(e);
  }
}
