"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

const LIGHT = { ink: "#17141c", accent: "#2f5bea", error: "#b3261e" };
const DARK = { ink: "#ecebe7", accent: "#7d9bff", error: "#ff8a80" };

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Dark only when the OS asks for it AND the page opts into dark rendering.
 * A root with `color-scheme: light` (this app today) keeps a light paper
 * background in dark mode, so light ink would vanish on it.
 */
function getSnapshot(): boolean {
  if (!window.matchMedia(QUERY).matches) return false;
  const scheme = getComputedStyle(document.documentElement).colorScheme || "normal";
  return scheme !== "light" && scheme !== "only light";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useSketchTheme(sketchColor?: string): { ink: string; accent: string; error: string } {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const palette = dark ? DARK : LIGHT;
  return { ...palette, ink: sketchColor ?? palette.ink };
}
