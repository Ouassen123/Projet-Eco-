import clsx from "clsx";
import { InputHTMLAttributes, forwardRef, LabelHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  erreur?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, erreur, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "block w-full rounded-2xl border px-3 py-2 text-sm text-slate-900 shadow-sm shadow-pink-950/5 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 disabled:bg-pink-50 disabled:text-slate-500",
        erreur ? "border-rose-300 focus:border-rose-500" : "border-pink-200 focus:border-pink-400",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={clsx("mb-1.5 block text-sm font-medium text-slate-700", className)}
      {...props}
    />
  );
}

export function ChampErreur({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

export function Field({
  label,
  requis,
  erreur,
  enfant,
  className,
}: {
  label: string;
  requis?: boolean;
  erreur?: string;
  enfant: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>
        {label}
        {requis && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {enfant}
      <ChampErreur message={erreur} />
    </div>
  );
}
