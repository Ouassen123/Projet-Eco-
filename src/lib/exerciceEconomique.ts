import { prisma } from "@/lib/prisma";

export interface ExerciceEconomique {
  id: string;
  annee: number;
  dateDebut: Date;
  dateFin: Date;
  actif: boolean;
  archive: boolean;
  createdAt: Date;
}

/**
 * Crée les exercices 2026 et 2027 si absents.
 * 2026 est actif par défaut. 2027 est inactif en attente.
 */
export async function initialiserExercicesEconomiques(): Promise<void> {
  const maintenant = new Date();
  const anneeCourante = maintenant.getUTCFullYear();

  const ex2026 = await prisma.exerciceEconomique.findUnique({
    where: { annee: 2026 },
  });
  if (!ex2026) {
    await prisma.exerciceEconomique.create({
      data: {
        annee: 2026,
        dateDebut: new Date(Date.UTC(2026, 0, 1)),
        dateFin: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
        actif: anneeCourante <= 2026,
        archive: false,
      },
    });
  }

  const ex2027 = await prisma.exerciceEconomique.findUnique({
    where: { annee: 2027 },
  });
  if (!ex2027) {
    await prisma.exerciceEconomique.create({
      data: {
        annee: 2027,
        dateDebut: new Date(Date.UTC(2027, 0, 1)),
        dateFin: new Date(Date.UTC(2027, 11, 31, 23, 59, 59, 999)),
        actif: anneeCourante >= 2027,
        archive: false,
      },
    });
  }
}

/**
 * Retourne l'exercice économique actif. Si aucun n'est actif, active l'exercice
 * correspondant à l'année courante (ou 2026 si on est avant 2027) et archive
 * automatiquement les exercices antérieurs.
 */
export async function exerciceEconomiqueActif(
  date = new Date()
): Promise<ExerciceEconomique> {
  let actif = await prisma.exerciceEconomique.findFirst({
    where: { actif: true },
    orderBy: { annee: "desc" },
  });

  if (actif) return actif;

  const annee = date.getUTCFullYear();
  const debut = new Date(Date.UTC(annee, 0, 1));
  const fin = new Date(Date.UTC(annee, 11, 31, 23, 59, 59, 999));

  actif = await prisma.exerciceEconomique.upsert({
    where: { annee },
    update: { actif: true, archive: false },
    create: {
      annee,
      dateDebut: debut,
      dateFin: fin,
      actif: true,
      archive: false,
    },
  });

  await prisma.exerciceEconomique.updateMany({
    where: { annee: { lt: annee } },
    data: { actif: false, archive: true },
  });

  return actif;
}

export async function resoudreAnneeEconomique(
  date = new Date()
): Promise<number> {
  const exercice = await exerciceEconomiqueActif(date);
  return exercice.annee;
}

/**
 * Associe l'année économique 2026 aux ordres de mission existants qui n'en ont pas.
 */
export async function associerAnneeEconomiqueParDefaut(
  annee = 2026
): Promise<void> {
  await prisma.ordreMission.updateMany({
    where: { anneeEconomique: null },
    data: { anneeEconomique: annee },
  });
}
