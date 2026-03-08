/**
 * Home.tsx — WaterIQ Dashboard
 *
 * Dependencies to install (if not already present):
 *   npm install react-grid-layout
 *   npm install --save-dev @types/react-grid-layout
 *
 * Supabase auth logic is preserved but login/logout UI buttons are removed
 * per spec (Task 6). Bottom navigation is fully removed (Task 7).
 */

import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { supabase } from "../lib/supabase";

/* ─────────────────────────────────────────────
   AUTH HELPERS — logic kept, UI buttons removed
───────────────────────────────────────────── */
const _login = async () => { await supabase.auth.signInWithOAuth({ provider: "google" }); };
const _logout = async () => { await supabase.auth.signOut(); };

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type WidgetId =
  | "weather" | "radar" | "graph" | "toggle"
  | "tank" | "history" | "settings" | "applications" | "status";

interface WidgetDef {
  id: WidgetId;
  title: string;
  accentColor: string;
  settingsKey: string;
  route?: string;
  pinnable?: boolean;
  defaultLayout: { x: number; y: number; w: number; h: number; minW?: number; minH?: number };
}

const STORAGE_KEY = "wateriq-dashboard-v3";

const WIDGET_DEFS: WidgetDef[] = [
  { id: "status",       title: "System Status",  accentColor: "#22c55e", settingsKey: "Live metrics",      pinnable: true,  defaultLayout: { x: 0, y: 0, w: 12, h: 3, minW: 6, minH: 2 } },
  { id: "weather",      title: "Weather",        accentColor: "#38bdf8", settingsKey: "Station sensor",                     defaultLayout: { x: 0, y: 3, w: 3,  h: 6, minW: 2, minH: 4 } },
  { id: "radar",        title: "Radar / Level",  accentColor: "#22c55e", settingsKey: "Pump station 5",   route: "/live",   defaultLayout: { x: 3, y: 3, w: 3,  h: 6, minW: 2, minH: 4 } },
  { id: "graph",        title: "Live Graph",     accentColor: "#22c55e", settingsKey: "Pump station 5",   route: "/live",   defaultLayout: { x: 6, y: 3, w: 3,  h: 6, minW: 2, minH: 4 } },
  { id: "toggle",       title: "Pump Control",   accentColor: "#38bdf8", settingsKey: "Pump station 5",   pinnable: true,   defaultLayout: { x: 9, y: 3, w: 3,  h: 6, minW: 2, minH: 5 } },
  { id: "tank",         title: "Tank 3D",        accentColor: "#a78bfa", settingsKey: "Pump station 5",   route: "/live",   defaultLayout: { x: 0, y: 9, w: 3,  h: 7, minW: 2, minH: 5 } },
  { id: "history",      title: "History",        accentColor: "#fbbf24", settingsKey: "Session records",  route: "/history",defaultLayout: { x: 3, y: 9, w: 3,  h: 7, minW: 2, minH: 5 } },
  { id: "settings",     title: "Settings",       accentColor: "#94a3b8", settingsKey: "System config",    route: "/settings",defaultLayout: { x: 6, y: 9, w: 3, h: 7, minW: 2, minH: 5 } },
  { id: "applications", title: "Applications",   accentColor: "#22c55e", settingsKey: "Reuse scenarios",  route: "/applications/aquaculture", defaultLayout: { x: 9, y: 9, w: 3, h: 7, minW: 2, minH: 5 } },
];

