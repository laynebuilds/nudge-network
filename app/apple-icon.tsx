import { ImageResponse } from "next/og";
import { PLANET_SVG } from "./landing/planet";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The planet mark on the site's dark night background.
export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(PLANET_SVG).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0a12" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={132} height={132} alt="" />
      </div>
    ),
    size
  );
}
