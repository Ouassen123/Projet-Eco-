import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BusinessError } from "@/lib/errors";

const STATUT_PAR_CODE: Record<string, number> = {
  CONFLIT_DATES: 409,
  JOUR_FERIE: 409,
  MAPPING_ECHELLE_MANQUANT: 422,
  BAREME_MISSION_INTROUVABLE: 422,
  TRAJET_INTROUVABLE: 422,
  BAREME_KM_INTROUVABLE: 422,
  VEHICULE_MANQUANT: 422,
  EMPLOYE_INTROUVABLE: 404,
  STATUT_INVALIDE: 400,
  TRANSITION_STATUT_INVALIDE: 409,
  MODELE_INTROUVABLE: 500,
  MODELE_INVALIDE: 500,
  TRANSPORT_INCOMPATIBLE: 422,
};

export function gererErreurApi(e: unknown): NextResponse {
  if (e instanceof BusinessError) {
    return NextResponse.json(
      { code: e.code, message: e.message, details: e.details ?? null },
      { status: STATUT_PAR_CODE[e.code] ?? 400 }
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { code: "VALIDATION", message: "Donnees invalides.", details: e.issues },
      { status: 400 }
    );
  }
  console.error(e);
  return NextResponse.json(
    {
      code: "ERREUR_INTERNE",
      message: e instanceof Error ? e.message : "Erreur inconnue.",
    },
    { status: 500 }
  );
}
