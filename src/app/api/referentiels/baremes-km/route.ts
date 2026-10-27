import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";

export async function GET() {
  try {
    // Lecture publique pour tous les roles authentifies (middleware garantit l'auth)
    const baremes = await prisma.baremeKilometrique.findMany({
      where: { actif: true },
      orderBy: { puissanceFiscale: "asc" },
    });
    return NextResponse.json(baremes);
  } catch (e) {
    return gererErreurApi(e);
  }
}
