"use client";

import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";

interface SessionEnLigne {
  login: string;
  nomComplet: string;
  role: string;
  clientId: string;
  soiMeme: boolean;
  derniereVisite: string;
}

interface ReponsePresence {
  total: number;
  sessions: SessionEnLigne[];
}

const INTERVALLE_MS = 20_000;
const CLE_CLIENT_ID = "om_client_id";

function getClientId(): string {
  let id = localStorage.getItem(CLE_CLIENT_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLE_CLIENT_ID, id);
  }
  return id;
}

function ilYA(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s}s`;
  return `il y a ${Math.round(s / 60)}min`;
}

export function PresenceIndicator() {
  const [data, setData] = useState<ReponsePresence | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = getClientId();
    let actif = true;

    async function ping() {
      try {
        const res = await fetch("/api/presence", {
          cache: "no-store",
          headers: { "x-client-id": clientId },
        });
        if (!res.ok) {
          if (actif) setData(null);
          return;
        }
        if (actif) setData(await res.json());
      } catch {
        if (actif) setData(null);
      }
    }

    ping();
    const timer = setInterval(ping, INTERVALLE_MS);
    return () => {
      actif = false;
      clearInterval(timer);
    };
  }, []);

  // Fermer le panneau au clic a l'exterieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!data) return null;

  return (
    <div ref={ref} className="relative px-3 pb-2">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-pink-100 bg-white/70 px-2 py-2 text-xs text-slate-700 transition-colors hover:bg-pink-50 hover:text-slate-900"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
        </span>
        <Users size={14} className="shrink-0" />
        <span className="font-medium">
          {data.total} en ligne
        </span>
      </button>

      {ouvert && (
        <div className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl shadow-pink-950/10">
          <p className="border-b border-pink-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-pink-600">
            Connectés maintenant
          </p>
          <ul className="max-h-48 overflow-y-auto">
            {data.sessions.map((s, i) => (
              <li
                key={`${s.login}-${s.clientId}-${i}`}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {s.nomComplet || s.login}
                    {s.soiMeme && (
                      <span className="ml-1 text-pink-500">(vous)</span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {s.login} · {s.role}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-fuchsia-500">
                  {ilYA(s.derniereVisite)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
