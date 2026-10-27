import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { marquerPresent, listePresencesEnLigne } from "@/lib/presence";

// GET /api/presence : sert aussi de heartbeat — l'appel met a jour la presence
// de l'utilisateur connecte et renvoie la liste des sessions en ligne.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { code: "NON_AUTHENTIFIE", message: "Authentification requise." },
      { status: 401 }
    );
  }

  const clientId = request.headers.get("x-client-id") ?? "inconnu";

  marquerPresent({
    utilisateurId: session.utilisateurId,
    login: session.login,
    nomComplet: session.nomComplet,
    role: session.role,
    clientId,
  });

  const sessions = listePresencesEnLigne();
  return NextResponse.json({
    total: sessions.length,
    sessions: sessions.map((s) => ({
      login: s.login,
      nomComplet: s.nomComplet,
      role: s.role,
      clientId: s.clientId.slice(0, 6),
      soiMeme: s.utilisateurId === session.utilisateurId && s.clientId === clientId,
      derniereVisite: new Date(s.derniereVisite).toISOString(),
    })),
  });
}
