"use client";

import { useId, type CSSProperties, type ReactNode } from "react";

export interface ValidationProps {
  invalid?: boolean;
  error?: boolean;
  errorMessage?: ReactNode;
}

export interface FieldValidation {
  strokeOverride?: string;
  ariaInvalid?: boolean;
  describedBy?: string;
  errorId: string;
  errorMessage?: ReactNode;
  messageStyle: CSSProperties;
}

function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

export function useFieldValidation(
  props: ValidationProps,
  { describedBy, errorColor }: { describedBy?: string; errorColor: string },
): FieldValidation {
  const errorId = `${useId()}-error`;
  const showMessage = hasContent(props.errorMessage);
  const isInvalid = Boolean(props.invalid || props.error || showMessage);
  const ids = [describedBy, showMessage ? errorId : undefined].filter(Boolean).join(" ");
  return {
    strokeOverride: isInvalid ? errorColor : undefined,
    ariaInvalid: isInvalid ? true : undefined,
    describedBy: ids || undefined,
    errorId,
    errorMessage: showMessage ? props.errorMessage : undefined,
    messageStyle: { color: errorColor, fontSize: 13, fontWeight: 500, lineHeight: 1.4, margin: 0 },
  };
}

export function ValidationMessage({
  id,
  style,
  children,
}: {
  id: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  if (!hasContent(children)) return null;
  return (
    <span id={id} role="alert" style={{ display: "block", ...style }}>
      {children}
    </span>
  );
}
