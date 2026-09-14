import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "#0d0d0d",
          color: "#ffffff",
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        MP
        <div style={{ width: 56, height: 6, background: "#1d6ad4", borderRadius: 3 }} />
      </div>
    ),
    size
  )
}
