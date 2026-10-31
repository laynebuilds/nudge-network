"use client";

import {
  forwardRef,
  useRef,
  useState,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import {
  DRAW_IN_DURATION_MS,
  useAnimate,
  useDrawIn,
} from "@/components/ui/textarea-utils/animations-index";
import { useResolvedSeed } from "@/components/ui/textarea-utils/useResolvedSeed";
import { useSketchTheme } from "@/components/ui/textarea-utils/useSketchTheme";
import { RoughSvg } from "@/components/ui/textarea-utils/RoughSvg";
import { resolveInteractiveState } from "@/components/ui/textarea-utils/interactive";
import {
  FIELD_SIZE_STYLES,
  resolveSize,
  type DoodleSize,
} from "@/components/ui/textarea-utils/size";
import {
  useFieldValidation,
  ValidationMessage,
  type ValidationProps,
} from "@/components/ui/textarea-utils/validation";
import type { SketchProps } from "@/components/ui/textarea-utils/types";
import {
  cn,
  deriveSeed,
  doodleUiFontFamily,
  doodleUiFontWeight,
} from "@/components/ui/textarea-utils/utils";

export type TextareaSize = DoodleSize;

/**
 * Props for {@link Textarea}.
 */
export interface TextareaProps
  extends
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "color">,
    SketchProps,
    ValidationProps {
  /** Visible label above the control. */
  label?: ReactNode;
  /**
   * Control size preset.
   * @default "md"
   */
  size?: TextareaSize;
  /**
   * Play sketch draw-in animations. Defaults to {@link DoodleUIProvider} `animate` (true).
   * @default undefined (follow provider)
   */
  animate?: boolean;
}

/**
 * Multi-line text field inside a sketch box.
 *
 * @example
 * <Textarea label="Notes" name="notes" />
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      className,
      style,
      label,
      size: sizeProp = "md",
      roughness,
      seed,
      sketchColor,
      bowing,
      fillStyle,
      strokeWidth,
      hachureGap,
      hachureAngle,
      fillWeight,
      id,
      rows = 4,
      onFocus,
      onBlur,
      animate,
      disabled,
      invalid,
      error,
      errorMessage,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalidProp,
      ...rest
    },
    ref,
  ) {
    const size = resolveSize(sizeProp);
    const [focused, setFocused] = useState(false);
    const fieldRef = useRef<HTMLSpanElement>(null);
    const theme = useSketchTheme(sketchColor);
    const shouldAnimate = useAnimate(animate);
    const resolvedSeed = useResolvedSeed(seed);
    const focusSeed = deriveSeed(resolvedSeed, "focus");
    const sketchSeed = shouldAnimate && focused ? focusSeed : resolvedSeed;
    const ink = sketchColor ?? theme.ink;
    const interactive = resolveInteractiveState({ disabled });
    const validation = useFieldValidation(
      { invalid, error, errorMessage },
      { describedBy: ariaDescribedBy, errorColor: theme.error },
    );

    useDrawIn(fieldRef, DRAW_IN_DURATION_MS, shouldAnimate, sketchSeed);

    const strokeColor =
      validation.strokeOverride ??
      (focused ? (sketchColor ?? theme.accent) : ink);

    return (
      <label
        htmlFor={id}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: "100%",
          ...interactive.style,
        }}
      >
        {label ? (
          <span
            style={{
              fontSize: 13,
              fontWeight: doodleUiFontWeight(600),
              fontFamily: doodleUiFontFamily,
              color: ink,
            }}
          >
            {label}
          </span>
        ) : null}
        <span ref={fieldRef} style={{ position: "relative", display: "block" }}>
          <RoughSvg
            shape="rectangle"
            roughness={roughness}
            seed={sketchSeed}
            sketchColor={strokeColor}
            bowing={bowing}
            fillStyle={fillStyle}
            hachureGap={hachureGap}
            hachureAngle={hachureAngle}
            fillWeight={fillWeight}
            strokeWidth={
              focused && !shouldAnimate
                ? (strokeWidth ?? 1.75) + 0.35
                : focused
                  ? (strokeWidth ?? 1.75) + 0.2
                  : strokeWidth
            }
          />
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            className={cn(className)}
            disabled={interactive.isDisabled}
            aria-invalid={validation.ariaInvalid ?? ariaInvalidProp}
            aria-describedby={validation.describedBy}
            aria-disabled={interactive.aria["aria-disabled"]}
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
              width: "100%",
              boxSizing: "border-box",
              border: "none",
              outline: "none",
              background: "transparent",
              color: ink,
              fontFamily: doodleUiFontFamily,
              ...FIELD_SIZE_STYLES[size],
              resize: "vertical",
              ...style,
            }}
            {...rest}
          />
        </span>
        <ValidationMessage
          id={validation.errorId}
          style={validation.messageStyle}
        >
          {validation.errorMessage}
        </ValidationMessage>
      </label>
    );
  },
);

export default Textarea;
