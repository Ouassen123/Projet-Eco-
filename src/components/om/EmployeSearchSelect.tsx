"use client";

import { useEffect, useRef, useState } from "react";
import { Search, User, X } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import type { Employe } from "@/lib/types";

export function EmployeSearchSelect({
  employeSelectionne,
  onSelectionner,
  erreur,
}: {
  employeSelectionne: Employe | null;
  onSelectionner: (employe: Employe) => void;
  erreur?: string;
}) {
  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<Employe[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terme.trim().length < 1) {
      setResultats([]);
      return;
    }
    setRecherche(true);
    const timer = setTimeout(() => {
      apiGet<Employe[]>(`/api/personnel?q=${encodeURIComponent(terme.trim())}`)
        .then((d) => setResultats(d.slice(0, 8)))
        .catch(() => setResultats([]))
        .finally(() => setRecherche(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [terme]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (employeSelectionne) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {employeSelectionne.nomFr.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {employeSelectionne.nomFr} {employeSelectionne.prenomFr}
            </p>
            <p className="text-xs text-slate-500">
              Matricule {employeSelectionne.matricule} ·{" "}
              {employeSelectionne.type === "ADMINISTRATIF" ? "Administratif" : "Enseignant"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelectionner(null as unknown as Employe);
            setTerme("");
          }}
          className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label="Changer d'employé"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={conteneurRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={terme}
          onChange={(e) => {
            setTerme(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          placeholder="Rechercher un employé ou enseignant..."
          className={`block w-full rounded-lg border px-3 py-2 pl-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
            erreur ? "border-red-400" : "border-slate-300 focus:border-indigo-500"
          }`}
        />
      </div>

      {ouvert && terme.trim().length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {recherche ? (
            <p className="px-4 py-3 text-sm text-slate-400">Recherche...</p>
          ) : resultats.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">Aucun résultat.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {resultats.map((emp) => (
                <li key={emp.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectionner(emp);
                      setOuvert(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                  >
                    <User size={15} className="shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-slate-800">{emp.nomFr} {emp.prenomFr}</span>
                      <span className="ml-1.5 text-slate-400">· {emp.matricule}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {emp.type === "ADMINISTRATIF" ? "Admin." : "Enseignant"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {erreur && <p className="mt-1.5 text-xs font-medium text-red-600">{erreur}</p>}
    </div>
  );
}
