"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  notifier: (type: ToastType, message: string) => void;
  succes: (message: string) => void;
  erreur: (message: string) => void;
  avertissement: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONES: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-sky-50 border-sky-200 text-sky-800",
};

const ICONE_COULEUR: Record<ToastType, string> = {
  success: "text-emerald-500",
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-sky-500",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const retirer = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notifier = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => retirer(id), 5000);
    },
    [retirer]
  );

  const value: ToastContextValue = {
    notifier,
    succes: (m) => notifier("success", m),
    erreur: (m) => notifier("error", m),
    avertissement: (m) => notifier("warning", m),
    info: (m) => notifier("info", m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icone = ICONES[t.type];
          return (
            <div
              key={t.id}
              role="alert"
              className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-md ${STYLES[t.type]} animate-in`}
            >
              <Icone size={18} className={`mt-0.5 shrink-0 ${ICONE_COULEUR[t.type]}`} />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                onClick={() => retirer(t.id)}
                className="shrink-0 opacity-60 hover:opacity-100"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit etre utilise dans <ToastProvider>.");
  return ctx;
}
