"use client";

import { useEffect } from "react";

// Adds .in to every .rv and .stop as it scrolls into view.
export default function Reveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -12% 0px" }
    );
    document.querySelectorAll(".rv, .stop").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
