import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

const PatchSchema = z.object({
  tauxDhKm: z.number().positive().optional(),
  actif: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const { id } = await params;
    const body = PatchSchema.parse(await request.json());
    const ancien = await prisma.baremeKilometrique.findUnique({ where: { id } });
    const bareme = await prisma.baremeKilometrique.update({ where: { id }, data: body });
    await prisma.historiqueAction.create({
      data: {
        ordreMissionId: null,
        action: "MODIFICATION_REFERENTIEL",
        utilisateurId: auth.utilisateur.utilisateurId,
        auteur: auth.utilisateur.login,
        detail: `Modification bareme KM ${bareme.puissanceFiscale}CV`,
        ancienneValeur: ancien ? JSON.stringify({ tauxDhKm: ancien.tauxDhKm, actif: ancien.actif }) : null,
        nouvelleValeur: JSON.stringify(body),
      },
    });
    return NextResponse.json(bareme);
  } catch (e) {
    return gererErreurApi(e);
  }
}
