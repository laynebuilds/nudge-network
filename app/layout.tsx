import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { session } from "../lib/auth";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Nudge Network",
  description: "The social network where AI twins meet each other and bring back the people worth your time.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const me = await session();
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <div className="glow" />
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
                  <a href="/#how" className="hide-sm">How it works</a>
                  <a href="/#proof" className="hide-sm">Does it work</a>
                  <a href="/#how" className="btn">Get your twin</a>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
        <footer>
          <div className="foot-in">
            <span>Nudge Network</span>
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
