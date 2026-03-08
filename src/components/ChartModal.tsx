import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import * as htmlToImage from 
  "html-to-image";
import { useRef } from "react";

type Props = {
  metric: "ph" | "tds" | "turbidity";
  rows: any[];
  onClose: () => void;
};

export default function ChartModal({ metric, rows, onClose }: Props) {
  if (!rows || rows.length === 0) return null;

  const chartRef = useRef<HTMLDivElement>(null);

  const metricLabel =
    metric === "ph"
      ? "pH"
      : metric === "tds"
      ? "TDS"
      : "Turbidity";

  const values = rows.map((r) => Number(r[metric])).filter((v) => !isNaN(v));
  const current = values.at(-1)!;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Standard deviation
  const std =
    Math.sqrt(
      values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length
    ) || 0;

  // Attach anomaly flag
  const chartData = rows.map((r) => ({
    ...r,
    anomaly: Math.abs(r[metric] - avg) > 2 * std,
  }));

  // Thresholds (visual only)
  const thresholds =
    metric === "ph"
      ? [6.5, 8.5]
      : metric === "tds"
      ? [1000]
      : [10];

  const exportPNG = async () => {
    if (!chartRef.current) return;
    const dataUrl = await toPng(chartRef.current);
    const link = document.createElement("a");
    link.download = `${metricLabel}_chart.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* HEADER */}
        <div style={headerStyle}>
          <h2>{metricLabel} vs Time</h2>
          <div>
            <button onClick={exportPNG} style={exportBtn}>
              Export PNG
            </button>
            <button onClick={onClose} style={closeBtn}>
              ✕
            </button>
          </div>
        </div>

        {/* STATS */}
        <div style={statsBar}>
          <Stat label="Current" value={current} />
          <Stat label="Min" value={min} />
          <Stat label="Max" value={max} />
          <Stat label="Average" value={avg} />
        </div>

        {/* CHART */}
        <div ref={chartRef} style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" />

              <XAxis dataKey="time" tick={{ fill: "#cbd5e1" }} />
              <YAxis tick={{ fill: "#cbd5e1" }} />

              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  color: "#e5e7eb",
                }}
              />

              {/* Threshold lines */}
              {thresholds.map((t, i) => (
                <ReferenceLine
                  key={i}
                  y={t}
                  stroke="#eab308"
                  strokeDasharray="6 6"
                />
              ))}

              {/* Main line */}
              <Line
                type="monotone"
                dataKey={metric}
                stroke="#22c55e"
                strokeWidth={3}
                dot={({ cx, cy, payload }) =>
                  payload.anomaly ? (
                    <circle cx={cx} cy={cy} r={6} fill="#ef4444" />
                  ) : (
                    <circle cx={cx} cy={cy} r={4} fill="#22c55e" />
                  )
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p style={footerText}>
          Thresholds shown are advisory. Red points indicate anomalies.
        </p>
      </div>
    </div>
  );
}

/* SMALL STAT COMPONENT */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statItem}>
      <span style={statLabel}>{label}</span>
      <span style={statValue}>{value.toFixed(2)}</span>
    </div>
  );
}

/* ===================== STYLES ===================== */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,0.6)",
  backdropFilter: "blur(8px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: "90%",
  maxWidth: 1000,
  background: "rgba(15,23,42,0.92)",
  padding: 24,
  borderRadius: 16,
  color: "#e5e7eb",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#e5e7eb",
  fontSize: 22,
  cursor: "pointer",
  marginLeft: 12,
};

const exportBtn: React.CSSProperties = {
  background: "#22c55e",
  border: "none",
  color: "#022c22",
  padding: "6px 12px",
  borderRadius: 6,
  fontWeight: 600,
  cursor: "pointer",
};

const statsBar: React.CSSProperties = {
  display: "flex",
  gap: 18,
  background: "#020617",
  padding: 12,
  borderRadius: 10,
  margin: "12px 0",
};

const statItem: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const statLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
};

const statValue: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#22c55e",
};

const footerText: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
  marginTop: 10,
};
