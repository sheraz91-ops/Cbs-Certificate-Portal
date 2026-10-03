import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="hero-bg relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-navy-400/20 blur-3xl" />
      <Header />
      <div className="relative z-10 flex-1">{children}</div>
      <div className="relative z-10"><Footer /></div>
    </main>
  );
}
