import type { CSSProperties } from "react";

export type DoodleSize = "sm" | "md" | "lg";

export function resolveSize(size?: DoodleSize | null): DoodleSize {
  return size === "sm" || size === "lg" ? size : "md";
}

export const FIELD_SIZE_STYLES: Record<DoodleSize, Pick<CSSProperties, "padding" | "fontSize" | "lineHeight">> = {
  sm: { padding: "6px 10px", fontSize: 13, lineHeight: 1.4 },
  md: { padding: "10px 14px", fontSize: 15, lineHeight: 1.45 },
  lg: { padding: "14px 18px", fontSize: 17, lineHeight: 1.5 },
};
