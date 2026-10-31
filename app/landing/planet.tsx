// The Jebln mark: a small Jupiter. Banded, a red spot, lit from the top left.
// app/icon.svg holds the same drawing for the favicon.
export const PLANET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
<clipPath id="p"><circle cx="32" cy="32" r="28"/></clipPath>
<radialGradient id="l" cx="34%" cy="28%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2a1208" stop-opacity=".55"/></radialGradient>
</defs>
<g clip-path="url(#p)">
<g transform="rotate(-14 32 32)">
<rect x="-10" y="-10" width="84" height="84" fill="#ecd3a6"/>
<rect x="-10" y="8" width="84" height="7" fill="#c98a52"/>
<rect x="-10" y="15" width="84" height="4" fill="#f4e4c4"/>
<rect x="-10" y="19" width="84" height="8" fill="#b4623a"/>
<rect x="-10" y="27" width="84" height="3" fill="#e2b783"/>
<rect x="-10" y="33" width="84" height="6" fill="#d89c63"/>
<rect x="-10" y="39" width="84" height="3" fill="#f2dfbb"/>
<rect x="-10" y="42" width="84" height="7" fill="#9c5232"/>
<rect x="-10" y="49" width="84" height="5" fill="#d7a874"/>
<ellipse cx="42" cy="36" rx="6.5" ry="3.6" fill="#c0432a"/>
<ellipse cx="42" cy="36" rx="3.6" ry="1.8" fill="#de6a45"/>
</g>
<circle cx="32" cy="32" r="28" fill="url(#l)"/>
</g>
</svg>`;

export default function Planet({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, display: "inline-block", flex: "none" }}
      dangerouslySetInnerHTML={{ __html: PLANET_SVG }}
    />
  );
}