/* ─────────────────────────────────────────────
   LOCALSTORAGE HELPERS
───────────────────────────────────────────── */
interface SavedState {
  layout: Layout[];
  visibleIds: WidgetId[];
  pinnedIds: WidgetId[];
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(s: SavedState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: STATUS BAR
───────────────────────────────────────────── */
function StatusContent() {
  const metrics = [
    { label: "Sensors Online",    value: "12/12", color: "#22c55e" },
    { label: "Active Pumps",      value: "3",     color: "#38bdf8" },
    { label: "Alert Count",       value: "1",     color: "#fbbf24" },
    { label: "Data Points Today", value: "2,847", color: "#a78bfa" },
    { label: "Flow Rate",         value: "4.2 m³/s", color: "#22c55e" },
    { label: "Avg. WQI",          value: "74",    color: "#38bdf8" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, flex: 1 }}>
      {metrics.map((m) => (
        <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.label}</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: m.color, fontFamily: "'DM Mono', monospace", textShadow: `0 0 12px ${m.color}55` }}>{m.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: RADAR
───────────────────────────────────────────── */
function RadarContent() {
  const rings = [
    { level: 0.12, label: "STEP", color: "#22c55e" },
    { level: 0.09, label: "STEP", color: "#22c55e" },
    { level: 0.07, label: "WARN", color: "#fbbf24" },
  ];
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flex: 1 }}>
      <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
        {[0,1,2,3,4].map((i) => (
          <div key={i} style={{
            position: "absolute", left: "50%", top: `${i * 14}px`,
            transform: "translateX(-50%)", width: 80, height: 18, borderRadius: "50%",
            border: `2px solid ${i < 3 ? "#22c55e" : "#1e3a2e"}`,
            background: i < 3 ? "radial-gradient(ellipse at center,#0d4a2a 0%,transparent 70%)" : "transparent",
            boxShadow: i < 3 ? "0 0 8px #22c55e55" : "none",
            transition: "all 0.5s ease",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {rings.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: r.color, fontFamily: "'DM Mono', monospace", minWidth: 52 }}>
              {r.level.toFixed(2)}
            </span>
            <span style={{ fontSize: 9, color: r.color, border: `1px solid ${r.color}`, borderRadius: 4, padding: "1px 5px", fontWeight: 700, letterSpacing: "0.1em" }}>
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: LIVE GRAPH
───────────────────────────────────────────── */
function GraphContent() {
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length: 40 }, () => 10 + Math.random() * 25)
  );
  const [trend, setTrend] = useState<"Increasing"|"Decreasing"|"Stable">("Increasing");
  const [lastVal, setLastVal] = useState(20);

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const next = [...prev.slice(1), Math.max(5, Math.min(45, prev[prev.length-1] + (Math.random()-0.42)*4))];
        setLastVal(+next[next.length-1].toFixed(1));
        const delta = next[next.length-1] - next[next.length-5];
        setTrend(delta > 0.5 ? "Increasing" : delta < -0.5 ? "Decreasing" : "Stable");
        return next;
      });
    }, 600);
    return () => clearInterval(id);
  }, []);

  const W = 220, H = 80;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i/(data.length-1))*W;
    const y = H - ((v-min)/range)*(H-6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 20 }}>
        <div>
          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Trend</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:20, height:20, borderRadius:"50%",
              background: trend==="Increasing" ? "#052e16" : "#1c0202",
              border: `1px solid ${trend==="Increasing" ? "#22c55e" : "#ef4444"}`,
              fontSize:10, color: trend==="Increasing" ? "#22c55e" : "#ef4444" }}>
              {trend==="Increasing" ? "↑" : trend==="Decreasing" ? "↓" : "→"}
            </span>
            <span style={{ fontSize:13, fontWeight:700, color:"#ecfdf5" }}>{trend}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Last Value</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {lastVal.toFixed(1)} <span style={{ fontSize:12, color:"#64748b" }}>m</span>
          </div>
        </div>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="gw-fill2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75].map((f) => (
          <line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        ))}
        <path d={`M0,${H} L${pts.join(" L")} L${W},${H}Z`} fill="url(#gw-fill2)"/>
        <path d={`M${pts.join(" L")}`} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={+pts[pts.length-1].split(",")[0]} cy={+pts[pts.length-1].split(",")[1]} r="3" fill="#22c55e"/>
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#475569" }}>
        <span>10s</span><span>1m</span>
        <span>{new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: PUMP TOGGLE (no login/logout buttons)
───────────────────────────────────────────── */
function ToggleContent() {
  const [state, setState] = useState<"ON"|"OFF"|"AUTO">("AUTO");
  const opts: {label:"ON"|"OFF"|"AUTO"; color:string}[] = [
    { label:"ON",   color:"#22c55e" },
    { label:"OFF",  color:"#ef4444" },
    { label:"AUTO", color:"#38bdf8" },
  ];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14, alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontSize:22, fontWeight:800, color:"#ecfdf5", letterSpacing:"-0.02em" }}>Pump 1</div>
      <div style={{ display:"flex", gap:6 }}>
        {opts.map(({ label, color }) => (
          <button key={label} onClick={(e) => { e.stopPropagation(); setState(label); }}
            style={{ padding:"6px 14px", borderRadius:9, border:`1px solid ${state===label ? color : "rgba(255,255,255,0.08)"}`,
              background: state===label ? `${color}1a` : "rgba(255,255,255,0.03)",
              color: state===label ? color : "#475569", fontWeight:700, fontSize:11, cursor:"pointer",
              transition:"all 0.2s", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background: state===label ? color : "#334155", display:"inline-block" }}/>
            {label}
          </button>
        ))}
      </div>
      <div style={{ fontSize:12, color:"#64748b" }}>Pump station 5</div>
      <div style={{ padding:"9px 18px", borderRadius:10, width:"100%", textAlign:"center",
        background: state==="ON" ? "rgba(34,197,94,0.1)" : state==="AUTO" ? "rgba(56,189,248,0.1)" : "rgba(239,68,68,0.1)",
        border: `1px solid ${state==="ON" ? "#22c55e44" : state==="AUTO" ? "#38bdf844" : "#ef444444"}`,
        fontSize:12, fontWeight:700, letterSpacing:"0.08em",
        color: state==="ON" ? "#22c55e" : state==="AUTO" ? "#38bdf8" : "#ef4444" }}>
        {state==="ON" ? "● RUNNING" : state==="AUTO" ? "◉ AUTO MODE" : "○ OFFLINE"}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: TANK 3D
