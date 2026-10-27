// Suivi de presence en memoire. La Map est stockee sur globalThis pour etre
// partagee entre les routes et survivre aux recompilations en dev.
// La presence est volontairement ephemere : pas de persistance en base.
import type { RoleUtilisateur } from "@prisma/client";

export interface Presence {
  utilisateurId: string;
  login: string;
  nomComplet: string;
  role: RoleUtilisateur;
  clientId: string; // identifiant stable par navigateur/ordinateur
  derniereVisite: number; // epoch ms
}

// Une session est consideree "en ligne" si vue dans les 75 dernieres secondes
// (le client envoie un ping toutes les 20s, on tolere des pings perdus).
const FENETRE_EN_LIGNE_MS = 75_000;

const globalForPresence = globalThis as unknown as {
  presence?: Map<string, Presence>;
};

const presences = (globalForPresence.presence ??= new Map<string, Presence>());

export function marquerPresent(p: Omit<Presence, "derniereVisite">): void {
  const maintenant = Date.now();
  presences.set(`${p.utilisateurId}:${p.clientId}`, {
    ...p,
    derniereVisite: maintenant,
  });
  // Purge opportuniste des sessions inactives
  const seuil = maintenant - FENETRE_EN_LIGNE_MS;
  for (const [cle, valeur] of presences) {
    if (valeur.derniereVisite < seuil) presences.delete(cle);
  }
}

export function listePresencesEnLigne(): Presence[] {
  const seuil = Date.now() - FENETRE_EN_LIGNE_MS;
  return [...presences.values()]
    .filter((p) => p.derniereVisite >= seuil)
    .sort((a, b) => b.derniereVisite - a.derniereVisite);
}
