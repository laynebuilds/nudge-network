import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Nudge Network",
  description: "Two founders' digital twins negotiate, then the humans decide.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <a href="/" className="brand">Nudge Network</a>
          <span className="muted">twins negotiate, humans decide</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
