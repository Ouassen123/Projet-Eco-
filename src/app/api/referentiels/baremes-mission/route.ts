import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";

export async function GET() {
  try {
    const baremes = await prisma.baremeMission.findMany({
      where: { actif: true },
      orderBy: { priorite: "asc" },
    });
    return NextResponse.json(baremes);
  } catch (e) {
    return gererErreurApi(e);
  }
}
