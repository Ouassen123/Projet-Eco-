"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { ExerciceProvider } from "@/components/layout/ExerciceContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <main className="flex-1 overflow-y-auto bg-transparent">{children}</main>;
  }

  return (
    <ExerciceProvider>
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-transparent">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </div>
      </main>
    </ExerciceProvider>
  );
}
