import { ImageResponse } from "next/og"

// A 1003px-wide wordmark is unreadable at 32px, so the favicon is a monogram on
// the brand ink square rather than a scaled-down logo.png.
export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
          color: "#ffffff",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        MP
      </div>
    ),
    size
  )
}
