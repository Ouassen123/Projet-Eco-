"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Taille = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  taille?: Taille;
  chargement?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600 focus-visible:ring-pink-500 disabled:from-pink-300 disabled:to-violet-300",
  secondary: "bg-pink-50 text-pink-800 hover:bg-pink-100 focus-visible:ring-pink-400 disabled:text-pink-300",
  danger: "bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-500 disabled:bg-rose-300",
  ghost: "bg-transparent text-slate-600 hover:bg-pink-50 hover:text-pink-700 focus-visible:ring-pink-400",
  outline: "border border-pink-200 bg-white text-slate-700 hover:bg-pink-50 focus-visible:ring-pink-400",
};

const TAILLES: Record<Taille, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", taille = "md", chargement, disabled, className, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || chargement}
        className={clsx(
          "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed shadow-sm shadow-pink-950/5",
          VARIANTS[variant],
          TAILLES[taille],
          className
        )}
        {...props}
      >
        {chargement && <Loader2 size={16} className="animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
