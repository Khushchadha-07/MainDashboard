/**
 * GlassCard — Core reusable glassmorphism card component.
 *
 * Usage:
 *   <GlassCard>...</GlassCard>
 *   <GlassCard variant="thick" hover accent>...</GlassCard>
 *   <GlassCard variant="panel" className="p-6">...</GlassCard>
 */

import React, { useState, useCallback, useRef } from "react";

/* ─── Types ───────────────────────────────────────────────────── */
export type GlassCardVariant = "default" | "thick" | "panel" | "accent";

export interface GlassCardProps {
  /** Visual variant */
  variant?: GlassCardVariant;
  /** Enable lift + glow on hover */
  hover?: boolean;
  /** Enable cursor-follow glow effect */
  glow?: boolean;
  /** Show gradient border accent */
  accent?: boolean;
  /** onClick handler — also enables pointer cursor + lift */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/* ─── Variant base styles ─────────────────────────────────────── */
const VARIANT_STYLES: Record<GlassCardVariant, React.CSSProperties> = {
  default: {
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: "1px solid rgba(255, 255, 255, 0.09)",
    borderRadius: 16,
    boxShadow:
      "0 4px 24px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.04) inset",
  },
  thick: {
    background: "rgba(8, 16, 24, 0.78)",
    backdropFilter: "blur(40px) saturate(200%)",
    WebkitBackdropFilter: "blur(40px) saturate(200%)",
    border: "1px solid rgba(6, 182, 212, 0.14)",
    borderRadius: 20,
    boxShadow:
      "0 12px 60px rgba(0,0,0,0.7), 0 0 40px rgba(6,182,212,0.06), 0 0 0 1px rgba(255,255,255,0.04) inset",
  },
  panel: {
    background: "rgba(10, 18, 28, 0.62)",
    backdropFilter: "blur(28px) saturate(180%)",
    WebkitBackdropFilter: "blur(28px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    boxShadow:
      "0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.06) inset, 0 1px 0 rgba(255,255,255,0.06) inset",
  },
  accent: {
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(24px) saturate(170%)",
    WebkitBackdropFilter: "blur(24px) saturate(170%)",
    border: "1px solid rgba(6, 182, 212, 0.22)",
    borderRadius: 16,
    boxShadow:
      "0 4px 24px rgba(0,0,0,0.55), 0 0 20px rgba(6,182,212,0.1), 0 1px 0 rgba(6,182,212,0.2) inset",
  },
};

/* ─── Top-edge specular highlight ─────────────────────────────── */
const TOP_EDGE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 1,
  background:
    "linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.4) 25%, rgba(255,255,255,0.12) 50%, rgba(6,182,212,0.4) 75%, transparent 100%)",
  pointerEvents: "none",
  zIndex: 1,
};

/* ─── Component ───────────────────────────────────────────────── */
export default function GlassCard({
  variant = "default",
  hover = false,
  glow = false,
  accent = false,
  onClick,
  className,
  style,
  children,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const isInteractive = !!(hover || onClick);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!glow || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      setGlowPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [glow]
  );

  const baseStyle: React.CSSProperties = {
    ...VARIANT_STYLES[variant],
    position: "relative",
    overflow: "hidden",
    transition: "all 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: onClick ? "pointer" : "default",
  };

  /* Hover overrides */
  const hoverStyle: React.CSSProperties =
    isHovered && isInteractive
      ? {
          background:
            variant === "thick"
              ? "rgba(10, 20, 30, 0.82)"
              : "rgba(255,255,255,0.07)",
          borderColor: "rgba(6, 182, 212, 0.35)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.7), 0 0 28px rgba(6,182,212,0.14), 0 1px 0 rgba(255,255,255,0.06) inset",
          transform: "translateY(-3px) scale(1.01)",
        }
      : {};

  /* Gradient border accent override */
  const accentBorder: React.CSSProperties = accent
    ? {
        border: "1px solid transparent",
        background: `linear-gradient(rgba(8,16,24,0.78), rgba(8,16,24,0.78)) padding-box,
          linear-gradient(120deg, rgba(29,111,220,0.4), rgba(6,182,212,0.3), rgba(20,60,120,0.45)) border-box`,
      }
    : {};

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ ...baseStyle, ...hoverStyle, ...accentBorder, ...style }}
      className={className}
    >
      {/* Top-edge specular highlight */}
      <div style={TOP_EDGE_STYLE} />

      {/* Cursor-follow glow layer */}
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.3s ease",
            background: `radial-gradient(280px 240px at ${glowPos.x}% ${glowPos.y}%, rgba(6,182,212,0.10) 0%, rgba(29,111,220,0.05) 45%, transparent 70%)`,
            zIndex: 0,
          }}
        />
      )}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
