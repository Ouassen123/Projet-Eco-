import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ connecte: false });
  }
  return NextResponse.json({
    connecte: true,
    login: session.login,
    nomComplet: session.nomComplet,
    role: session.role,
  });
}
