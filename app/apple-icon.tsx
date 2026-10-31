import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same mark as app/icon.svg: a filled circle and a ring, your twin and theirs.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#17121c" }}>
        <div style={{ position: "relative", width: 112, height: 62, display: "flex" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 62, height: 62, borderRadius: 31, background: "#fff" }} />
          <div style={{ position: "absolute", right: 0, top: 3, width: 56, height: 56, borderRadius: 28, border: "8px solid #fff" }} />
        </div>
      </div>
    ),
    size
  );
}