───────────────────────────────────────────── */
function TankContent() {
  const [fillLevel, setFillLevel] = useState(0.6);
  useEffect(() => {
    const id = setInterval(() => {
      setFillLevel((p) => Math.max(0.1, Math.min(0.95, p + (Math.random()-0.5)*0.04)));
    }, 1500);
    return () => clearInterval(id);
  }, []);
  const fillColor = fillLevel > 0.7 ? "#22c55e" : fillLevel > 0.4 ? "#fbbf24" : "#ef4444";
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10, alignItems:"center", justifyContent:"center" }}>
      <svg width="130" height="140" viewBox="0 0 130 140">
        <defs>
          <clipPath id="tank-clip2"><rect x="35" y="20" width="60" height="90" rx="4"/></clipPath>
          <linearGradient id="water-grad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.4"/>
          </linearGradient>
          <linearGradient id="tank-body2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b"/><stop offset="100%" stopColor="#0f172a"/>
          </linearGradient>
        </defs>
        <rect x="35" y="20" width="60" height="90" rx="4" fill="url(#tank-body2)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
        <rect x="36" y={20+90*(1-fillLevel)} width="58" height={90*fillLevel}
          fill="url(#water-grad2)" clipPath="url(#tank-clip2)"
          style={{transition:"y 0.8s ease,height 0.8s ease"}}/>
        {[30,55,80,100].map((y) => (
          <rect key={y} x="35" y={y} width="60" height="2" fill="rgba(255,255,255,0.04)"/>
        ))}
        <ellipse cx="65" cy="20" rx="30" ry="5" fill={fillColor} opacity="0.15"/>
        <text x="65" y="72" textAnchor="middle" fill="#ecfdf5" fontSize="14" fontWeight="800" fontFamily="'DM Mono',monospace">
          {Math.round(fillLevel*100)}%
        </text>
        <rect x="20" y="60" width="15" height="6" rx="3" fill="#334155"/>
        <rect x="18" y="58" width="5" height="10" rx="2" fill="#22c55e" opacity="0.7"/>
        <rect x="95" y="85" width="15" height="6" rx="3" fill="#334155"/>
        <rect x="107" y="83" width="5" height="10" rx="2" fill={fillColor} opacity="0.7"/>
      </svg>
      <div style={{ display:"flex", gap:8 }}>
        {["Start/Stop","Alarms"].map((label) => (
          <div key={label} onClick={(e) => e.stopPropagation()}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8,
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
              fontSize:11, color:"#94a3b8", cursor:"pointer", backdropFilter:"blur(4px)" }}>
            <span style={{ width:22, height:10, borderRadius:99, background: label==="Start/Stop" ? "#22c55e" : "rgba(255,255,255,0.1)", position:"relative", display:"inline-block", transition:"background 0.2s" }}>
              <span style={{ position:"absolute", top:1, left: label==="Start/Stop" ? "calc(100% - 10px)" : 1, width:8, height:8, borderRadius:"50%", background:"#ecfdf5", transition:"left 0.2s" }}/>
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: WEATHER
───────────────────────────────────────────── */
function WeatherContent() {
  const days = [
    { label:"Today",    icon:"☀️", hi:27, lo:22 },
    { label:"Tomorrow", icon:"⛅", hi:24, lo:19 },
    { label:"7 Days",   icon:"🌧️", hi:21, lo:16 },
  ];
  const [activeDay, setActiveDay] = useState(0);
  const stats = [
    { icon:"💧", value:"59%" },
    { icon:"🌬️", value:"49f/s" },
    { icon:"☁️", value:"30%" },
  ];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:32 }}>☀️</span>
        <div>
          <div style={{ fontSize:32, fontWeight:900, color:"#ecfdf5", lineHeight:1, fontFamily:"'DM Mono',monospace" }}>27°</div>
          <div style={{ fontSize:13, color:"#94a3b8" }}>Sunny Skies</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        {stats.map((s,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#64748b" }}>
            <span>{s.icon}</span><span>{s.value}</span>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {days.map((d,i) => (
          <button key={d.label} onClick={(e) => { e.stopPropagation(); setActiveDay(i); }}
            style={{ flex:1, padding:"6px 4px", borderRadius:10, cursor:"pointer", textAlign:"center", transition:"all 0.2s",
              background: activeDay===i ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeDay===i ? "#38bdf855" : "rgba(255,255,255,0.06)"}`,
              color: activeDay===i ? "#38bdf8" : "#64748b", fontSize:11, fontWeight:700, backdropFilter:"blur(4px)" }}>
            <div>{d.icon}</div>
            <div style={{ marginTop:2 }}>{d.label}</div>
            <div style={{ color:"#ecfdf5", fontWeight:800, marginTop:2 }}>
              {d.hi}° <span style={{ color:"#475569", fontWeight:400 }}>{d.lo}°</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: HISTORY
───────────────────────────────────────────── */
function HistoryContent() {
  const rows = [
    { name:"Run #14", bracket:"F2", time:"14:22" },
    { name:"Run #13", bracket:"F4", time:"13:08" },
    { name:"Run #12", bracket:"F1", time:"11:54" },
  ];
  const bracketColor: Record<string,string> = { F1:"#22c55e", F2:"#86efac", F4:"#f97316" };
  const bracketBg:    Record<string,string> = { F1:"#052e16", F2:"#052e16", F4:"#1c0a02" };
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:12, color:"#64748b" }}>Saved iterations</div>
      {rows.map((r) => (
        <div key={r.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 10px", borderRadius:10, background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#ecfdf5" }}>{r.name}</span>
          <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:800,
            background: bracketBg[r.bracket]||"#1c0202",
            color: bracketColor[r.bracket]||"#ef4444",
            border:`1px solid ${bracketColor[r.bracket]||"#ef4444"}` }}>
            {r.bracket}
          </span>
          <span style={{ fontSize:11, color:"#475569" }}>{r.time}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: SETTINGS
───────────────────────────────────────────── */
function SettingsContent() {
  const items = [
    { icon:"📡", label:"Sensor thresholds", status:"Configured" },
    { icon:"⏱",  label:"Polling interval",  status:"4 sec" },
    { icon:"🔔", label:"Alert rules",       status:"1 active" },
    { icon:"🗄",  label:"Data retention",    status:"30 days" },
  ];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
      {items.map((s) => (
        <div key={s.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"8px 10px", borderRadius:10,
          background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:14 }}>{s.icon}</span>
            <span style={{ fontSize:12, color:"#94a3b8" }}>{s.label}</span>
          </div>
          <span style={{ fontSize:11, color:"#22c55e", fontWeight:700 }}>{s.status}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT: APPLICATIONS
───────────────────────────────────────────── */
function ApplicationsContent() {
  const apps = [
    { icon:"🐟", label:"Aquaculture",     pct:74 },
    { icon:"🌾", label:"Agriculture",     pct:88 },
    { icon:"🏭", label:"Industrial",      pct:55 },
    { icon:"🏙️", label:"Municipal Reuse", pct:62 },
  ];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
      {apps.map((a) => (
        <div key={a.label}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:12, color:"#94a3b8" }}>{a.icon} {a.label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>{a.pct}%</span>
          </div>
          <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${a.pct}%`, borderRadius:99,
              background:"linear-gradient(90deg,#22c55e,#16a34a)", transition:"width 1s ease" }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIDGET CONTENT ROUTER
───────────────────────────────────────────── */
function WidgetContent({ id }: { id: WidgetId }) {
  switch (id) {
    case "status":       return <StatusContent />;
    case "weather":      return <WeatherContent />;
    case "radar":        return <RadarContent />;
    case "graph":        return <GraphContent />;
    case "toggle":       return <ToggleContent />;
    case "tank":         return <TankContent />;
    case "history":      return <HistoryContent />;
    case "settings":     return <SettingsContent />;
    case "applications": return <ApplicationsContent />;
    default:             return null;
  }
}

/* ─────────────────────────────────────────────
   DASHBOARD WIDGET WRAPPER
───────────────────────────────────────────── */
interface DashboardWidgetProps {
  def: WidgetDef;
  isEditMode: boolean;
  isPinned: boolean;
  onRemove: () => void;
  onTogglePin: () => void;
  children: React.ReactNode;
}

function DashboardWidget({ def, isEditMode, isPinned, onRemove, onTogglePin, children }: DashboardWidgetProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: hovered
          ? `1px solid ${def.accentColor}55`
          : isEditMode
          ? "1px dashed rgba(255,255,255,0.15)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: hovered
          ? `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${def.accentColor}18, inset 0 1px 0 rgba(255,255,255,0.07)`
          : "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow: "hidden",
        position: "relative",
        transition: "border 0.25s ease, box-shadow 0.25s ease",
        cursor: isEditMode ? "default" : (def.route ? "pointer" : "default"),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setSettingsOpen(false); }}
      onClick={() => { if (!isEditMode && def.route) navigate(def.route); }}
    >
      {/* Top shimmer */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(255,255,255,0.04) 0%,transparent 30%)", pointerEvents:"none", borderRadius:16 }}/>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"9px 14px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)",
        background:"rgba(0,0,0,0.15)", flexShrink:0, position:"relative", zIndex:2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Drag handle — only visible in edit mode */}
          {isEditMode && (
            <span className="drag-handle" style={{ color:"#475569", fontSize:15, cursor:"grab", userSelect:"none", lineHeight:1 }}>⠿</span>
          )}
          <div style={{ width:6, height:6, borderRadius:"50%", background:def.accentColor, boxShadow:`0 0 6px ${def.accentColor}` }}/>
          <span style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.07em", textTransform:"uppercase" }}>
            {def.title}
          </span>
          {isPinned && (
            <span style={{ fontSize:10, color:"#fbbf24", letterSpacing:"0.05em" }}>📌</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {isEditMode ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
                title={isPinned ? "Unpin widget" : "Pin widget"}
                style={{ background:"none", border:`1px solid ${isPinned ? "#fbbf2444" : "rgba(255,255,255,0.1)"}`,
                  borderRadius:6, color: isPinned ? "#fbbf24" : "#475569", cursor:"pointer",
                  fontSize:11, width:22, height:22, display:"flex", alignItems:"center",
                  justifyContent:"center", transition:"all 0.2s" }}>
                📌
              </button>
              {!isPinned && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)",
                    borderRadius:6, color:"#ef4444", cursor:"pointer", fontSize:12,
                    width:22, height:22, display:"flex", alignItems:"center",
                    justifyContent:"center", transition:"all 0.2s" }}>
                  ✕
                </button>
              )}
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setSettingsOpen((v) => !v); }}
              style={{ background:"none", border:"none", color:"#475569", cursor:"pointer",
                fontSize:13, padding:"2px 4px", borderRadius:4, transition:"color 0.2s" }}>
              ⚙
            </button>
          )}
        </div>
      </div>

      {/* Settings dropdown */}
      {settingsOpen && !isEditMode && (
        <div onClick={(e) => e.stopPropagation()}
          style={{ position:"absolute", top:38, right:8, zIndex:100,
            background:"rgba(8,12,24,0.97)", backdropFilter:"blur(20px)",
            border:"1px solid rgba(255,255,255,0.1)", borderRadius:12,
            padding:8, minWidth:140, boxShadow:"0 16px 40px rgba(0,0,0,0.7)" }}>
          {["View Details","Configure","Set Alarms","Export Data"].map((opt) => (
            <div key={opt}
              style={{ padding:"7px 12px", fontSize:12, color:"#94a3b8", cursor:"pointer",
                borderRadius:8, transition:"background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {opt}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding:"14px 16px", flex:1, display:"flex", flexDirection:"column",
        overflow:"hidden", position:"relative", zIndex:1 }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{ padding:"7px 14px", borderTop:"1px solid rgba(255,255,255,0.04)",
        background:"rgba(0,0,0,0.1)", display:"flex", justifyContent:"space-between",
        alignItems:"center", flexShrink:0, position:"relative", zIndex:1 }}>
        <span style={{ fontSize:10, color:"#2d3f52" }}>{def.settingsKey}</span>
        {!isEditMode && (
          <span style={{ fontSize:9, color:def.accentColor, border:`1px solid ${def.accentColor}33`, borderRadius:4, padding:"1px 6px" }}>↗</span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TOP HEADER
───────────────────────────────────────────── */
function TopHeader({
  isEditMode, onToggleEdit, visibleIds, onAddWidget,
}: {
  isEditMode: boolean;
  onToggleEdit: () => void;
  visibleIds: WidgetId[];
  onAddWidget: (id: WidgetId) => void;
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }));
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })), 10000);
    return () => clearInterval(id);
  }, []);

  const hiddenWidgets = WIDGET_DEFS.filter((w) => !visibleIds.includes(w.id));

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 24px", background:"rgba(3,4,8,0.88)",
      backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      position:"sticky", top:0, zIndex:50, gap:12 }}>

      {/* Left: Brand + Search */}
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:9,
            background:"linear-gradient(135deg,#0f6a7a,#0a2540)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, boxShadow:"0 0 14px rgba(15,106,122,0.6)" }}>💧</div>
          <span style={{ fontWeight:900, fontSize:15, color:"#ecfdf5", letterSpacing:"-0.02em" }}>
            Water<span style={{ color:"#38bdf8" }}>IQ</span>
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px",
          borderRadius:10, background:"rgba(255,255,255,0.04)",
          border:`1px solid ${searchFocused ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.07)"}`,
          transition:"border-color 0.2s", minWidth:190, backdropFilter:"blur(8px)" }}>
          <span style={{ color:"#475569", fontSize:13 }}>🔍</span>
          <input value={searchVal} onChange={(e) => setSearchVal(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            placeholder="Choose installation…"
            style={{ background:"none", border:"none", outline:"none", color:"#94a3b8", fontSize:13, width:"100%" }}/>
        </div>
      </div>

      {/* Center */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ color:"#fbbf24", fontSize:14 }}>★</span>
        <span style={{ fontWeight:800, fontSize:15, color:"#ecfdf5", letterSpacing:"-0.02em" }}>
          System Dashboard
        </span>
      </div>

      {/* Right: customize + user */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {/* Add widget button — only in edit mode */}
        {isEditMode && hiddenWidgets.length > 0 && (
          <div style={{ position:"relative" }}>
            <button onClick={() => setAddMenuOpen((v) => !v)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px",
                borderRadius:9, background:"rgba(34,197,94,0.12)",
                border:"1px solid rgba(34,197,94,0.3)",
                color:"#22c55e", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}>
              + Add Widget
            </button>
            {addMenuOpen && (
              <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:200,
                background:"rgba(8,12,24,0.97)", backdropFilter:"blur(20px)",
                border:"1px solid rgba(255,255,255,0.1)", borderRadius:12,
                padding:8, minWidth:180, boxShadow:"0 16px 40px rgba(0,0,0,0.7)" }}>
                {hiddenWidgets.map((w) => (
                  <div key={w.id}
                    onClick={() => { onAddWidget(w.id); setAddMenuOpen(false); }}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
                      fontSize:12, color:"#94a3b8", cursor:"pointer", borderRadius:8, transition:"background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:w.accentColor, flexShrink:0 }}/>
                    {w.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customize toggle */}
        <button onClick={onToggleEdit}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
            borderRadius:9, fontWeight:700, fontSize:12, cursor:"pointer", transition:"all 0.2s",
            background: isEditMode ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
            border: isEditMode ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(255,255,255,0.1)",
            color: isEditMode ? "#fbbf24" : "#94a3b8" }}>
          {isEditMode ? "✓ Save Layout" : "⊞ Customize"}
        </button>

        {/* Time */}
        <span style={{ fontSize:11, color:"#334155", fontFamily:"'DM Mono',monospace", minWidth:42 }}>{time}</span>

        {/* Avatar */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#ecfdf5" }}>Admin</div>
            <div style={{ fontSize:10, color:"#475569" }}>WaterIQ</div>
          </div>
          <div style={{ width:34, height:34, borderRadius:"50%",
            background:"linear-gradient(135deg,#22c55e,#16a34a)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize:12, color:"#022c22", flexShrink:0 }}>AD</div>
        </div>

        {/* Bell */}
        <button style={{ position:"relative", background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.08)", borderRadius:8,
          padding:"7px 9px", color:"#94a3b8", cursor:"pointer", fontSize:15 }}>
          🔔
          <span style={{ position:"absolute", top:3, right:3, width:7, height:7,
            borderRadius:"50%", background:"#ef4444", border:"1.5px solid #050608" }}/>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HOME — MAIN EXPORT
───────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load persisted state or build defaults
  const [visibleIds, setVisibleIds] = useState<WidgetId[]>(() => {
    const saved = loadState();
    return saved?.visibleIds ?? WIDGET_DEFS.map((w) => w.id);
  });

  const [pinnedIds, setPinnedIds] = useState<WidgetId[]>(() => {
    const saved = loadState();
    return saved?.pinnedIds ?? ["status", "toggle"];
  });

  const [layout, setLayout] = useState<Layout[]>(() => {
    const saved = loadState();
    if (saved?.layout) return saved.layout;
    return WIDGET_DEFS.map((w) => ({
      i: w.id,
      x: w.defaultLayout.x,
      y: w.defaultLayout.y,
      w: w.defaultLayout.w,
      h: w.defaultLayout.h,
      minW: w.defaultLayout.minW ?? 2,
      minH: w.defaultLayout.minH ?? 3,
    }));
  });

  // Measure container width for responsive grid
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Persist on change
  useEffect(() => {
    saveState({ layout, visibleIds, pinnedIds });
  }, [layout, visibleIds, pinnedIds]);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout((prev) => {
      // Merge — keep minW/minH from previous
      return newLayout.map((nl) => {
        const old = prev.find((p) => p.i === nl.i);
        return { ...nl, minW: old?.minW ?? 2, minH: old?.minH ?? 3 };
      });
    });
  }, []);

  const handleRemoveWidget = useCallback((id: WidgetId) => {
    if (pinnedIds.includes(id)) return;
    setVisibleIds((prev) => prev.filter((v) => v !== id));
  }, [pinnedIds]);

  const handleAddWidget = useCallback((id: WidgetId) => {
    setVisibleIds((prev) => [...prev, id]);
    // Add a default layout entry if not already present
    const def = WIDGET_DEFS.find((w) => w.id === id)!;
    setLayout((prev) => {
      if (prev.find((l) => l.i === id)) return prev;
      return [...prev, {
        i: id,
        x: 0, y: 999, // GridLayout will place it at end
        w: def.defaultLayout.w,
        h: def.defaultLayout.h,
        minW: def.defaultLayout.minW ?? 2,
        minH: def.defaultLayout.minH ?? 3,
      }];
    });
  }, []);

  const handleTogglePin = useCallback((id: WidgetId) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const handleToggleEdit = useCallback(() => {
    setIsEditMode((v) => !v);
  }, []);

  const visibleDefs = WIDGET_DEFS.filter((w) => visibleIds.includes(w.id));
  const activeLayout = layout.filter((l) => visibleIds.includes(l.i as WidgetId));
  const ROW_HEIGHT = 48;
  const COLS = 12;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Syne:wght@600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        html, body, #root {
          margin: 0; padding: 0;
          background: #050608;
          font-family: 'Syne', 'Segoe UI', sans-serif;
          min-height: 100vh;
          color: #ecfdf5;
        }

        @keyframes auroraFlow {
          0%   { transform: translate(0%,0%) scale(1); }
          50%  { transform: translate(3%,-4%) scale(1.06); }
          100% { transform: translate(0%,0%) scale(1); }
        }
        @keyframes auroraFlow2 {
          0%   { transform: translate(0%,0%) scale(1); }
          50%  { transform: translate(-4%,3%) scale(1.05); }
          100% { transform: translate(0%,0%) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }

        .wateriq-bg {
          position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
        }
        .aurora-a {
          position:absolute; inset:-20%; border-radius:50%;
          background: radial-gradient(ellipse 90% 60% at 20% 80%, rgba(15,106,122,0.22) 0%, transparent 60%),
                      radial-gradient(ellipse 60% 50% at 75% 20%, rgba(10,37,64,0.28) 0%, transparent 55%);
          animation: auroraFlow 14s ease-in-out infinite;
        }
        .aurora-b {
          position:absolute; inset:-20%; border-radius:50%;
          background: radial-gradient(ellipse 80% 45% at 65% 85%, rgba(12,59,85,0.2) 0%, transparent 60%),
                      radial-gradient(ellipse 70% 60% at 15% 30%, rgba(15,106,122,0.1) 0%, transparent 55%);
          animation: auroraFlow2 18s ease-in-out infinite;
        }
        .dot-grid {
          position:absolute; inset:0;
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0);
          background-size: 28px 28px;
        }

        /* react-grid-layout overrides */
        .react-grid-item.react-draggable-dragging {
          opacity: 0.7 !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
          z-index: 999;
        }
        .react-grid-item > .react-resizable-handle {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .react-grid-item:hover > .react-resizable-handle {
          opacity: 1;
        }
        .react-grid-item > .react-resizable-handle::after {
          border-color: rgba(56,189,248,0.5) !important;
          width: 10px !important;
          height: 10px !important;
        }
        .react-grid-placeholder {
          background: rgba(56,189,248,0.08) !important;
          border: 1px dashed rgba(56,189,248,0.3) !important;
          border-radius: 16px !important;
        }

        .widget-fade {
          animation: fadeUp 0.35s ease both;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
      `}</style>

      {/* Animated background */}
      <div className="wateriq-bg">
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,#050608 0%,#070c12 50%,#050810 100%)" }}/>
        <div className="aurora-a"/>
        <div className="aurora-b"/>
        <div className="dot-grid"/>
      </div>

      {/* App shell */}
      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", minHeight:"100vh" }}>

        {/* Header */}
        <TopHeader
          isEditMode={isEditMode}
          onToggleEdit={handleToggleEdit}
          visibleIds={visibleIds}
          onAddWidget={handleAddWidget}
        />

        {/* Dashboard area */}
        <div ref={containerRef} style={{ flex:1, padding:"20px 24px", overflowY:"auto" }}>

          {/* Edit mode banner */}
          {isEditMode && (
            <div style={{ marginBottom:16, padding:"10px 18px", borderRadius:12,
              background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.25)",
              display:"flex", alignItems:"center", gap:10, color:"#fbbf24", fontSize:13 }}>
              <span style={{ fontSize:16 }}>✏️</span>
              <span>
                <strong>Customize mode</strong> — drag widgets to rearrange, resize from corners, pin important widgets, or remove others.
                Click <strong>Save Layout</strong> when done.
              </span>
            </div>
          )}

          {/* Grid */}
          <GridLayout
            className="layout"
            layout={activeLayout}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            width={containerWidth}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            draggableHandle=".drag-handle"
            onLayoutChange={handleLayoutChange}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            resizeHandles={["se", "sw", "ne", "nw", "e", "w", "n", "s"]}
          >
            {visibleDefs.map((def) => (
              <div key={def.id} className="widget-fade">
                <DashboardWidget
                  def={def}
                  isEditMode={isEditMode}
                  isPinned={pinnedIds.includes(def.id)}
                  onRemove={() => handleRemoveWidget(def.id)}
                  onTogglePin={() => handleTogglePin(def.id)}
                >
                  <WidgetContent id={def.id} />
                </DashboardWidget>
              </div>
            ))}
          </GridLayout>

          {visibleIds.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 20px", color:"#334155" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No widgets visible</div>
              <div style={{ fontSize:13 }}>Enable Customize mode and add widgets back.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
