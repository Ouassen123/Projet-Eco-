import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { BusinessError, ErrorCodes } from "@/lib/errors";
import { calculerIndemniteMission } from "@/lib/moteurMission";
import { calculerIndemniteKilometrique } from "@/lib/kilometrique";
import { convertMontantEnLettres } from "@/lib/montantLettres";
import { verifierRole } from "@/lib/authApi";

// Previsualisation en LECTURE SEULE : calcule les memes montants que le
// moteur (src/lib/moteurMission.ts) SANS creer d'Ordre de Mission. Le
// backend reste l'unique source de verite pour les calculs ; le frontend
// n'affiche ici qu'une prevision avant confirmation.
const Schema = z.object({
  employeId: z.string().min(1),
  villeDepart: z.string().min(1),
  villeArrivee: z.string().min(1),
  dateHeureDepart: z.string(),
  dateHeureRetour: z.string(),
  moyenTransport: z.enum(["TRANSPORT_PUBLIC", "VOITURE_PERSONNELLE", "VOITURE_SERVICE"]),
  vehiculePuissanceFiscale: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE");
    if ("erreur" in auth) return auth.erreur;
    const body = Schema.parse(await request.json());
    const dateHeureDepart = new Date(body.dateHeureDepart);
    const dateHeureRetour = new Date(body.dateHeureRetour);

    const calculMission = await calculerIndemniteMission(
      prisma,
      body.employeId,
      body.villeArrivee,
      dateHeureDepart,
      dateHeureRetour
    );

    let kilometrique: {
      trajetIntrouvable: boolean;
      vehiculeManquant: boolean;
      distanceKm: number | null;
      tauxDhKm: number | null;
      montant: number | null;
    } = {
      trajetIntrouvable: false,
      vehiculeManquant: false,
      distanceKm: null,
      tauxDhKm: null,
      montant: null,
    };

    if (body.moyenTransport === "VOITURE_PERSONNELLE") {
      if (!body.vehiculePuissanceFiscale) {
        kilometrique = { ...kilometrique, vehiculeManquant: true };
      } else {
        try {
          const resultat = await calculerIndemniteKilometrique(
            body.villeDepart,
            body.villeArrivee,
            body.vehiculePuissanceFiscale
          );
          kilometrique = {
            trajetIntrouvable: false,
            vehiculeManquant: false,
            distanceKm: resultat.distanceKm,
            tauxDhKm: resultat.tauxDhKm,
            montant: resultat.montant,
          };
        } catch (e) {
          if (e instanceof BusinessError && e.code === ErrorCodes.TRAJET_INTROUVABLE) {
            kilometrique = { ...kilometrique, trajetIntrouvable: true };
          } else {
            throw e;
          }
        }
      }
    }

    const montantTotal = calculMission.montantIndemniteMission + (kilometrique.montant ?? 0);

    return NextResponse.json({
      ...calculMission,
      kilometrique,
      montantTotal,
      montantTotalEnLettres: convertMontantEnLettres(montantTotal),
    });
  } catch (e) {
    return gererErreurApi(e);
  }
}
