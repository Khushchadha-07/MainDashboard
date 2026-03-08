/**
 * Home.tsx — WaterIQ Dashboard
 *
 * Zero new dependencies. Drag/resize built with native browser APIs.
 * Supabase auth logic preserved. Login/logout UI buttons removed.
 * Bottom navigation fully removed.
 */

import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

/* ─── AUTH HELPERS (logic kept, no UI buttons) ─── */
const _login  = async () => { await supabase.auth.signInWithOAuth({ provider: "google" }); };
const _logout = async () => { await supabase.auth.signOut(); };

/* ─── TYPES ─── */
type WidgetId =
  | "status" | "weather" | "radar" | "graph"
  | "toggle" | "tank"   | "history" | "settings" | "applications";

interface WidgetDef {
  id: WidgetId;
  title: string;
  accentColor: string;
  settingsKey: string;
  route?: string;
  defaultSpan: { col: number; row: number; colSpan: number; rowSpan: number };
}

interface WLayout {
  id: WidgetId;
  col: number; row: number;
  colSpan: number; rowSpan: number;
}

const COLS    = 4;
const ROW_PX  = 230;
const GAP_PX  = 16;

const DEFS: WidgetDef[] = [
  { id:"status",       title:"System Status",  accentColor:"#22c55e", settingsKey:"Live metrics",       defaultSpan:{col:1,row:1,colSpan:4,rowSpan:1} },
  { id:"weather",      title:"Weather",        accentColor:"#38bdf8", settingsKey:"Station sensor",      defaultSpan:{col:1,row:2,colSpan:1,rowSpan:2} },
  { id:"radar",        title:"Radar / Level",  accentColor:"#22c55e", settingsKey:"Pump station 5",      route:"/live",     defaultSpan:{col:2,row:2,colSpan:1,rowSpan:2} },
  { id:"graph",        title:"Live Graph",     accentColor:"#22c55e", settingsKey:"Pump station 5",      route:"/live",     defaultSpan:{col:3,row:2,colSpan:1,rowSpan:2} },
  { id:"toggle",       title:"Pump Control",   accentColor:"#38bdf8", settingsKey:"Pump station 5",      defaultSpan:{col:4,row:2,colSpan:1,rowSpan:2} },
  { id:"tank",         title:"Tank 3D",        accentColor:"#a78bfa", settingsKey:"Pump station 5",      route:"/live",     defaultSpan:{col:1,row:4,colSpan:1,rowSpan:2} },
  { id:"history",      title:"History",        accentColor:"#fbbf24", settingsKey:"Session records",     route:"/history",  defaultSpan:{col:2,row:4,colSpan:1,rowSpan:2} },
  { id:"settings",     title:"Settings",       accentColor:"#94a3b8", settingsKey:"System config",       route:"/settings", defaultSpan:{col:3,row:4,colSpan:1,rowSpan:2} },
  { id:"applications", title:"Applications",   accentColor:"#22c55e", settingsKey:"Reuse scenarios",     route:"/applications/aquaculture", defaultSpan:{col:4,row:4,colSpan:1,rowSpan:2} },
];

const DEFAULT_PINNED: WidgetId[] = ["status", "toggle"];
const STORAGE_KEY = "wateriq-v5";

/* ─── STORAGE ─── */
interface Saved { layouts: WLayout[]; visible: WidgetId[]; pinned: WidgetId[] }
const loadSaved = (): Saved | null => { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const persist   = (s: Saved) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} };
const defaultLayouts = (): WLayout[] => DEFS.map(w => ({ id:w.id, ...w.defaultSpan }));

