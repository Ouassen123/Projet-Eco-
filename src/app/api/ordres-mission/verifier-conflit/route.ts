import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { STATUTS_BLOQUANTS_CONFLIT } from "@/lib/conflits";
import { verifierRole } from "@/lib/authApi";

// Pre-verification en LECTURE SEULE pour retour immediat au frontend
// (regle validee : le frontend doit informer immediatement l'utilisateur).
// L'authorite finale reste le controle transactionnel effectue au moment
// de la creation/validation (src/lib/moteurMission.ts, src/lib/statutOM.ts).
const Schema = z.object({
  employeId: z.string().min(1),
  dateHeureDepart: z.string(),
  dateHeureRetour: z.string(),
  excludeOrdreMissionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const body = Schema.parse(await request.json());
    const debut = new Date(body.dateHeureDepart);
    const fin = new Date(body.dateHeureRetour);

    const conflits = await prisma.ordreMission.findMany({
      where: {
        employeId: body.employeId,
        statut: { in: [...STATUTS_BLOQUANTS_CONFLIT] },
        id: body.excludeOrdreMissionId
          ? { not: body.excludeOrdreMissionId }
          : undefined,
        dateHeureDepart: { lt: fin },
        dateHeureRetour: { gt: debut },
      },
      select: {
        id: true,
        numero: true,
        numeroSequence: true,
        dateHeureDepart: true,
        dateHeureRetour: true,
        objetMission: true,
      },
    });

    return NextResponse.json({ enConflit: conflits.length > 0, conflits });
  } catch (e) {
    return gererErreurApi(e);
  }
}
