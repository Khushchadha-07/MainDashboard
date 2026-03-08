/**
 * MetricCard — Glassmorphism metric display card.
 * Updated to use the global glass design system while preserving
 * all original props and logic.
 */

import { useState } from "react";

export default function MetricCard({
  title,
  valueKey,
  rows = [],
  avg,
  onClick,
}: any) {
  const [hovered, setHovered] = useState(false);
  const hasData = rows.length > 0;

  const current = hasData
    ? Number(rows[rows.length - 1]?.[valueKey])
    : null;

  const safeAvg =
    typeof avg === "number" && avg > 0 ? avg : null;

  let deviationText = "—";
  if (current !== null && safeAvg) {
    const diff = ((current - safeAvg) / safeAvg) * 100;
    deviationText = `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}% from avg`;
  }

  return (
    <div
      onClick={hasData ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        /* Glass card base */
        background: hovered && hasData
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: hovered && hasData
          ? "1px solid rgba(6,182,212,0.35)"
          : "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        boxShadow: hovered && hasData
          ? "0 8px 40px rgba(0,0,0,0.7), 0 0 28px rgba(6,182,212,0.12)"
          : "0 4px 24px rgba(0,0,0,0.55)",

        /* Layout */
        padding: 18,
        width: 180,
        cursor: hasData ? "pointer" : "default",
        opacity: hasData ? 1 : 0.6,
        position: "relative",
        overflow: "hidden",

        /* Smooth transitions */
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        transform: hovered && hasData ? "translateY(-3px) scale(1.02)" : "none",
      }}
    >
      {/* Top-edge specular highlight */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(6,182,212,0.4) 30%, rgba(255,255,255,0.1) 50%, rgba(6,182,212,0.4) 70%, transparent)",
          pointerEvents: "none",
        }}
      />

      <h4
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
          fontFamily: "var(--font-body)",
        }}
      >
        {title}
      </h4>

      <h2
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {current !== null ? current : "—"}
      </h2>

      <small
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          display: "block",
          lineHeight: 1.5,
        }}
      >
        Avg: {safeAvg ?? "—"} | {deviationText}
        <br />
        <span style={{ color: "rgba(6,182,212,0.5)" }}>↻ every 4s</span>
      </small>
    </div>
  );
}
      <h2>{current !== null ? current : "—"}</h2>
      <small>
        Avg: {safeAvg ?? "—"} | {deviationText}
        <br />
        Updated every 4s
      </small>
    </div>
  );
}
