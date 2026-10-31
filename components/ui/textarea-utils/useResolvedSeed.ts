"use client";

import { useId } from "react";
import { hashString } from "./utils";

/** Stable seed per component instance. useId matches between server and client, so no hydration drift. */
export function useResolvedSeed(seed?: number): number {
  const id = useId();
  return seed ?? hashString(id);
}
