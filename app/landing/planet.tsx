// The Jebln mark: Jupiter on a night-sky tile with a few stars.
// app/icon.svg holds the same drawing for the favicon. `square` drops the rounded corners for the
// Apple touch icon, since iOS applies its own mask.
const tile = (rx: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
<linearGradient id="jbs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1830"/><stop offset="1" stop-color="#0d0a12"/></linearGradient>
<linearGradient id="jbb" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#e9cfa0"/><stop offset=".14" stop-color="#cf9459"/><stop offset=".22" stop-color="#f3e2c0"/>
<stop offset=".33" stop-color="#b8653c"/><stop offset=".42" stop-color="#e7c08d"/><stop offset=".52" stop-color="#f4e6c8"/>
<stop offset=".6" stop-color="#d49a62"/><stop offset=".7" stop-color="#9d5333"/><stop offset=".8" stop-color="#e2b884"/>
<stop offset=".9" stop-color="#c58451"/><stop offset="1" stop-color="#a86a42"/></linearGradient>
<radialGradient id="jbl" cx="33%" cy="27%" r="85%"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1e0c05" stop-opacity=".6"/></radialGradient>
</defs>
<rect width="64" height="64" rx="${rx}" fill="url(#jbs)"/>
<circle cx="13" cy="14" r="1" fill="#fff" opacity=".8"/><circle cx="51" cy="52" r=".8" fill="#fff" opacity=".6"/><circle cx="54" cy="16" r=".6" fill="#fff" opacity=".7"/>
<g transform="rotate(-12 32 33)">
<circle cx="32" cy="33" r="19" fill="url(#jbb)"/>
<ellipse cx="38.84" cy="37.18" rx="4.18" ry="2.28" fill="#c0432a"/><ellipse cx="38.84" cy="37.18" rx="2.09" ry="1.05" fill="#e2724c"/>
</g>
<circle cx="32" cy="33" r="19" fill="url(#jbl)"/>
</svg>`;

export const PLANET_SVG = tile(14);
export const PLANET_SVG_SQUARE = tile(0);

export default function Planet({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, display: "inline-block", flex: "none", lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: PLANET_SVG }}
    />
  );
}
