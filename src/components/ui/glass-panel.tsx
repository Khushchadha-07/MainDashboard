/**
 * GlassPanel — Full-width / full-height frosted panel.
 *
 * Designed for sidebars, modals, drawers, and large content areas.
 * Uses a thicker blur than GlassCard for a more pronounced depth effect.
 *
 * Usage:
 *   <GlassPanel>...</GlassPanel>
 *   <GlassPanel side="left" className="w-64 h-screen">...</GlassPanel>
 */

import React from "react";

/* ─── Types ───────────────────────────────────────────────────── */
export type GlassPanelSide = "none" | "left" | "right" | "top" | "bottom";

export interface GlassPanelProps {
  /** Which edge gets a stronger border accent */
  side?: GlassPanelSide;
  /** Extra className */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/* ─── Border accent helpers ───────────────────────────────────── */
const ACCENT_BORDER: Record<GlassPanelSide, React.CSSProperties> = {
  none:   {},
  left:   { borderLeft:   "1px solid rgba(6, 182, 212, 0.2)" },
  right:  { borderRight:  "1px solid rgba(6, 182, 212, 0.2)" },
  top:    { borderTop:    "1px solid rgba(6, 182, 212, 0.2)" },
  bottom: { borderBottom: "1px solid rgba(6, 182, 212, 0.2)" },
};

/* ─── Component ───────────────────────────────────────────────── */
export default function GlassPanel({
  side = "none",
  className,
  style,
  children,
}: GlassPanelProps) {
  const panelStyle: React.CSSProperties = {
    /* Thick frosted glass foundation */
    background: "rgba(6, 12, 20, 0.78)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",

    /* Default border */
    border: "1px solid rgba(255, 255, 255, 0.07)",

    /* Layered depth shadows */
    boxShadow: `
      0 8px 48px rgba(0, 0, 0, 0.65),
      0 0 0 1px rgba(6, 182, 212, 0.04) inset,
      0 1px 0 rgba(255, 255, 255, 0.05) inset
    `,

    /* Accent side border override */
    ...ACCENT_BORDER[side],

    position: "relative",
    overflow: "hidden",
  };

  return (
    <div style={{ ...panelStyle, ...style }} className={className}>
      {/* Ambient inner glow — subtle top-left light source */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(6,182,212,0.3) 40%, rgba(255,255,255,0.1) 60%, transparent)",
          pointerEvents: "none",
        }}
      />
      {/* Faint corner glow */}
      <div
        style={{
          position: "absolute",
          top: -60,
          left: -60,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Preset: Sidebar ─────────────────────────────────────────── */
export function GlassSidebar({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <GlassPanel
      side="right"
      style={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        ...style,
      }}
      className={className}
    >
      {children}
    </GlassPanel>
  );
}

/* ─── Preset: Modal Overlay ───────────────────────────────────── */
export function GlassModal({
  children,
  maxWidth = 520,
  style,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2, 5, 10, 0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <GlassPanel
        style={{
          width: "100%",
          maxWidth,
          borderRadius: 20,
          padding: 28,
          ...style,
        }}
      >
        {children}
      </GlassPanel>
    </div>
  );
}

/* ─── Preset: Header Bar ──────────────────────────────────────── */
export function GlassHeader({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <GlassPanel
      side="bottom"
      style={{
        borderRadius: 0,
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        ...style,
      }}
      className={className}
    >
      {children}
    </GlassPanel>
  );
}

/* ─── Preset: Status Strip ────────────────────────────────────── */
export function GlassStatusBar({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 1,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
