"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface OptionsConfirmation {
  titre: string;
  message: string;
  libelleConfirmer?: string;
  variantConfirmer?: "primary" | "danger";
  onConfirmer: () => Promise<void> | void;
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<OptionsConfirmation | null>(null);
  const [enCours, setEnCours] = useState(false);

  const demanderConfirmation = (opts: OptionsConfirmation) => setOptions(opts);

  const dialog = options ? (
    <Modal ouvert titre={options.titre} onFermer={() => (!enCours ? setOptions(null) : undefined)} largeur="max-w-md">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle size={20} className="text-amber-600" />
        </div>
        <p className="pt-2 text-sm text-slate-600">{options.message}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" disabled={enCours} onClick={() => setOptions(null)}>
          Annuler
        </Button>
        <Button
          variant={options.variantConfirmer ?? "primary"}
          chargement={enCours}
          onClick={async () => {
            setEnCours(true);
            try {
              await options.onConfirmer();
              setOptions(null);
            } finally {
              setEnCours(false);
            }
          }}
        >
          {options.libelleConfirmer ?? "Confirmer"}
        </Button>
      </div>
    </Modal>
  ) : null;

  return { demanderConfirmation, dialog };
}