/* ═══════════════════════════════════════════
   WIDGET CONTENTS
═══════════════════════════════════════════ */
function StatusContent() {
  const metrics = [
    { label:"Sensors Online",    value:"12/12",    color:"#22c55e" },
    { label:"Active Pumps",      value:"3",         color:"#38bdf8" },
    { label:"Alert Count",       value:"1",         color:"#fbbf24" },
    { label:"Data Points Today", value:"2,847",     color:"#a78bfa" },
    { label:"Flow Rate",         value:"4.2 m³/s",  color:"#22c55e" },
    { label:"Avg. WQI",          value:"74",         color:"#38bdf8" },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:12, flex:1 }}>
      {metrics.map(m => (
        <div key={m.label} style={{ display:"flex", flexDirection:"column", gap:3 }}>
          <span style={{ fontSize:9, color:"#475569", textTransform:"uppercase", letterSpacing:"0.1em" }}>{m.label}</span>
          <span style={{ fontSize:20, fontWeight:800, color:m.color, fontFamily:"'DM Mono',monospace", textShadow:`0 0 12px ${m.color}55` }}>{m.value}</span>
        </div>
      ))}
    </div>
  );
}

function RadarContent() {
  const rings = [{level:0.12,label:"STEP",color:"#22c55e"},{level:0.09,label:"STEP",color:"#22c55e"},{level:0.07,label:"WARN",color:"#fbbf24"}];
  return (
    <div style={{ display:"flex", gap:20, alignItems:"center", flex:1 }}>
      <div style={{ position:"relative", width:90, height:90, flexShrink:0 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ position:"absolute", left:"50%", top:`${i*14}px`, transform:"translateX(-50%)", width:80, height:18, borderRadius:"50%",
            border:`2px solid ${i<3?"#22c55e":"#1e3a2e"}`,
            background:i<3?"radial-gradient(ellipse at center,#0d4a2a 0%,transparent 70%)":"transparent",
            boxShadow:i<3?"0 0 8px #22c55e55":"none", transition:"all 0.5s ease" }}/>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, flex:1 }}>
        {rings.map((r,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20, fontWeight:800, color:r.color, fontFamily:"'DM Mono',monospace", minWidth:52 }}>{r.level.toFixed(2)}</span>
            <span style={{ fontSize:9, color:r.color, border:`1px solid ${r.color}`, borderRadius:4, padding:"1px 5px", fontWeight:700, letterSpacing:"0.1em" }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GraphContent() {
  const [data, setData] = useState<number[]>(() => Array.from({length:40}, () => 10+Math.random()*25));
  const [trend, setTrend] = useState<"Increasing"|"Decreasing"|"Stable">("Increasing");
  const [lastVal, setLastVal] = useState(20);
  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const next = [...prev.slice(1), Math.max(5,Math.min(45,prev[prev.length-1]+(Math.random()-0.42)*4))];
        setLastVal(+next[next.length-1].toFixed(1));
        const delta = next[next.length-1]-next[next.length-5];
        setTrend(delta>0.5?"Increasing":delta<-0.5?"Decreasing":"Stable");
        return next;
      });
    }, 600);
    return () => clearInterval(id);
  }, []);
  const W=220,H=80,min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const pts = data.map((v,i) => `${((i/(data.length-1))*W).toFixed(1)},${(H-((v-min)/range)*(H-6)-3).toFixed(1)}`);
  const trendColor = trend==="Increasing"?"#22c55e":"#ef4444";
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", gap:20 }}>
        <div>
          <div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em" }}>Trend</div>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
            <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:20, height:20, borderRadius:"50%", background:trend==="Increasing"?"#052e16":"#1c0202", border:`1px solid ${trendColor}`, fontSize:10, color:trendColor }}>
              {trend==="Increasing"?"↑":trend==="Decreasing"?"↓":"→"}
            </span>
            <span style={{ fontSize:13, fontWeight:700, color:"#ecfdf5" }}>{trend}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em" }}>Last Value</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#22c55e", fontFamily:"'DM Mono',monospace", marginTop:2 }}>{lastVal.toFixed(1)} <span style={{fontSize:12,color:"#64748b"}}>m</span></div>
        </div>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        <defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/><stop offset="100%" stopColor="#22c55e" stopOpacity="0"/></linearGradient></defs>
        {[0.25,0.5,0.75].map(f=><line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>)}
        <path d={`M0,${H} L${pts.join(" L")} L${W},${H}Z`} fill="url(#gf)"/>
        <path d={`M${pts.join(" L")}`} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={+pts[pts.length-1].split(",")[0]} cy={+pts[pts.length-1].split(",")[1]} r="3" fill="#22c55e"/>
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569"}}>
        <span>10s</span><span>1m</span><span>{new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
      </div>
    </div>
  );
}

