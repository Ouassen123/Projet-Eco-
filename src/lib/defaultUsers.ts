import type { RoleUtilisateur } from "@prisma/client";

export interface UtilisateurParDefaut {
  login: string;
  motDePasse: string;
  nomComplet: string;
  role: RoleUtilisateur;
}

export const UTILISATEURS_PAR_DEFAUT: UtilisateurParDefaut[] = [
  {
    login: "Loubna",
    motDePasse: "Loubna@0102",
    nomComplet: "Loubna",
    role: "ADMIN",
  },
  {
    login: "Oumaima",
    motDePasse: "Oumaima@0102",
    nomComplet: "Oumaima",
    role: "GESTIONNAIRE",
  },
  {
    login: "Ikhlasse",
    motDePasse: "Ikhlasse@0102",
    nomComplet: "Ikhlasse",
    role: "CONSULTATION",
  },
];
