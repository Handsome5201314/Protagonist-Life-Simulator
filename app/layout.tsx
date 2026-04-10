import Link from "next/link";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { getDb } from "@/lib/db";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/personas", label: "Persona Vault" },
  { href: "/arena", label: "Arena" },
  { href: "/dating", label: "Tarot Date Desk" },
  { href: "/worlds", label: "World Forge" },
];

export const metadata = {
  title: "Hero Life Arena",
  description: "Interactive fiction arena, support economy, and dating rehearsal built for AgentPit.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const db = await getDb();
  const user = db.users[0];

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="top-nav">
            <div className="page-wrap top-nav__row">
              <div className="brand">
                <div className="brand__seal">命</div>
                <div className="brand__copy">
                  <h1>Hero Life Arena</h1>
                  <p>Interactive Fiction + Crowd Momentum + Tarot Date Desk</p>
                </div>
              </div>

              <div className="nav-links">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-link">
                    {item.label}
                  </Link>
                ))}
                <span className="pill">Renown {user.wallet.renown}</span>
                <span className="pill">Diamonds {user.wallet.diamonds}</span>
              </div>
            </div>
          </header>

          {children}

          <div className="page-wrap footer-note">
            Built as a text-first MVP. Public support uses Renown only; Diamonds never affect public outcomes.
          </div>
        </div>
      </body>
    </html>
  );
}
