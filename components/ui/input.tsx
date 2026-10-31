"use client";

import { forwardRef, useRef, useState, type ReactNode, type InputHTMLAttributes } from "react";
import { DRAW_IN_DURATION_MS, useAnimate, useDrawIn } from "./textarea-utils/animations-index";
import { useResolvedSeed } from "./textarea-utils/useResolvedSeed";
import { useSketchTheme } from "./textarea-utils/useSketchTheme";
import { RoughSvg } from "./textarea-utils/RoughSvg";
import { resolveInteractiveState } from "./textarea-utils/interactive";
import { FIELD_SIZE_STYLES, resolveSize, type DoodleSize } from "./textarea-utils/size";
import { useFieldValidation, ValidationMessage, type ValidationProps } from "./textarea-utils/validation";
import type { SketchProps } from "./textarea-utils/types";
import { cn, deriveSeed, doodleUiFontFamily, doodleUiFontWeight } from "./textarea-utils/utils";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "color">,
    SketchProps,
    ValidationProps {
  label?: ReactNode;
  size?: DoodleSize;
  animate?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    size = "md",
    roughness,
    seed,
    sketchColor,
    bowing,
    fillStyle,
    strokeWidth = 1.75,
    hachureGap,
    hachureAngle,
    fillWeight,
    id,
    onFocus,
    onBlur,
    animate,
    disabled,
    invalid,
    error,
    errorMessage,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalidProp,
    className,
    style,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef<HTMLSpanElement>(null);
  const resolvedSeed = useResolvedSeed(seed);
  const theme = useSketchTheme(sketchColor);
  const shouldAnimate = useAnimate(animate);
  const interactive = resolveInteractiveState({ disabled });
  const resolvedSize = resolveSize(size);
  const validation = useFieldValidation(
    { invalid, error, errorMessage },
    { describedBy: ariaDescribedBy, errorColor: theme.error },
  );

  const stroke = validation.strokeOverride ?? (focused ? theme.accent : theme.ink);
  const sketchStrokeWidth = focused ? strokeWidth + (shouldAnimate ? 0.2 : 0.35) : strokeWidth;
  const sketchSeed = shouldAnimate && focused ? deriveSeed(resolvedSeed, "focus") : resolvedSeed;

  useDrawIn(fieldRef, DRAW_IN_DURATION_MS, shouldAnimate, sketchSeed);

  return (
    <label
      htmlFor={id}
      className={cn("doodle-field", className)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
        fontFamily: doodleUiFontFamily,
        fontWeight: doodleUiFontWeight(400),
        fontSize: "inherit",
        ...interactive.style,
      }}
    >
      {label ? (
        <span style={{ fontSize: 13, fontWeight: doodleUiFontWeight(600), lineHeight: 1.3 }}>{label}</span>
      ) : null}
      <span ref={fieldRef} style={{ position: "relative", display: "block", width: "100%" }}>
        <RoughSvg
          shape="rectangle"
          roughness={roughness}
          seed={sketchSeed}
          sketchColor={stroke}
          bowing={bowing}
          fillStyle={fillStyle}
          hachureGap={hachureGap}
          hachureAngle={hachureAngle}
          fillWeight={fillWeight}
          strokeWidth={sketchStrokeWidth}
        />
        <input
          {...rest}
          {...interactive.aria}
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={validation.ariaInvalid ?? ariaInvalidProp}
          aria-describedby={validation.describedBy}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={{
            position: "relative",
            zIndex: 1,
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            margin: 0,
            border: "none",
            borderRadius: 0,
            outline: "none",
            boxShadow: "none",
            background: "transparent",
            color: "inherit",
            fontFamily: doodleUiFontFamily,
            fontWeight: doodleUiFontWeight(400),
            resize: "none",
            cursor: interactive.isDisabled ? "not-allowed" : undefined,
            ...FIELD_SIZE_STYLES[resolvedSize],
            ...style,
          }}
        />
      </span>
      <ValidationMessage id={validation.errorId} style={validation.messageStyle}>
        {validation.errorMessage}
      </ValidationMessage>
    </label>
  );
});

export default Input;
