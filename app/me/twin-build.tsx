"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Founder } from "../../lib/schemas";
import { LINK_FIELDS, LINK_META, normalizeLink, type LinkField } from "../../lib/links";
import "./twin-build.css";

const DURATION = 7200;
const FLIGHT = 1500;
const MAX_CHIPS = 40;

const SOURCE_NAMES: Record<string, string> = {
  imessage: "iMessage",
  whatsapp: "WhatsApp",
  email: "Email",
  calendar: "Calendar",
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
  doc: "Docs",
};

const firstWords = (s: string, n: number) => {
  const words = s.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length < 2) return "";
  const out = words.slice(0, n).join(" ").replace(/[,.;:!?]+$/, "");
  return out.length > 34 ? `${out.slice(0, 32)}...` : words.length > n ? `${out}...` : out;
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// What flies into the figure: the person's real sources first (links, counts), then snippets in their own words.
function chipLabels(items: Founder["items"], links: Partial<Record<LinkField, string>>): string[] {
  const head: string[] = [];
  for (const f of LINK_FIELDS) {
    const url = normalizeLink(links[f] ?? "");
    if (url) head.push(f === "website" ? host(url) || "Your site" : LINK_META[f].label);
  }
  const count = (src: string) => items.filter((i) => i.source === src).length;
  const photos = count("photo");
  const answers = count("interview");
  const messages = count("imessage") + count("whatsapp") + count("email");
  if (photos) head.push(`${photos} photo${photos === 1 ? "" : "s"}`);
  if (answers) head.push(`${answers} answer${answers === 1 ? "" : "s"}`);
  if (messages) head.push(`${messages} message${messages === 1 ? "" : "s"}`);
  for (const s of new Set(items.map((i) => i.source))) if (SOURCE_NAMES[s] && !head.includes(SOURCE_NAMES[s])) head.push(SOURCE_NAMES[s]);

  const snippets = items
    .map((i, n) => ({ n, label: firstWords(i.caption ?? i.text ?? i.title ?? i.subject ?? "", 3 + (n % 3)) }))
    .filter((x) => x.label)
    // Spread across the history instead of always taking the oldest items.
    .sort((a, b) => ((a.n * 7919) % 97) - ((b.n * 7919) % 97))
    .map((x) => x.label);

  const out: string[] = [];
  // Interleave so sources and snippets alternate rather than arriving in two blocks.
  for (let i = 0; out.length < MAX_CHIPS && (i < head.length || i < snippets.length); i++) {
    if (i < head.length && !out.includes(head[i])) out.push(head[i]);
    if (i < snippets.length && out.length < MAX_CHIPS && !out.includes(snippets[i])) out.push(snippets[i]);
  }
  return out.length ? out : ["Your name", "Your bio", "LinkedIn"];
}

function stageLines(items: Founder["items"], links: Partial<Record<LinkField, string>>): string[] {
  const photos = items.filter((i) => i.source === "photo").length;
  const out: string[] = [];
  if (links.linkedin?.trim()) out.push("Reading your LinkedIn");
  if (photos) out.push(`Learning from ${photos} photo${photos === 1 ? "" : "s"}`);
  out.push("Taking in your own words");
  out.push("Shaping how you negotiate");
  return out;
}

