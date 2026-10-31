import { ImageResponse } from "next/og";
import { PLANET_SVG_SQUARE } from "./landing/planet";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The tile, full bleed. iOS rounds the corners itself.
export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(PLANET_SVG_SQUARE).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={180} height={180} alt="" />
      </div>
    ),
    size
  );
}
