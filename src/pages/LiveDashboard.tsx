/**
 * ============================================================
 *  LiveDashboard.tsx — WaterIQ Enhanced Industrial SCADA UI
 * ============================================================
 *  CHANGES FROM ORIGINAL:
 *  ✅ Persistent fake stream (localStorage rolling buffer)
 *  ✅ Smooth drift engine (no random spikes, rare anomalies)
 *  ✅ Restores past readings on reload, continues slNo counter
 *  ✅ anime.js — staggered card entrance, numeric tweens,
 *     prediction slide-in, anomaly pulse, toast timeline,
 *     progress bar, live indicator, health gauge arc
 *  ✅ Rolling 50-reading pH trend (rising/falling/stable)
 *  ✅ System Health Score with animated ring
 *  ✅ Auto-scroll dataset table on new row
 *  ✅ Anomaly banner drop-down animation
 *  ✅ Bracket glow border transition
 *  ✅ Refs for internal buffer — no re-renders of 20k array
 *  ✅ All original API endpoints/structure untouched
 * ============================================================
 */

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import MetricCard from "../components/MetricCard";
import DatasetTable from "../components/DatasetTable";
import ChartModal from "../components/ChartModal";

/* ── anime.js CDN dynamic loader (avoids npm dep issues) ── */
declare const anime: any;

/* ======================================================
   BACKEND ENDPOINTS  (UNCHANGED)
====================================================== */
const BACKEND_ANALYZE_URL =
  "https://water-quality-backend-12-pctw.onrender.com/analyze-water";
const BACKEND_SESSION_READINGS_URL =
  "https://water-quality-backend-12-pctw.onrender.com/session/readings";
const BACKEND_SESSION_START_URL =
  "https://water-quality-backend-12-pctw.onrender.com/session/start";
const BACKEND_SESSION_STATUS_URL =
  "https://water-quality-backend-12-pctw.onrender.com/session/status";
const BACKEND_SESSION_RESET_URL =
  "https://water-quality-backend-12-pctw.onrender.com/session/reset";
const BACKEND_PUMP_COMMAND_URL =
  "https://water-quality-backend-12-pctw.onrender.com/pump/command";

/* ======================================================
   CONFIG
====================================================== */
const INTERVAL_MS        = 4_000;
const MAX_ROWS           = 5;          // session rows shown
const ROLLING_BUFFER_MAX = 20_000;     // localStorage buffer cap
const LS_BUFFER_KEY      = "waterIQ_stream_buffer";
const LS_COUNTER_KEY     = "waterIQ_sl_counter";
const TREND_WINDOW       = 50;         // readings for trend calc
const ANOMALY_PROB       = 0.04;       // 4 % chance per tick

/* ======================================================
   TYPES
====================================================== */
type Row = {
  slNo: number;
  time: string;
  ph: number;
  turbidity: number;
  tds: number;
  source: "simulation" | "live" | "stream";
};

type Mode = "idle" | "simulation" | "live";

type Prediction = {
  bracket: "F1" | "F2" | "F3" | "F4" | "F5";
  reusable: boolean;
  suggestedTank: "A" | "B";
};

type Iteration = {
  id: string;
  name: string;
  timestamp: string;
  mode: Mode;
  rows: Row[];
  avg: { ph: number; turbidity: number; tds: number };
  prediction: Prediction | null;
};

type ToastType = "success" | "error" | "info" | "warning";
type Toast = { id: string; message: string; type: ToastType };
type Anomaly = {
  metric: string;
  value: number;
  message: string;
  severity: "warning" | "critical";
};

/* ======================================================
   DRIFT ENGINE  (smooth sensor simulation)
   Each sensor walks within bounds using direction + jitter.
   Rare anomaly spikes are injected at ANOMALY_PROB rate.
====================================================== */
type DriftState = {
  current: number;
  direction: 1 | -1;
  stepSize: number;
  min: number;
  max: number;
  decimals: number;
};

// Mutable drift state stored in a ref — never triggers re-render
const createDriftState = (): {
  ph: DriftState;
  turbidity: DriftState;
  tds: DriftState;
} => ({
  ph:        { current: 7.2,  direction:  1, stepSize: 0.04,  min: 5.8, max: 8.6, decimals: 2 },
  turbidity: { current: 2.8,  direction:  1, stepSize: 0.10,  min: 0.4, max: 9.8, decimals: 2 },
  tds:       { current: 320,  direction: -1, stepSize: 3.0,   min: 75,  max: 950, decimals: 1 },
});

function advanceDrift(state: DriftState): number {
  const jitter = (Math.random() - 0.5) * state.stepSize * 0.5;
  state.current += state.direction * state.stepSize + jitter;
  const margin = (state.max - state.min) * 0.08;
  if (state.current >= state.max - margin) {
    state.direction = -1;
    state.current = Math.min(state.current, state.max);
  } else if (state.current <= state.min + margin) {
    state.direction = 1;
    state.current = Math.max(state.current, state.min);
  }
  return +state.current.toFixed(state.decimals);
}

function generateDriftReading(
  drift: ReturnType<typeof createDriftState>,
  slNo: number,
  isAnomaly: boolean
): Row {
  let ph        = advanceDrift(drift.ph);
  let turbidity = advanceDrift(drift.turbidity);
  let tds       = advanceDrift(drift.tds);

  if (isAnomaly) {
    // Spike one random sensor
    const pick = Math.floor(Math.random() * 3);
    if (pick === 0) ph        = +(4.0 + Math.random() * 1.5).toFixed(2);
    if (pick === 1) turbidity = +(12 + Math.random() * 6).toFixed(2);
    if (pick === 2) tds       = +(950 + Math.random() * 200).toFixed(1);
  }

  return {
    slNo,
    time: new Date().toLocaleTimeString(),
    ph,
    turbidity,
    tds,
    source: "stream",
  };
}

