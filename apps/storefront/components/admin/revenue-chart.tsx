"use client"

import { useState } from "react"
import type { DaySlice } from "@/lib/admin-stats"

// Single series, so no legend — the heading names what's plotted.
const BAR = "#16a34a" // brand-600, validated ≥3:1 on the white card surface
const SURFACE = "#ffffff"
const MAX_BAR_W = 24
const GAP = 2 // surface gap between adjacent bars

function money(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`
  return `$${dollars.toFixed(0)}`
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

export function RevenueChart({ series }: { series: DaySlice[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const W = 720
  const H = 220
  const PAD = { top: 16, right: 8, bottom: 28, left: 48 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const peak = Math.max(...series.map((d) => d.revenue_cents), 0)
  const yMax = niceCeiling(peak)
  const band = plotW / series.length
  const barW = Math.min(MAX_BAR_W, Math.max(2, band - GAP))

  // Three gridlines is enough to read magnitude without becoming furniture.
  const ticks = [0, yMax / 2, yMax]
  const peakIndex = peak > 0 ? series.findIndex((d) => d.revenue_cents === peak) : -1

  const active = hover != null ? series[hover] : null

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-sand-900">Revenue</h2>
          <p className="mt-0.5 text-xs text-sand-500">
            Paid, shipped, and delivered orders · last {series.length} days
          </p>
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="shrink-0 text-xs text-sand-500 underline-offset-2 hover:text-sand-800 hover:underline"
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-sand-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-sand-50 text-left text-xs uppercase tracking-wide text-sand-500">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {series.map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5 text-sand-600">{d.date}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-sand-600">
                    {d.orders}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium text-sand-900">
                    ${(d.revenue_cents / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`Daily revenue for the last ${series.length} days. Peak ${money(peak)}.`}
            onMouseLeave={() => setHover(null)}
          >
            {/* Gridlines — hairline, solid, recessive */}
            {ticks.map((t) => {
              const y = PAD.top + plotH - (t / yMax) * plotH
              return (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={y}
                    y2={y}
                    stroke="#ebe9e3"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-sand-400 text-[10px] tabular-nums"
                  >
                    {money(t)}
                  </text>
                </g>
              )
            })}

            {series.map((d, i) => {
              const h = yMax > 0 ? (d.revenue_cents / yMax) * plotH : 0
              const x = PAD.left + i * band + (band - barW) / 2
              const y = PAD.top + plotH - h
              const isHover = hover === i

              return (
                <g key={d.date}>
                  {/* Hit target spans the full band so thin bars stay hoverable */}
                  <rect
                    x={PAD.left + i * band}
                    y={PAD.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                  />
                  {h > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={h}
                      rx={Math.min(4, barW / 2)}
                      fill={BAR}
                      opacity={hover == null || isHover ? 1 : 0.35}
                      stroke={SURFACE}
                      strokeWidth={0}
                      pointerEvents="none"
                    />
                  )}
                  {/* Square off the rounded bottom so bars sit on the baseline */}
                  {h > 4 && (
                    <rect
                      x={x}
                      y={PAD.top + plotH - 4}
                      width={barW}
                      height={4}
                      fill={BAR}
                      opacity={hover == null || isHover ? 1 : 0.35}
                      pointerEvents="none"
                    />
                  )}
                </g>
              )
            })}

            {/* Baseline */}
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={PAD.top + plotH}
              y2={PAD.top + plotH}
              stroke="#d9d6cd"
              strokeWidth="1"
            />

            {/* Label the peak only — never a number on every bar */}
            {peakIndex >= 0 && hover == null && (
              <text
                x={PAD.left + peakIndex * band + band / 2}
                y={PAD.top + plotH - (peak / yMax) * plotH - 6}
                textAnchor="middle"
                className="fill-sand-700 text-[10px] font-semibold"
              >
                {money(peak)}
              </text>
            )}

            {/* First and last date only — a tick per day is unreadable */}
            <text
              x={PAD.left}
              y={H - 8}
              className="fill-sand-400 text-[10px]"
            >
              {series[0]?.date.slice(5)}
            </text>
            <text
              x={W - PAD.right}
              y={H - 8}
              textAnchor="end"
              className="fill-sand-400 text-[10px]"
            >
              {series[series.length - 1]?.date.slice(5)}
            </text>
          </svg>

          {active && (
            <div
              className="pointer-events-none absolute -top-1 rounded-lg border border-sand-200 bg-white px-3 py-2 shadow-lg"
              style={{
                left: `${((PAD.left + (hover! + 0.5) * band) / W) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <p className="text-[10px] text-sand-500">{active.date}</p>
              <p className="text-sm font-semibold tabular-nums text-sand-900">
                ${(active.revenue_cents / 100).toFixed(2)}
              </p>
              <p className="text-[10px] text-sand-500">
                {active.orders} order{active.orders === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
