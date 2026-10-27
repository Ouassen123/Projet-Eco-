import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { RoleUtilisateur, Utilisateur } from "@prisma/client";

const SESSION_COOKIE = "om_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 heures

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET non configuré. Définissez-le dans .env");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export interface SessionData {
  utilisateurId: string;
  login: string;
  role: RoleUtilisateur;
  nomComplet: string;
}

export function creerTokenSession(data: SessionData): string {
  const payload = JSON.stringify(data);
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifierTokenSession(token: string): SessionData | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expectedSig = sign(encoded);
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    return payload as SessionData;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifierTokenSession(token);
}

export async function getUtilisateurConnecte(): Promise<Utilisateur | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.utilisateur.findUnique({
    where: { id: session.utilisateurId },
  });
  if (!user || !user.actif) return null;
  return user;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.AUTH_SECURE_COOKIE !== "false",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// --- Vérifications de rôles côté serveur ---

export function requireRole(session: SessionData | null, ...roles: RoleUtilisateur[]): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}

export function requireAdmin(session: SessionData | null): boolean {
  return requireRole(session, "ADMIN");
}

export function requireGestionnaire(session: SessionData | null): boolean {
  return requireRole(session, "ADMIN", "GESTIONNAIRE");
}

export function requireConsultation(session: SessionData | null): boolean {
  return requireRole(session, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
}
