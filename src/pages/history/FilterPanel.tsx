/* ============================================================
   FilterPanel.tsx
   Left control panel — date range, bracket/tank/reusable
   filters, anomaly toggle, sort selector.
   anime.js: slide-in mount, expand/collapse sections,
   animated toggle switches.
============================================================ */
import { useEffect, useRef, useState, memo } from "react";
import type { FilterState, SortKey } from "./historyTypes";

declare const anime: any;

/* ── Animated toggle switch ── */
const Toggle = memo(({
  label, value, onChange, accentColor = "#22c55e",
}: { label: string; value: boolean; onChange: (v: boolean) => void; accentColor?: string }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackRef.current || !thumbRef.current || typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    a({ targets: trackRef.current, background: value ? accentColor + "44" : "#0f172a", duration: 220, easing: "easeOutQuad" });
    a({ targets: thumbRef.current, translateX: value ? 18 : 0, background: value ? accentColor : "#475569", duration: 220, easing: "easeOutExpo" });
  }, [value, accentColor]);

  return (
    <div
      onClick={() => onChange(!value)}
      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}
    >
      <div ref={trackRef} style={{
        width: 42, height: 22, borderRadius: 11, background: "#0f172a",
        border: "1px solid #1e293b", position: "relative", flexShrink: 0,
        transition: "border-color 0.2s",
      }}>
        <div ref={thumbRef} style={{
          width: 16, height: 16, borderRadius: "50%",
          background: "#475569", position: "absolute",
          top: 2, left: 3,
        }} />
      </div>
      <span style={{ fontSize: 12, color: value ? "#e2e8f0" : "#64748b", fontWeight: 600 }}>{label}</span>
    </div>
  );
});

/* ── Collapsible section ── */
const Section = memo(({
  title, children, defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bodyRef.current || typeof (window as any).anime === "undefined") return;
    const a = (window as any).anime;
    if (open) {
      bodyRef.current.style.display = "flex";
      a({ targets: bodyRef.current, opacity: [0, 1], translateY: [-8, 0], duration: 280, easing: "easeOutExpo" });
    } else {
      a({
        targets: bodyRef.current, opacity: [1, 0], translateY: [0, -8],
        duration: 200, easing: "easeInQuad",
        complete: () => { if (bodyRef.current) bodyRef.current.style.display = "none"; },
      });
    }
  }, [open]);

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", marginBottom: 10, userSelect: "none",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#38bdf8", textTransform: "uppercase" }}>
          {title}
        </span>
        <span style={{ color: "#38bdf8", fontSize: 11, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
      </div>
      <div ref={bodyRef} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
});

/* ── Styled select ── */
const Sel = ({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      background: "#060e1c", color: "#94a3b8", border: "1px solid #1e293b",
      borderRadius: 8, padding: "7px 10px", fontSize: 12, width: "100%",
      outline: "none", cursor: "pointer",
      fontFamily: "'JetBrains Mono', monospace",
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

/* ── Date input ── */
const DateInput = ({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "#060e1c", color: "#94a3b8", border: "1px solid #1e293b",
        borderRadius: 8, padding: "7px 10px", fontSize: 12, width: "100%",
        outline: "none",
        fontFamily: "'JetBrains Mono', monospace",
        colorScheme: "dark",
      }}
    />
  </div>
);

/* ── MAIN FILTER PANEL ── */
export const FilterPanel = memo(({
  filters, onChange, onReset, resultCount,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  resultCount: number;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  /* slide-in on mount */
  useEffect(() => {
    if (!panelRef.current || typeof (window as any).anime === "undefined") return;
    (window as any).anime({
      targets: panelRef.current,
      translateX: [-30, 0],
      opacity: [0, 1],
      duration: 520,
      easing: "easeOutExpo",
    });
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        width: 220,
        flexShrink: 0,
        background: "#040b16",
        border: "1px solid #0f2236",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "fit-content",
        position: "sticky",
        top: 20,
        opacity: 0,
      }}
    >
      {/* Panel header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: "#22c55e", textTransform: "uppercase" }}>
          ◈ Control Panel
        </div>
        <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#475569" }}>{resultCount} sessions</span>
          <button
            onClick={onReset}
            style={{
              fontSize: 10, padding: "3px 9px", borderRadius: 6,
              background: "transparent", border: "1px solid #1e293b",
              color: "#64748b", cursor: "pointer", letterSpacing: "0.08em",
            }}
          >
            RESET
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: "#0f2236", marginBottom: 16 }} />

      {/* Date Range */}
      <Section title="Date Range">
        <DateInput label="From" value={filters.dateFrom} onChange={(v) => onChange({ dateFrom: v })} />
        <DateInput label="To"   value={filters.dateTo}   onChange={(v) => onChange({ dateTo: v })} />
      </Section>

      {/* Bracket Filter */}
      <Section title="Filtration Bracket">
        <Sel
          value={filters.bracket}
          onChange={(v) => onChange({ bracket: v })}
          options={[
            { label: "All Brackets", value: "" },
            { label: "F1 — Baseline",     value: "F1" },
            { label: "F2 — Moderate",     value: "F2" },
            { label: "F3 — High Solids",  value: "F3" },
            { label: "F4 — High TDS",     value: "F4" },
            { label: "F5 — Severe",       value: "F5" },
          ]}
        />
      </Section>

      {/* Tank */}
      <Section title="Tank Routing">
        <Sel
          value={filters.tank}
          onChange={(v) => onChange({ tank: v })}
          options={[
            { label: "All Tanks", value: "" },
            { label: "Tank A",    value: "A" },
            { label: "Tank B",    value: "B" },
          ]}
        />
      </Section>

      {/* Reusable */}
      <Section title="Reusability">
        <Sel
          value={filters.reusable}
          onChange={(v) => onChange({ reusable: v })}
          options={[
            { label: "All", value: "" },
            { label: "Reusable",     value: "yes" },
            { label: "Non-reusable", value: "no" },
          ]}
        />
      </Section>

      {/* Toggles */}
      <Section title="Flags">
        <Toggle
          label="Anomaly Sessions Only"
          value={filters.anomalyOnly}
          onChange={(v) => onChange({ anomalyOnly: v })}
          accentColor="#ef4444"
        />
      </Section>

      {/* Sort */}
      <Section title="Sort By">
        <Sel
          value={filters.sortKey}
          onChange={(v) => onChange({ sortKey: v as SortKey })}
          options={[
            { label: "Date",      value: "date" },
            { label: "Severity",  value: "severity" },
            { label: "WQI Score", value: "wqi" },
            { label: "Readings",  value: "readings" },
          ]}
        />
        <Toggle
          label={filters.sortAsc ? "Ascending" : "Descending"}
          value={filters.sortAsc}
          onChange={(v) => onChange({ sortAsc: v })}
          accentColor="#38bdf8"
        />
      </Section>
    </div>
  );
});
