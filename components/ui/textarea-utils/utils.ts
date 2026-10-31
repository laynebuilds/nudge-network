type ClassValue = string | number | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

/** FNV-1a 32-bit hash, kept positive and non-zero so roughjs treats it as a real seed. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 2147483646 + 1;
}

export function deriveSeed(seed: number, salt: string): number {
  return hashString(`${seed}:${salt}`);
}

export const doodleUiFontFamily = "inherit";

export function doodleUiFontWeight(w: number): number {
  return w;
}
