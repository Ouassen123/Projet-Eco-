/**
 * Script de préparation des jours fériés pour l'année suivante.
 * 
 * Usage: npx tsx scripts/prepare_feries.ts <annee>
 * Exemple: npx tsx scripts/prepare_feries.ts 2027
 * 
 * Les jours fériés fixes (recurrentAnnuel=true) sont automatiquement
 * recréés pour la nouvelle année. Les jours fériés lunaires religieux
 * (Aïd, Mawlid, Ramadan) doivent être saisis manuellement par l'admin
 * via l'interface, car leurs dates exactes dépendent de l'observation
 * du croissant lunaire.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const annee = parseInt(process.argv[2] ?? "");
  if (!annee || annee < 2025) {
    console.error("Usage: npx tsx scripts/prepare_feries.ts <annee>");
    console.error("Exemple: npx tsx scripts/prepare_feries.ts 2027");
    process.exit(1);
  }

  console.log(`\n=== Préparation des jours fériés pour ${annee} ===\n`);

  // 1. Récupérer les jours fériés récurrents existants
  const feriesRecurrents = await prisma.jourFerie.findMany({
    where: { recurrentAnnuel: true, actif: true },
  });

  console.log(`Jours fériés récurrents trouvés: ${feriesRecurrents.length}`);

  let crees = 0;
  let existants = 0;

  for (const ferie of feriesRecurrents) {
    // Construire la date pour la nouvelle année (même mois/jour)
    const dateExistante = new Date(ferie.date);
    const nouvelleDate = new Date(annee, dateExistante.getUTCMonth(), dateExistante.getUTCDate());

    // Vérifier si existe déjà pour cette année
    const existant = await prisma.jourFerie.findFirst({
      where: {
        date: nouvelleDate,
        actif: true,
      },
    });

    if (existant) {
      existants++;
      console.log(`  EXISTS: ${ferie.libelle} (${nouvelleDate.toISOString().split("T")[0]})`);
    } else {
      await prisma.jourFerie.create({
        data: {
          date: nouvelleDate,
          libelle: ferie.libelle,
          recurrentAnnuel: true,
        },
      });
      crees++;
      console.log(`  CREATED: ${ferie.libelle} (${nouvelleDate.toISOString().split("T")[0]})`);
    }
  }

  // 2. Lister les jours fériés NON récurrents de l'année précédente
  // pour rappel (lunaires religieux à saisir manuellement)
  const feriesNonRecurrents = await prisma.jourFerie.findMany({
    where: {
      recurrentAnnuel: false,
      actif: true,
      date: {
        gte: new Date(annee - 1, 0, 1),
        lt: new Date(annee, 0, 1),
      },
    },
    orderBy: { date: "asc" },
  });

  console.log(`\n--- Jours fériés NON récurrents de ${annee - 1} (à vérifier/saisir pour ${annee}) ---`);
  for (const ferie of feriesNonRecurrents) {
    console.log(`  ${ferie.date.toISOString().split("T")[0]} - ${ferie.libelle}`);
  }

  if (feriesNonRecurrents.length === 0) {
    console.log("  (aucun)");
  }

  console.log(`\nRésumé: ${crees} créés, ${existants} déjà existants`);
  console.log(`\n⚠ Les jours fériés lunaires (Aïd, Mawlid, etc.) doivent être saisis`);
  console.log(`  par l'administrateur via Paramètres > Jours fériés.`);

  await prisma.$disconnect();
})();
