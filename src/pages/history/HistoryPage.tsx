/* ============================================================
   HistoryPage.tsx
   Enterprise Admin Analytics Panel — WaterIQ
   ─────────────────────────────────────────
   Layout:
     Top bar   → AnalyticsSummary
     Body      → [FilterPanel | ChartsGrid] 2-column
     Bottom    → DataExplorer

   Extra features:
     • Real-time clock + uptime counter
     • Prediction confidence estimator (derived from stability)
     • Animated gradient scan-line background
     • anime.js CDN loader
     • All data from localStorage("waterIQ_iterations")
     • No backend calls, no auth, no database
============================================================ */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { AnalyticsSummary }  from "./AnalyticsSummary";
import { FilterPanel }       from "./FilterPanel";
import { ChartsGrid }        from "./ChartsGrid";
import { DataExplorer }      from "./DataExplorer";
import {
  type Iteration,
  type FilterState,
  normalise,
  applyFilters,
  computeGlobalStats,
} from "./historyTypes";

/* ── anime.js CDN loader (fires once) ── */
function useAnimeJS(onReady: () => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).anime) { onReady(); return; }
    const s    = document.createElement("script");
    s.src      = "https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js";
    s.async    = true;
    s.onload   = onReady;
    document.head.appendChild(s);
  }, []); // eslint-disable-line
}

/* ── Default filters ── */
const DEFAULT_FILTERS: FilterState = {
  bracket: "", tank: "", reusable: "", anomalyOnly: false,
  sortKey: "date", sortAsc: false, dateFrom: "", dateTo: "",
};

