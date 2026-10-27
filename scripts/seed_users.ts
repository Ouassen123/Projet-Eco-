import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UTILISATEURS_PAR_DEFAUT } from "../src/lib/defaultUsers";

const prisma = new PrismaClient();

(async () => {
  for (const utilisateur of UTILISATEURS_PAR_DEFAUT) {
    const existing = await prisma.utilisateur.findUnique({ where: { login: utilisateur.login } });
    if (existing) {
      console.log(`  EXISTS: ${utilisateur.login} (${utilisateur.role})`);
      continue;
    }

    await prisma.utilisateur.create({
      data: {
        login: utilisateur.login,
        motDePasse: await bcrypt.hash(utilisateur.motDePasse, 10),
        nomComplet: utilisateur.nomComplet,
        role: utilisateur.role,
      },
    });
    console.log(`  CREATED: ${utilisateur.login} (${utilisateur.role})`);
  }

  const total = await prisma.utilisateur.count();
  console.log(`\nTotal utilisateurs: ${total}`);
  await prisma.$disconnect();
})();