/* ======================================================
   ROLLING BUFFER  (localStorage persistence)
====================================================== */
function loadBuffer(): Row[] {
  try {
    return JSON.parse(localStorage.getItem(LS_BUFFER_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBuffer(buf: Row[]): void {
  try {
    const trimmed = buf.slice(-ROLLING_BUFFER_MAX);
    localStorage.setItem(LS_BUFFER_KEY, JSON.stringify(trimmed));
  } catch {
    // quota exceeded — trim harder
    try {
      localStorage.setItem(LS_BUFFER_KEY, JSON.stringify(buf.slice(-500)));
    } catch { /* silent */ }
  }
}

function loadCounter(): number {
  try {
    return parseInt(localStorage.getItem(LS_COUNTER_KEY) || "1", 10);
  } catch {
    return 1;
  }
}

function saveCounter(n: number): void {
  try {
    localStorage.setItem(LS_COUNTER_KEY, String(n));
  } catch { /* silent */ }
}

/* ======================================================
   KNOWLEDGE / BRACKET LIBRARIES  (unchanged from original)
====================================================== */
type FiltrationVisual = { label: string; src: string; type: "image" | "lottie" };

const FILTRATION_LIBRARY: Record<string, {
  title: string; tank: string; status: string;
  contamination: string[]; method: string[];
  explanation: string; postUse: string[];
  risks: string[]; mitigation: string[];
  visuals: FiltrationVisual[];
}> = {
  F1: {
    title: "Baseline Polishing Filtration", tank: "Tank A",
    status: "Reusable (with baseline filtration)",
    contamination: ["Trace suspended particles such as sand, silt, rust flakes, and debris","Minor organic residues from surface runoff and domestic discharge","Aesthetic issues including color, odor, and taste inconsistencies"],
    method: ["Sediment filtration","Activated carbon filtration"],
    explanation: "F1 represents lightly contaminated water that is structurally safe but aesthetically impaired. Sediment filtration removes fine particulate matter that can clog systems or reduce clarity, while activated carbon adsorption removes dissolved organic compounds, chlorine residues, and odor-causing molecules.",
    postUse: ["Gardening and landscaping","Toilet flushing","Domestic cleaning","Cooling water systems","Light industrial washing"],
    risks: ["Carbon saturation over prolonged usage","Sediment filter clogging","Breakthrough of fine particles if maintenance is neglected"],
    mitigation: ["Scheduled filter replacement","Backwashing mechanisms","Parallel filtration units for redundancy"],
    visuals: [],
  },
  F2: {
    title: "Moderate Suspended Solids", tank: "Tank B",
    status: "Non-reusable (before treatment)",
    contamination: ["Moderate suspended solids","Visible turbidity","Particulate-induced flow instability"],
    method: ["Sand filtration","Activated carbon filtration","Fine polishing filters"],
    explanation: "F2 water contains suspended solids at levels that interfere with hydraulic performance and mechanical equipment. A staged filtration process removes progressively smaller particles.",
    postUse: ["Agricultural irrigation","Construction activities","Cooling towers","Equipment and vehicle washing"],
    risks: ["Media saturation","Channel formation"],
    mitigation: ["Layered filter beds","Periodic media replacement","Modular filtration design"],
    visuals: [],
  },
  F3: {
    title: "High Suspended Solids", tank: "Tank B",
    status: "Non-reusable (before treatment)",
    contamination: ["Very high suspended solids","Organic and biological particulate load"],
    method: ["Coagulation","Flocculation","Sedimentation","Rapid sand filtration"],
    explanation: "F3 water requires chemical destabilization of colloidal particles. Coagulants neutralize surface charges, forming flocs that settle during sedimentation.",
    postUse: ["Industrial reuse","Construction supply","Landscaping"],
    risks: ["Sludge accumulation","Chemical overdosing"],
    mitigation: ["Automated dosing systems","Sludge dewatering and disposal"],
    visuals: [],
  },
  F4: {
    title: "High Dissolved Solids", tank: "Tank B",
    status: "Non-reusable (before treatment)",
    contamination: ["High dissolved salts and ions","Elevated electrical conductivity"],
    method: ["Ultrafiltration","Activated carbon stabilization"],
    explanation: "F4 water is dominated by dissolved contaminants. Ultrafiltration removes colloids and biological matter while protecting downstream membranes.",
    postUse: ["Industrial process water","Cooling systems","Boiler feed with conditioning"],
    risks: ["Membrane fouling","Pressure loss"],
    mitigation: ["Optimized pretreatment","Scheduled membrane cleaning","Continuous monitoring"],
    visuals: [],
  },
  F5: {
    title: "Severe Dissolved Contamination", tank: "Tank B",
    status: "Non-reusable (before treatment)",
    contamination: ["Extremely high dissolved solids","Toxic ions and chemical pollutants"],
    method: ["Advanced reverse osmosis","Electrodialysis","Thermal desalination"],
    explanation: "F5 represents extreme contamination. Molecular-level separation technologies are required.",
    postUse: ["Industrial manufacturing","Potable water after remineralization","Emergency water supply"],
    risks: ["High operational cost","Brine disposal challenges"],
    mitigation: ["Zero Liquid Discharge systems","Energy recovery devices","Brine recovery and reuse"],
    visuals: [],
  },
};

const BRACKET_META: Record<string, {
  color: string; bg: string; border: string; icon: string; severity: string;
}> = {
  F1: { color: "#22c55e", bg: "#052e16", border: "#22c55e", icon: "✅", severity: "Low" },
  F2: { color: "#86efac", bg: "#052e16", border: "#86efac", icon: "🟡", severity: "Moderate" },
  F3: { color: "#fbbf24", bg: "#1c1007", border: "#fbbf24", icon: "⚠️", severity: "High" },
  F4: { color: "#f97316", bg: "#1c0a02", border: "#f97316", icon: "🔶", severity: "Very High" },
  F5: { color: "#ef4444", bg: "#1c0202", border: "#ef4444", icon: "🚨", severity: "Critical" },
};

/* ======================================================
   HELPERS
====================================================== */
function simulatePrediction(avg: { ph: number; turbidity: number; tds: number }): Prediction {
  const { ph, turbidity, tds } = avg;
  if (turbidity < 2 && tds < 200 && ph >= 6.5 && ph <= 8)
    return { bracket: "F1", reusable: true, suggestedTank: "A" };
  if (turbidity < 4 && tds < 300)
    return { bracket: "F2", reusable: false, suggestedTank: "B" };
  if (turbidity < 8 && tds < 500)
    return { bracket: "F3", reusable: false, suggestedTank: "B" };
  if (tds < 800)
    return { bracket: "F4", reusable: false, suggestedTank: "B" };
  return { bracket: "F5", reusable: false, suggestedTank: "B" };
}

function computeWQI(ph: number, turbidity: number, tds: number): number {
  const phScore   = ph >= 6.5 && ph <= 8.5 ? 100 : Math.max(0, 100 - Math.abs(ph - 7.5) * 30);
  const turbScore = Math.max(0, 100 - turbidity * 10);
  const tdsScore  = Math.max(0, 100 - (tds / 1000) * 100);
  return Math.round(phScore * 0.3 + turbScore * 0.35 + tdsScore * 0.35);
}

function wqiLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "#22c55e" };
  if (score >= 60) return { label: "Good",      color: "#86efac" };
  if (score >= 40) return { label: "Fair",      color: "#fbbf24" };
  if (score >= 20) return { label: "Poor",      color: "#f97316" };
  return              { label: "Critical",  color: "#ef4444" };
}

function detectAnomalies(rows: Row[]): Anomaly[] {
  if (!rows.length) return [];
  const out: Anomaly[] = [];
  rows.forEach((r) => {
    if (r.ph < 6.0 || r.ph > 9.0)
      out.push({ metric: "pH", value: r.ph,
        message: `pH ${r.ph} outside safe range (6.0–9.0)`,
        severity: r.ph < 4 || r.ph > 10 ? "critical" : "warning" });
    if (r.turbidity > 8)
      out.push({ metric: "Turbidity", value: r.turbidity,
        message: `Turbidity ${r.turbidity} NTU exceeds threshold (8 NTU)`,
        severity: r.turbidity > 15 ? "critical" : "warning" });
    if (r.tds > 800)
      out.push({ metric: "TDS", value: r.tds,
        message: `TDS ${r.tds} mg/L exceeds limit (800 mg/L)`,
        severity: r.tds > 1200 ? "critical" : "warning" });
  });
  const seen = new Set<string>();
  return out.filter((a) => {
    const k = `${a.metric}-${a.severity}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

function computeTrend(buffer: Row[]): { dir: "rising" | "falling" | "stable"; delta: number } {
  if (buffer.length < 10) return { dir: "stable", delta: 0 };
  const recent = buffer.slice(-TREND_WINDOW);
  const half   = Math.floor(recent.length / 2);
  const first  = recent.slice(0, half).reduce((s, r) => s + r.ph, 0) / half;
  const last   = recent.slice(half).reduce((s, r) => s + r.ph, 0) / (recent.length - half);
  const delta  = +(last - first).toFixed(3);
  if (Math.abs(delta) < 0.05) return { dir: "stable", delta };
  return { dir: delta > 0 ? "rising" : "falling", delta };
}

function computeHealthScore(buffer: Row[]): number {
  if (!buffer.length) return 100;
  const window = buffer.slice(-200);
  let anomalyCount = 0;
  window.forEach((r) => {
    if (r.ph < 6.0 || r.ph > 9.0) anomalyCount++;
    if (r.turbidity > 8)           anomalyCount++;
    if (r.tds > 800)               anomalyCount++;
  });
  const freq = anomalyCount / (window.length * 3);
  return Math.max(0, Math.round(100 - freq * 100 * 2.5));
}

function exportIterationsToCSV(iterations: Iteration[]) {
  const header = "Iteration,Timestamp,Mode,Bracket,Reusable,Tank,Avg pH,Avg Turbidity,Avg TDS\n";
  const rows = iterations.map((it) => [
    `"${it.name}"`, it.timestamp, it.mode,
    it.prediction?.bracket ?? "N/A", it.prediction?.reusable ?? "N/A",
    it.prediction?.suggestedTank ?? "N/A",
    it.avg.ph.toFixed(2), it.avg.turbidity.toFixed(2), it.avg.tds.toFixed(1),
  ].join(",")).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: `wateriq_${Date.now()}.csv` });
  a.click(); URL.revokeObjectURL(url);
}

/* ======================================================
   STYLES
====================================================== */
const S = {
  card: {
    padding: 20, borderRadius: 16,
    background: "#020617", border: "1px solid #1e293b", color: "#ecfdf5",
  } as React.CSSProperties,
  primaryBtn: {
    padding: "12px 20px", borderRadius: 12,
    background: "linear-gradient(135deg,#22c55e,#16a34a)",
    color: "#ecfdf5", border: "1px solid #22c55e", fontWeight: 700, cursor: "pointer",
  } as React.CSSProperties,
  secondaryBtn: {
    padding: "12px 20px", borderRadius: 12, background: "#020617",
    color: "#22c55e", border: "1px solid #22c55e", fontWeight: 700, cursor: "pointer",
  } as React.CSSProperties,
  dangerBtn: {
    padding: "12px 20px", borderRadius: 12, background: "#1c0202",
    color: "#ef4444", border: "1px solid #ef4444", fontWeight: 700, cursor: "pointer",
  } as React.CSSProperties,
  sectionHeading: {
    color: "#86efac", marginTop: 12, marginBottom: 6,
    fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 700,
  },
};

/* ======================================================
   ANIME.JS LOADER  (dynamic CDN inject, runs once)
====================================================== */
function useAnimeJS(onReady: () => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).anime) { onReady(); return; }
    const script   = document.createElement("script");
    script.src     = "https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js";
    script.async   = true;
    script.onload  = onReady;
    document.head.appendChild(script);
  }, []); // eslint-disable-line
}

/* ======================================================
   LIVE INDICATOR  (infinite pulse loop via anime.js)
====================================================== */
const LiveIndicator = memo(({ active }: { active: boolean }) => {
  const dotRef = useRef<HTMLDivElement>(null);
  const aniRef = useRef<any>(null);

  useEffect(() => {
    if (!active || !dotRef.current || typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    aniRef.current?.pause();
    aniRef.current = a({
      targets: dotRef.current,
      scale: [1, 1.6, 1],
      opacity: [1, 0.3, 1],
      easing: "easeInOutSine",
      duration: 1400,
      loop: true,
    });
    return () => aniRef.current?.pause();
  }, [active]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div
        ref={dotRef}
        style={{
          width: 9, height: 9, borderRadius: "50%",
          background: active ? "#22c55e" : "#374151",
          boxShadow: active ? "0 0 8px #22c55e" : "none",
        }}
      />
      <span style={{
        fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
        color: active ? "#22c55e" : "#374151",
      }}>
        {active ? "LIVE" : "IDLE"}
      </span>
    </div>
  );
});

/* ======================================================
   ANIMATED NUMBER  (tweens value on change)
====================================================== */
const AnimatedNumber = memo(({
  value, decimals = 2, suffix = "",
}: { value: number; decimals?: number; suffix?: string }) => {
  const spanRef  = useRef<HTMLSpanElement>(null);
  const prevRef  = useRef(value);
  const objRef   = useRef({ v: value });

  useEffect(() => {
    if (!spanRef.current || typeof (window as any).anime === "undefined") return;
    const a    = (window as any).anime;
    const from = prevRef.current;
    prevRef.current = value;
    a({
      targets: objRef.current,
      v: [from, value],
      duration: 700,
      easing: "easeOutExpo",
      update: () => {
        if (spanRef.current)
          spanRef.current.textContent = objRef.current.v.toFixed(decimals) + suffix;
      },
    });
  }, [value, decimals, suffix]);

  return (
    <span ref={spanRef}>{value.toFixed(decimals)}{suffix}</span>
  );
});

/* ======================================================
   HEALTH SCORE GAUGE  (animated arc via anime.js)
====================================================== */
const HealthGauge = memo(({ score }: { score: number }) => {
  const arcRef  = useRef<SVGCircleElement>(null);
  const prevRef = useRef(score);
  const R = 44, CIRC = 2 * Math.PI * R;

  useEffect(() => {
    if (!arcRef.current || typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    const obj = { pct: prevRef.current };
    prevRef.current = score;
    a({
      targets: obj,
      pct: score,
      duration: 900,
      easing: "easeOutExpo",
      update: () => {
        if (arcRef.current) {
          const dash = (obj.pct / 100) * CIRC;
          arcRef.current.style.strokeDasharray = `${dash} ${CIRC}`;
        }
      },
      complete: () => {
        // subtle glow pulse at completion
        if (arcRef.current) {
          a({
            targets: arcRef.current,
            opacity: [1, 0.6, 1],
            duration: 600,
            easing: "easeInOutSine",
          });
        }
      },
    });
  }, [score, CIRC]);

  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#fbbf24" : "#ef4444";
  const label = score >= 80 ? "Healthy" : score >= 50 ? "Degraded" : "Critical";

  return (
    <div style={{ ...S.card, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 20 }}>
      <div style={{ color: "#94a3b8", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        System Health
      </div>
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <svg viewBox="0 0 100 100" width="100" height="100">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            ref={arcRef}
            cx="50" cy="50" r={R}
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${(score / 100) * CIRC} ${CIRC}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke 0.4s" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color }}>{score}</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>/ 100</span>
        </div>
      </div>
      <div style={{ fontWeight: 700, color, fontSize: 13 }}>{label}</div>
    </div>
  );
});

/* ======================================================
   WQI GAUGE  (CSS transition arc — no anime needed)
====================================================== */
const WQIGauge = memo(({ score }: { score: number }) => {
  const { label, color } = wqiLabel(score);
  return (
    <div style={{ ...S.card, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 20 }}>
      <div style={{ color: "#94a3b8", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        Water Quality
      </div>
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <svg viewBox="0 0 120 120" width="100" height="100">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="12" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${(score / 100) * 314} 314`}
            strokeLinecap="round" transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.4s" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 22, fontWeight: 800, color }}>{score}</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>/100</span>
        </div>
      </div>
      <div style={{ fontWeight: 700, color, fontSize: 13 }}>{label}</div>
    </div>
  );
});

/* ======================================================
   ROLLING ANALYTICS PANEL
====================================================== */
const RollingAnalytics = memo(({
  bufferRef,
  rowCount,
}: { bufferRef: React.MutableRefObject<Row[]>; rowCount: number }) => {
  const trend       = useMemo(() => computeTrend(bufferRef.current), [rowCount]); // eslint-disable-line
  const healthScore = useMemo(() => computeHealthScore(bufferRef.current), [rowCount]); // eslint-disable-line
  const recentPH    = bufferRef.current.slice(-TREND_WINDOW).map((r) => r.ph);
  const avgPH       = recentPH.length
    ? +(recentPH.reduce((s, v) => s + v, 0) / recentPH.length).toFixed(3)
    : 0;

  const trendIcon  = trend.dir === "rising" ? "↑" : trend.dir === "falling" ? "↓" : "→";
  const trendColor = trend.dir === "rising" ? "#f97316" : trend.dir === "falling" ? "#22c55e" : "#94a3b8";

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 20 }}>
      {/* pH Trend */}
      <div style={{
        ...S.card, flex: 1, minWidth: 180,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          pH Trend (last {TREND_WINDOW})
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#86efac" }}>
            <AnimatedNumber value={avgPH} decimals={3} />
          </span>
          <span style={{ fontSize: 22, fontWeight: 800, color: trendColor }}>{trendIcon}</span>
        </div>
        <div style={{ fontSize: 12, color: trendColor, fontWeight: 600, textTransform: "capitalize" }}>
          {trend.dir} {Math.abs(trend.delta) > 0 ? `(Δ ${trend.delta > 0 ? "+" : ""}${trend.delta})` : ""}
        </div>
      </div>

      {/* Health Gauge */}
      <HealthGauge score={healthScore} />

      {/* Total Readings */}
      <div style={{
        ...S.card, flex: 1, minWidth: 160,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          Total Readings
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#38bdf8" }}>
          {bufferRef.current.length.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>rolling buffer</div>
      </div>
    </div>
  );
});

/* ======================================================
   ANOMALY BANNER  (anime.js drop-down)
====================================================== */
const AnomalyBanner = memo(({ anomalies }: { anomalies: Anomaly[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCount    = useRef(0);

  useEffect(() => {
    if (!containerRef.current || typeof (window as any).anime === "undefined") return;
    if (anomalies.length === 0) { prevCount.current = 0; return; }
    if (anomalies.length === prevCount.current) return;
    prevCount.current = anomalies.length;
    const a = (window as any).anime;
    a({
      targets: containerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 480,
      easing: "easeOutExpo",
    });
  }, [anomalies.length]);

  if (!anomalies.length) return null;

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
      {anomalies.map((a, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 10,
          background: a.severity === "critical" ? "#1c0202" : "#1c1007",
          border: `1px solid ${a.severity === "critical" ? "#ef4444" : "#fbbf24"}`,
          color: a.severity === "critical" ? "#fca5a5" : "#fde68a",
          fontSize: 13, fontWeight: 600,
        }}>
          <span>{a.severity === "critical" ? "🚨" : "⚠️"}</span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
});

/* ======================================================
   PROGRESS BAR  (anime.js width tween)
====================================================== */
const CollectionProgress = memo(({
  collected, total,
}: { collected: number; total: number }) => {
  const barRef  = useRef<HTMLDivElement>(null);
  const prevPct = useRef(0);

  useEffect(() => {
    if (!barRef.current || typeof (window as any).anime === "undefined") return;
    const pct = Math.min((collected / total) * 100, 100);
    const a   = (window as any).anime;
    a({
      targets: barRef.current,
      width: [`${prevPct.current}%`, `${pct}%`],
      duration: 600,
      easing: "easeOutExpo",
    });
    prevPct.current = pct;
  }, [collected, total]);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Collecting readings…</span>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>{collected} / {total}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "#0f172a", border: "1px solid #1e293b", overflow: "hidden" }}>
        <div ref={barRef} style={{
          height: "100%", width: `${(collected / total) * 100}%`,
          borderRadius: 99, background: "linear-gradient(90deg,#22c55e,#16a34a)",
        }} />
      </div>
    </div>
  );
});

/* ======================================================
   TOAST CONTAINER  (anime.js timeline entry/exit)
====================================================== */
const TOAST_META: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "#052e16", border: "#22c55e", icon: "✅" },
  error:   { bg: "#1c0202", border: "#ef4444", icon: "❌" },
  info:    { bg: "#020617", border: "#38bdf8", icon: "ℹ️" },
  warning: { bg: "#1c1007", border: "#fbbf24", icon: "⚠️" },
};

const ToastItem = memo(({
  toast, onDismiss,
}: { toast: Toast; onDismiss: (id: string) => void }) => {
  const ref  = useRef<HTMLDivElement>(null);
  const meta = TOAST_META[toast.type];

  useEffect(() => {
    if (!ref.current || typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    // Entry
    a.timeline({ targets: ref.current })
      .add({ translateX: [60, 0], opacity: [0, 1], duration: 340, easing: "easeOutExpo" });
    // Auto-exit after 3.6 s
    const t = setTimeout(() => {
      if (!ref.current) return;
      a.timeline({ targets: ref.current })
        .add({
          translateX: [0, 60], opacity: [1, 0],
          duration: 280, easing: "easeInExpo",
          complete: () => onDismiss(toast.id),
        });
    }, 3_600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  return (
    <div ref={ref} onClick={() => onDismiss(toast.id)} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", borderRadius: 12,
      background: meta.bg, border: `1px solid ${meta.border}`,
      color: "#ecfdf5", fontSize: 14, fontWeight: 600,
      cursor: "pointer", boxShadow: `0 4px 24px 0 ${meta.border}33`,
      opacity: 0, // anime sets to 1 on mount
    }}>
      <span style={{ fontSize: 18 }}>{meta.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <span style={{ color: "#64748b", fontSize: 12 }}>✕</span>
    </div>
  );
});

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 340 }}>
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}

/* ======================================================
   PREDICTION RESULT  (anime.js timeline slide-in + glow)
====================================================== */
const PredictionBanner = memo(({
  prediction,
}: { prediction: Prediction }) => {
  const ref    = useRef<HTMLDivElement>(null);
  const meta   = BRACKET_META[prediction.bracket];
  const info   = FILTRATION_LIBRARY[prediction.bracket];
  const prevB  = useRef<string>("");

  useEffect(() => {
    if (!ref.current || typeof (window as any).anime === "undefined") return;
    if (prevB.current === prediction.bracket) return;
    prevB.current = prediction.bracket;
    const a = (window as any).anime;
    a.timeline({ targets: ref.current })
      .add({ translateY: [-24, 0], opacity: [0, 1], duration: 500, easing: "easeOutExpo" })
      .add({ boxShadow: [`0 0 0px ${meta.color}00`, `0 0 32px ${meta.color}55`, `0 0 0px ${meta.color}00`], duration: 900, easing: "easeInOutSine" }, "-=200");
  }, [prediction.bracket, meta.color]);

  return (
    <div ref={ref} style={{
      marginTop: 24, padding: "16px 20px", borderRadius: 14,
      background: meta.bg, border: `1px solid ${meta.border}`,
      display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      opacity: 0,
    }}>
      <span style={{ fontSize: 32 }}>{meta.icon}</span>
      <div>
        <div style={{ color: meta.color, fontWeight: 800, fontSize: 22 }}>
          {prediction.bracket} — {info.title}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 2 }}>
          Severity: <b style={{ color: meta.color }}>{meta.severity}</b>
          {" · "}Tank: <b style={{ color: meta.color }}>{prediction.suggestedTank}</b>
          {" · "}
          {prediction.reusable
            ? <span style={{ color: "#22c55e" }}>✅ Reusable after treatment</span>
            : <span style={{ color: "#ef4444" }}>❌ Requires full treatment</span>}
        </div>
      </div>
    </div>
  );
});