/* ── Live clock ── */
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ── Uptime counter ── */
function useUptime() {
  const start  = useRef(Date.now());
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.floor((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/* ============================================================
   MAIN PAGE
============================================================ */
export default function HistoryPage() {
  const [animeReady, setAnimeReady] = useState(false);
  useAnimeJS(() => setAnimeReady(true));

  const [rawIterations, setRawIterations] = useState<Iteration[]>([]);
  const [filters, setFilters]             = useState<FilterState>(DEFAULT_FILTERS);
  const clock  = useClock();
  const uptime = useUptime();

  /* ── Load localStorage ── */
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("waterIQ_iterations") || "[]") as Iteration[];
      setRawIterations(stored);
    } catch { setRawIterations([]); }
  }, []);

  /* ── Normalise all iterations ── */
  const allNorm = useMemo(() => rawIterations.map(normalise), [rawIterations]);

  /* ── Global stats (unfiltered) ── */
  const globalStats = useMemo(() => computeGlobalStats(allNorm), [allNorm]);

  /* ── Filtered + sorted ── */
  const filtered = useMemo(() => applyFilters(allNorm, filters), [allNorm, filters]);

  /* ── Filtered stats (for charts) ── */
  const filteredStats = useMemo(() => computeGlobalStats(filtered), [filtered]);

  /* ── Confidence estimator ── */
  const confidence = useMemo(() => {
    if (!allNorm.length) return 0;
    const stab = globalStats.stabilityScore;
    const size = Math.min(allNorm.length / 20, 1); // more data = higher confidence
    return Math.round(stab * 0.6 + size * 100 * 0.4);
  }, [globalStats.stabilityScore, allNorm.length]);

  /* ── Filter patch helper ── */
  const patchFilter = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ── Animated scan-line on background ── */
  const scanRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!animeReady || !scanRef.current) return;
    const a = (window as any).anime;
    a({
      targets: scanRef.current,
      translateY: ["-100%", "100vh"],
      duration: 6000,
      easing: "linear",
      loop: true,
    });
  }, [animeReady]);

  /* ── Page mount entrance ── */
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!animeReady || !pageRef.current) return;
    (window as any).anime({
      targets: pageRef.current,
      opacity: [0, 1],
      duration: 500,
      easing: "easeOutExpo",
    });
  }, [animeReady]);

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <>
      {/* ── Global CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');

        * { box-sizing: border-box; }

        :root {
          --bg-deep:   #020910;
          --bg-card:   #040b16;
          --border:    #0f2236;
          --green:     #22c55e;
          --blue:      #38bdf8;
          --amber:     #fbbf24;
          --orange:    #f97316;
          --red:       #ef4444;
          --text:      #94a3b8;
          --text-dim:  #334155;
        }

        body, #root {
          background: var(--bg-deep) !important;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
        }

        ::-webkit-scrollbar       { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #020910; }
        ::-webkit-scrollbar-thumb { background: #0f2236; border-radius: 3px; }

        /* scan-line overlay */
        .scan-line {
          position: fixed; left: 0; width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #38bdf811, transparent);
          pointer-events: none; z-index: 9998;
        }

        /* grid texture overlay */
        .grid-bg::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(#0d1f3511 1px, transparent 1px),
            linear-gradient(90deg, #0d1f3511 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* scan line */}
      <div ref={scanRef} className="scan-line" />

      {/* Page wrapper */}
      <div
        ref={pageRef}
        className="grid-bg"
        style={{
          minHeight: "100vh",
          background: "var(--bg-deep)",
          padding: "0 0 60px",
          position: "relative",
          zIndex: 1,
          opacity: 0,
        }}
      >

        {/* ═══════════════════════════════════════
            HEADER BAR
        ═══════════════════════════════════════ */}
        <div style={{
          background: "#030b17",
          borderBottom: "1px solid #0f2236",
          padding: "12px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          {/* Left — system ID */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#22c55e", letterSpacing: "0.18em" }}>
                WATERIQ · ADMIN ANALYTICS
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", letterSpacing: "0.12em", marginTop: 2 }}>
                SCADA CONTROL SYSTEM v2.1 · READ-ONLY
              </div>
            </div>

            {/* Confidence indicator */}
            <div style={{
              padding: "4px 12px", borderRadius: 6,
              background: "#040b16", border: "1px solid #0f2236",
            }}>
              <div style={{ fontSize: 8, color: "#1e3a5f", letterSpacing: "0.12em", marginBottom: 2, textTransform: "uppercase" }}>
                Pred. Confidence
              </div>
              <div style={{
                fontSize: 14, fontWeight: 800,
                color: confidence >= 70 ? "#22c55e" : confidence >= 40 ? "#fbbf24" : "#ef4444",
              }}>
                {confidence}%
              </div>
            </div>
          </div>

          {/* Right — clock + uptime */}
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8", letterSpacing: "0.04em" }}>
                {clock.toLocaleTimeString()}
              </div>
              <div style={{ fontSize: 9, color: "#1e3a5f", letterSpacing: "0.1em" }}>
                {clock.toLocaleDateString()}
              </div>
            </div>
            <div style={{
              padding: "4px 12px", borderRadius: 6,
              background: "#040b16", border: "1px solid #0f2236",
            }}>
              <div style={{ fontSize: 8, color: "#1e3a5f", letterSpacing: "0.12em", marginBottom: 2, textTransform: "uppercase" }}>
                Session Uptime
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>{uptime}</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            MAIN CONTENT
        ═══════════════════════════════════════ */}
        <div style={{ padding: "24px 28px" }}>

          {/* ── Analytics Summary KPIs ── */}
          <AnalyticsSummary stats={globalStats} />

          {/* ── Status bar ── */}
          <div style={{
            padding: "8px 14px", borderRadius: 8,
            background: "#030a12", border: "1px solid #0a1e30",
            display: "flex", gap: 24, alignItems: "center",
            marginBottom: 20, flexWrap: "wrap",
          }}>
            {[
              { label: "DATA SOURCE",  value: "localStorage · waterIQ_iterations", color: "#38bdf8" },
              { label: "INDEX",        value: `${allNorm.length} sessions · ${globalStats.totalReadings.toLocaleString()} readings`, color: "#22c55e" },
              { label: "FILTER RESULT",value: `${filtered.length} sessions`, color: "#fbbf24" },
              { label: "BACKEND",      value: "READ-ONLY", color: "#ef4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 8, color: "#1e3a5f", letterSpacing: "0.1em" }}>{label}</span>
                <span style={{ fontSize: 10, color, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* ── Body: [FilterPanel | ChartsGrid] ── */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>

            {/* Filter Panel */}
            <FilterPanel
              filters={filters}
              onChange={patchFilter}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              resultCount={filtered.length}
            />

            {/* Charts */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {filtered.length === 0 ? (
                <div style={{
                  background: "#040b16", border: "1px solid #0f2236",
                  borderRadius: 14, padding: "60px 40px",
                  textAlign: "center", color: "#1e3a5f",
                  fontSize: 13, letterSpacing: "0.1em",
                }}>
                  NO DATA MATCHES ACTIVE FILTERS
                </div>
              ) : (
                <ChartsGrid stats={filteredStats} items={filtered} />
              )}
            </div>
          </div>

          {/* ── Data Explorer ── */}
          <div style={{ marginBottom: 4 }}>
            <div style={{
              marginBottom: 12, display: "flex", alignItems: "center",
              gap: 12,
            }}>
              <div style={{
                width: 3, height: 18, borderRadius: 2,
                background: "linear-gradient(180deg,#22c55e,#38bdf8)",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: "0.16em",
                color: "#22c55e", textTransform: "uppercase",
              }}>
                Session Data Explorer
              </span>
              <span style={{ fontSize: 10, color: "#1e3a5f" }}>
                Expand rows for raw readings, sparklines, and prediction details
              </span>
            </div>
            <DataExplorer items={filtered} />
          </div>

        </div>
      </div>
    </>
  );
}