function ToggleContent() {
  const [state, setState] = useState<"ON"|"OFF"|"AUTO">("AUTO");
  const opts: {label:"ON"|"OFF"|"AUTO";color:string}[] = [{label:"ON",color:"#22c55e"},{label:"OFF",color:"#ef4444"},{label:"AUTO",color:"#38bdf8"}];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:14,alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:22,fontWeight:800,color:"#ecfdf5",letterSpacing:"-0.02em"}}>Pump 1</div>
      <div style={{display:"flex",gap:6}}>
        {opts.map(({label,color}) => (
          <button key={label} onClick={(e)=>{e.stopPropagation();setState(label);}}
            style={{padding:"6px 14px",borderRadius:9,border:`1px solid ${state===label?color:"rgba(255,255,255,0.08)"}`,background:state===label?`${color}1a`:"rgba(255,255,255,0.03)",color:state===label?color:"#475569",fontWeight:700,fontSize:11,cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:state===label?color:"#334155",display:"inline-block"}}/>
            {label}
          </button>
        ))}
      </div>
      <div style={{fontSize:12,color:"#64748b"}}>Pump station 5</div>
      <div style={{padding:"9px 18px",borderRadius:10,width:"100%",textAlign:"center",
        background:state==="ON"?"rgba(34,197,94,0.1)":state==="AUTO"?"rgba(56,189,248,0.1)":"rgba(239,68,68,0.1)",
        border:`1px solid ${state==="ON"?"#22c55e44":state==="AUTO"?"#38bdf844":"#ef444444"}`,
        fontSize:12,fontWeight:700,letterSpacing:"0.08em",
        color:state==="ON"?"#22c55e":state==="AUTO"?"#38bdf8":"#ef4444"}}>
        {state==="ON"?"● RUNNING":state==="AUTO"?"◉ AUTO MODE":"○ OFFLINE"}
      </div>
    </div>
  );
}

