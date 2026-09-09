import { ImageResponse } from "next/og"

// The card every link preview shows — Slack, iMessage, X, Discord. Without it
// those unfurls fall back to a bare URL.
export const alt = "Midwestern Peptides — lab-tested research peptides"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d0d0d",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8f8b7f",
            }}
          >
            North Dakota · Est. 2026
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            Midwestern Peptides
          </div>
          <div style={{ marginTop: 24, fontSize: 34, color: "#d9d6cd", maxWidth: 820 }}>
            Trusted US supplier of lab-tested research peptides.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* "98%+" not "≥98%" — the default OG font has no glyph for ≥ and
              renders it as a tofu box. */}
          {["HPLC Verified", "3rd Party Tested", "COA on Request", "98%+ Purity"].map(
            (badge) => (
              <div
                key={badge}
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#b8b4a8",
                  border: "2px solid #35332f",
                  borderRadius: 999,
                  padding: "12px 24px",
                }}
              >
                {badge}
              </div>
            )
          )}
        </div>
      </div>
    ),
    size
  )
}
