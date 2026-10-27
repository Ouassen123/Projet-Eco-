import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

const PatchSchema = z.object({
  login: z.string().trim().min(3).optional(),
  nomComplet: z.string().trim().min(2).optional(),
  motDePasse: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "GESTIONNAIRE", "CONSULTATION"]).optional(),
  actif: z.boolean().optional(),
});

const selectUtilisateur = {
  id: true,
  login: true,
  nomComplet: true,
  role: true,
  actif: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;

    const { id } = await params;
    const body = PatchSchema.parse(await request.json());
    const ancien = await prisma.utilisateur.findUnique({
      where: { id },
      select: selectUtilisateur,
    });

    if (!ancien) {
      return NextResponse.json(
        { code: "UTILISATEUR_INTROUVABLE", message: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    if (body.login && body.login !== ancien.login) {
      const duplicate = await prisma.utilisateur.findUnique({ where: { login: body.login } });
      if (duplicate) {
        return NextResponse.json(
          { code: "LOGIN_EXISTANT", message: "Ce login existe déjà." },
          { status: 409 }
        );
      }
    }

    const { motDePasse, ...rest } = body;
    const utilisateur = await prisma.utilisateur.update({
      where: { id },
      data: {
        ...rest,
        ...(motDePasse ? { motDePasse: await bcrypt.hash(motDePasse, 10) } : {}),
      },
      select: selectUtilisateur,
    });

    await prisma.historiqueAction.create({
      data: {
        ordreMissionId: null,
        action: "MODIFICATION_PERSONNEL",
        utilisateurId: auth.utilisateur.utilisateurId,
        auteur: auth.utilisateur.login,
        detail: `Modification utilisateur ${utilisateur.login}`,
        ancienneValeur: JSON.stringify(ancien),
        nouvelleValeur: JSON.stringify(utilisateur),
      },
    });

    return NextResponse.json(utilisateur);
  } catch (e) {
    return gererErreurApi(e);
  }
}
