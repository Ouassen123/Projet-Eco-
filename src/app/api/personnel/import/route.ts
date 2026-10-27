import { NextRequest, NextResponse } from "next/server";
import { importerPersonnelDepuisBuffer } from "@/lib/importPersonnel";
import { gererErreurApi } from "@/lib/apiUtils";
import { verifierRole } from "@/lib/authApi";

export async function POST(request: NextRequest) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const formData = await request.formData();
    const fichier = formData.get("fichier");

    if (!(fichier instanceof File)) {
      return NextResponse.json(
        { message: "Champ 'fichier' (xlsx) requis." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fichier.arrayBuffer());
    const resultat = await importerPersonnelDepuisBuffer(buffer);

    return NextResponse.json(resultat);
  } catch (e) {
    return gererErreurApi(e);
  }
}
