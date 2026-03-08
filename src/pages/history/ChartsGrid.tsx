/* ============================================================
   ChartsGrid.tsx
   5 pure-SVG / Canvas charts — no charting library needed.
   anime.js: stroke-dashoffset draws, opacity stagger, arc wipe.
   A) Multi-line trend (pH / TDS / turbidity)
   B) Bracket distribution pie
   C) Tank routing bar
   D) Anomaly frequency heatmap
   E) WQI trend line
============================================================ */
import { useEffect, useRef, memo, useMemo } from "react";
import type { GlobalStats, NormIteration } from "./historyTypes";
import { BRACKET_COLOR, wqiColor } from "./historyTypes";

declare const anime: any;

const CHART_BG   = "#040b16";
const GRID_COLOR = "#0d1f35";
const LABEL_COLOR = "#334155";

/* ── tiny helper: normalise array to [0,1] ── */
function norm(arr: number[]): number[] {
  const mn = Math.min(...arr), mx = Math.max(...arr);
  if (mx === mn) return arr.map(() => 0.5);
  return arr.map((v) => (v - mn) / (mx - mn));
}

/* ── build SVG polyline points from normalised values ── */
function toPoints(vals: number[], W: number, H: number, pad = 20): string {
  if (!vals.length) return "";
  const step = (W - pad * 2) / Math.max(vals.length - 1, 1);
  return vals
    .map((v, i) => `${pad + i * step},${pad + (1 - v) * (H - pad * 2)}`)
    .join(" ");
}

