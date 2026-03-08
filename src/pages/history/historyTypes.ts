/* ============================================================
   historyTypes.ts — Shared types + pure data helpers
   All computation lives here; components stay presentation-only.
============================================================ */

export type Row = {
  slNo: number;
  time: string;
  ph: number;
  turbidity: number;
  tds: number;
  source: "simulation" | "live" | "stream";
};

export type Prediction = {
  bracket?: string;
  filtrationBracket?: string;
  reusable: boolean | string;
  suggestedTank?: string;
  tank?: string;
};

export type Iteration = {
  id: string;
  name?: string;
  timestamp: string;
  mode: "idle" | "simulation" | "live";
  rows: Row[];
  avg: { ph: number; turbidity: number; tds: number };
  prediction: Prediction | null;
};

/* ── Normalised view used only by History page ── */
export type NormIteration = {
  id: string;
  name: string;
  timestamp: string;
  mode: string;
  rows: Row[];
  avg: { ph: number; turbidity: number; tds: number };
  bracket: string;
  tank: string;
  reusable: boolean;
  wqi: number;
  anomalyCount: number;
};

/* ── Filters ── */
export type SortKey = "date" | "severity" | "wqi" | "readings";
export type FilterState = {
  bracket: string;        // "" = all
  tank: string;           // "" = all
  reusable: string;       // "" | "yes" | "no"
  anomalyOnly: boolean;
  sortKey: SortKey;
  sortAsc: boolean;
  dateFrom: string;       // ISO date string or ""
  dateTo: string;
};

/* ── FILTRATION LIBRARY ── */
export const FILTRATION_LIB: Record<string, { title: string; explanation: string }> = {
  F1: { title: "Baseline Polishing",        explanation: "Lightly contaminated. Sediment + activated carbon. Safe for non-potable reuse after treatment." },
  F2: { title: "Moderate Suspended Solids", explanation: "Sand + carbon + polishing filters. Hydraulic interference removed. Suitable for irrigation and industrial wash." },
  F3: { title: "High Suspended Solids",     explanation: "Coagulation, flocculation, sedimentation, rapid sand filtration. Municipal-grade treatment required." },
  F4: { title: "High Dissolved Solids",     explanation: "Ultrafiltration + carbon stabilisation. Pre-treatment for advanced RO stages." },
  F5: { title: "Severe Contamination",      explanation: "RO / electrodialysis / thermal desalination. Molecular-level separation. Energy intensive." },
};

export const BRACKET_COLOR: Record<string, string> = {
  F1: "#22c55e", F2: "#86efac", F3: "#fbbf24", F4: "#f97316", F5: "#ef4444",
};
export const BRACKET_ORDER: Record<string, number> = {
  F1: 1, F2: 2, F3: 3, F4: 4, F5: 5,
};

/* ── Pure helpers ── */
export function computeWQI(ph: number, turbidity: number, tds: number): number {
  const phScore   = ph >= 6.5 && ph <= 8.5 ? 100 : Math.max(0, 100 - Math.abs(ph - 7.5) * 30);
  const turbScore = Math.max(0, 100 - turbidity * 10);
  const tdsScore  = Math.max(0, 100 - (tds / 1000) * 100);
  return Math.round(phScore * 0.3 + turbScore * 0.35 + tdsScore * 0.35);
}

export function wqiColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#86efac";
  if (score >= 40) return "#fbbf24";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

export function wqiLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Poor";
  return "Critical";
}

export function countAnomalies(rows: Row[]): number {
  return rows.filter(
    (r) => r.ph < 6.0 || r.ph > 9.0 || r.turbidity > 8 || r.tds > 800
  ).length;
}

export function normalise(it: Iteration): NormIteration {
  const bracket =
    it.prediction?.bracket ??
    it.prediction?.filtrationBracket ??
    "—";
  const tank =
    it.prediction?.suggestedTank ??
    it.prediction?.tank ??
    "—";
  const reusable = it.prediction
    ? it.prediction.reusable === true ||
      String(it.prediction.reusable).toLowerCase() === "yes" ||
      String(it.prediction.reusable).toLowerCase() === "true"
    : false;
  const wqi = computeWQI(it.avg.ph, it.avg.turbidity, it.avg.tds);
  return {
    id: it.id,
    name: it.name || "Unnamed",
    timestamp: it.timestamp,
    mode: it.mode,
    rows: it.rows,
    avg: it.avg,
    bracket,
    tank,
    reusable,
    wqi,
    anomalyCount: countAnomalies(it.rows),
  };
}

