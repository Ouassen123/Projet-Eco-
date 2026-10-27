import clsx from "clsx";
import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  erreur?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, erreur, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={clsx(
          "block w-full appearance-none rounded-2xl border bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm shadow-pink-950/5 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500/20 disabled:bg-pink-50 disabled:text-slate-500",
          erreur ? "border-rose-300 focus:border-rose-500" : "border-pink-200 focus:border-pink-400",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
);
Select.displayName = "Select";
