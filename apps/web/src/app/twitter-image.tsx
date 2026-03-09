import { ImageResponse } from "next/og";

export const alt = "AFENDA - Business Truth Engine";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(120deg, rgb(9 9 11), rgb(24 24 27))",
          color: "rgb(250 250 250)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 4, textTransform: "uppercase", opacity: 0.8 }}>
          AFENDA
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
            Business Truth Engine
          </div>
          <div style={{ fontSize: 30, opacity: 0.9 }}>
            Audit-first financial operations platform
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
