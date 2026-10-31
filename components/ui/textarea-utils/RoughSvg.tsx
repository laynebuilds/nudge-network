"use client";

import { useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs";
import type { SketchProps } from "./types";
import "./sketch.css";

export interface RoughSvgProps extends SketchProps {
  shape?: "rectangle";
}

export function RoughSvg({
  shape = "rectangle",
  roughness = 1.2,
  seed,
  sketchColor = "currentColor",
  bowing = 1,
  fillStyle,
  hachureGap,
  hachureAngle,
  fillWeight,
  strokeWidth = 1.75,
}: RoughSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const parent = svg?.parentElement;
    if (!svg || !parent) return;
    const measure = () => {
      const w = Math.round(parent.clientWidth);
      const h = Math.round(parent.clientHeight);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    const { w, h } = size;
    if (w < 6 || h < 6) return;
    const rc = rough.svg(svg);
    const options = {
      roughness,
      bowing,
      stroke: sketchColor,
      strokeWidth,
      ...(seed !== undefined ? { seed } : {}),
      ...(fillStyle ? { fill: sketchColor, fillStyle } : {}),
      ...(hachureGap !== undefined ? { hachureGap } : {}),
      ...(hachureAngle !== undefined ? { hachureAngle } : {}),
      ...(fillWeight !== undefined ? { fillWeight } : {}),
    };
    if (shape === "rectangle") svg.appendChild(rc.rectangle(2, 2, w - 4, h - 4, options));
  }, [size, shape, roughness, seed, sketchColor, bowing, fillStyle, hachureGap, hachureAngle, fillWeight, strokeWidth]);

  return (
    <svg
      ref={svgRef}
      className="doodle-rough-svg"
      aria-hidden="true"
      focusable="false"
      width={size.w || undefined}
      height={size.h || undefined}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, overflow: "visible" }}
    />
  );
}

export default RoughSvg;
