import { Loader2 } from "lucide-react";
import clsx from "clsx";

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={clsx("animate-spin text-indigo-600", className)} />;
}

export function PageLoader({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-slate-500">
      <Spinner size={28} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
