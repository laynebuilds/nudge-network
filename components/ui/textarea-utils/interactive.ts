import type { CSSProperties } from "react";

export function resolveInteractiveState({ disabled }: { disabled?: boolean }): {
  isDisabled: boolean;
  style: CSSProperties;
  aria: { "aria-disabled"?: boolean };
} {
  const isDisabled = Boolean(disabled);
  return {
    isDisabled,
    style: isDisabled ? { opacity: 0.55, cursor: "not-allowed" } : {},
    aria: isDisabled ? { "aria-disabled": true } : {},
  };
}
