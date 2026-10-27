import { NextRequest, NextResponse } from "next/server";
import type { RoleUtilisateur } from "@prisma/client";

export interface UtilisateurRequest extends NextRequest {
  utilisateurId?: string;
  utilisateurRole?: RoleUtilisateur;
  utilisateurLogin?: string;
  utilisateurNom?: string;
}

export function getUtilisateurFromHeaders(request: NextRequest): {
  utilisateurId: string;
  role: RoleUtilisateur;
  login: string;
  nomComplet: string;
} | null {
  const id = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role") as RoleUtilisateur | null;
  const login = request.headers.get("x-user-login");
  const nomEncoded = request.headers.get("x-user-nom");

  if (!id || !role || !login) return null;

  return {
    utilisateurId: id,
    role,
    login,
    nomComplet: nomEncoded ? decodeURIComponent(nomEncoded) : login,
  };
}

export function verifierRole(
  request: NextRequest,
  ...rolesAutorises: RoleUtilisateur[]
): { utilisateur: NonNullable<ReturnType<typeof getUtilisateurFromHeaders>> } | { erreur: NextResponse } {
  const utilisateur = getUtilisateurFromHeaders(request);
  if (!utilisateur) {
    return {
      erreur: NextResponse.json(
        { code: "NON_AUTHENTIFIE", message: "Authentification requise." },
        { status: 401 }
      ),
    };
  }
  if (!rolesAutorises.includes(utilisateur.role)) {
    return {
      erreur: NextResponse.json(
        { code: "NON_AUTORISE", message: "Vous n'avez pas les permissions nécessaires." },
        { status: 403 }
      ),
    };
  }
  return { utilisateur };
}