/* ======================================================
   METRIC CARDS WRAPPER  (staggered entrance on mount)
====================================================== */
const MetricCardsRow = memo(({
  rows, avg, anomalies, wqiScore,
  onMetricClick,
}: {
  rows: Row[];
  avg: { ph: number; turbidity: number; tds: number };
  anomalies: Anomaly[];
  wqiScore: number;
  onMetricClick: (m: "ph" | "tds" | "turbidity") => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated  = useRef(false);
  const hasAnomaly   = anomalies.length > 0;
  const pulseRef     = useRef<any>(null);

  // Staggered entrance
  useEffect(() => {
    if (hasAnimated.current || !containerRef.current || typeof (window as any).anime === "undefined") return;
    hasAnimated.current = true;
    const a = (window as any).anime;
    a({
      targets: containerRef.current.children,
      translateY: [30, 0],
      opacity:    [0, 1],
      delay: a.stagger(90),
      duration: 700,
      easing: "easeOutExpo",
    });
  }, []);

  // Anomaly pulse
  useEffect(() => {
    if (!containerRef.current || typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    pulseRef.current?.pause();
    if (hasAnomaly) {
      pulseRef.current = a({
        targets: containerRef.current.children,
        boxShadow: [
          "0 0 0px #ef444400",
          "0 0 16px #ef444440",
          "0 0 0px #ef444400",
        ],
        duration: 1800,
        easing: "easeInOutSine",
        loop: true,
        delay: a.stagger(120),
      });
    }
    return () => pulseRef.current?.pause();
  }, [hasAnomaly]);

  return (
    <div ref={containerRef} style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 160, opacity: 0 }}>
        <MetricCard title="pH" valueKey="ph" rows={rows} avg={avg.ph}
          onClick={() => rows.length && onMetricClick("ph")} />
      </div>
      <div style={{ flex: 1, minWidth: 160, opacity: 0 }}>
        <MetricCard title="TDS" valueKey="tds" rows={rows} avg={avg.tds}
          onClick={() => rows.length && onMetricClick("tds")} />
      </div>
      <div style={{ flex: 1, minWidth: 160, opacity: 0 }}>
        <MetricCard title="Turbidity" valueKey="turbidity" rows={rows} avg={avg.turbidity}
          onClick={() => rows.length && onMetricClick("turbidity")} />
      </div>
      {rows.length > 0 && (
        <div style={{ minWidth: 160, opacity: 0 }}>
          <WQIGauge score={wqiScore} />
        </div>
      )}
    </div>
  );
});

