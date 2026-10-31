"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Planet from "./planet";

// Over the landing hero the nav is transparent with white text, then it floats as a pill once you scroll.
// Everywhere else it is the floating pill from the start.
export default function SiteNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const landing = !signedIn && path === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`nav ${landing ? "over" : ""} ${!landing || scrolled ? "float" : ""}`}>
      <a href="/" className="logo">
        <Planet size={24} />
        Jebln
      </a>
      {signedIn ? (
        <div className="links">
          <a href="/">Runs</a>
          <a href="/me">Your twin</a>
        </div>
      ) : (
        <>
          <div className="links">
            <a href="/#how">How it works</a>
            <a href="/#for">What it&apos;s for</a>
            <a href="/#proof">Does it work</a>
          </div>
          <div className="r">
            <a href="/#join" className="fill">Get your twin</a>
          </div>
        </>
      )}
    </header>
  );
}
