import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import BottomNavigation from "./components/BottomNavigation";
import { supabase } from "../lib/supabase";

const login = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
  });
};

const logout = async () => {
  await supabase.auth.signOut();
};
//
// export default function Layout() {
//   return (
//     <div style={{ paddingBottom: 72 }}>
//       <Outlet />
//       <BottomNavigation />
//     </div>
//   );
// }

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type NavTab = "Dashboard" | "Map" | "Graph" | "History";

/* ─────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────── */
const NAV_TABS: { label: NavTab; icon: string }[] = [
  { label: "Dashboard", icon: "⊞" },
  { label: "Map",       icon: "◈" },
  { label: "Graph",     icon: "⌇" },
  { label: "History",   icon: "◷" },
];

const WIDGET_ROUTES: Record<string, string> = {
  "Live Dashboard": "/live",
  "History":        "/history",
  "Settings":       "/settings",
  "Applications":   "/applications/aquaculture",
};

/* ─────────────────────────────────────────────
   MINI SPARKLINE (SVG path from data array)
───────────────────────────────────────────── */
function Sparkline({
  data,
  color,
  width = 160,
  height = 48,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const d = `M${pts.join(" L")}`;
  const fillPts = [
    `0,${height}`,
    ...pts,
    `${width},${height}`,
  ];
  const fillD = `M${fillPts.join(" L")}Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#sg-${color.replace("#", "")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 6) - 3}
        r="3"
        fill={color}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   ANIMATED RADAR / LEVEL WIDGET
   Mimics the stacked ring "level" display
───────────────────────────────────────────── */
function RadarWidget() {
  const rings = [
    { level: 0.12, label: "STEP", color: "#22c55e", glow: true },
    { level: 0.09, label: "STEP", color: "#22c55e", glow: false },
    { level: 0.07, label: "WARN", color: "#fbbf24", glow: false },
  ];

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flex: 1 }}>
      {/* Stacked rings visual */}
      <div style={{ position: "relative", width: 90, height: 90 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: `${i * 14}px`,
              transform: "translateX(-50%)",
              width: 80,
              height: 18,
              borderRadius: "50%",
              border: `2px solid ${i < 3 ? "#22c55e" : "#1e3a2e"}`,
              background:
                i < 3
                  ? "radial-gradient(ellipse at center, #0d4a2a 0%, transparent 70%)"
                  : "transparent",
              boxShadow: i < 3 ? "0 0 8px #22c55e55" : "none",
              transition: "all 0.5s ease",
            }}
          />
        ))}
      </div>

      {/* Values */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {rings.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: r.color,
                fontFamily: "'Courier New', monospace",
                letterSpacing: "-0.03em",
                minWidth: 52,
              }}
            >
              {r.level.toFixed(2)}
            </span>
            <span
              style={{
                fontSize: 9,
                color: r.color,
                border: `1px solid ${r.color}`,
                borderRadius: 4,
                padding: "1px 5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIVE GRAPH WIDGET (animated line)
───────────────────────────────────────────── */
function GraphWidget() {
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length: 40 }, () => 10 + Math.random() * 25)
  );
  const [trend, setTrend] = useState<"Increasing" | "Decreasing" | "Stable">("Increasing");
  const [lastVal, setLastVal] = useState(20);

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const next = [...prev.slice(1), Math.max(5, Math.min(45, prev[prev.length - 1] + (Math.random() - 0.42) * 4))];
        const lv = +next[next.length - 1].toFixed(1);
        setLastVal(lv);
        const delta = next[next.length - 1] - next[next.length - 5];
        setTrend(delta > 0.5 ? "Increasing" : delta < -0.5 ? "Decreasing" : "Stable");
        return next;
      });
    }, 600);
    return () => clearInterval(id);
  }, []);

  const W = 200, H = 72;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const fillPts = [`0,${H}`, ...pts, `${W},${H}`];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Trend</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 20, height: 20, borderRadius: "50%",
              background: trend === "Increasing" ? "#052e16" : "#1c0202",
              border: `1px solid ${trend === "Increasing" ? "#22c55e" : "#ef4444"}`,
              fontSize: 10,
              color: trend === "Increasing" ? "#22c55e" : "#ef4444",
            }}>
              {trend === "Increasing" ? "↑" : trend === "Decreasing" ? "↓" : "→"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ecfdf5" }}>{trend}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Last Value</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e", fontFamily: "'Courier New', monospace", marginTop: 2 }}>
            {lastVal.toFixed(1)} <span style={{ fontSize: 13, color: "#64748b" }}>meter</span>
          </div>
        </div>
      </div>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="gw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke="#1e293b" strokeWidth="1" />
        ))}
        <path d={`M${fillPts.join(" L")}Z`} fill="url(#gw-fill)" />
        <path
          d={`M${pts.join(" L")}`}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={+pts[pts.length - 1].split(",")[0]}
          cy={+pts[pts.length - 1].split(",")[1]}
          r="3"
          fill="#22c55e"
        />
      </svg>

      {/* Time axis labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569" }}>
        <span>10s</span>
        <span>1m</span>
        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TOGGLE WIDGET (Pump control)
───────────────────────────────────────────── */
function ToggleWidget() {
  const [state, setState] = useState<"ON" | "OFF" | "AUTO">("AUTO");

  const opts: { label: "ON" | "OFF" | "AUTO"; color: string }[] = [
    { label: "ON",   color: "#22c55e" },
    { label: "OFF",  color: "#475569" },
    { label: "AUTO", color: "#38bdf8" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#ecfdf5", textAlign: "center" }}>
        Pump 1
      </div>
<button onClick={login}>Login with Google</button>
<button onClick={logout}>Logout</button>

      {/* Toggle bar */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {opts.map(({ label, color }) => (
          <button
            key={label}
            onClick={(e) => { e.stopPropagation(); setState(label); }}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid ${state === label ? color : "#1e293b"}`,
              background: state === label ? `${color}22` : "#0f172a",
              color: state === label ? color : "#475569",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: state === label ? color : "#1e293b",
                display: "inline-block",
              }}
            />
            {label}
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center", fontSize: 13, color: "#475569" }}>
        Pump station 5
      </div>

      {/* Status indicator */}
      <div
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          background: state === "ON" ? "#052e16" : state === "AUTO" ? "#0c1a2e" : "#1c0202",
          border: `1px solid ${state === "ON" ? "#22c55e" : state === "AUTO" ? "#38bdf8" : "#ef4444"}`,
          textAlign: "center",
          fontSize: 12,
          fontWeight: 700,
          color: state === "ON" ? "#22c55e" : state === "AUTO" ? "#38bdf8" : "#ef4444",
        }}
      >
        {state === "ON" ? "● RUNNING" : state === "AUTO" ? "◉ AUTO MODE" : "○ OFFLINE"}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   3D VIEW WIDGET
   (CSS 3D isometric tank illustration)
