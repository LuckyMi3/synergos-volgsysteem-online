import type { ReactNode } from "react";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export const metadata = {
  title: "Synergos Volgsysteem",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-white text-slate-900">
        <ImpersonationBanner />
        {children}
      </body>
    </html>
  );
}