function TankContent() {
  const [fill, setFill] = useState(0.6);
  useEffect(()=>{
    const id=setInterval(()=>setFill(p=>Math.max(0.1,Math.min(0.95,p+(Math.random()-0.5)*0.04))),1500);
    return()=>clearInterval(id);
  },[]);
  const fc=fill>0.7?"#22c55e":fill>0.4?"#fbbf24":"#ef4444";
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:10,alignItems:"center",justifyContent:"center"}}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <defs>
          <clipPath id="tc2"><rect x="35" y="20" width="60" height="90" rx="4"/></clipPath>
          <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={fc} stopOpacity="0.9"/><stop offset="100%" stopColor={fc} stopOpacity="0.4"/></linearGradient>
          <linearGradient id="tb2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1e293b"/><stop offset="100%" stopColor="#0f172a"/></linearGradient>
        </defs>
        <rect x="35" y="20" width="60" height="90" rx="4" fill="url(#tb2)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
        <rect x="36" y={20+90*(1-fill)} width="58" height={90*fill} fill="url(#wg2)" clipPath="url(#tc2)" style={{transition:"y 0.8s ease,height 0.8s ease"}}/>
        {[30,55,80,100].map(y=><rect key={y} x="35" y={y} width="60" height="2" fill="rgba(255,255,255,0.04)"/>)}
        <ellipse cx="65" cy="20" rx="30" ry="5" fill={fc} opacity="0.15"/>
        <text x="65" y="72" textAnchor="middle" fill="#ecfdf5" fontSize="14" fontWeight="800" fontFamily="'DM Mono',monospace">{Math.round(fill*100)}%</text>
        <rect x="20" y="60" width="15" height="6" rx="3" fill="#334155"/>
        <rect x="18" y="58" width="5" height="10" rx="2" fill="#22c55e" opacity="0.7"/>
        <rect x="95" y="85" width="15" height="6" rx="3" fill="#334155"/>
        <rect x="107" y="83" width="5" height="10" rx="2" fill={fc} opacity="0.7"/>
      </svg>
      <div style={{display:"flex",gap:8}}>
        {["Start/Stop","Alarms"].map(label=>(
          <div key={label} onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",fontSize:11,color:"#94a3b8",cursor:"pointer"}}>
            <span style={{width:22,height:10,borderRadius:99,background:label==="Start/Stop"?"#22c55e":"rgba(255,255,255,0.1)",position:"relative",display:"inline-block"}}>
              <span style={{position:"absolute",top:1,left:label==="Start/Stop"?"calc(100% - 10px)":1,width:8,height:8,borderRadius:"50%",background:"#ecfdf5"}}/>
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherContent() {
  const days=[{label:"Today",icon:"☀️",hi:27,lo:22},{label:"Tomorrow",icon:"⛅",hi:24,lo:19},{label:"7 Days",icon:"🌧️",hi:21,lo:16}];
  const [active,setActive]=useState(0);
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:32}}>☀️</span>
        <div><div style={{fontSize:32,fontWeight:900,color:"#ecfdf5",lineHeight:1,fontFamily:"'DM Mono',monospace"}}>27°</div><div style={{fontSize:13,color:"#94a3b8"}}>Sunny Skies</div></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        {[{icon:"💧",v:"59%"},{icon:"🌬️",v:"49f/s"},{icon:"☁️",v:"30%"}].map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#64748b"}}><span>{s.icon}</span><span>{s.v}</span></div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        {days.map((d,i)=>(
          <button key={d.label} onClick={e=>{e.stopPropagation();setActive(i);}}
            style={{flex:1,padding:"6px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all 0.2s",background:active===i?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.03)",border:`1px solid ${active===i?"#38bdf855":"rgba(255,255,255,0.06)"}`,color:active===i?"#38bdf8":"#64748b",fontSize:11,fontWeight:700}}>
            <div>{d.icon}</div><div style={{marginTop:2}}>{d.label}</div>
            <div style={{color:"#ecfdf5",fontWeight:800,marginTop:2}}>{d.hi}° <span style={{color:"#475569",fontWeight:400}}>{d.lo}°</span></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryContent() {
  const rows=[{name:"Run #14",bracket:"F2",time:"14:22"},{name:"Run #13",bracket:"F4",time:"13:08"},{name:"Run #12",bracket:"F1",time:"11:54"}];
  const bc:Record<string,string>={F1:"#22c55e",F2:"#86efac",F4:"#f97316"};
  const bb:Record<string,string>={F1:"#052e16",F2:"#052e16",F4:"#1c0a02"};
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:12,color:"#64748b"}}>Saved iterations</div>
      {rows.map(r=>(
        <div key={r.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#ecfdf5"}}>{r.name}</span>
          <span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:800,background:bb[r.bracket]||"#1c0202",color:bc[r.bracket]||"#ef4444",border:`1px solid ${bc[r.bracket]||"#ef4444"}`}}>{r.bracket}</span>
          <span style={{fontSize:11,color:"#475569"}}>{r.time}</span>
        </div>
      ))}
    </div>
  );
}

function SettingsContent() {
  const items=[{icon:"📡",label:"Sensor thresholds",status:"Configured"},{icon:"⏱",label:"Polling interval",status:"4 sec"},{icon:"🔔",label:"Alert rules",status:"1 active"},{icon:"🗄",label:"Data retention",status:"30 days"}];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
      {items.map(s=>(
        <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>{s.icon}</span><span style={{fontSize:12,color:"#94a3b8"}}>{s.label}</span></div>
          <span style={{fontSize:11,color:"#22c55e",fontWeight:700}}>{s.status}</span>
        </div>
      ))}
    </div>
  );
}

