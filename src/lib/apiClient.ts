// Client API frontend centralise. Le backend reste la seule source de
// verite pour les calculs/regles metier : ce module ne fait QUE des appels
// HTTP + normalisation des erreurs, aucune logique metier ici.
import type { ErreurApi } from "@/lib/types";

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(erreur: ErreurApi, status: number) {
    super(erreur.message);
    this.name = "ApiError";
    this.code = erreur.code;
    this.details = erreur.details;
    this.status = status;
  }
}

async function traiterReponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const corps = isJson ? await res.json() : null;

  if (!res.ok) {
    const erreur: ErreurApi = corps ?? {
      code: "ERREUR_INCONNUE",
      message: `Erreur ${res.status}`,
    };
    throw new ApiError(erreur, res.status);
  }
  return corps as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  return traiterReponse<T>(res);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return traiterReponse<T>(res);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return traiterReponse<T>(res);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE" });
  return traiterReponse<T>(res);
}

export async function apiUpload<T>(url: string, fichier: File, champ = "fichier"): Promise<T> {
  const formData = new FormData();
  formData.append(champ, fichier);
  const res = await fetch(url, { method: "POST", body: formData });
  return traiterReponse<T>(res);
}

/** Message d'erreur pret a afficher a l'utilisateur, en francais. */
export function messageErreur(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Une erreur inattendue est survenue.";
}