───────────────────────────────────────────── */
function ThreeDWidget() {
  const [fillLevel, setFillLevel] = useState(0.6);

  useEffect(() => {
    const id = setInterval(() => {
      setFillLevel((prev) => {
        const next = prev + (Math.random() - 0.5) * 0.04;
        return Math.max(0.1, Math.min(0.95, next));
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const fillColor =
    fillLevel > 0.7 ? "#22c55e" : fillLevel > 0.4 ? "#fbbf24" : "#ef4444";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      {/* Isometric tank SVG */}
      <svg width="130" height="130" viewBox="0 0 130 130">
        <defs>
          <clipPath id="tank-clip">
            <rect x="35" y="20" width="60" height="90" rx="4" />
          </clipPath>
          <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="tank-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* Tank body */}
        <rect x="35" y="20" width="60" height="90" rx="4" fill="url(#tank-body)" stroke="#334155" strokeWidth="1.5" />

        {/* Water fill */}
        <rect
          x="36"
          y={20 + 90 * (1 - fillLevel)}
          width="58"
          height={90 * fillLevel}
          fill="url(#water-grad)"
          clipPath="url(#tank-clip)"
          style={{ transition: "y 0.8s ease, height 0.8s ease" }}
        />

        {/* Tank rings / bolts */}
        {[30, 55, 80, 100].map((y) => (
          <rect key={y} x="35" y={y} width="60" height="3" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
        ))}

        {/* Glow top */}
        <ellipse cx="65" cy="20" rx="30" ry="5" fill={fillColor} opacity="0.15" />

        {/* Level % text */}
        <text x="65" y="72" textAnchor="middle" fill="#ecfdf5" fontSize="14" fontWeight="800" fontFamily="'Courier New', monospace">
          {Math.round(fillLevel * 100)}%
        </text>

        {/* Pipe left */}
        <rect x="20" y="60" width="15" height="6" rx="3" fill="#334155" />
        <rect x="18" y="58" width="5" height="10" rx="2" fill="#22c55e" opacity="0.7" />

        {/* Pipe right */}
        <rect x="95" y="85" width="15" height="6" rx="3" fill="#334155" />
        <rect x="107" y="83" width="5" height="10" rx="2" fill={fillColor} opacity="0.7" />
      </svg>

      {/* Controls row */}
      <div style={{ display: "flex", gap: 8 }}>
        {["Start / Stop", "Alarms"].map((label) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 7,
              background: "#0f172a",
              border: "1px solid #1e293b",
              fontSize: 11,
              color: "#94a3b8",
              cursor: "pointer",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                width: 22,
                height: 10,
                borderRadius: 99,
                background: label === "Start / Stop" ? "#22c55e" : "#1e293b",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 1,
                  left: label === "Start / Stop" ? "calc(100% - 10px)" : 1,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#ecfdf5",
                  transition: "left 0.2s",
                }}
              />
            </span>
            {label}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "#475569" }}>Pump station 5</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WEATHER WIDGET
───────────────────────────────────────────── */
function WeatherWidget() {
  const days = [
    { label: "Today",    icon: "☀️", hi: 27, lo: 22 },
    { label: "Tomorrow", icon: "⛅", hi: 24, lo: 19 },
    { label: "7 Days",   icon: "🌧️", hi: 21, lo: 16 },
  ];
  const [activeDay, setActiveDay] = useState(0);

  const stats = [
    { icon: "💧", label: "Humidity", value: "59%" },
    { icon: "🌬️", label: "Winds",    value: "49f/s" },
    { icon: "☁️", label: "Cloud",    value: "30%" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Current temp */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 32 }}>☀️</span>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#ecfdf5", lineHeight: 1, fontFamily: "'Courier New', monospace" }}>
            27°
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Sunny Skies</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
            <span>{s.icon}</span>
            <span>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Forecast mini cards */}
      <div style={{ display: "flex", gap: 6 }}>
        {days.map((d, i) => (
          <button
            key={d.label}
            onClick={(e) => { e.stopPropagation(); setActiveDay(i); }}
            style={{
              flex: 1,
              padding: "6px 4px",
              borderRadius: 8,
              background: activeDay === i ? "#052e16" : "#0f172a",
              border: `1px solid ${activeDay === i ? "#22c55e" : "#1e293b"}`,
              color: activeDay === i ? "#22c55e" : "#64748b",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div>{d.icon}</div>
            <div style={{ marginTop: 2 }}>{d.label}</div>
            <div style={{ color: "#ecfdf5", fontWeight: 800, marginTop: 2 }}>
              {d.hi}° <span style={{ color: "#475569", fontWeight: 400 }}>{d.lo}°</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CARD WRAPPER
───────────────────────────────────────────── */
function WidgetCard({
  title,
  settingsKey,
  children,
  onClick,
  accentColor = "#22c55e",
  style,
}: {
  title: string;
  settingsKey?: string;
  children: React.ReactNode;
  onClick?: () => void;
  accentColor?: string;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setSettingsOpen(false); }}
      style={{
        borderRadius: 14,
        background: "#0a0f1e",
        border: `1px solid ${hovered ? accentColor + "88" : "#1e293b"}`,
        color: "#ecfdf5",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.25s ease",
        transform: hovered && onClick ? "translateY(-4px)" : "none",
        boxShadow: hovered && onClick
          ? `0 16px 48px ${accentColor}22, 0 0 0 1px ${accentColor}33`
          : "0 2px 12px #00000044",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px 8px",
          borderBottom: "1px solid #1e293b",
          background: "#060d1a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: "linear-gradient(135deg, #1e293b, #334155)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              color: "#64748b",
            }}
          >
            ⠿
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#94a3b8",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setSettingsOpen((v) => !v); }}
          style={{
            background: "none",
            border: "none",
            color: "#475569",
            cursor: "pointer",
            fontSize: 14,
            padding: "2px 4px",
            borderRadius: 4,
            transition: "color 0.2s",
          }}
        >
          ⚙
        </button>
      </div>

      {/* Settings dropdown */}
      {settingsOpen && (
        <div
          style={{
            position: "absolute",
            top: 38,
            right: 8,
            zIndex: 100,
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 10,
            padding: 8,
            minWidth: 140,
            boxShadow: "0 8px 24px #000000aa",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {["View Details", "Configure", "Set Alarms", "Export Data"].map((opt) => (
            <div
              key={opt}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                color: "#94a3b8",
                cursor: "pointer",
                borderRadius: 6,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {opt}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "7px 14px",
          borderTop: "1px solid #1e293b",
          background: "#060d1a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "#334155" }}>
          {settingsKey ?? "Pump station 5"}
        </span>
        <span
          style={{
            fontSize: 9,
            color: accentColor,
            border: `1px solid ${accentColor}44`,
            borderRadius: 4,
            padding: "1px 6px",
          }}
        >
          ↗
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SYSTEM STATUS BAR
───────────────────────────────────────────── */
function SystemStatusBar() {
  const metrics = [
    { label: "Sensors Online",   value: "12/12", color: "#22c55e" },
    { label: "Active Pumps",     value: "3",     color: "#38bdf8" },
    { label: "Alert Count",      value: "1",     color: "#fbbf24" },
    { label: "Data Points Today",value: "2,847", color: "#a78bfa" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 1,
        marginBottom: 20,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #1e293b",
      }}
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            flex: 1,
            padding: "10px 16px",
            background: "#060d1a",
            borderRight: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {m.label}
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: m.color, fontFamily: "'Courier New', monospace" }}>
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TOP HEADER
───────────────────────────────────────────── */
function TopHeader({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 24px",
        background: "#060d1a",
        borderBottom: "1px solid #1e293b",
        gap: 16,
      }}
    >
      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 10,
          background: "#0a0f1e",
          border: `1px solid ${searchFocused ? "#22c55e" : "#1e293b"}`,
          transition: "border-color 0.2s",
          minWidth: 220,
        }}
      >
        <span style={{ color: "#475569", fontSize: 14 }}>🔍</span>
        <input
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Choose installation…"
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: "#94a3b8",
            fontSize: 13,
            width: "100%",
          }}
        />
      </div>

      {/* Center title */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#fbbf24", fontSize: 16 }}>★</span>
        <span style={{ fontWeight: 800, fontSize: 16, color: "#ecfdf5", letterSpacing: "-0.02em" }}>
          System dashboard
        </span>
        <span style={{ color: "#475569", fontSize: 14, cursor: "pointer" }}>✏</span>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 12, color: "#475569", fontFamily: "'Courier New', monospace" }}>
          {time}
        </span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ecfdf5" }}>John Doe</span>
          <span style={{ fontSize: 11, color: "#475569" }}>DomainX</span>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 13,
            color: "#022c22",
          }}
        >
          JD
        </div>
        <button
          style={{
            position: "relative",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: "7px 10px",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          🔔
          <span
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef4444",
              border: "1.5px solid #060d1a",
            }}
          />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BOTTOM NAV BAR
───────────────────────────────────────────── */
function BottomNav({
  active,
  onChange,
  onNavigate,
}: {
  active: NavTab;
  onChange: (t: NavTab) => void;
  onNavigate: (path: string) => void;
}) {
  const NAV_ROUTES: Partial<Record<NavTab, string>> = {
    History: "/history",
    Graph:   "/live",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "#060d1a",
        borderTop: "1px solid #1e293b",
        height: 64,
      }}
    >
      {/* Brand */}
      <div style={{ fontWeight: 900, fontSize: 15, color: "#22c55e", letterSpacing: "-0.02em" }}>
        Water<span style={{ color: "#ecfdf5" }}>IQ</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4 }}>
        {NAV_TABS.map(({ label, icon }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              onClick={() => {
                onChange(label);
                if (NAV_ROUTES[label]) onNavigate(NAV_ROUTES[label]!);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 20px",
                borderRadius: 10,
                background: isActive ? "#052e16" : "none",
                border: `1px solid ${isActive ? "#22c55e" : "transparent"}`,
                color: isActive ? "#22c55e" : "#475569",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: 18,
                position: "relative",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 28,
                    height: 2,
                    background: "#22c55e",
                    borderRadius: 99,
                  }}
                />
              )}
              <span>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Settings icon */}
      <button
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 8,
          padding: "8px 10px",
          color: "#475569",
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        ⚙
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUBTITLE BAR (below header)
───────────────────────────────────────────── */
function SubtitleBar({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 24px",
        background: "#060d1a",
        borderBottom: "1px solid #1e293b",
      }}
    >
      <button
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 8,
          background: "#0f172a",
          border: "1px solid #1e293b",
          color: "#94a3b8",
          fontSize: 12,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        System Dashboard <span style={{ color: "#475569" }}>▾</span>
      </button>

      <button
        onClick={() => onNavigate("/settings")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 12px",
          borderRadius: 8,
          background: "none",
          border: "1px solid #1e293b",
          color: "#94a3b8",
          fontSize: 12,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        ✏ Edit
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HOME PAGE — MAIN COMPONENT
───────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<NavTab>("Dashboard");

  // Animate cards in on mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800;900&display=swap');

        * { box-sizing: border-box; }

        body, #root {
          margin: 0;
          padding: 0;
          background: #050c18;
          font-family: 'Syne', 'Segoe UI', sans-serif;
          min-height: 100vh;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }

        .widget-enter {
          animation: fadeUp 0.4s ease both;
        }

        /* Texture overlay */
        .dash-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: radial-gradient(circle at 1px 1px, #ffffff04 1px, transparent 0);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      <div
        className="dash-bg"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: "linear-gradient(160deg, #05091a 0%, #050c18 50%, #040a14 100%)",
          position: "relative",
        }}
      >
        {/* TOP HEADER */}
        <TopHeader onNavigate={navigate} />

        {/* SUBTITLE BAR */}
        <SubtitleBar onNavigate={navigate} />

        {/* MAIN CONTENT */}
        <div
          style={{
            flex: 1,
            padding: "20px 24px",
            position: "relative",
            zIndex: 1,
            overflowY: "auto",
          }}
        >
          {/* System status strip */}
          <SystemStatusBar />

          {/* WIDGET GRID — 4 columns like the reference */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            {/* WIDGET 1 — Weather */}
            <div
              className="widget-enter"
              style={{ animationDelay: "0ms" }}
            >
              <WidgetCard
                title="Weather Widget"
                settingsKey="Station sensor"
                accentColor="#38bdf8"
              >
                <WeatherWidget />
              </WidgetCard>
            </div>

            {/* WIDGET 2 — Radar / Level */}
            <div
              className="widget-enter"
              style={{ animationDelay: "60ms" }}
            >
              <WidgetCard
                title="Radar / Level"
                settingsKey="Pump station 5"
                onClick={() => navigate("/live")}
                accentColor="#22c55e"
              >
                <RadarWidget />
              </WidgetCard>
            </div>

            {/* WIDGET 3 — Live Graph */}
            <div
              className="widget-enter"
              style={{ animationDelay: "120ms" }}
            >
              <WidgetCard
                title="Graph"
                settingsKey="Pump station 5"
                onClick={() => navigate("/live")}
                accentColor="#22c55e"
              >
                <GraphWidget />
              </WidgetCard>
            </div>

            {/* WIDGET 4 — Toggle / Pump */}
            <div
              className="widget-enter"
              style={{ animationDelay: "180ms" }}
            >
              <WidgetCard
                title="Toggle"
                settingsKey="Pump station 5"
                accentColor="#38bdf8"
              >
                <ToggleWidget />
              </WidgetCard>
            </div>

            {/* WIDGET 5 — 3D View / Tank */}
            <div
              className="widget-enter"
              style={{ animationDelay: "240ms" }}
            >
              <WidgetCard
                title="3D View"
                settingsKey="Pump station 5"
                onClick={() => navigate("/live")}
                accentColor="#a78bfa"
              >
                <ThreeDWidget />
              </WidgetCard>
            </div>

            {/* WIDGET 6 — History */}
            <div
              className="widget-enter"
              style={{ animationDelay: "300ms" }}
            >
              <WidgetCard
                title="History"
                settingsKey="Session records"
                onClick={() => navigate("/history")}
                accentColor="#fbbf24"
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Saved iterations</div>
                  {[
                    { name: "Run #14", bracket: "F2", wqi: 61, time: "14:22" },
                    { name: "Run #13", bracket: "F4", wqi: 33, time: "13:08" },
                    { name: "Run #12", bracket: "F1", wqi: 88, time: "11:54" },
                  ].map((r) => (
                    <div
                      key={r.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "#0f172a",
                        border: "1px solid #1e293b",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#ecfdf5" }}>{r.name}</span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          background:
                            r.bracket === "F1" ? "#052e16" :
                            r.bracket === "F2" ? "#052e16" :
                            r.bracket === "F4" ? "#1c0a02" : "#1c0202",
                          color:
                            r.bracket === "F1" ? "#22c55e" :
                            r.bracket === "F2" ? "#86efac" :
                            r.bracket === "F4" ? "#f97316" : "#ef4444",
                          border: `1px solid ${
                            r.bracket === "F1" ? "#22c55e" :
                            r.bracket === "F2" ? "#86efac" :
                            r.bracket === "F4" ? "#f97316" : "#ef4444"
                          }`,
                        }}
                      >
                        {r.bracket}
                      </span>
                      <span style={{ fontSize: 11, color: "#475569" }}>{r.time}</span>
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>

            {/* WIDGET 7 — Settings shortcut */}
            <div
              className="widget-enter"
              style={{ animationDelay: "360ms" }}
            >
              <WidgetCard
                title="Settings"
                settingsKey="System config"
                onClick={() => navigate("/settings")}
                accentColor="#94a3b8"
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: "📡", label: "Sensor thresholds", status: "Configured" },
                    { icon: "⏱", label: "Polling interval",  status: "4 sec" },
                    { icon: "🔔", label: "Alert rules",       status: "1 active" },
                    { icon: "🗄", label: "Data retention",    status: "30 days" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 10px",
                        borderRadius: 8,
                        background: "#0f172a",
                        border: "1px solid #1e293b",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{s.icon}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{s.label}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>

            {/* WIDGET 8 — Applications */}
            <div
              className="widget-enter"
              style={{ animationDelay: "420ms" }}
            >
              <WidgetCard
                title="Applications"
                settingsKey="Reuse scenarios"
                onClick={() => navigate("/applications/aquaculture")}
                accentColor="#22c55e"
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: "🐟", label: "Aquaculture",     pct: 74 },
                    { icon: "🌾", label: "Agriculture",     pct: 88 },
                    { icon: "🏭", label: "Industrial",      pct: 55 },
                    { icon: "🏙️", label: "Municipal Reuse", pct: 62 },
                  ].map((a) => (
                    <div key={a.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          {a.icon} {a.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{a.pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "#1e293b", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${a.pct}%`,
                            borderRadius: 99,
                            background: "linear-gradient(90deg,#22c55e,#16a34a)",
                            transition: "width 1s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>
          </div>
        </div>

        {/* BOTTOM NAV */}
        <BottomNav
          active={activeTab}
          onChange={setActiveTab}
          onNavigate={navigate}
        />
      </div>
    </>
  );
}
