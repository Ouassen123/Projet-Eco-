import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { resoudreEchelleAffichage } from "@/lib/echelle";
import { verifierRole } from "@/lib/authApi";
import { exerciceEconomiqueActif } from "@/lib/exerciceEconomique";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const inclureArchives = searchParams.get("toutesAnnees") === "true";
    const anneeExerciceParam = searchParams.get("anneeEconomique");

    const exercice = anneeExerciceParam
      ? await prisma.exerciceEconomique.findUniqueOrThrow({ where: { annee: Number(anneeExerciceParam) } })
      : await exerciceEconomiqueActif();

    const employe = await prisma.employe.findUnique({
      where: { id },
      include: {
        ordresMission: {
          where: inclureArchives ? undefined : { anneeEconomique: exercice.annee },
          orderBy: { dateHeureDepart: "desc" },
        },
      },
    });
    if (!employe) {
      return NextResponse.json({ message: "Employe introuvable." }, { status: 404 });
    }
    const { echelle } = await resoudreEchelleAffichage(employe);
    return NextResponse.json({ ...employe, echelleAffichage: echelle });
  } catch (e) {
    return gererErreurApi(e);
  }
}

const PatchSchema = z.object({
  echelonExceptionnel: z.boolean().optional(),
  vehiculeMatricule: z.string().nullable().optional(),
  vehiculePuissanceFiscale: z.number().int().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE");
    if ("erreur" in auth) return auth.erreur;
    const { id } = await params;
    const body = PatchSchema.parse(await request.json());

    const ancien = await prisma.employe.findUnique({ where: { id } });
    const employe = await prisma.employe.update({
      where: { id },
      data: body,
    });

    await prisma.historiqueAction.create({
      data: {
        ordreMissionId: null,
        action: "MODIFICATION_VEHICULE",
        utilisateurId: auth.utilisateur.utilisateurId,
        auteur: auth.utilisateur.login,
        detail: `Modification employe ${employe.matricule}`,
        ancienneValeur: ancien ? JSON.stringify({
          echelonExceptionnel: ancien.echelonExceptionnel,
          vehiculeMatricule: ancien.vehiculeMatricule,
          vehiculePuissanceFiscale: ancien.vehiculePuissanceFiscale,
        }) : null,
        nouvelleValeur: JSON.stringify(body),
      },
    });

    return NextResponse.json(employe);
  } catch (e) {
    return gererErreurApi(e);
  }
}
