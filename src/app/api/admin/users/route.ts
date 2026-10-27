import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

const UtilisateurSchema = z.object({
  login: z.string().trim().min(3),
  nomComplet: z.string().trim().min(2),
  motDePasse: z.string().min(6),
  role: z.enum(["ADMIN", "GESTIONNAIRE", "CONSULTATION"]),
  actif: z.boolean().optional().default(true),
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

export async function GET(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;

    const utilisateurs = await prisma.utilisateur.findMany({
      select: selectUtilisateur,
      orderBy: [{ role: "asc" }, { nomComplet: "asc" }],
    });

    return NextResponse.json(utilisateurs);
  } catch (e) {
    return gererErreurApi(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;

    const body = UtilisateurSchema.parse(await request.json());
    const login = body.login.trim();

    const existe = await prisma.utilisateur.findUnique({ where: { login } });
    if (existe) {
      return NextResponse.json(
        { code: "LOGIN_EXISTANT", message: "Ce login existe déjà." },
        { status: 409 }
      );
    }

    const motDePasse = await bcrypt.hash(body.motDePasse, 10);
    const utilisateur = await prisma.utilisateur.create({
      data: {
        login,
        nomComplet: body.nomComplet.trim(),
        motDePasse,
        role: body.role,
        actif: body.actif,
      },
      select: selectUtilisateur,
    });

    await prisma.historiqueAction.create({
      data: {
        ordreMissionId: null,
        action: "CREATION",
        utilisateurId: auth.utilisateur.utilisateurId,
        auteur: auth.utilisateur.login,
        detail: `Création utilisateur ${utilisateur.login}`,
        nouvelleValeur: JSON.stringify(utilisateur),
      },
    });

    return NextResponse.json(utilisateur, { status: 201 });
  } catch (e) {
    return gererErreurApi(e);
  }
}
