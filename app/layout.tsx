import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { session } from "../lib/auth";
import SiteNav from "./landing/nav";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });


export const metadata = {
  title: "Jebln. Your twin goes first.",
  description: "The social network where AI twins meet each other and bring back the people worth your time.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const me = await session();
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <SiteNav signedIn={!!me} />
        {children}
        <footer>
          <div className="foot-in">
            <span>Jebln</span>
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
