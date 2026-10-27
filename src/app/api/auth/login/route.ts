import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { creerTokenSession, setSessionCookie, type SessionData } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const LoginSchema = z.object({
  login: z.string().min(1),
  motDePasse: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, motDePasse } = LoginSchema.parse(body);

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { login },
    });

    if (!utilisateur || !utilisateur.actif) {
      return NextResponse.json(
        { code: "AUTH_INVALIDE", message: "Login ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const valide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!valide) {
      return NextResponse.json(
        { code: "AUTH_INVALIDE", message: "Login ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const sessionData: SessionData = {
      utilisateurId: utilisateur.id,
      login: utilisateur.login,
      role: utilisateur.role,
      nomComplet: utilisateur.nomComplet,
    };

    const token = creerTokenSession(sessionData);
    await setSessionCookie(token);

    return NextResponse.json({
      login: utilisateur.login,
      nomComplet: utilisateur.nomComplet,
      role: utilisateur.role,
    });
  } catch (e) {
    return gererErreurApi(e);
  }
}
