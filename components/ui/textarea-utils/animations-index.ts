"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

export const DRAW_IN_DURATION_MS = 450;

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(REDUCED);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** True when animation is wanted and the user has not asked for reduced motion. */
export function useAnimate(animate: boolean = true): boolean {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  return animate && !reduced;
}

/** Strokes the SVG paths inside ref.current in from nothing whenever enabled or seed changes. */
export function useDrawIn(
  ref: RefObject<Element | null>,
  durationMs: number,
  enabled: boolean,
  seed: number,
): void {
  useEffect(() => {
    if (!enabled) return;
    // Wait a frame so the rough SVG has redrawn for the new seed or size.
    const frame = requestAnimationFrame(() => {
      const root = ref.current;
      if (!root) return;
      root.querySelectorAll<SVGPathElement>("svg path").forEach((path) => {
        const length = path.getTotalLength();
        if (!length) return;
        path.style.transition = "none";
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.getBoundingClientRect();
        path.style.transition = `stroke-dashoffset ${durationMs}ms ease-out`;
        path.style.strokeDashoffset = "0";
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [ref, durationMs, enabled, seed]);
}
