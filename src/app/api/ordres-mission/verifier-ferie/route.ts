import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gererErreurApi } from "@/lib/apiUtils";
import { listerJoursFeriesDansPeriode } from "@/lib/joursFeries";
import { verifierRole } from "@/lib/authApi";

// Pre-verification en LECTURE SEULE (retour immediat au frontend). L'autorite
// finale reste verifierAucunJourFerie, appelee dans la transaction de
// creation/validation (src/lib/moteurMission.ts, src/lib/statutOM.ts).
const Schema = z.object({
  dateHeureDepart: z.string(),
  dateHeureRetour: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const body = Schema.parse(await request.json());
    const joursFeries = await listerJoursFeriesDansPeriode(
      new Date(body.dateHeureDepart),
      new Date(body.dateHeureRetour)
    );
    return NextResponse.json({ contientFerie: joursFeries.length > 0, joursFeries });
  } catch (e) {
    return gererErreurApi(e);
  }
}
