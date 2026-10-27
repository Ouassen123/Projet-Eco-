// Script ponctuel : valide le pipeline d'import personnel avec le fichier
// Excel reel fourni par l'utilisateur. Ne fait PAS partie de la suite de
// tests automatisee (depend d'un fichier hors du repo, sur le Bureau).
import fs from "fs";
import { importerPersonnelDepuisBuffer } from "@/lib/importPersonnel";
import { prisma } from "@/lib/prisma";

async function main() {
  const chemin = "C:\\Users\\viet\\Desktop\\PERSONNEL ENS ET ADM (2).xlsx";
  const buffer = fs.readFileSync(chemin);
  const resultat = await importerPersonnelDepuisBuffer(buffer);

  console.log("Total lignes traitees:", resultat.total);
  console.log("Crees:", resultat.crees);
  console.log("Mis a jour:", resultat.misAJour);
  console.log("Erreurs:", resultat.erreurs.length);
  if (resultat.erreurs.length > 0) {
    console.log(JSON.stringify(resultat.erreurs.slice(0, 20), null, 2));
  }

  const nbAdmin = await prisma.employe.count({ where: { type: "ADMINISTRATIF" } });
  const nbEnseignant = await prisma.employe.count({ where: { type: "ENSEIGNANT" } });
  console.log("En base -> ADMINISTRATIF:", nbAdmin, "| ENSEIGNANT:", nbEnseignant);

  const exemples = await prisma.employe.findMany({ take: 3 });
  console.log("Exemples:", JSON.stringify(exemples, null, 2));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