/* ======================================================
   AUTO-SCROLL TABLE WRAPPER
====================================================== */
const AutoScrollTable = memo(({ rows }: { rows: Row[] }) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
  }, [rows.length]);

  return (
    <div ref={wrapRef} style={{ maxHeight: 280, overflowY: "auto", borderRadius: 12 }}>
      <DatasetTable rows={rows} />
    </div>
  );
});

/* ======================================================
   PUMP CONTROL PANEL
====================================================== */
type PumpCommand = "START_PUMP_A" | "START_PUMP_B" | "START_PUMP_C" | "STOP_ALL";

const PUMP_BUTTONS: { label: string; command: PumpCommand; color: string }[] = [
  { label: "Pump A", command: "START_PUMP_A", color: "#22c55e" },
  { label: "Pump B", command: "START_PUMP_B", color: "#38bdf8" },
  { label: "Pump C", command: "START_PUMP_C", color: "#a78bfa" },
  { label: "Stop All", command: "STOP_ALL",   color: "#ef4444" },
];

const PumpControlPanel = memo(({
  pumpBusy, lastPumpCommand, onCommand,
}: { pumpBusy: boolean; lastPumpCommand: string | null; onCommand: (c: PumpCommand) => void }) => (
  <div style={{ ...S.card, marginTop: 24 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ margin: 0, color: "#94a3b8", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Pump Control
      </h3>
      {lastPumpCommand && (
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Last: <b style={{ color: "#22c55e" }}>{lastPumpCommand}</b>
        </span>
      )}
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {PUMP_BUTTONS.map(({ label, command, color }) => (
        <button key={command} onClick={() => onCommand(command)} disabled={pumpBusy} style={{
          padding: "10px 16px", borderRadius: 10, background: "#0f172a",
          color, border: `1px solid ${color}`, fontWeight: 700, fontSize: 13,
          cursor: pumpBusy ? "not-allowed" : "pointer", opacity: pumpBusy ? 0.5 : 1,
        }}>
          {label}
        </button>
      ))}
    </div>
  </div>
));

/* ======================================================
   SESSION HISTORY PANEL
====================================================== */
const SessionHistoryPanel = memo(({
  iterations, onExport, onClear,
}: { iterations: Iteration[]; onExport: () => void; onClear: () => void }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!iterations.length) return null;

  return (
    <div style={{ ...S.card, marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "#94a3b8", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Session History ({iterations.length})
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onExport} style={{ ...S.secondaryBtn, padding: "7px 14px", fontSize: 13 }}>⬇ Export CSV</button>
          <button onClick={onClear}  style={{ ...S.dangerBtn,    padding: "7px 14px", fontSize: 13 }}>🗑 Clear</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...iterations].reverse().map((it) => {
          const meta = it.prediction ? BRACKET_META[it.prediction.bracket] : null;
          const isExpanded = expanded === it.id;
          const wqi = computeWQI(it.avg.ph, it.avg.turbidity, it.avg.tds);
          const wqiMeta = wqiLabel(wqi);
          return (
            <div key={it.id} style={{
              borderRadius: 12, border: `1px solid ${meta?.border ?? "#1e293b"}`,
              background: meta?.bg ?? "#0f172a", overflow: "hidden",
            }}>
              <div onClick={() => setExpanded(isExpanded ? null : it.id)} style={{
                padding: "12px 16px", display: "flex", justifyContent: "space-between",
                alignItems: "center", cursor: "pointer", userSelect: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {meta && <span style={{
                    padding: "2px 10px", borderRadius: 8, background: meta.bg,
                    color: meta.color, border: `1px solid ${meta.border}`, fontSize: 12, fontWeight: 800,
                  }}>{meta.icon} {it.prediction?.bracket}</span>}
                  <span style={{ fontWeight: 700, color: "#ecfdf5" }}>{it.name}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{it.mode === "live" ? "🔴 LIVE" : "🔵 SIM"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: wqiMeta.color, fontSize: 13, fontWeight: 700 }}>WQI: {wqi}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{new Date(it.timestamp).toLocaleString()}</span>
                  <span style={{ color: "#64748b" }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>
              {isExpanded && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e293b" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 12 }}>
                    {[
                      { label: "Avg pH",        value: it.avg.ph.toFixed(2) },
                      { label: "Avg Turbidity", value: `${it.avg.turbidity.toFixed(2)} NTU` },
                      { label: "Avg TDS",       value: `${it.avg.tds.toFixed(1)} mg/L` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: "#020617", borderRadius: 10, padding: "10px 14px", border: "1px solid #1e293b" }}>
                        <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                        <div style={{ color: "#ecfdf5", fontWeight: 700, fontSize: 18, marginTop: 4 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {it.prediction && (
                    <div style={{ marginTop: 12, color: "#94a3b8", fontSize: 13 }}>
                      Routed to <b style={{ color: meta?.color }}>Tank {it.prediction.suggestedTank}</b> —{" "}
                      {it.prediction.reusable
                        ? <span style={{ color: "#22c55e" }}>✅ Reusable</span>
                        : <span style={{ color: "#ef4444" }}>❌ Full treatment required</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ======================================================
   FILTRATION KNOWLEDGE CARD
====================================================== */
const FiltrationCard = memo(({ bracket }: { bracket: string }) => {
  const info = FILTRATION_LIBRARY[bracket];
  const meta = BRACKET_META[bracket];
  if (!info || !meta) return null;
  return (
    <div style={{ marginTop: 24, padding: 24, borderRadius: 16, background: meta.bg, border: `1px solid ${meta.border}`, color: "#ecfdf5" }}>
      <h2 style={{ color: meta.color, marginBottom: 12, marginTop: 0 }}>{meta.icon} {info.title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div><span style={{ color: "#64748b", fontSize: 12 }}>Tank</span><div style={{ fontWeight: 700 }}>{info.tank}</div></div>
        <div><span style={{ color: "#64748b", fontSize: 12 }}>Status</span><div style={{ fontWeight: 700 }}>{info.status}</div></div>
      </div>
      <hr style={{ borderColor: "#1e293b", margin: "16px 0" }} />
      <h3 style={S.sectionHeading}>Contamination</h3>
      <ul style={{ paddingLeft: 18, margin: "0 0 12px" }}>{info.contamination.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <h3 style={S.sectionHeading}>Treatment Method</h3>
      <ul style={{ paddingLeft: 18, margin: "0 0 12px" }}>{info.method.map((m, i) => <li key={i}>{m}</li>)}</ul>
      <h3 style={S.sectionHeading}>Explanation</h3>
      <p style={{ lineHeight: 1.6, margin: "0 0 12px" }}>{info.explanation}</p>
      <h3 style={S.sectionHeading}>Post-Treatment Uses</h3>
      <ul style={{ paddingLeft: 18, margin: "0 0 12px" }}>{info.postUse.map((u, i) => <li key={i}>{u}</li>)}</ul>
      <h3 style={{ ...S.sectionHeading, color: "#fca5a5" }}>Risks</h3>
      <ul style={{ paddingLeft: 18, margin: "0 0 12px" }}>{info.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
      <h3 style={{ ...S.sectionHeading, color: "#fde68a" }}>Mitigation</h3>
      <ul style={{ paddingLeft: 18, margin: "0 0 12px" }}>{info.mitigation.map((m, i) => <li key={i}>{m}</li>)}</ul>
    </div>
  );
});

/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function LiveDashboard() {
  /* ── anime.js readiness flag ── */
  const [animeReady, setAnimeReady] = useState(false);
  useAnimeJS(() => setAnimeReady(true));

  /* ── Persistent rolling buffer (ref — no re-render) ── */
  const bufferRef    = useRef<Row[]>([]);
  const driftRef     = useRef(createDriftState());
  const slCounterRef = useRef(loadCounter());

  /* ── bufferSize drives analytics re-compute without exposing full array ── */
  const [bufferSize, setBufferSize] = useState(0);

  /* ── Session rows (only last MAX_ROWS shown in table) ── */
  const [rows, setRows] = useState<Row[]>([]);

  /* ── Other state ── */
  const [activeMetric, setActiveMetric]   = useState<"ph" | "tds" | "turbidity" | null>(null);
  const [prediction, setPrediction]       = useState<Prediction | null>(null);
  const [mode, setMode]                   = useState<Mode>("idle");
  const [iterationName, setIterationName] = useState("");
  const [readyToSave, setReadyToSave]     = useState(false);
  const [predicting, setPredicting]       = useState(false);
  const [deployingLive, setDeployingLive] = useState(false);
  const [iterations, setIterations]       = useState<Iteration[]>([]);
  const [toasts, setToasts]               = useState<Toast[]>([]);
  const [pumpBusy, setPumpBusy]           = useState(false);
  const [lastPumpCommand, setLastPumpCommand] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<{
    active: boolean; completed: boolean; collected: number;
    phase: "IDLE"|"COLLECTING"|"ANALYZED"|"TRANSFERRING_MAIN"|"POST_FILTRATION"|"COMPLETE";
  } | null>(null);

  const seenTimestamps = useRef<Set<string>>(new Set());
  const prevModeRef    = useRef<Mode>("idle");

  /* ── Derived ── */
  const avg = useMemo(() => ({
    ph:        rows.length ? rows.reduce((s, r) => s + r.ph,        0) / rows.length : 0,
    turbidity: rows.length ? rows.reduce((s, r) => s + r.turbidity, 0) / rows.length : 0,
    tds:       rows.length ? rows.reduce((s, r) => s + r.tds,       0) / rows.length : 0,
  }), [rows]);

  const wqiScore = useMemo(() => rows.length ? computeWQI(avg.ph, avg.turbidity, avg.tds) : 0, [avg, rows.length]);
  const anomalies = useMemo(() => detectAnomalies(rows), [rows]);

  /* ──────────────────────────────────────────────────────
     BOOT: load localStorage buffer + restore counter
  ────────────────────────────────────────────────────── */
  useEffect(() => {
    const stored = loadBuffer();
    if (stored.length) {
      bufferRef.current = stored;
      setBufferSize(stored.length);
      // seed drift from last known values
      const last = stored[stored.length - 1];
      driftRef.current.ph.current        = last.ph;
      driftRef.current.turbidity.current = last.turbidity;
      driftRef.current.tds.current       = last.tds;
      // restore session rows
      const recent = stored.slice(-MAX_ROWS);
      setRows(recent);
    }
    // load iterations
    try {
      setIterations(JSON.parse(localStorage.getItem("waterIQ_iterations") || "[]"));
    } catch { setIterations([]); }
  }, []);

  /* ──────────────────────────────────────────────────────
     PERSISTENT FAKE STREAM  (always-on, idle mode only)
     Generates a reading every INTERVAL_MS regardless of
     whether user has started simulation/live session.
  ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (mode !== "idle") return; // stream pauses when session is active

    const tick = () => {
      const isAnomaly = Math.random() < ANOMALY_PROB;
      const row       = generateDriftReading(driftRef.current, slCounterRef.current++, isAnomaly);
      saveCounter(slCounterRef.current);

      // push to rolling buffer (ref)
      bufferRef.current = [...bufferRef.current, row].slice(-ROLLING_BUFFER_MAX);
      saveBuffer(bufferRef.current);
      setBufferSize(bufferRef.current.length);

      // update displayed rows (last MAX_ROWS)
      setRows(bufferRef.current.slice(-MAX_ROWS));
    };

    // Immediate tick so dashboard isn't blank
    tick();
    const id = setInterval(tick, INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode]);

  /* ──────────────────────────────────────────────────────
     TOAST HELPERS
  ────────────────────────────────────────────────────── */
  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ──────────────────────────────────────────────────────
     PUMP COMMAND  (unchanged)
  ────────────────────────────────────────────────────── */
  const sendPumpCommand = useCallback(async (command: PumpCommand) => {
    try {
      setPumpBusy(true);
      const res  = await fetch(BACKEND_PUMP_COMMAND_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command }) });
      const data = await res.json();
      if (!res.ok) { addToast(data.error || "Pump command failed", "error"); return; }
      setLastPumpCommand(command);
      addToast(`Pump command sent: ${command}`, "success");
    } catch { addToast("Backend unavailable — pump command failed", "error"); }
    finally   { setPumpBusy(false); }
  }, [addToast]);

  /* ──────────────────────────────────────────────────────
     SIMULATION START
  ────────────────────────────────────────────────────── */
  const startSimulation = useCallback(() => {
    setMode("simulation");
    setRows([]);
    setPrediction(null);
    setReadyToSave(false);
    seenTimestamps.current.clear();
    setSessionStatus({ active: true, completed: false, collected: 0, phase: "COLLECTING" });
    addToast("Simulation started — collecting readings", "info");
  }, [addToast]);

  /* ──────────────────────────────────────────────────────
     LIVE SESSION START
  ────────────────────────────────────────────────────── */
  const startLiveSession = useCallback(async () => {
    if (deployingLive) return;
    setDeployingLive(true);
    setRows([]); setPrediction(null); setReadyToSave(false);
    seenTimestamps.current.clear();
    try {
      const res = await fetch(BACKEND_SESSION_START_URL, { method: "POST" });
      if (!res.ok) throw new Error();
      setMode("live");
      addToast("Live sensors deployed — awaiting readings", "success");
    } catch { addToast("Backend unavailable — live mode cannot start", "error"); }
    finally   { setDeployingLive(false); }
  }, [deployingLive, addToast]);

  /* ──────────────────────────────────────────────────────
     LIVE MODE: readings + status polls
  ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (mode !== "live") return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(BACKEND_SESSION_READINGS_URL);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.readings)) {
          setRows((prev) => {
            const newOnes = data.readings.filter((r: any) => !seenTimestamps.current.has(r.timestamp));
            newOnes.forEach((r: any) => seenTimestamps.current.add(r.timestamp));
            const mapped = newOnes.map((r: any, i: number) => ({
              slNo: prev.length + i + 1, time: new Date(r.timestamp).toLocaleTimeString(),
              ph: r.ph, turbidity: r.turbidity, tds: r.tds, source: "live" as const,
            }));
            return [...prev, ...mapped].slice(0, MAX_ROWS);
          });
        }
      } catch { /* silent */ }
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (mode !== "live") return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(BACKEND_SESSION_STATUS_URL);
        if (!res.ok) return;
        setSessionStatus(await res.json());
      } catch { /* silent */ }
    }, 2000);
    return () => clearInterval(id);
  }, [mode]);

  /* ──────────────────────────────────────────────────────
     SIMULATION: DATA GENERATION (bounded to MAX_ROWS)
  ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (mode !== "simulation") return;
    if (rows.length >= MAX_ROWS) return;
    const id = setInterval(() => {
      setRows((prev) => {
        if (prev.length >= MAX_ROWS) return prev;
        const isAnomaly = Math.random() < ANOMALY_PROB;
        const newRow: Row = {
          slNo: slCounterRef.current++,
          time: new Date().toLocaleTimeString(),
          ph:        isAnomaly ? +(4.0 + Math.random() * 1.5).toFixed(2)  : advanceDrift(driftRef.current.ph),
          turbidity: isAnomaly ? +(12   + Math.random() * 6).toFixed(2)   : advanceDrift(driftRef.current.turbidity),
          tds:       isAnomaly ? +(950  + Math.random() * 200).toFixed(1) : advanceDrift(driftRef.current.tds),
          source: "simulation",
        };
        const updated = [...prev, newRow];
        setSessionStatus({ active: true, completed: false, collected: updated.length, phase: "COLLECTING" });
        if (updated.length === MAX_ROWS) addToast("All readings collected — run prediction", "success");
        return updated;
      });
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode, rows.length, addToast]);

  /* ──────────────────────────────────────────────────────
     RESET backend on live→idle transition
  ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (prevModeRef.current === "live" && mode !== "live") {
      fetch(BACKEND_SESSION_RESET_URL, { method: "POST" }).catch(() => {});
      setSessionStatus(null);
    }
    prevModeRef.current = mode;
  }, [mode]);

  /* ──────────────────────────────────────────────────────
     RUN PREDICTION  (unchanged logic)
  ────────────────────────────────────────────────────── */
  const runPrediction = useCallback(async () => {
    if (rows.length < MAX_ROWS) { addToast("Collect all 5 readings first", "warning"); return; }
    if (predicting) return;
    setPredicting(true);
    if (mode === "simulation" || mode === "idle") {
      const result = simulatePrediction(avg);
      setPrediction(result);
      setReadyToSave(true);
      setSessionStatus({ active: true, completed: false, collected: MAX_ROWS, phase: "ANALYZED" });
      addToast(`Prediction: ${result.bracket} → Tank ${result.suggestedTank}`, "success");
      setPredicting(false);
      return;
    }
    if (mode === "live") {
      try {
        const res    = await fetch(BACKEND_ANALYZE_URL, { method: "POST" });
        const result = await res.json();
        if (!res.ok || result.error) { addToast(result.error || "Prediction failed", "error"); return; }
        setPrediction(result);
        setReadyToSave(true);
        addToast(`Prediction: ${result.bracket} → Tank ${result.suggestedTank}`, "success");
      } catch { addToast("Backend unavailable — prediction failed", "error"); }
      finally   { setPredicting(false); }
    }
  }, [rows.length, predicting, mode, avg, addToast]);

  /* ──────────────────────────────────────────────────────
     SAVE ITERATION
  ────────────────────────────────────────────────────── */
  const saveIteration = useCallback(() => {
    const it: Iteration = {
      id: crypto.randomUUID(),
      name: iterationName.trim() || `Iteration ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      mode, rows, avg, prediction,
    };
    const updated = [...iterations, it];
    setIterations(updated);
    try { localStorage.setItem("waterIQ_iterations", JSON.stringify(updated)); } catch { /* silent */ }
    setIterationName(""); setReadyToSave(false);
    addToast(`Iteration "${it.name}" saved`, "success");
  }, [iterationName, mode, rows, avg, prediction, iterations, addToast]);

  const clearHistory = useCallback(() => {
    setIterations([]); localStorage.removeItem("waterIQ_iterations");
    addToast("Session history cleared", "info");
  }, [addToast]);

  /* ======================================================
     RENDER
  ====================================================== */
  const isStreamActive = mode === "idle";
  const showPredictBtn = rows.length === MAX_ROWS && !prediction;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modePulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.45; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
      `}</style>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>

        {/* ── TOP BAR ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#ecfdf5", letterSpacing: "-0.02em" }}>
              Live Dashboard
            </h1>
            {/* Mode badge */}
            <span style={{
              padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700,
              background: mode === "live" ? "#14532d" : mode === "simulation" ? "#1e293b" : "#0a1628",
              color:      mode === "live" ? "#22c55e" : mode === "simulation" ? "#38bdf8" : "#22c55e",
              border: `1px solid ${mode === "live" ? "#22c55e" : mode === "simulation" ? "#38bdf8" : "#1e3a2e"}`,
              animation: "modePulse 2.5s ease infinite",
            }}>
              {mode === "live" ? "● LIVE" : mode === "simulation" ? "● SIMULATION" : "● STREAM"}
            </span>
            {/* Live indicator */}
            <LiveIndicator active={mode !== "idle" || isStreamActive} />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Stream reading count */}
            <span style={{ color: "#4b5563", fontSize: 12, fontWeight: 600 }}>
              {bufferSize.toLocaleString()} stored
            </span>
            <button style={S.secondaryBtn} onClick={startSimulation}
              disabled={mode === "simulation" && rows.length < MAX_ROWS}>
              Deploy Simulation
            </button>
            <button style={{ ...S.secondaryBtn, opacity: deployingLive ? 0.5 : 1, cursor: deployingLive ? "not-allowed" : "pointer" }}
              onClick={startLiveSession} disabled={deployingLive}>
              {deployingLive ? "⟳ Starting…" : "Deploy Live Sensors"}
            </button>
          </div>
        </div>

        {/* ── METRIC CARDS  (staggered entrance + anomaly pulse) ── */}
        <MetricCardsRow
          rows={rows} avg={avg} anomalies={anomalies}
          wqiScore={wqiScore} onMetricClick={setActiveMetric}
        />

        {/* ── ROLLING ANALYTICS ── */}
        <RollingAnalytics bufferRef={bufferRef} rowCount={bufferSize} />

        {/* ── ANOMALY BANNER ── */}
        <AnomalyBanner anomalies={anomalies} />

        {/* ── DATA TABLE (auto-scroll) ── */}
        <div style={{ marginTop: 20 }}>
          <AutoScrollTable rows={rows} />
        </div>

        {/* ── COLLECTION PROGRESS ── */}
        {mode !== "idle" && rows.length < MAX_ROWS && (
          <CollectionProgress collected={rows.length} total={MAX_ROWS} />
        )}

        {/* ── BACKEND PHASE ── */}
        {mode === "live" && sessionStatus && (
          <p style={{ marginTop: 8, color: "#94a3b8", fontSize: 13 }}>
            Backend Phase: <b style={{ color: "#38bdf8" }}>{sessionStatus.phase}</b>
          </p>
        )}

        {/* ── RUN PREDICTION BUTTON ── */}
        {showPredictBtn && (
          <button onClick={runPrediction} disabled={predicting} style={{
            marginTop: 24, width: "100%", padding: "16px 24px", fontSize: 18,
            borderRadius: 14,
            background: predicting ? "#0f172a" : "linear-gradient(135deg,#22c55e,#16a34a)",
            color: predicting ? "#22c55e" : "#022c22",
            border: predicting ? "1px solid #22c55e" : "none",
            fontWeight: 800, cursor: predicting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            {predicting
              ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>Running prediction…</>
              : "Run Prediction Model"}
          </button>
        )}

        {/* ── PREDICTION RESULT (anime.js slide-in) ── */}
        {prediction && <PredictionBanner prediction={prediction} />}

        {/* ── FILTRATION KNOWLEDGE ── */}
        {prediction && <FiltrationCard bracket={prediction.bracket} />}

        {/* ── SAVE ITERATION ── */}
        {readyToSave && (
          <div style={{
            marginTop: 24, padding: 20, borderRadius: 14,
            background: "#020617", border: "1px dashed #22c55e",
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <input
              value={iterationName}
              onChange={(e) => setIterationName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveIteration()}
              placeholder="Give this iteration a name…"
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 10,
                background: "#020617", color: "#ecfdf5",
                border: "1px solid #22c55e", outline: "none", fontSize: 14,
              }}
            />
            <button onClick={saveIteration} style={S.primaryBtn}>Save Iteration</button>
          </div>
        )}

        {/* ── PUMP CONTROL ── */}
        <PumpControlPanel pumpBusy={pumpBusy} lastPumpCommand={lastPumpCommand} onCommand={sendPumpCommand} />

        {/* ── SESSION HISTORY ── */}
        <SessionHistoryPanel
          iterations={iterations}
          onExport={() => exportIterationsToCSV(iterations)}
          onClear={clearHistory}
        />

        {/* ── CHART MODAL ── */}
        {activeMetric && (
          <ChartModal metric={activeMetric} rows={rows} onClose={() => setActiveMetric(null)} />
        )}
      </div>
    </>
  );
                              }
