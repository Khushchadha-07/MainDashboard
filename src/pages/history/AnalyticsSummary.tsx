/* ============================================================
   AnalyticsSummary.tsx
   Top summary bar — 7 animated KPI cards, staggered entrance,
   number tweens, color-coded severity, hover glow.
============================================================ */
import { useEffect, useRef, memo } from "react";
import type { GlobalStats } from "./historyTypes";
import { wqiColor } from "./historyTypes";

declare const anime: any;

/* ── single KPI card ── */
type CardDef = {
  label: string;
  value: number;
  unit?: string;
  decimals: number;
  color: string;
  icon: string;
};

const KPICard = memo(({
  card, index,
}: { card: CardDef; index: number }) => {
  const valRef  = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const objRef  = useRef({ v: 0 });

  /* number tween on value change */
  useEffect(() => {
    if (!valRef.current || typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    a({
      targets: objRef.current,
      v: [0, card.value],
      duration: 900 + index * 80,
      easing: "easeOutExpo",
      delay: index * 70,
      update: () => {
        if (valRef.current)
          valRef.current.textContent =
            objRef.current.v.toFixed(card.decimals) + (card.unit ?? "");
      },
    });
  }, [card.value]); // eslint-disable-line

  /* hover glow */
  const onEnter = () => {
    if (!cardRef.current || typeof (window as any).anime === "undefined") return;
    (window as any).anime({
      targets: cardRef.current,
      boxShadow: [`0 0 0px ${card.color}00`, `0 0 22px ${card.color}44`],
      duration: 280, easing: "easeOutQuad",
    });
  };
  const onLeave = () => {
    if (!cardRef.current || typeof (window as any).anime === "undefined") return;
    (window as any).anime({
      targets: cardRef.current,
      boxShadow: [`0 0 22px ${card.color}44`, `0 0 0px ${card.color}00`],
      duration: 380, easing: "easeOutQuad",
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        flex: "1 1 130px",
        padding: "14px 16px",
        borderRadius: 12,
        background: "#050d1a",
        border: `1px solid ${card.color}33`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        cursor: "default",
        transition: "border-color 0.25s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 16 }}>{card.icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          color: "#475569", textTransform: "uppercase",
        }}>{card.label}</span>
      </div>
      <div style={{
        fontSize: 26, fontWeight: 800, color: card.color,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineHeight: 1,
      }}>
        <span ref={valRef}>0{card.unit ?? ""}</span>
      </div>
    </div>
  );
});

/* ── container ── */
export const AnalyticsSummary = memo(({
  stats,
}: { stats: GlobalStats }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  /* staggered entrance */
  useEffect(() => {
    if (hasAnimated.current || !rowRef.current || typeof (window as any).anime === "undefined") return;
    hasAnimated.current = true;
    const a = (window as any).anime;
    a({
      targets: rowRef.current.children,
      translateY: [24, 0],
      opacity: [0, 1],
      delay: a.stagger(60),
      duration: 650,
      easing: "easeOutExpo",
    });
  }, [stats.totalSessions]);

  const cards: CardDef[] = [
    { label: "Sessions",    value: stats.totalSessions,  decimals: 0, color: "#38bdf8", icon: "⬡" },
    { label: "Readings",    value: stats.totalReadings,  decimals: 0, color: "#818cf8", icon: "◈" },
    { label: "Avg pH",      value: stats.avgPH,          decimals: 2, color: "#22c55e", icon: "⌬" },
    { label: "Avg TDS",     value: stats.avgTDS,         decimals: 1, unit: "", color: "#fbbf24", icon: "◇" },
    { label: "Avg Turb",    value: stats.avgTurbidity,   decimals: 2, color: "#f97316", icon: "◉" },
    { label: "Avg WQI",     value: stats.avgWQI,         decimals: 1, color: wqiColor(stats.avgWQI), icon: "◎" },
    { label: "Stability",   value: stats.stabilityScore, decimals: 0, unit: "%",
      color: stats.stabilityScore >= 70 ? "#22c55e" : stats.stabilityScore >= 40 ? "#fbbf24" : "#ef4444",
      icon: "⬡" },
  ];

  return (
    <div
      ref={rowRef}
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 20,
      }}
    >
      {cards.map((c, i) => (
        <KPICard key={c.label} card={c} index={i} />
      ))}
    </div>
  );
});
