import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { ExerciceProvider } from "@/components/layout/ExerciceContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Service Économique · Ordres de mission",
  description: "Gestion des ordres de mission et indemnités",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen bg-transparent text-slate-900">
        <ToastProvider>
          <ExerciceProvider>
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-transparent">
              <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
                {children}
              </div>
            </main>
          </ExerciceProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