function ApplicationsContent() {
  const apps=[{icon:"🐟",label:"Aquaculture",pct:74},{icon:"🌾",label:"Agriculture",pct:88},{icon:"🏭",label:"Industrial",pct:55},{icon:"🏙️",label:"Municipal Reuse",pct:62}];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
      {apps.map(a=>(
        <div key={a.label}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:12,color:"#94a3b8"}}>{a.icon} {a.label}</span>
            <span style={{fontSize:12,fontWeight:700,color:"#22c55e"}}>{a.pct}%</span>
          </div>
          <div style={{height:5,borderRadius:99,background:"rgba(255,255,255,0.08)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${a.pct}%`,borderRadius:99,background:"linear-gradient(90deg,#22c55e,#16a34a)",transition:"width 1s ease"}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function WidgetContent({ id }: { id: WidgetId }) {
  switch (id) {
    case "status":       return <StatusContent/>;
    case "weather":      return <WeatherContent/>;
    case "radar":        return <RadarContent/>;
    case "graph":        return <GraphContent/>;
    case "toggle":       return <ToggleContent/>;
    case "tank":         return <TankContent/>;
    case "history":      return <HistoryContent/>;
    case "settings":     return <SettingsContent/>;
    case "applications": return <ApplicationsContent/>;
  }
}

/* ═══════════════════════════════════════════
   DASHBOARD WIDGET WRAPPER
═══════════════════════════════════════════ */
function DashboardWidget({ def, isEditMode, isPinned, onRemove, onTogglePin, onResizeStart, children }: {
  def: WidgetDef; isEditMode: boolean; isPinned: boolean;
  onRemove: () => void; onTogglePin: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      onClick={() => { if (!isEditMode && def.route) navigate(def.route); }}
      style={{
        height:"100%", display:"flex", flexDirection:"column", borderRadius:16,
        overflow:"hidden", position:"relative",
        background:"rgba(255,255,255,0.04)",
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        border: isEditMode
          ? "1px dashed rgba(255,255,255,0.18)"
          : hovered
          ? `1px solid ${def.accentColor}55`
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: hovered && !isEditMode
          ? `0 8px 40px rgba(0,0,0,0.5),0 0 0 1px ${def.accentColor}18,inset 0 1px 0 rgba(255,255,255,0.07)`
          : "0 4px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.04)",
        transition:"border 0.25s,box-shadow 0.25s,transform 0.2s",
        transform: hovered && !isEditMode && def.route ? "translateY(-2px)" : "none",
        cursor: isEditMode ? "default" : def.route ? "pointer" : "default",
      }}
    >
      {/* Shimmer */}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0.04) 0%,transparent 30%)",pointerEvents:"none",borderRadius:16}}/>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 14px 8px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.15)",flexShrink:0,position:"relative",zIndex:2}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:def.accentColor,boxShadow:`0 0 6px ${def.accentColor}`}}/>
          <span style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:"0.07em",textTransform:"uppercase"}}>{def.title}</span>
          {isPinned && <span style={{fontSize:10}}>📌</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          {isEditMode ? (
            <>
              <button onClick={e=>{e.stopPropagation();onTogglePin();}} title={isPinned?"Unpin":"Pin"}
                style={{background:"none",border:`1px solid ${isPinned?"#fbbf2444":"rgba(255,255,255,0.1)"}`,borderRadius:6,color:isPinned?"#fbbf24":"#475569",cursor:"pointer",fontSize:10,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>📌</button>
              {!isPinned && (
                <button onClick={e=>{e.stopPropagation();onRemove();}}
                  style={{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,color:"#ef4444",cursor:"pointer",fontSize:12,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              )}
            </>
          ) : (
            <button onClick={e=>{e.stopPropagation();setMenuOpen(v=>!v);}}
              style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:"2px 4px",borderRadius:4}}>⚙</button>
          )}
        </div>
      </div>

      {/* Settings dropdown */}
      {menuOpen && !isEditMode && (
        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:38,right:8,zIndex:100,background:"rgba(8,12,24,0.97)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:8,minWidth:140,boxShadow:"0 16px 40px rgba(0,0,0,0.7)"}}>
          {["View Details","Configure","Set Alarms","Export Data"].map(opt=>(
            <div key={opt} style={{padding:"7px 12px",fontSize:12,color:"#94a3b8",cursor:"pointer",borderRadius:8,transition:"background 0.15s"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.07)")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>{opt}</div>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",zIndex:1}}>
        {children}
      </div>

      {/* Footer */}
      <div style={{padding:"7px 14px",borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(0,0,0,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,position:"relative",zIndex:1}}>
        <span style={{fontSize:10,color:"#2d3f52"}}>{def.settingsKey}</span>
        {!isEditMode && <span style={{fontSize:9,color:def.accentColor,border:`1px solid ${def.accentColor}33`,borderRadius:4,padding:"1px 6px"}}>↗</span>}
      </div>

      {/* Resize handle */}
      {isEditMode && (
        <div onMouseDown={onResizeStart} onClick={e=>e.stopPropagation()}
          style={{position:"absolute",bottom:4,right:4,width:18,height:18,cursor:"se-resize",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,background:"rgba(56,189,248,0.15)",border:"1px solid rgba(56,189,248,0.35)"}}>
          <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1 7.5 L7.5 1 M4 7.5 L7.5 4 M7.5 7.5 L7.5 7.5" stroke="rgba(56,189,248,0.9)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   GRID
═══════════════════════════════════════════ */
function DashGrid({ layouts, visibleIds, pinnedIds, isEditMode, onMove, onRemove, onTogglePin, onResize }: {
  layouts: WLayout[]; visibleIds: WidgetId[]; pinnedIds: WidgetId[];
  isEditMode: boolean;
  onMove: (id: WidgetId, col: number, row: number) => void;
  onRemove: (id: WidgetId) => void;
  onTogglePin: (id: WidgetId) => void;
  onResize: (id: WidgetId, colSpan: number, rowSpan: number) => void;
}) {
  const dragId  = useRef<WidgetId | null>(null);
  const resizeState = useRef<{id:WidgetId;startX:number;startY:number;startCS:number;startRS:number}|null>(null);

  const visible = layouts.filter(l => visibleIds.includes(l.id));
  const maxRow  = Math.max(...visible.map(l => l.row+l.rowSpan-1), 5);

  /* Pointer-based resize */
  useEffect(() => {
    const onMove_ = (e: MouseEvent) => {
      const s = resizeState.current;
      if (!s) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      const cellW = (window.innerWidth - 48 - GAP_PX*(COLS-1)) / COLS;
      const newCS = Math.max(1, Math.min(COLS, Math.round(s.startCS + dx/cellW)));
      const newRS = Math.max(1, Math.min(4,    Math.round(s.startRS + dy/(ROW_PX+GAP_PX))));
      onResize(s.id, newCS, newRS);
    };
    const onUp_ = () => { resizeState.current = null; };
    document.addEventListener("mousemove", onMove_);
    document.addEventListener("mouseup",   onUp_);
    return () => { document.removeEventListener("mousemove", onMove_); document.removeEventListener("mouseup", onUp_); };
  }, [onResize]);

  /* Drop zone rows (cols 1-COLS, rows 1-maxRow+2) */
  const dropCells = isEditMode ? Array.from({length:(maxRow+2)*COLS},(_,i)=>({col:(i%COLS)+1,row:Math.floor(i/COLS)+1})) : [];

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:`repeat(${COLS},1fr)`,
      gridAutoRows:`${ROW_PX}px`,
      gap:GAP_PX,
      position:"relative",
    }}>
      {/* Ghost drop targets */}
      {dropCells.map(({col,row}) => (
        <div key={`drop-${col}-${row}`}
          style={{gridColumn:`${col}/${col+1}`,gridRow:`${row}/${row+1}`,borderRadius:12,border:"1px dashed rgba(56,189,248,0.1)",background:"rgba(56,189,248,0.015)",pointerEvents:"all",zIndex:0}}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();if(dragId.current)onMove(dragId.current,col,row);}}
        />
      ))}

      {/* Widgets */}
      {visible.map(l => {
        const def = DEFS.find(d=>d.id===l.id)!;
        return (
          <div key={l.id}
            draggable={isEditMode}
            onDragStart={()=>{dragId.current=l.id;}}
            onDragEnd={()=>{dragId.current=null;}}
            style={{
              gridColumn:`${l.col}/span ${l.colSpan}`,
              gridRow:`${l.row}/span ${l.rowSpan}`,
              zIndex:1, animation:"fadeUp 0.35s ease both",
            }}
          >
            <DashboardWidget
              def={def}
              isEditMode={isEditMode}
              isPinned={pinnedIds.includes(l.id)}
              onRemove={()=>onRemove(l.id)}
              onTogglePin={()=>onTogglePin(l.id)}
              onResizeStart={e=>{
                e.stopPropagation();
                resizeState.current={id:l.id,startX:e.clientX,startY:e.clientY,startCS:l.colSpan,startRS:l.rowSpan};
              }}
            >
              <WidgetContent id={l.id}/>
            </DashboardWidget>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TOP HEADER
═══════════════════════════════════════════ */
function TopHeader({ isEditMode, onToggleEdit, visibleIds, onAddWidget }: {
  isEditMode:boolean; onToggleEdit:()=>void;
  visibleIds:WidgetId[]; onAddWidget:(id:WidgetId)=>void;
}) {
  const [sf,setSf]=useState(false);
  const [sv,setSv]=useState("");
  const [time,setTime]=useState(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
  const [addOpen,setAddOpen]=useState(false);
  useEffect(()=>{const id=setInterval(()=>setTime(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),10000);return()=>clearInterval(id);},[]);
  const hidden = DEFS.filter(w=>!visibleIds.includes(w.id));

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",background:"rgba(3,4,8,0.92)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.06)",position:"sticky",top:0,zIndex:50,gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#0f6a7a,#0a2540)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:"0 0 14px rgba(15,106,122,0.5)"}}>💧</div>
          <span style={{fontWeight:900,fontSize:15,color:"#ecfdf5",letterSpacing:"-0.02em"}}>Water<span style={{color:"#38bdf8"}}>IQ</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:`1px solid ${sf?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.07)"}`,transition:"border-color 0.2s",minWidth:190,backdropFilter:"blur(8px)"}}>
          <span style={{color:"#475569",fontSize:13}}>🔍</span>
          <input value={sv} onChange={e=>setSv(e.target.value)} onFocus={()=>setSf(true)} onBlur={()=>setSf(false)} placeholder="Choose installation…"
            style={{background:"none",border:"none",outline:"none",color:"#94a3b8",fontSize:13,width:"100%"}}/>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:"#fbbf24",fontSize:14}}>★</span>
        <span style={{fontWeight:800,fontSize:15,color:"#ecfdf5",letterSpacing:"-0.02em"}}>System Dashboard</span>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {isEditMode && hidden.length>0 && (
          <div style={{position:"relative"}}>
            <button onClick={()=>setAddOpen(v=>!v)}
              style={{display:"flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:9,background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              + Add Widget
            </button>
            {addOpen && (
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:200,background:"rgba(8,12,24,0.97)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:8,minWidth:180,boxShadow:"0 16px 40px rgba(0,0,0,0.7)"}}>
                {hidden.map(w=>(
                  <div key={w.id} onClick={()=>{onAddWidget(w.id);setAddOpen(false);}}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",fontSize:12,color:"#94a3b8",cursor:"pointer",borderRadius:8,transition:"background 0.15s"}}
                    onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:w.accentColor,flexShrink:0}}/>{w.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={onToggleEdit}
          style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.2s",background:isEditMode?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.05)",border:isEditMode?"1px solid rgba(251,191,36,0.4)":"1px solid rgba(255,255,255,0.1)",color:isEditMode?"#fbbf24":"#94a3b8"}}>
          {isEditMode?"✓ Save Layout":"⊞ Customize"}
        </button>

        <span style={{fontSize:11,color:"#334155",fontFamily:"'DM Mono',monospace",minWidth:40}}>{time}</span>

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:"#ecfdf5"}}>Admin</div><div style={{fontSize:10,color:"#475569"}}>WaterIQ</div></div>
          <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:"#022c22"}}>AD</div>
        </div>

        <button style={{position:"relative",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"7px 9px",color:"#94a3b8",cursor:"pointer",fontSize:15}}>
          🔔<span style={{position:"absolute",top:3,right:3,width:7,height:7,borderRadius:"50%",background:"#ef4444",border:"1.5px solid #050608"}}/>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME — DEFAULT EXPORT
═══════════════════════════════════════════ */
export default function Home() {
  const saved = loadSaved();
  const [isEditMode, setIsEditMode] = useState(false);
  const [visible,  setVisible]  = useState<WidgetId[]>(saved?.visible  ?? DEFS.map(d=>d.id));
  const [pinned,   setPinned]   = useState<WidgetId[]>(saved?.pinned   ?? DEFAULT_PINNED);
  const [layouts,  setLayouts]  = useState<WLayout[]>(saved?.layouts   ?? defaultLayouts());

  useEffect(()=>{ persist({layouts,visible,pinned}); },[layouts,visible,pinned]);

  const handleMove   = useCallback((id:WidgetId,col:number,row:number)=>setLayouts(p=>p.map(l=>l.id===id?{...l,col,row}:l)),[]);
  const handleRemove = useCallback((id:WidgetId)=>{ if(!pinned.includes(id)) setVisible(p=>p.filter(x=>x!==id)); },[pinned]);
  const handleAdd    = useCallback((id:WidgetId)=>setVisible(p=>p.includes(id)?p:[...p,id]),[]);
  const handlePin    = useCallback((id:WidgetId)=>setPinned(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]),[]);
  const handleResize = useCallback((id:WidgetId,cs:number,rs:number)=>setLayouts(p=>p.map(l=>l.id===id?{...l,colSpan:Math.max(1,Math.min(COLS,cs)),rowSpan:Math.max(1,Math.min(4,rs))}:l)),[]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        html,body,#root{margin:0;padding:0;background:#050608;font-family:'Syne','Segoe UI',sans-serif;min-height:100vh;color:#ecfdf5}
        @keyframes auroraA{0%{transform:translate(0%,0%) scale(1)}50%{transform:translate(3%,-5%) scale(1.06)}100%{transform:translate(0%,0%) scale(1)}}
        @keyframes auroraB{0%{transform:translate(0%,0%) scale(1)}50%{transform:translate(-4%,4%) scale(1.05)}100%{transform:translate(0%,0%) scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .wiq-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
        .au-a{position:absolute;inset:-20%;border-radius:50%;background:radial-gradient(ellipse 90% 60% at 20% 80%,rgba(15,106,122,0.2) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 75% 20%,rgba(10,37,64,0.25) 0%,transparent 55%);animation:auroraA 14s ease-in-out infinite}
        .au-b{position:absolute;inset:-20%;border-radius:50%;background:radial-gradient(ellipse 80% 45% at 65% 85%,rgba(12,59,85,0.18) 0%,transparent 60%);animation:auroraB 18s ease-in-out infinite}
        .dot{position:absolute;inset:0;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,0.022) 1px,transparent 0);background-size:28px 28px}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:99px}
        [draggable=true]{user-select:none}
      `}</style>

      {/* Animated bg */}
      <div className="wiq-bg">
        <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,#050608 0%,#070c12 50%,#050810 100%)"}}/>
        <div className="au-a"/><div className="au-b"/><div className="dot"/>
      </div>

      {/* App shell */}
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <TopHeader
          isEditMode={isEditMode}
          onToggleEdit={()=>setIsEditMode(v=>!v)}
          visibleIds={visible}
          onAddWidget={handleAdd}
        />

        <div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
          {isEditMode && (
            <div style={{marginBottom:16,padding:"10px 18px",borderRadius:12,background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.22)",display:"flex",alignItems:"center",gap:10,color:"#fbbf24",fontSize:13}}>
              <span style={{fontSize:16}}>✏️</span>
              <span><strong>Customize mode</strong> — drag widgets by header to rearrange, resize with the ↘ handle, 📌 pin important widgets, or ✕ remove others. Click <strong>Save Layout</strong> when done.</span>
            </div>
          )}

          <DashGrid
            layouts={layouts}
            visibleIds={visible}
            pinnedIds={pinned}
            isEditMode={isEditMode}
            onMove={handleMove}
            onRemove={handleRemove}
            onTogglePin={handlePin}
            onResize={handleResize}
          />

          {visible.length===0 && (
            <div style={{textAlign:"center",padding:"60px 20px",color:"#334155"}}>
              <div style={{fontSize:32,marginBottom:12}}>📭</div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>No widgets visible</div>
              <div style={{fontSize:13}}>Enable Customize mode and use + Add Widget to restore them.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