/* ── ChartCard wrapper ── */
const ChartCard = memo(({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || typeof (window as any).anime === "undefined") return;
    (window as any).anime({
      targets: ref.current,
      opacity: [0, 1], translateY: [16, 0],
      duration: 600, easing: "easeOutExpo",
    });
  }, []);
  return (
    <div ref={ref} style={{
      background: CHART_BG, border: "1px solid #0f2236",
      borderRadius: 14, padding: 16, opacity: 0,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#38bdf8", textTransform: "uppercase" }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
});

/* ============================================================
   A) MULTI-LINE TREND
============================================================ */
const MultiLineTrend = memo(({ stats }: { stats: GlobalStats }) => {
  const W = 520, H = 160, PAD = 28;
  const phRef   = useRef<SVGPolylineElement>(null);
  const tdsRef  = useRef<SVGPolylineElement>(null);
  const turbRef = useRef<SVGPolylineElement>(null);

  const { phPts, tdsPts, turbPts } = useMemo(() => {
    const phn  = norm(stats.phOverTime.map((d) => d.ph));
    const tdsn = norm(stats.tdsOverTime.map((d) => d.tds));
    const tn   = norm(stats.turbOverTime.map((d) => d.turb));
    return {
      phPts:   toPoints(phn,  W, H, PAD),
      tdsPts:  toPoints(tdsn, W, H, PAD),
      turbPts: toPoints(tn,   W, H, PAD),
    };
  }, [stats]);

  /* animate stroke-dashoffset draw */
  useEffect(() => {
    if (typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    [phRef, tdsRef, turbRef].forEach((r, i) => {
      if (!r.current) return;
      const len = r.current.getTotalLength?.() ?? 400;
      r.current.style.strokeDasharray  = `${len}`;
      r.current.style.strokeDashoffset = `${len}`;
      a({
        targets: r.current,
        strokeDashoffset: [len, 0],
        duration: 900,
        delay: i * 180,
        easing: "easeInOutQuad",
      });
    });
  }, [phPts]);

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((v) =>
    PAD + (1 - v) * (H - PAD * 2)
  );

  return (
    <ChartCard title="Sensor Trend — pH / TDS / Turbidity" subtitle="Normalised 0–1 per metric">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {/* grid */}
        {gridLines.map((y, i) => (
          <line key={i} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={GRID_COLOR} strokeWidth="1" />
        ))}
        {/* lines */}
        <polyline ref={phRef}   points={phPts}   fill="none" stroke="#22c55e" strokeWidth="1.8" />
        <polyline ref={tdsRef}  points={tdsPts}  fill="none" stroke="#fbbf24" strokeWidth="1.8" />
        <polyline ref={turbRef} points={turbPts} fill="none" stroke="#38bdf8" strokeWidth="1.8" />
        {/* legend */}
        {[["#22c55e","pH"],["#fbbf24","TDS"],["#38bdf8","Turbidity"]].map(([c, l], i) => (
          <g key={l} transform={`translate(${PAD + i * 80}, ${H - 6})`}>
            <rect x="0" y="-7" width="10" height="3" fill={c} rx="1" />
            <text x="14" y="0" fill={LABEL_COLOR} fontSize="9" fontFamily="monospace">{l}</text>
          </g>
        ))}
      </svg>
    </ChartCard>
  );
});

/* ============================================================
   B) BRACKET DISTRIBUTION PIE
============================================================ */
const BracketPie = memo(({ dist }: { dist: Record<string, number> }) => {
  const SIZE = 130, CX = SIZE / 2, CY = SIZE / 2, R = 50;
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  const slices = useMemo(() => {
    const entries = Object.entries(dist).filter(([, v]) => v > 0);
    const total   = entries.reduce((s, [, v]) => s + v, 0);
    let angle     = -Math.PI / 2;
    return entries.map(([bracket, count]) => {
      const sweep = (count / total) * 2 * Math.PI;
      const x1 = CX + R * Math.cos(angle);
      const y1 = CY + R * Math.sin(angle);
      angle += sweep;
      const x2 = CX + R * Math.cos(angle);
      const y2 = CY + R * Math.sin(angle);
      const large = sweep > Math.PI ? 1 : 0;
      return {
        bracket, count,
        d: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`,
        color: BRACKET_COLOR[bracket] ?? "#475569",
        midAngle: angle - sweep / 2,
        pct: Math.round((count / total) * 100),
      };
    });
  }, [dist]);

  /* animate: scale from 0 per-path */
  useEffect(() => {
    if (typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    pathRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.transformOrigin = `${CX}px ${CY}px`;
      el.style.transform = "scale(0)";
      el.style.opacity = "0";
      a({ targets: el, scale: [0, 1], opacity: [0, 1], delay: i * 120, duration: 480, easing: "easeOutExpo" });
    });
  }, [slices.length]); // eslint-disable-line

  return (
    <ChartCard title="Bracket Distribution" subtitle="All sessions">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
          {slices.map((s, i) => (
            <path
              key={s.bracket}
              ref={(el) => { pathRefs.current[i] = el; }}
              d={s.d}
              fill={s.color}
              opacity={0.85}
            />
          ))}
          {/* donut hole */}
          <circle cx={CX} cy={CY} r={R * 0.45} fill={CHART_BG} />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {slices.map((s) => (
            <div key={s.bracket} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: s.color, fontWeight: 700, fontFamily: "monospace" }}>
                {s.bracket}
              </span>
              <span style={{ fontSize: 10, color: "#475569" }}>
                {s.count}× ({s.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
});

/* ============================================================
   C) TANK ROUTING BAR CHART
============================================================ */
const TankBar = memo(({ dist }: { dist: Record<string, number> }) => {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const total   = Object.values(dist).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(dist);

  useEffect(() => {
    if (typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    barRefs.current.forEach((el, i) => {
      if (!el) return;
      const target = (dist[entries[i]?.[0]] ?? 0) / total * 100;
      el.style.width = "0%";
      a({ targets: el, width: `${target}%`, delay: i * 150, duration: 700, easing: "easeOutExpo" });
    });
  }, [total]); // eslint-disable-line

  const COLORS: Record<string, string> = { A: "#22c55e", B: "#38bdf8" };

  return (
    <ChartCard title="Tank Routing Breakdown" subtitle="Sessions per tank">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
        {entries.map(([tank, count], i) => (
          <div key={tank}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: COLORS[tank] ?? "#94a3b8", fontWeight: 700, fontFamily: "monospace" }}>
                TANK {tank}
              </span>
              <span style={{ fontSize: 11, color: "#475569" }}>{count} sessions</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "#0d1f35", overflow: "hidden" }}>
              <div
                ref={(el) => { barRefs.current[i] = el; }}
                style={{
                  height: "100%", width: "0%",
                  borderRadius: 5,
                  background: `linear-gradient(90deg, ${COLORS[tank] ?? "#818cf8"}, ${COLORS[tank] ?? "#818cf8"}88)`,
                }}
              />
            </div>
          </div>
        ))}
        {!entries.length && (
          <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No data</div>
        )}
      </div>
    </ChartCard>
  );
});

/* ============================================================
   D) ANOMALY FREQUENCY HEATMAP
   Buckets sessions by hour-of-day (0–23), counts anomalies.
============================================================ */
const AnomalyHeatmap = memo(({ items }: { items: NormIteration[] }) => {
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  const buckets = useMemo(() => {
    const b = new Array(24).fill(0);
    items.forEach((it) => {
      const h = new Date(it.timestamp).getHours();
      b[h] += it.anomalyCount;
    });
    return b;
  }, [items]);

  const maxVal = Math.max(...buckets, 1);

  useEffect(() => {
    if (typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    a({
      targets: cellRefs.current.filter(Boolean),
      opacity: [0, 1],
      scale: [0.6, 1],
      delay: a.stagger(18),
      duration: 350,
      easing: "easeOutExpo",
    });
  }, [buckets[0]]); // eslint-disable-line

  return (
    <ChartCard title="Anomaly Frequency" subtitle="By hour of day (24 h clock)">
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {buckets.map((v, h) => {
          const intensity = v / maxVal;
          const bg = v === 0 ? "#0d1f35"
            : `rgba(239,68,68,${0.15 + intensity * 0.7})`;
          return (
            <div
              key={h}
              ref={(el) => { cellRefs.current[h] = el; }}
              title={`${String(h).padStart(2, "0")}:00 — ${v} anomalies`}
              style={{
                width: 18, height: 22, borderRadius: 3,
                background: bg, cursor: "default",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                paddingBottom: 2,
                opacity: 0,
              }}
            >
              <span style={{ fontSize: 7, color: v > 0 ? "#fca5a5" : "#1e3a5f", lineHeight: 1 }}>
                {String(h).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: 2, background: "#0d1f35" }} />
        <span style={{ fontSize: 9, color: "#334155" }}>None</span>
        <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(239,68,68,0.8)" }} />
        <span style={{ fontSize: 9, color: "#334155" }}>High</span>
      </div>
    </ChartCard>
  );
});

/* ============================================================
   E) WQI TREND LINE
============================================================ */
const WQITrend = memo(({ stats }: { stats: GlobalStats }) => {
  const W = 520, H = 110, PAD = 24;
  const lineRef = useRef<SVGPolylineElement>(null);
  const fillRef = useRef<SVGPolygonElement>(null);

  const { pts, fillPts, colors } = useMemo(() => {
    const vals   = stats.wqiOverTime.map((d) => d.wqi);
    const normed = norm(vals.length ? vals : [50]);
    const p      = toPoints(normed, W, H, PAD);
    // build fill polygon (close at bottom)
    const points = normed.map((v, i) => {
      const x = PAD + i * ((W - PAD * 2) / Math.max(normed.length - 1, 1));
      const y = PAD + (1 - v) * (H - PAD * 2);
      return `${x},${y}`;
    });
    const first = `${PAD},${H - PAD}`;
    const last  = `${PAD + (normed.length - 1) * ((W - PAD * 2) / Math.max(normed.length - 1, 1))},${H - PAD}`;
    const fp    = `${first} ${points.join(" ")} ${last}`;
    const dotColors = vals.map((v) => wqiColor(v));
    return { pts: p, fillPts: fp, colors: dotColors };
  }, [stats.wqiOverTime]);

  useEffect(() => {
    if (!lineRef.current || typeof (window as any).anime === "undefined") return;
    const a   = (window as any).anime;
    const len = lineRef.current.getTotalLength?.() ?? 300;
    lineRef.current.style.strokeDasharray  = `${len}`;
    lineRef.current.style.strokeDashoffset = `${len}`;
    a({ targets: lineRef.current, strokeDashoffset: [len, 0], duration: 950, easing: "easeInOutQuad" });
    if (fillRef.current) {
      a({ targets: fillRef.current, opacity: [0, 0.12], duration: 800, easing: "easeOutQuad", delay: 200 });
    }
  }, [pts]);

  const avgWQI = stats.avgWQI;
  const avgColor = wqiColor(avgWQI);

  return (
    <ChartCard title="WQI Over Time" subtitle="Water Quality Index per session">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div style={{
          fontSize: 28, fontWeight: 800, color: avgColor,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{avgWQI}</div>
        <div>
          <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em" }}>Avg WQI</div>
          <div style={{ fontSize: 11, color: avgColor, fontWeight: 700 }}>{
            avgWQI >= 80 ? "Excellent" : avgWQI >= 60 ? "Good" : avgWQI >= 40 ? "Fair" : "Poor"
          }</div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* grid */}
        {[0, 0.5, 1].map((v, i) => (
          <line key={i} x1={PAD} y1={PAD + (1 - v) * (H - PAD * 2)}
            x2={W - PAD} y2={PAD + (1 - v) * (H - PAD * 2)}
            stroke={GRID_COLOR} strokeWidth="1" />
        ))}
        {/* fill */}
        <polygon ref={fillRef} points={fillPts} fill={avgColor} opacity={0} />
        {/* line */}
        <polyline ref={lineRef} points={pts} fill="none" stroke={avgColor} strokeWidth="2" />
      </svg>
    </ChartCard>
  );
});

/* ============================================================
   CHARTS GRID — assembles all 5
============================================================ */
export const ChartsGrid = memo(({
  stats, items,
}: { stats: GlobalStats; items: NormIteration[] }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <WQITrend stats={stats} />
    <MultiLineTrend stats={stats} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <BracketPie dist={stats.bracketDist} />
      <TankBar    dist={stats.tankDist} />
    </div>
    <AnomalyHeatmap items={items} />
  </div>
));
