import type { ReactNode } from "react";
import { Inter, Instrument_Serif } from "next/font/google";
import { session } from "../lib/auth";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });

export const metadata = {
  title: "Nudge Network",
  description: "Your digital twin meets theirs, negotiates what you could build together, and brings back a proposal. Then you both decide.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const me = await session();
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <header className="top">
          <div className="top-in">
            <a href="/" className="brand">
              <span className="mark"><i /><i /></span>
              Nudge Network
            </a>
            <nav className="nav">
              {me ? (
                <>
                  <a href="/">Runs</a>
                  <a href="/me">Your twin</a>
                </>
              ) : (
                <>
                  <a href="/#how">How it works</a>
                  <a href="/#proof" className="hide-sm">The scorecard</a>
                  <a href="/#privacy">Privacy</a>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
        <footer className="foot">
          <div className="foot-in">
            <span>Nudge Network. Twins negotiate, humans decide.</span>
            <span>
              Built by <a href="https://github.com/laynebuilds">Layne Singh</a> and{" "}
              <a href="https://github.com/jasnoorkaur111">Jasnoor Kaur</a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
