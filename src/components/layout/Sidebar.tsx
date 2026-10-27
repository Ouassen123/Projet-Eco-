"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  ClipboardList,
  CalendarDays,
  Receipt,
  Settings2,
  SlidersHorizontal,
  Landmark,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { PresenceIndicator } from "@/components/layout/PresenceIndicator";
import { ExerciceSelector } from "@/components/layout/ExerciceSelector";

const NAV = [
  { href: "/", label: "Tableau de bord", icone: LayoutDashboard },
  { href: "/personnel", label: "Personnel", icone: Users },
  { href: "/ordres-mission/nouveau", label: "Nouvel Ordre de Mission", icone: PlusCircle },
  { href: "/ordres-mission", label: "Ordres de Mission", icone: ClipboardList },
  { href: "/calendrier", label: "Calendrier", icone: CalendarDays },
  { href: "/etats-sommes-dues", label: "États des sommes dues", icone: Receipt },
  { href: "/referentiels", label: "Référentiels", icone: SlidersHorizontal },
  { href: "/admin", label: "Administration", icone: ShieldCheck },
  { href: "/parametres", label: "Paramètres", icone: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-pink-100 bg-gradient-to-b from-pink-50 via-violet-50 to-sky-50 text-slate-700 shadow-2xl shadow-pink-950/10">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-950/20">
          <Landmark size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-tight">Service Économique</p>
          <p className="text-xs text-slate-500 leading-tight">Ordres de mission & administration</p>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="rounded-2xl border border-pink-100 bg-white/70 px-3 py-3 shadow-sm shadow-pink-950/5 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-600">Espace de travail</p>
          <p className="mt-1 text-sm text-slate-600">
            Suivi des missions, du personnel, des comptes et du journal d'activité.
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const actif = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icone = item.icone;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    actif
                      ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-950/15"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  )}
                >
                  <Icone size={17} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <PresenceIndicator />

      <ExerciceSelector />

      <div className="px-3 pb-3">
        <LogoutButton />
      </div>

      <div className="px-5 py-4 text-xs text-slate-500">
        Application interne · Service Économique
      </div>
    </aside>
  );
}

function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5 text-sm font-medium text-rose-600 shadow-sm shadow-pink-950/5 transition-all hover:bg-rose-50 hover:text-rose-700"
    >
      <LogOut size={17} className="shrink-0" />
      <span className="truncate">Se déconnecter</span>
    </button>
  );
}