// The trigger at the end of the profile form, plus the one automatic play the first time the required fields
// are completed in this browser. `complete` and `saving` come from the form, so it fires only once the save lands.
export default function BuildTwin({
  founder,
  links,
  complete,
  saving,
}: {
  founder: Founder;
  links: Partial<Record<LinkField, string>>;
  complete: boolean;
  saving: boolean;
}) {
  // The labels are fixed when it opens, so a reload of the profile underneath does not restart the animation.
  const [open, setOpen] = useState<{ chips: string[]; stages: string[] } | null>(null);
  const play = () => setOpen({ chips: chipLabels(founder.items, links), stages: stageLines(founder.items, links) });
  const storageKey = `jebln-twin-built-${founder.owner.id}`;
  // Only a completion that happens during this visit plays on its own; a profile that loads complete does not.
  const armed = useRef(false);
  useEffect(() => {
    if (!complete) armed.current = true;
  }, [complete]);

  // The Continue button at the end of /me asks for the build through a window event. If something
  // required is still missing, take the person to the first field that needs them instead.
  useEffect(() => {
    const onContinue = () => {
      if (complete) {
        try {
          localStorage.setItem(storageKey, "1");
        } catch {}
        play();
        return;
      }
      const field = document.querySelector<HTMLElement>('.profile-form [aria-invalid="true"], .profile-form input:invalid, .profile-form textarea:invalid');
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus({ preventScroll: true });
    };
    window.addEventListener("jebln:continue", onContinue);
    return () => window.removeEventListener("jebln:continue", onContinue);
  });

  const remember = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
  };

  useEffect(() => {
    if (!complete || saving || !armed.current) return;
    // Waits for a pause in typing so it does not open while the last field is still being filled.
    let t: ReturnType<typeof setTimeout>;
    const fire = () => {
      armed.current = false;
      let seen = false;
      try {
        seen = localStorage.getItem(storageKey) === "1";
      } catch {}
      if (seen) return;
      remember();
      play();
    };
    const restart = () => {
      clearTimeout(t);
      t = setTimeout(fire, 1800);
    };
    restart();
    document.addEventListener("input", restart);
    return () => {
      clearTimeout(t);
      document.removeEventListener("input", restart);
    };
  }, [complete, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="row twin-build-trigger">
        <button
          type="button"
          disabled={!complete}
          onClick={() => {
            remember();
            play();
          }}
        >
          Build my twin
        </button>
        {!complete && <span className="muted">Add your name, bio and LinkedIn first.</span>}
      </div>
      {open && (
        <TwinBuild chips={open.chips} stages={open.stages} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

// ---- The figure: a point cloud of a standing person, y up from -1 (feet) to 1 (top of head). ----

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function buildFigure(): Float32Array {
  const pts: number[] = [];
  const rand = rng(7);
  const ring = (cx: number, y: number, cz: number, rx: number, rz: number, n: number) => {
    const off = rand() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      pts.push(cx + Math.cos(a) * rx + (rand() - 0.5) * 0.01, y + (rand() - 0.5) * 0.012, cz + Math.sin(a) * rz);
    }
  };
  const tube = (a: number[], b: number[], r0: number, r1: number, rings: number, per: number) => {
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const r = r0 + (r1 - r0) * t;
      ring(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, r, r, per);
    }
  };
  // Head
  for (let i = 1; i < 15; i++) {
    const p = (i / 15) * Math.PI;
    ring(0, 0.8 + Math.cos(p) * 0.15, 0.005, Math.sin(p) * 0.12, Math.sin(p) * 0.13, Math.max(6, Math.round(Math.sin(p) * 22)));
  }
  tube([0, 0.6, 0], [0, 0.67, 0], 0.052, 0.048, 3, 12);
  // Torso: shoulders, chest, waist, hips
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = 0.6 - t * 0.66;
    const rx =
      t < 0.08 ? 0.14 + (t / 0.08) * 0.14 : t < 0.5 ? 0.28 - ((t - 0.08) / 0.42) * 0.09 : 0.19 + ((t - 0.5) / 0.5) * 0.04;
    const rz = t < 0.08 ? 0.08 + (t / 0.08) * 0.05 : t < 0.35 ? 0.135 : 0.12;
    ring(0, y, 0, rx, rz, 36);
  }
  // Arms, slightly away from the body
  for (const s of [-1, 1]) {
    tube([s * 0.31, 0.54, 0], [s * 0.36, 0.2, 0.01], 0.062, 0.05, 9, 12);
    tube([s * 0.36, 0.2, 0.01], [s * 0.39, -0.12, 0.04], 0.05, 0.04, 9, 10);
    tube([s * 0.11, -0.06, 0], [s * 0.12, -0.5, 0.01], 0.1, 0.07, 12, 14);
    tube([s * 0.12, -0.5, 0.01], [s * 0.13, -0.94, 0], 0.068, 0.05, 12, 12);
  }
  return new Float32Array(pts);
}

// ---- The ASCII "dither" recipe, reimplemented on Canvas2D. ----

const RECIPE = {
  cellSize: 3,
  density: 24,
  coverage: 100,
  toneCurve: [[0, 0], [0.28, 0.14], [0.72, 0.86], [1, 1]] as [number, number][],
  chromatic: 15,
  animSpeed: 80,
  animIntensity: 30,
};

// 4x4 ordered dither thresholds, centred in each step.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const TONE = (() => {
  const lut = new Float32Array(256);
  const c = RECIPE.toneCurve;
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    let k = 1;
    while (k < c.length - 1 && x > c[k][0]) k++;
    const [x0, y0] = c[k - 1];
    const [x1, y1] = c[k];
    lut[i] = y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return lut;
})();

