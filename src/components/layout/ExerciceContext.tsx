"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { apiGet, messageErreur } from "@/lib/apiClient";
import { useToast } from "@/components/toast/ToastProvider";

export interface Exercice {
  id: string;
  annee: number;
  actif: boolean;
  archive: boolean;
  dateDebut: string;
  dateFin: string;
}

interface ExerciceContextValue {
  annee: number | null;
  setAnnee: (annee: number) => void;
  exercices: Exercice[];
  chargement: boolean;
}

const ExerciceContext = createContext<ExerciceContextValue | null>(null);

export function ExerciceProvider({ children }: { children: ReactNode }) {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [annee, setAnneeState] = useState<number | null>(null);
  const [chargement, setChargement] = useState(true);
  const { erreur } = useToast();

  useEffect(() => {
    let actif = true;
    apiGet<{ exercices: Exercice[]; actif: { annee: number } }>("/api/exercices-economiques")
      .then((d) => {
        if (!actif) return;
        setExercices(d.exercices);
        const sauvegarde = typeof window !== "undefined" ? localStorage.getItem("exercice-economique") : null;
        const anneeInitiale = sauvegarde ? Number(sauvegarde) : d.actif.annee;
        setAnneeState(anneeInitiale);
      })
      .catch((e) => erreur(messageErreur(e)))
      .finally(() => actif && setChargement(false));
    return () => {
      actif = false;
    };
  }, [erreur]);

  const setAnnee = (valeur: number) => {
    setAnneeState(valeur);
    if (typeof window !== "undefined") {
      localStorage.setItem("exercice-economique", String(valeur));
    }
  };

  return (
    <ExerciceContext.Provider value={{ annee, setAnnee, exercices, chargement }}>
      {children}
    </ExerciceContext.Provider>
  );
}

export function useExercice() {
  const ctx = useContext(ExerciceContext);
  if (!ctx) {
    throw new Error("useExercique doit être utilisé dans ExerciceProvider");
  }
  return ctx;
}
