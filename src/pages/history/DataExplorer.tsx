/* ============================================================
   DataExplorer.tsx
   Virtualized sortable expandable data table.
   - Windowed rendering (only visible rows in DOM)
   - Sticky headers
   - Sortable columns
   - Expandable rows with sparkline + raw readings
   - anime.js: row reveal, expand, row highlight
   - CSV + JSON export
============================================================ */
import {
  useState, useRef, useEffect, useMemo, useCallback, memo,
} from "react";
import type { NormIteration } from "./historyTypes";
import { BRACKET_COLOR, FILTRATION_LIB, wqiColor } from "./historyTypes";

declare const anime: any;

/* ── Mini sparkline (pure SVG) ── */
const Sparkline = memo(({
  values, color, width = 80, height = 28,
}: { values: number[]; color: string; width?: number; height?: number }) => {
  if (values.length < 2) return null;
  const mn = Math.min(...values), mx = Math.max(...values);
  const norm = (v: number) => mx === mn ? 0.5 : (v - mn) / (mx - mn);
  const pts  = values.map((v, i) =>
    `${(i / (values.length - 1)) * width},${height - 4 - norm(v) * (height - 8)}`
  ).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
});

/* ── Expanded row detail ── */
const ExpandedDetail = memo(({ item }: { item: NormIteration }) => {
  const ref    = useRef<HTMLDivElement>(null);
  const lib    = FILTRATION_LIB[item.bracket];
  const bColor = BRACKET_COLOR[item.bracket] ?? "#94a3b8";
  const phs    = item.rows.map((r) => r.ph);
  const tds    = item.rows.map((r) => r.tds);
  const turbs  = item.rows.map((r) => r.turbidity);

  useEffect(() => {
    if (!ref.current || typeof (window as any).anime === "undefined") return;
    (window as any).anime({
      targets: ref.current,
      translateY: [-10, 0],
      opacity: [0, 1],
      duration: 320,
      easing: "easeOutExpo",
    });
  }, []);

  return (
    <div ref={ref} style={{
      background: "#040b16", borderTop: "1px solid #0f2236",
      padding: "14px 16px", opacity: 0,
    }}>
      {/* Sparklines */}
      <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { label: "pH",        vals: phs,   color: "#22c55e" },
          { label: "TDS",       vals: tds,   color: "#fbbf24" },
          { label: "Turbidity", vals: turbs, color: "#38bdf8" },
        ].map(({ label, vals, color }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <Sparkline values={vals} color={color} />
            <span style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Prediction detail */}
      {lib && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: `${bColor}11`, border: `1px solid ${bColor}33`,
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: bColor, marginBottom: 4 }}>
            {item.bracket} — {lib.title}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>{lib.explanation}</div>
        </div>
      )}

      {/* Raw readings */}
      {item.rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["#", "Time", "pH", "Turbidity", "TDS", "Source"].map((h) => (
                  <th key={h} style={{
                    padding: "5px 10px", textAlign: "left", color: "#334155",
                    fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                    borderBottom: "1px solid #0f2236", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.rows.map((r) => (
                <tr key={r.slNo} style={{ borderBottom: "1px solid #060e1c" }}>
                  <td style={{ padding: "4px 10px", color: "#1e3a5f", fontFamily: "monospace" }}>{r.slNo}</td>
                  <td style={{ padding: "4px 10px", color: "#475569", fontFamily: "monospace" }}>{r.time}</td>
                  <td style={{ padding: "4px 10px", color: "#22c55e", fontFamily: "monospace" }}>{r.ph.toFixed(2)}</td>
                  <td style={{ padding: "4px 10px", color: "#38bdf8", fontFamily: "monospace" }}>{r.turbidity.toFixed(2)}</td>
                  <td style={{ padding: "4px 10px", color: "#fbbf24", fontFamily: "monospace" }}>{r.tds.toFixed(1)}</td>
                  <td style={{ padding: "4px 10px", color: "#475569", fontFamily: "monospace", fontSize: 10 }}>{r.source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

/* ── Column header ── */
type ColKey = "name" | "timestamp" | "mode" | "bracket" | "tank" | "wqi" | "anomalyCount" | "rows";

const COL_DEFS: { key: ColKey; label: string; width: number }[] = [
  { key: "name",        label: "Session",   width: 160 },
  { key: "timestamp",   label: "Time",      width: 130 },
  { key: "mode",        label: "Mode",      width: 80  },
  { key: "bracket",     label: "Bracket",   width: 75  },
  { key: "tank",        label: "Tank",      width: 55  },
  { key: "wqi",         label: "WQI",       width: 65  },
  { key: "anomalyCount",label: "Anomalies", width: 75  },
  { key: "rows",        label: "Readings",  width: 75  },
];

/* ── Virtual row height ── */
const ROW_H      = 40;
const OVERSCAN   = 5;
const VIEWPORT_H = 420;

/* ============================================================
   MAIN DATA EXPLORER
============================================================ */
export const DataExplorer = memo(({
  items,
}: { items: NormIteration[] }) => {
  const [sortCol, setSortCol]     = useState<ColKey>("timestamp");
  const [sortAsc, setSortAsc]     = useState(false);
  const [expandedId, setExpanded] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs      = useRef<Map<string, HTMLDivElement>>(new Map());

  /* ── Sorted items ── */
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let diff = 0;
      if (sortCol === "name")         diff = a.name.localeCompare(b.name);
      if (sortCol === "timestamp")    diff = a.timestamp.localeCompare(b.timestamp);
      if (sortCol === "mode")         diff = a.mode.localeCompare(b.mode);
      if (sortCol === "bracket")      diff = (a.bracket ?? "").localeCompare(b.bracket ?? "");
      if (sortCol === "tank")         diff = (a.tank ?? "").localeCompare(b.tank ?? "");
      if (sortCol === "wqi")          diff = a.wqi - b.wqi;
      if (sortCol === "anomalyCount") diff = a.anomalyCount - b.anomalyCount;
      if (sortCol === "rows")         diff = a.rows.length - b.rows.length;
      return sortAsc ? diff : -diff;
    });
  }, [items, sortCol, sortAsc]);

  /* ── Toggle sort ── */
  const handleSort = useCallback((col: ColKey) => {
    setSortCol((prev) => { if (prev === col) setSortAsc((a) => !a); return col; });
  }, []);

  /* ── Virtual window ── */
  const totalH   = sorted.length * ROW_H;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const endIdx   = Math.min(sorted.length, Math.ceil((scrollTop + VIEWPORT_H) / ROW_H) + OVERSCAN);
  const visible  = sorted.slice(startIdx, endIdx);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  /* ── Row expand animation ── */
  const handleExpand = useCallback((id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
    const el = rowRefs.current.get(id);
    if (!el || typeof (window as any).anime === "undefined") return;
    (window as any).anime({
      targets: el,
      background: ["#040b16", "#071526", "#040b16"],
      duration: 500,
      easing: "easeOutQuad",
    });
  }, []);

  /* ── Highlight newly visible row ── */
  useEffect(() => {
    if (typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    visible.forEach((item, i) => {
      const el = rowRefs.current.get(item.id);
      if (!el) return;
      a({ targets: el, opacity: [0, 1], translateX: [-6, 0], delay: i * 12, duration: 200, easing: "easeOutQuad" });
    });
  }, [startIdx]); // eslint-disable-line

  /* ── Export ── */
  const exportCSV = useCallback(() => {
    const head = "Name,Timestamp,Mode,Bracket,Tank,WQI,Anomalies,Readings\n";
    const rows = sorted.map((it) =>
      [`"${it.name}"`, it.timestamp, it.mode, it.bracket, it.tank, it.wqi, it.anomalyCount, it.rows.length].join(",")
    ).join("\n");
    const blob = new Blob([head + rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `wateriq_history_${Date.now()}.csv` }).click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `wateriq_history_${Date.now()}.json` }).click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  const BTN = (p: { label: string; onClick: () => void; color?: string }) => (
    <button onClick={p.onClick} style={{
      padding: "6px 14px", borderRadius: 7, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase" as const,
      background: "transparent", border: `1px solid ${p.color ?? "#1e293b"}`,
      color: p.color ?? "#475569", cursor: "pointer",
      fontFamily: "'JetBrains Mono', monospace",
    }}>{p.label}</button>
  );

  return (
    <div style={{
      background: "#040b16", border: "1px solid #0f2236",
      borderRadius: 14, overflow: "hidden",
    }}>
      {/* Toolbar */}
      <div style={{
        padding: "12px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid #0f2236",
      }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#38bdf8", textTransform: "uppercase" }}>
            ◈ Session Explorer
          </span>
          <span style={{ marginLeft: 12, fontSize: 11, color: "#334155" }}>
            {sorted.length} sessions · {sorted.reduce((s, i) => s + i.rows.length, 0).toLocaleString()} readings
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <BTN label="⬇ CSV"  onClick={exportCSV}  color="#22c55e" />
          <BTN label="⬇ JSON" onClick={exportJSON} color="#38bdf8" />
        </div>
      </div>

      {/* Sticky header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: COL_DEFS.map((c) => `${c.width}px`).join(" ") + " 1fr",
        background: "#020910", borderBottom: "1px solid #0f2236",
        position: "sticky", top: 0, zIndex: 2,
      }}>
        {COL_DEFS.map((col) => (
          <div
            key={col.key}
            onClick={() => handleSort(col.key)}
            style={{
              padding: "9px 12px", fontSize: 9, fontWeight: 800,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: sortCol === col.key ? "#38bdf8" : "#1e3a5f",
              cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {col.label}
            {sortCol === col.key && (
              <span style={{ fontSize: 8, color: "#38bdf8" }}>{sortAsc ? "↑" : "↓"}</span>
            )}
          </div>
        ))}
        <div />
      </div>

      {/* Virtual scroll container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: VIEWPORT_H,
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* spacer for virtual height */}
        <div style={{ height: totalH, position: "relative" }}>
          {visible.map((item, vi) => {
            const rowTop  = (startIdx + vi) * ROW_H;
            const bColor  = BRACKET_COLOR[item.bracket] ?? "#475569";
            const wColor  = wqiColor(item.wqi);
            const isOpen  = expandedId === item.id;

            return (
              <div
                key={item.id}
                ref={(el) => { if (el) rowRefs.current.set(item.id, el); }}
                style={{
                  position: "absolute",
                  top: rowTop,
                  left: 0,
                  right: 0,
                  // when expanded, give more height (detail appended after)
                }}
              >
                {/* Main row */}
                <div
                  onClick={() => handleExpand(item.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COL_DEFS.map((c) => `${c.width}px`).join(" ") + " 1fr",
                    height: ROW_H, alignItems: "center",
                    cursor: "pointer",
                    borderBottom: isOpen ? "none" : "1px solid #060e1c",
                    background: isOpen ? "#071526" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ padding: "0 12px", fontSize: 11, color: "#94a3b8", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </div>
                  <div style={{ padding: "0 12px", fontSize: 10, color: "#334155", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  <div style={{ padding: "0 12px" }}>
                    <span style={{
                      fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                      background: item.mode === "live" ? "#14532d" : "#1e293b",
                      color: item.mode === "live" ? "#22c55e" : "#38bdf8",
                      letterSpacing: "0.08em",
                    }}>
                      {item.mode.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ padding: "0 12px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: bColor,
                      fontFamily: "monospace",
                    }}>{item.bracket}</span>
                  </div>
                  <div style={{ padding: "0 12px", fontSize: 11, color: "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>
                    {item.tank}
                  </div>
                  <div style={{ padding: "0 12px", fontSize: 12, fontWeight: 800, color: wColor, fontFamily: "monospace" }}>
                    {item.wqi}
                  </div>
                  <div style={{ padding: "0 12px", fontSize: 11, color: item.anomalyCount > 0 ? "#ef4444" : "#334155", fontFamily: "monospace" }}>
                    {item.anomalyCount > 0 ? `⚠ ${item.anomalyCount}` : "—"}
                  </div>
                  <div style={{ padding: "0 12px", fontSize: 11, color: "#475569", fontFamily: "monospace" }}>
                    {item.rows.length}
                  </div>
                  <div style={{ padding: "0 8px", color: isOpen ? "#38bdf8" : "#1e3a5f", fontSize: 10 }}>
                    {isOpen ? "▲" : "▼"}
                  </div>
                </div>

                {/* Expanded detail — positioned below row (causes virtual scroll to be approximate but acceptable) */}
                {isOpen && <ExpandedDetail item={item} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid #0f2236",
        fontSize: 10, color: "#1e3a5f",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>Showing {startIdx + 1}–{Math.min(endIdx, sorted.length)} of {sorted.length}</span>
        <span>Click any row to inspect</span>
      </div>
    </div>
  );
});