const hash = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

type Chip = { label: string; start: number; x0: number; y0: number; cx: number; cy: number; done: boolean };

function TwinBuild({ chips, stages, onClose }: { chips: string[]; stages: string[]; onClose: () => void }) {
  const [phase, setPhase] = useState<"building" | "ready">("building");
  const [stage, setStage] = useState(0);
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const wrap = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLCanvasElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Esc closes, the page behind stops scrolling, and focus returns to where it was.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  useEffect(() => {
    const box = wrap.current;
    const fx = fxRef.current;
    const top = topRef.current;
    if (!box || !fx || !top) return;
    const fig = buildFigure();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const font = getComputedStyle(document.body).fontFamily;
    const cell = RECIPE.cellSize;
    const gain = RECIPE.density / 24;
    // At 3px cells a full-cell shift splits every cell into three colours, so 15 maps to a 1px fringe.
    const chroma = Math.max(1, Math.round(RECIPE.chromatic / 15));
    const flickerMs = 1000 / (4 + RECIPE.animSpeed * 0.2);
    const flickerAmp = RECIPE.animIntensity / 100;

    // Offscreen pipeline: source (full size), cells (one pixel per cell), and one canvas per colour channel.
    const source = document.createElement("canvas");
    const cells = document.createElement("canvas");
    const chans = [0, 1, 2].map(() => document.createElement("canvas"));
    const sctx = source.getContext("2d")!;
    const cctx = cells.getContext("2d", { willReadFrequently: true })!;
    const chanCtx = chans.map((c) => c.getContext("2d")!);
    const fxCtx = fx.getContext("2d")!;
    const tctx = top.getContext("2d")!;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let chanData: ImageData[] = [];

    const resize = () => {
      const r = box.getBoundingClientRect();
      // The effect runs at CSS pixels (dpr 1) to stay cheap on phones; only the chip labels go sharp.
      w = Math.max(1, Math.round(Math.min(r.width, 1100)));
      h = Math.max(1, Math.round(Math.min(r.height, 1000)));
      fx.width = source.width = w;
      fx.height = source.height = h;
      top.width = Math.round(w * dpr);
      top.height = Math.round(h * dpr);
      cols = Math.ceil(w / cell);
      rows = Math.ceil(h / cell);
      cells.width = cols;
      cells.height = rows;
      chans.forEach((c) => ((c.width = cols), (c.height = rows)));
      chanData = chanCtx.map((c) => c.createImageData(cols, rows));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    // Chips spawn evenly through the build and land before it settles.
    const spread = DURATION - FLIGHT - 900;
    const flying: Chip[] = chips.map((label, i) => {
      const a = hash(i, 3) * Math.PI * 2;
      return { label, start: 400 + (i / Math.max(1, chips.length)) * spread, x0: Math.cos(a), y0: Math.sin(a), cx: hash(i, 5) < 0.5 ? -1 : 1, cy: 0, done: false };
    });

    let pulse = 0;
    let lastStage = -1;
    let t0 = performance.now();
    let raf = 0;
    let prev = t0;

    const frame = (now: number) => {
      const t = now - t0;
      const dt = Math.min(64, now - prev);
      prev = now;
      const ready = phaseRef.current === "ready";
      const progress = reduced || ready ? 1 : Math.min(1, t / DURATION);
      if (!ready && !reduced) {
        const s = Math.min(stages.length - 1, Math.floor(progress * stages.length));
        if (s !== lastStage) setStage((lastStage = s));
        if (t >= DURATION) setPhase("ready");
      }

      // Layout: the figure fills the space above the text block at the bottom, head to feet.
      const avail = h - 56 - (w < 760 ? 250 : 230);
      const scale = Math.max(60, Math.min(avail / 2.1, w * 0.6));
      const cx = w / 2;
      const cy = 56 + avail / 2 + scale * 0.08;
      const hx = cx;
      const hy = cy - 0.42 * scale;
      const angle = reduced ? 0.5 : t * 0.0008;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const buildY = -1.05 + progress * 2.15;
      pulse = Math.max(0, pulse - dt * 0.0012);
      const glow = 0.35 + progress * 0.4 + pulse * 0.6;

      // 1. Source: the rotating figure in brand colours on nothing.
      sctx.clearRect(0, 0, w, h);
      const aura = sctx.createRadialGradient(hx, hy, 0, hx, hy, scale * (0.35 + pulse * 0.15));
      aura.addColorStop(0, `rgba(255,232,194,${Math.min(1, 0.55 * glow)})`);
      aura.addColorStop(0.4, `rgba(244,157,55,${0.3 * glow})`);
      aura.addColorStop(1, "rgba(244,157,55,0)");
      sctx.fillStyle = aura;
      sctx.fillRect(0, 0, w, h);
      const D = 3.2;
      const dot = Math.max(3, scale * 0.018);
      for (let i = 0; i < fig.length; i += 3) {
        const x = fig[i];
        const y = fig[i + 1];
        const z = fig[i + 2];
        const rx = x * cos + z * sin;
        const rz = -x * sin + z * cos;
        const f = D / (D - rz);
        const depth = Math.min(1, Math.max(0, (rz + 0.3) / 0.6));
        const built = y < buildY ? 1 : y < buildY + 0.08 ? 1.6 : 0.22;
        const near = Math.exp(-Math.hypot(x, y - 0.42, z) * 4) * glow;
        const lum = Math.min(1, (0.6 + depth * 0.4) * built + near * 0.5);
        // Warm orange in the shadows, cream where it is lit.
        const k = Math.min(1, depth * 0.6 + near);
        const r = 244 + (255 - 244) * k;
        const g = 157 + (232 - 157) * k;
        const b = 55 + (194 - 55) * k;
        sctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${lum})`;
        const sz = dot * f;
        sctx.fillRect(cx + rx * scale * f - sz / 2, cy - y * scale * f - sz / 2, sz, sz);
      }

      // Chips in flight: a comet in the source (so it is dithered with the figure), a crisp label on top.
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tctx.clearRect(0, 0, w, h);
      const fs = w < 520 ? 11 : 12.5;
      tctx.font = `500 ${fs}px ${font}`;
      tctx.textBaseline = "middle";
      const reach = Math.hypot(w, h) * 0.55;
      for (const c of flying) {
        if (c.done || reduced) continue;
        const u = ready ? 1 : (t - c.start) / FLIGHT;
        if (u < 0) continue;
        if (u >= 1) {
          c.done = true;
          pulse = Math.min(1.4, pulse + 0.35);
          continue;
        }
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const sx = hx + c.x0 * reach;
        const sy = hy + c.y0 * reach;
        // Control point off to one side so each chip curves in.
        const mx = (sx + hx) / 2 - (sy - hy) * 0.35 * c.cx;
        const my = (sy + hy) / 2 + (sx - hx) * 0.35 * c.cx;
        const px = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * mx + e * e * hx;
        const py = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * my + e * e * hy;
        const fade = Math.min(1, u / 0.15) * (u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1);
        const comet = sctx.createRadialGradient(px, py, 0, px, py, 14);
        comet.addColorStop(0, `rgba(255,232,194,${0.9 * fade})`);
        comet.addColorStop(1, "rgba(244,157,55,0)");
        sctx.fillStyle = comet;
        sctx.fillRect(px - 14, py - 14, 28, 28);
        const sc = 1 - Math.max(0, u - 0.6) * 1.4;
        tctx.save();
        tctx.globalAlpha = fade;
        tctx.translate(px, py);
        tctx.scale(sc, sc);
        const tw = tctx.measureText(c.label).width;
        const pw = tw + 18;
        const ph = fs + 12;
        tctx.beginPath();
        tctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
        tctx.fillStyle = "rgba(22,11,11,.78)";
        tctx.fill();
        tctx.strokeStyle = "rgba(244,157,55,.7)";
        tctx.lineWidth = 1;
        tctx.stroke();
        tctx.fillStyle = "#FFE8C2";
        tctx.fillText(c.label, -tw / 2, 0.5);
        tctx.restore();
      }

      // 2. One pixel per cell: the browser's downscale averages each 3x3 block.
      cctx.clearRect(0, 0, cols, rows);
      cctx.imageSmoothingEnabled = true;
      cctx.imageSmoothingQuality = "medium";
      cctx.drawImage(source, 0, 0, cols * cell, rows * cell, 0, 0, cols, rows);
      const src = cctx.getImageData(0, 0, cols, rows).data;
      const [R, G, B] = chanData.map((d) => d.data);
      const tick = reduced ? 0 : Math.floor(now / flickerMs);
      for (let y = 0; y < rows; y++) {
        // 7. Flicker: a few rows dip each tick, and every cell wobbles a little.
        const rh = hash(y, tick);
        const rowF = rh < 0.18 ? 1 - flickerAmp * (0.5 + rh * 2.5) : 1;
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const a = src[i + 3];
          R[i + 3] = G[i + 3] = B[i + 3] = 0;
          if (a < 3) continue;
          const r = src[i];
          const g = src[i + 1];
          const b = src[i + 2];
          // Luminance of the whole cell, so a half-covered cell counts half.
          const l0 = ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * (a / 255) * gain;
          const cellF = reduced ? 1 : 1 - flickerAmp * 0.35 * hash(i, tick);
          const lum = TONE[Math.min(255, (l0 * 255) | 0)] * rowF * cellF;
          // 3. Ordered dither: the cell is on only when it beats its Bayer threshold.
          if (lum <= BAYER[((y & 3) << 2) | (x & 3)]) continue;
          const m = Math.max(r, g, b) || 1;
          const k = (255 / m) * (0.62 + 0.38 * lum);
          R[i] = Math.min(255, r * k);
          G[i + 1] = Math.min(255, g * k);
          B[i + 2] = Math.min(255, b * k);
          R[i + 3] = G[i + 3] = B[i + 3] = 255;
        }
      }
      chanData.forEach((d, n) => chanCtx[n].putImageData(d, 0, 0));

      // 5. Chromatic aberration: red and blue drawn apart, added back together.
      fxCtx.clearRect(0, 0, w, h);
      fxCtx.imageSmoothingEnabled = false;
      fxCtx.globalCompositeOperation = "lighter";
      fxCtx.drawImage(chans[0], -chroma, 0, cols * cell, rows * cell);
      fxCtx.drawImage(chans[1], 0, 0, cols * cell, rows * cell);
      fxCtx.drawImage(chans[2], chroma, 0, cols * cell, rows * cell);
      fxCtx.globalCompositeOperation = "source-over";

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      frame(performance.now());
      ro.disconnect();
      const redraw = () => frame(performance.now());
      const ro2 = new ResizeObserver(() => (resize(), redraw()));
      ro2.observe(box);
      return () => ro2.disconnect();
    }
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [chips, stages, reduced]);

  return createPortal(
    <div className="twin-build" role="dialog" aria-modal="true" aria-label="Building your twin">
      <div className="twin-build-card" ref={dialog} tabIndex={-1}>
        <div className="twin-build-stage" ref={wrap}>
          <canvas ref={fxRef} className="twin-build-fx" aria-hidden="true" />
          <canvas ref={topRef} className="twin-build-top" aria-hidden="true" />
        </div>
        {phase === "building" && !reduced && (
          <button type="button" className="twin-build-skip" onClick={() => setPhase("ready")}>
            Skip
          </button>
        )}
        {reduced && (
          <ul className="twin-build-list" aria-label="What your twin learned from">
            {chips.slice(0, 18).map((c, i) => (
              <li key={i} style={{ "--d": `${i * 60}ms` } as CSSProperties}>{c}</li>
            ))}
          </ul>
        )}
        <div className="twin-build-foot">
          {phase === "building" && !reduced ? (
            <p className="twin-build-status" aria-live="polite" key={stage}>
              {stages[stage]}
              <span className="twin-build-dots" aria-hidden="true"><i /><i /><i /></span>
            </p>
          ) : (
            <div className="twin-build-ready">
              <h2>Your twin is ready</h2>
              <p>It holds everything you shared and decides the way you would.</p>
              <div className="twin-build-actions">
                <a className="twin-build-primary" href="/">See your matches</a>
                <button type="button" className="twin-build-close" onClick={onClose}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