export function applyFilters(
  items: NormIteration[],
  f: FilterState
): NormIteration[] {
  let out = items.filter((it) => {
    if (f.bracket && it.bracket !== f.bracket) return false;
    if (f.tank && it.tank !== f.tank) return false;
    if (f.reusable === "yes" && !it.reusable) return false;
    if (f.reusable === "no"  &&  it.reusable) return false;
    if (f.anomalyOnly && it.anomalyCount === 0) return false;
    if (f.dateFrom && it.timestamp < f.dateFrom) return false;
    if (f.dateTo   && it.timestamp > f.dateTo + "T23:59:59") return false;
    return true;
  });

  out = [...out].sort((a, b) => {
    let diff = 0;
    if (f.sortKey === "date")     diff = a.timestamp.localeCompare(b.timestamp);
    if (f.sortKey === "severity") diff = (BRACKET_ORDER[a.bracket] ?? 0) - (BRACKET_ORDER[b.bracket] ?? 0);
    if (f.sortKey === "wqi")      diff = a.wqi - b.wqi;
    if (f.sortKey === "readings") diff = a.rows.length - b.rows.length;
    return f.sortAsc ? diff : -diff;
  });

  return out;
}

/* ── Global analytics from all (unfiltered) iterations ── */
export type GlobalStats = {
  totalSessions: number;
  totalReadings: number;
  avgPH: number;
  avgTDS: number;
  avgTurbidity: number;
  avgWQI: number;
  stabilityScore: number;
  bracketDist: Record<string, number>;
  tankDist: Record<string, number>;
  wqiOverTime: { ts: string; wqi: number }[];
  phOverTime: { ts: string; ph: number }[];
  tdsOverTime: { ts: string; tds: number }[];
  turbOverTime: { ts: string; turb: number }[];
};

export function computeGlobalStats(items: NormIteration[]): GlobalStats {
  if (!items.length) return {
    totalSessions: 0, totalReadings: 0,
    avgPH: 0, avgTDS: 0, avgTurbidity: 0, avgWQI: 0, stabilityScore: 100,
    bracketDist: {}, tankDist: {},
    wqiOverTime: [], phOverTime: [], tdsOverTime: [], turbOverTime: [],
  };

  const totalReadings  = items.reduce((s, i) => s + i.rows.length, 0);
  const avgPH          = items.reduce((s, i) => s + i.avg.ph,        0) / items.length;
  const avgTDS         = items.reduce((s, i) => s + i.avg.tds,       0) / items.length;
  const avgTurbidity   = items.reduce((s, i) => s + i.avg.turbidity, 0) / items.length;
  const avgWQI         = items.reduce((s, i) => s + i.wqi,           0) / items.length;

  // Stability: 100 − (std-dev of WQI / mean_WQI * 100), clamped [0,100]
  const wqiVar  = items.reduce((s, i) => s + Math.pow(i.wqi - avgWQI, 2), 0) / items.length;
  const wqiStd  = Math.sqrt(wqiVar);
  const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - (wqiStd / Math.max(avgWQI, 1)) * 100)));

  const bracketDist: Record<string, number> = {};
  const tankDist:    Record<string, number> = {};
  items.forEach((i) => {
    bracketDist[i.bracket] = (bracketDist[i.bracket] || 0) + 1;
    if (i.tank !== "—") tankDist[i.tank] = (tankDist[i.tank] || 0) + 1;
  });

  const sorted = [...items].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    totalSessions: items.length, totalReadings,
    avgPH: +avgPH.toFixed(3), avgTDS: +avgTDS.toFixed(1),
    avgTurbidity: +avgTurbidity.toFixed(3), avgWQI: +avgWQI.toFixed(1),
    stabilityScore, bracketDist, tankDist,
    wqiOverTime:  sorted.map((i) => ({ ts: i.timestamp, wqi:  i.wqi })),
    phOverTime:   sorted.map((i) => ({ ts: i.timestamp, ph:   i.avg.ph })),
    tdsOverTime:  sorted.map((i) => ({ ts: i.timestamp, tds:  i.avg.tds })),
    turbOverTime: sorted.map((i) => ({ ts: i.timestamp, turb: i.avg.turbidity })),
  };
}
