"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

export function Modal({
  ouvert,
  onFermer,
  titre,
  children,
  largeur = "max-w-lg",
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  children: React.ReactNode;
  largeur?: string;
}) {
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onFermer}
      />
      <div
        className={clsx(
          "relative w-full rounded-xl bg-white shadow-xl",
          largeur
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">{titre}</h2>
          <button
            onClick={onFermer}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
