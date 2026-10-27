"use client";

import { useEffect, useState, Suspense, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Lock, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/toast/ToastProvider";

function LoginForm() {
  const searchParams = useSearchParams();
  const { erreur: toastErreur } = useToast();
  const [login, setLogin] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreurConnexion, setErreurConnexion] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { connecte?: boolean };
        if (actif && data.connecte) {
          window.location.replace("/");
        }
      } catch {
        // Pas bloquant : on reste sur la page de connexion.
      }
    })();

    return () => {
      actif = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreurConnexion(null);
    setChargement(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), motDePasse }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.message || "Erreur d'authentification";
        setErreurConnexion(message);
        throw new Error(message);
      }
      const redirect = searchParams.get("redirect") || "/";
      window.location.replace(redirect);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur de connexion.";
      setErreurConnexion(message);
      toastErreur(message);
      setChargement(false);
    }
  }

  const comptes = [
    { login: "Loubna", motDePasse: "Loubna@0102", role: "Admin" },
    { login: "Oumaima", motDePasse: "Oumaima@0102", role: "Gestionnaire" },
    { login: "Ikhlasse", motDePasse: "Ikhlasse@0102", role: "Consultation" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.16),_transparent_22%),linear-gradient(180deg,_#eef2ff_0%,_#f8fafc_42%,_#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-8 text-slate-900">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur">
            <Sparkles size={16} />
            Nouvelle interface premium
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Service Économique, plus clair, plus moderne, plus rapide.
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              Connectez-vous pour gérer les ordres de mission, les utilisateurs, les connexions en ligne
              et tout l'historique des actions depuis une interface plus élégante.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Palette bleu-violet moderne",
              "Journal d'activité admin",
              "Comptes de départ préconfigurés",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <CheckCircle2 size={18} />
                </div>
                <p className="text-sm font-medium text-slate-700">{item}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Comptes disponibles</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {comptes.map((compte) => (
                <div key={compte.login} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                  <p className="text-sm font-semibold text-slate-900">{compte.login}</p>
                  <p className="mt-1 text-xs text-slate-500">Mot de passe : {compte.motDePasse}</p>
                  <span className="mt-3 inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    {compte.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/20">
                <ArrowRight size={22} />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Connexion</h2>
              <p className="mt-1 text-sm text-slate-500">Entrez vos identifiants pour accéder au tableau de bord.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Identifiant</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    value={login}
                    onChange={(e) => {
                      setLogin(e.target.value);
                      if (erreurConnexion) setErreurConnexion(null);
                    }}
                    placeholder="Login"
                    className="pl-9"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="password"
                    value={motDePasse}
                    onChange={(e) => {
                      setMotDePasse(e.target.value);
                      if (erreurConnexion) setErreurConnexion(null);
                    }}
                    placeholder="••••••••"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              {erreurConnexion && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {erreurConnexion}
                </div>
              )}
              <Button type="submit" chargement={chargement} className="w-full">
                Se connecter
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Astuce</p>
              <p className="mt-1">
                Les comptes Loubna, Oumaima et Ikhlasse sont déjà créés et prêts à l'emploi.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-slate-400">Chargement...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
