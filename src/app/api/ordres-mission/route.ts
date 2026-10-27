import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { creerOrdreMission } from "@/lib/moteurMission";
import { verifierRole } from "@/lib/authApi";
import { exerciceEconomiqueActif } from "@/lib/exerciceEconomique";

export async function GET(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const { searchParams } = new URL(request.url);
    const employeId = searchParams.get("employeId") ?? undefined;
    const statut = searchParams.get("statut") ?? undefined;
    const moyenTransport = searchParams.get("moyenTransport") ?? undefined;
    const dateDebut = searchParams.get("dateDebut");
    const dateFin = searchParams.get("dateFin");
    const inclureArchives = searchParams.get("toutesAnnees") === "true";
    const anneeExerciceParam = searchParams.get("anneeEconomique");

    const exercice = anneeExerciceParam
      ? await prisma.exerciceEconomique.findUniqueOrThrow({ where: { annee: Number(anneeExerciceParam) } })
      : await exerciceEconomiqueActif();

    const ordresMission = await prisma.ordreMission.findMany({
      where: {
        anneeEconomique: inclureArchives ? undefined : exercice.annee,
        employeId,
        statut: statut ? (statut as "BROUILLON" | "VALIDE" | "ANNULE" | "PAYE") : undefined,
        moyenTransport: moyenTransport
          ? (moyenTransport as "TRANSPORT_PUBLIC" | "VOITURE_PERSONNELLE" | "VOITURE_SERVICE")
          : undefined,
        dateHeureDepart: dateFin ? { lte: new Date(dateFin) } : undefined,
        dateHeureRetour: dateDebut ? { gte: new Date(dateDebut) } : undefined,
      },
      include: { employe: true },
      orderBy: { dateHeureDepart: "desc" },
    });

    return NextResponse.json(ordresMission);
  } catch (e) {
    return gererErreurApi(e);
  }
}

const CreerOMSchema = z.object({
  employeId: z.string().min(1),
  objetMission: z.string().min(1),
  villeDepart: z.string().min(1),
  villeArrivee: z.string().min(1),
  dateHeureDepart: z.string().datetime().or(z.string()),
  dateHeureRetour: z.string().datetime().or(z.string()),
  moyenTransport: z.enum([
    "TRANSPORT_PUBLIC",
    "VOITURE_PERSONNELLE",
    "VOITURE_SERVICE",
  ]),
  vehiculeMatricule: z.string().optional(),
  vehiculePuissanceFiscale: z.number().int().optional(),
  createdBy: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE");
    if ("erreur" in auth) return auth.erreur;
    const body = CreerOMSchema.parse(await request.json());

    const ordreMission = await creerOrdreMission({
      ...body,
      dateHeureDepart: new Date(body.dateHeureDepart),
      dateHeureRetour: new Date(body.dateHeureRetour),
      createdBy: auth.utilisateur.login,
    });

    return NextResponse.json(ordreMission, { status: 201 });
  } catch (e) {
    return gererErreurApi(e);
  }
}
