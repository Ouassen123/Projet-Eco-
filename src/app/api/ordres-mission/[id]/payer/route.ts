import { NextRequest, NextResponse } from "next/server";
import { gererErreurApi } from "@/lib/apiUtils";
import { payerOrdreMission } from "@/lib/statutOM";
import { verifierRole } from "@/lib/authApi";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE");
    if ("erreur" in auth) return auth.erreur;
    const { id } = await params;
    const ordreMission = await payerOrdreMission(id, auth.utilisateur.login);
    return NextResponse.json(ordreMission);
  } catch (e) {
    return gererErreurApi(e);
  }
}
