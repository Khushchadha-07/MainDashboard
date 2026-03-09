import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const _login  = async () => { await supabase.auth.signInWithOAuth({ provider: "google" }); };
const _logout = async () => { await supabase.auth.signOut(); };

/* ─── TYPES ─── */
type NavTab = "Dashboard" | "Map" | "Graph" | "History";
const NAV_TABS: { label: NavTab; icon: string }[] = [
  { label: "Dashboard", icon: "⊞" },
  { label: "Map",       icon: "◈" },
  { label: "Graph",     icon: "⌇" },
  { label: "History",   icon: "◷" },
];

/* ═══════════════════════════════════
   SPARKLINE
═══════════════════════════════════ */
function Sparkline({ data, color, width=160, height=48 }: { data:number[]; color:string; width?:number; height?:number }) {
  if (data.length < 2) return null;
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1;
  const pts = data.map((v,i) => {
    const x=(i/(data.length-1))*width;
    const y=height-((v-min)/range)*(height-6)-3;
    return `${x},${y}`;
  });
  const fillPts=[`0,${height}`,...pts,`${width},${height}`];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${fillPts.join(" L")}Z`} fill={`url(#sg-${color.replace("#","")})`} />
      <path d={`M${pts.join(" L")}`} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length-1)/(data.length-1)*width} cy={height-((data[data.length-1]-min)/range)*(height-6)-3} r="3" fill={color} />
    </svg>
  );
}

/* ═══════════════════════════════════
   RADAR / LEVEL WIDGET
═══════════════════════════════════ */
function RadarWidget() {
  const rings = [
    { level:0.12, label:"STEP", color:"#22d3ee" },
    { level:0.09, label:"STEP", color:"#22d3ee" },
    { level:0.07, label:"WARN", color:"#fbbf24" },
  ];
  return (
    <div style={{display:"flex",gap:20,alignItems:"center",flex:1}}>
      <div style={{position:"relative",width:90,height:90,flexShrink:0}}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            position:"absolute", left:"50%", top:`${i*14}px`,
            transform:"translateX(-50%)", width:80, height:18, borderRadius:"50%",
            border:`2px solid ${i<3?"#22d3ee":"rgba(34,211,238,0.12)"}`,
            background:i<3?"radial-gradient(ellipse at center,rgba(34,211,238,0.12) 0%,transparent 70%)":"transparent",
            boxShadow:i<3?"0 0 10px rgba(34,211,238,0.3)":"none",
            transition:"all 0.5s ease",
          }}/>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
        {rings.map((r,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20,fontWeight:800,color:r.color,fontFamily:"'JetBrains Mono','Courier New',monospace",letterSpacing:"-0.03em",minWidth:52,textShadow:`0 0 10px ${r.color}66`}}>
              {r.level.toFixed(2)}
            </span>
            <span style={{fontSize:9,color:r.color,border:`1px solid ${r.color}55`,borderRadius:4,padding:"1px 5px",fontWeight:700,letterSpacing:"0.1em",background:`${r.color}11`}}>
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   LIVE GRAPH WIDGET
═══════════════════════════════════ */
function GraphWidget() {
  const [data, setData] = useState<number[]>(() => Array.from({length:40},()=>10+Math.random()*25));
  const [trend, setTrend] = useState<"Increasing"|"Decreasing"|"Stable">("Increasing");
  const [lastVal, setLastVal] = useState(20);
  useEffect(() => {
    const id=setInterval(()=>{
      setData(prev=>{
        const next=[...prev.slice(1),Math.max(5,Math.min(45,prev[prev.length-1]+(Math.random()-0.42)*4))];
        setLastVal(+next[next.length-1].toFixed(1));
        const delta=next[next.length-1]-next[next.length-5];
        setTrend(delta>0.5?"Increasing":delta<-0.5?"Decreasing":"Stable");
        return next;
      });
    },600);
    return ()=>clearInterval(id);
  },[]);
  const W=200,H=72,min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const pts=data.map((v,i)=>{
    const x=(i/(data.length-1))*W;
    const y=H-((v-min)/range)*(H-6)-3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const fillPts=[`0,${H}`,...pts,`${W},${H}`];
  const trendColor=trend==="Increasing"?"#22d3ee":"#f87171";
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",gap:20}}>
        <div>
          <div style={{fontSize:10,color:"rgba(148,163,184,0.7)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Trend</div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
            <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:"50%",background:`${trendColor}18`,border:`1px solid ${trendColor}55`,fontSize:10,color:trendColor}}>
              {trend==="Increasing"?"↑":trend==="Decreasing"?"↓":"→"}
            </span>
            <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{trend}</span>
          </div>
        </div>
        <div>
          <div style={{fontSize:10,color:"rgba(148,163,184,0.7)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Last Value</div>
          <div style={{fontSize:22,fontWeight:800,color:"#22d3ee",fontFamily:"'JetBrains Mono','Courier New',monospace",marginTop:2,textShadow:"0 0 12px rgba(34,211,238,0.5)"}}>
            {lastVal.toFixed(1)} <span style={{fontSize:13,color:"rgba(148,163,184,0.6)"}}>m</span>
          </div>
        </div>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="gw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75].map(f=>(
          <line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        ))}
        <path d={`M${fillPts.join(" L")}Z`} fill="url(#gw-fill)"/>
        <path d={`M${pts.join(" L")}`} fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={+pts[pts.length-1].split(",")[0]} cy={+pts[pts.length-1].split(",")[1]} r="3" fill="#22d3ee"/>
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(71,85,105,0.8)"}}>
        <span>10s</span><span>1m</span>
        <span>{new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   TOGGLE WIDGET (Pump control)
═══════════════════════════════════ */
function ToggleWidget() {
  const [state, setState] = useState<"ON"|"OFF"|"AUTO">("AUTO");
  const opts:[string,string][] = [["ON","#22d3ee"],["OFF","#64748b"],["AUTO","#a78bfa"]];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:16}}>
      <div style={{fontSize:26,fontWeight:800,color:"#f1f5f9",textAlign:"center",letterSpacing:"-0.02em"}}>
        Pump 1
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center"}}>
        {opts.map(([label,color])=>(
          <button key={label} onClick={e=>{e.stopPropagation();setState(label as any);}}
            style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${state===label?color+"88":"rgba(255,255,255,0.08)"}`,background:state===label?`${color}18`:"rgba(255,255,255,0.04)",color:state===label?color:"rgba(100,116,139,0.8)",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5,backdropFilter:"blur(4px)"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:state===label?color:"rgba(100,116,139,0.4)",display:"inline-block",boxShadow:state===label?`0 0 6px ${color}`:"none"}}/>
            {label}
          </button>
        ))}
      </div>
      <div style={{textAlign:"center",fontSize:13,color:"rgba(100,116,139,0.7)"}}>Pump station 5</div>
      <div style={{padding:"8px 14px",borderRadius:10,background:state==="ON"?"rgba(34,211,238,0.08)":state==="AUTO"?"rgba(167,139,250,0.08)":"rgba(100,116,139,0.06)",border:`1px solid ${state==="ON"?"rgba(34,211,238,0.3)":state==="AUTO"?"rgba(167,139,250,0.3)":"rgba(100,116,139,0.2)"}`,textAlign:"center",fontSize:12,fontWeight:700,color:state==="ON"?"#22d3ee":state==="AUTO"?"#a78bfa":"#64748b"}}>
        {state==="ON"?"● RUNNING":state==="AUTO"?"◉ AUTO MODE":"○ OFFLINE"}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   3D TANK WIDGET
═══════════════════════════════════ */
function ThreeDWidget() {
  const [fillLevel, setFillLevel] = useState(0.6);
  useEffect(()=>{
    const id=setInterval(()=>setFillLevel(p=>Math.max(0.1,Math.min(0.95,p+(Math.random()-0.5)*0.04))),1500);
    return()=>clearInterval(id);
  },[]);
  const fillColor=fillLevel>0.7?"#22d3ee":fillLevel>0.4?"#fbbf24":"#f87171";
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:12,alignItems:"center"}}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <defs>
          <clipPath id="tank-clip"><rect x="35" y="20" width="60" height="90" rx="4"/></clipPath>
          <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.4"/>
          </linearGradient>
          <linearGradient id="tank-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(30,41,59,0.6)"/>
            <stop offset="100%" stopColor="rgba(15,23,42,0.8)"/>
          </linearGradient>
        </defs>
        <rect x="35" y="20" width="60" height="90" rx="4" fill="url(#tank-body)" stroke="rgba(148,163,184,0.15)" strokeWidth="1.5"/>
        <rect x="36" y={20+90*(1-fillLevel)} width="58" height={90*fillLevel} fill="url(#water-grad)" clipPath="url(#tank-clip)" style={{transition:"y 0.8s ease,height 0.8s ease"}}/>
        {[30,55,80,100].map(y=>(
          <rect key={y} x="35" y={y} width="60" height="3" fill="rgba(15,23,42,0.7)" stroke="rgba(148,163,184,0.1)" strokeWidth="0.5"/>
        ))}
        <ellipse cx="65" cy="20" rx="30" ry="5" fill={fillColor} opacity="0.2"/>
        <text x="65" y="72" textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="800" fontFamily="'JetBrains Mono','Courier New',monospace">
          {Math.round(fillLevel*100)}%
        </text>
        <rect x="20" y="60" width="15" height="6" rx="3" fill="rgba(30,41,59,0.8)" stroke="rgba(148,163,184,0.15)" strokeWidth="1"/>
        <rect x="18" y="58" width="5" height="10" rx="2" fill="#22d3ee" opacity="0.7"/>
        <rect x="95" y="85" width="15" height="6" rx="3" fill="rgba(30,41,59,0.8)" stroke="rgba(148,163,184,0.15)" strokeWidth="1"/>
        <rect x="107" y="83" width="5" height="10" rx="2" fill={fillColor} opacity="0.7"/>
      </svg>
      <div style={{display:"flex",gap:8}}>
        {["Start / Stop","Alarms"].map(label=>(
          <div key={label} onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",fontSize:11,color:"rgba(148,163,184,0.8)",cursor:"pointer",backdropFilter:"blur(8px)"}}>
            <span style={{width:22,height:10,borderRadius:99,background:label==="Start / Stop"?"#22d3ee":"rgba(255,255,255,0.1)",position:"relative",display:"inline-block",transition:"background 0.2s"}}>
              <span style={{position:"absolute",top:1,left:label==="Start / Stop"?"calc(100% - 10px)":1,width:8,height:8,borderRadius:"50%",background:"#f1f5f9",transition:"left 0.2s"}}/>
            </span>
            {label}
          </div>
        ))}
      </div>
      <div style={{fontSize:12,color:"rgba(71,85,105,0.7)"}}>Pump station 5</div>
    </div>
  );
}

/* ═══════════════════════════════════
   WEATHER WIDGET
═══════════════════════════════════ */
function WeatherWidget() {
  const days=[{label:"Today",icon:"☀️",hi:27,lo:22},{label:"Tomorrow",icon:"⛅",hi:24,lo:19},{label:"7 Days",icon:"🌧️",hi:21,lo:16}];
  const [activeDay,setActiveDay]=useState(0);
  const stats=[{icon:"💧",label:"Humidity",value:"59%"},{icon:"🌬️",label:"Winds",value:"49f/s"},{icon:"☁️",label:"Cloud",value:"30%"}];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:32}}>☀️</span>
        <div>
          <div style={{fontSize:32,fontWeight:900,color:"#f1f5f9",lineHeight:1,fontFamily:"'JetBrains Mono','Courier New',monospace",textShadow:"0 0 20px rgba(34,211,238,0.3)"}}>27°</div>
          <div style={{fontSize:13,color:"rgba(148,163,184,0.7)"}}>Sunny Skies</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10}}>
        {stats.map(s=>(
          <div key={s.label} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"rgba(100,116,139,0.8)"}}>
            <span>{s.icon}</span><span>{s.value}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        {days.map((d,i)=>(
          <button key={d.label} onClick={e=>{e.stopPropagation();setActiveDay(i);}}
            style={{flex:1,padding:"6px 4px",borderRadius:10,background:activeDay===i?"rgba(34,211,238,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${activeDay===i?"rgba(34,211,238,0.4)":"rgba(255,255,255,0.07)"}`,color:activeDay===i?"#22d3ee":"rgba(100,116,139,0.7)",fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",transition:"all 0.2s",backdropFilter:"blur(4px)"}}>
            <div>{d.icon}</div>
            <div style={{marginTop:2}}>{d.label}</div>
            <div style={{color:"#f1f5f9",fontWeight:800,marginTop:2}}>{d.hi}° <span style={{color:"rgba(71,85,105,0.8)",fontWeight:400}}>{d.lo}°</span></div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   GLASS WIDGET CARD
═══════════════════════════════════ */
function WidgetCard({title,settingsKey,children,onClick,accentColor="#22d3ee",style}:{
  title:string; settingsKey?:string; children:React.ReactNode;
  onClick?:()=>void; accentColor?:string; style?:React.CSSProperties;
}) {
  const [hovered,setHovered]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>{setHovered(false);setSettingsOpen(false);}}
      style={{
        borderRadius:16,
        background:"rgba(8,20,42,0.55)",
        backdropFilter:"blur(24px)",
        WebkitBackdropFilter:"blur(24px)",
        border:`1px solid ${hovered?"rgba(34,211,238,0.35)":"rgba(148,163,184,0.1)"}`,
        color:"#f1f5f9",
        cursor:onClick?"pointer":"default",
        transition:"all 0.3s ease",
        transform:hovered&&onClick?"translateY(-3px)":"none",
        boxShadow:hovered&&onClick
          ?`0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}22, inset 0 1px 0 rgba(255,255,255,0.07)`
          :"0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",
        ...style,
      }}>
      {/* Top accent line */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${accentColor}44, transparent)`,pointerEvents:"none"}}/>
      
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 8px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:accentColor,boxShadow:`0 0 8px ${accentColor}88`}}/>
          <span style={{fontSize:11,fontWeight:700,color:"rgba(148,163,184,0.85)",letterSpacing:"0.07em",textTransform:"uppercase"}}>{title}</span>
        </div>
        <button onClick={e=>{e.stopPropagation();setSettingsOpen(v=>!v);}}
          style={{background:"none",border:"none",color:"rgba(100,116,139,0.6)",cursor:"pointer",fontSize:14,padding:"2px 4px",borderRadius:4,transition:"color 0.2s"}}>⚙</button>
      </div>

      {/* Settings dropdown */}
      {settingsOpen&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:38,right:8,zIndex:100,background:"rgba(4,12,28,0.95)",backdropFilter:"blur(20px)",border:"1px solid rgba(148,163,184,0.12)",borderRadius:12,padding:8,minWidth:140,boxShadow:"0 16px 48px rgba(0,0,0,0.7)"}}>
          {["View Details","Configure","Set Alarms","Export Data"].map(opt=>(
            <div key={opt} style={{padding:"7px 12px",fontSize:12,color:"rgba(148,163,184,0.8)",cursor:"pointer",borderRadius:6,transition:"background 0.15s"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.06)")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>{opt}</div>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column"}}>{children}</div>

      {/* Footer */}
      <div style={{padding:"7px 14px",borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(0,0,0,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:"rgba(51,65,85,0.9)"}}>{settingsKey??"Pump station 5"}</span>
        <span style={{fontSize:9,color:accentColor,border:`1px solid ${accentColor}44`,borderRadius:4,padding:"1px 6px",background:`${accentColor}0a`}}>↗</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   SYSTEM STATUS BAR (glassmorphic)
═══════════════════════════════════ */
function SystemStatusBar() {
  const metrics=[
    {label:"Sensors Online",   value:"12/12", color:"#22d3ee"},
    {label:"Active Pumps",     value:"3",     color:"#818cf8"},
    {label:"Alert Count",      value:"1",     color:"#fbbf24"},
    {label:"Data Points Today",value:"2,847", color:"#34d399"},
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      {metrics.map(m=>(
        <div key={m.label} style={{padding:"14px 18px",borderRadius:14,background:"rgba(8,20,42,0.55)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(148,163,184,0.1)",display:"flex",flexDirection:"column",gap:4,position:"relative",overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${m.color}44,transparent)`}}/>
          <span style={{fontSize:10,color:"rgba(100,116,139,0.8)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{m.label}</span>
          <span style={{fontSize:24,fontWeight:900,color:m.color,fontFamily:"'JetBrains Mono','Courier New',monospace",textShadow:`0 0 16px ${m.color}55`}}>{m.value}</span>
          <div style={{position:"absolute",bottom:-10,right:-10,width:50,height:50,borderRadius:"50%",background:`radial-gradient(circle,${m.color}0a,transparent 70%)`,pointerEvents:"none"}}/>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════
   TOP HEADER
═══════════════════════════════════ */
function TopHeader({ onNavigate }: { onNavigate:(path:string)=>void }) {
  const [sf,setSf]=useState(false);
  const [sv,setSv]=useState("");
  const [time,setTime]=useState(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
  useEffect(()=>{const id=setInterval(()=>setTime(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),10000);return()=>clearInterval(id);},[]);
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",background:"rgba(2,8,20,0.8)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderBottom:"1px solid rgba(148,163,184,0.08)",gap:16,position:"sticky",top:0,zIndex:50}}>
      {/* Brand */}
      <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,rgba(34,211,238,0.9),rgba(56,189,248,0.7))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"#020b18",boxShadow:"0 0 16px rgba(34,211,238,0.4)"}}>W</div>
        <div>
          <div style={{fontWeight:900,fontSize:15,color:"#f1f5f9",letterSpacing:"-0.02em",lineHeight:1}}>Water<span style={{color:"#22d3ee"}}>IQ</span></div>
          <div style={{fontSize:9,color:"rgba(71,85,105,0.8)",letterSpacing:"0.08em",textTransform:"uppercase"}}>Smart Water System</div>
        </div>
      </div>

      {/* Search */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:`1px solid ${sf?"rgba(34,211,238,0.4)":"rgba(148,163,184,0.1)"}`,transition:"border-color 0.2s",minWidth:220,backdropFilter:"blur(8px)"}}>
        <span style={{color:"rgba(100,116,139,0.6)",fontSize:14}}>🔍</span>
        <input value={sv} onChange={e=>setSv(e.target.value)} onFocus={()=>setSf(true)} onBlur={()=>setSf(false)} placeholder="Choose installation…"
          style={{background:"none",border:"none",outline:"none",color:"#94a3b8",fontSize:13,width:"100%"}}/>
      </div>

      {/* Center title */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:"#fbbf24",fontSize:14}}>★</span>
        <span style={{fontWeight:800,fontSize:15,color:"#f1f5f9",letterSpacing:"-0.02em"}}>System Dashboard</span>
        <span style={{color:"rgba(71,85,105,0.7)",fontSize:13,cursor:"pointer"}}>✏</span>
      </div>

      {/* Right */}
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <span style={{fontSize:12,color:"rgba(71,85,105,0.8)",fontFamily:"'JetBrains Mono','Courier New',monospace"}}>{time}</span>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>John Doe</span>
          <span style={{fontSize:11,color:"rgba(71,85,105,0.8)"}}>DomainX</span>
        </div>
        <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,rgba(34,211,238,0.8),rgba(56,189,248,0.6))",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"#020b18",boxShadow:"0 0 12px rgba(34,211,238,0.3)"}}>JD</div>
        <button style={{position:"relative",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(148,163,184,0.1)",borderRadius:9,padding:"7px 10px",color:"rgba(148,163,184,0.7)",cursor:"pointer",fontSize:15,backdropFilter:"blur(8px)"}}>
          🔔
          <span style={{position:"absolute",top:3,right:3,width:8,height:8,borderRadius:"50%",background:"#f87171",border:"1.5px solid rgba(2,8,20,0.9)"}}/>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   SUBTITLE BAR
═══════════════════════════════════ */
function SubtitleBar({ onNavigate }:{onNavigate:(path:string)=>void}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 24px",background:"rgba(2,8,20,0.6)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderBottom:"1px solid rgba(148,163,184,0.06)"}}>
      <button style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(148,163,184,0.1)",color:"rgba(148,163,184,0.8)",fontSize:12,cursor:"pointer",fontWeight:700,backdropFilter:"blur(8px)"}}>
        System Dashboard <span style={{color:"rgba(71,85,105,0.7)"}}>▾</span>
      </button>
      <button onClick={()=>onNavigate("/settings")}
        style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:8,background:"none",border:"1px solid rgba(148,163,184,0.08)",color:"rgba(100,116,139,0.7)",fontSize:12,cursor:"pointer",fontWeight:700}}>
        ✏ Edit
      </button>
    </div>
  );
}

/* ═══════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════ */
function BottomNav({active,onChange,onNavigate}:{active:NavTab;onChange:(t:NavTab)=>void;onNavigate:(path:string)=>void}) {
  const NAV_ROUTES:Partial<Record<NavTab,string>>={History:"/history",Graph:"/live"};
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",background:"rgba(2,8,20,0.85)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderTop:"1px solid rgba(148,163,184,0.07)",height:64}}>
      <div style={{fontWeight:900,fontSize:15,color:"#22d3ee",letterSpacing:"-0.02em"}}>Water<span style={{color:"#f1f5f9"}}>IQ</span></div>
      <div style={{display:"flex",gap:4}}>
        {NAV_TABS.map(({label,icon})=>{
          const isActive=active===label;
          return (
            <button key={label} onClick={()=>{onChange(label);if(NAV_ROUTES[label])onNavigate(NAV_ROUTES[label]!);}}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 20px",borderRadius:10,background:isActive?"rgba(34,211,238,0.1)":"none",border:`1px solid ${isActive?"rgba(34,211,238,0.35)":"transparent"}`,color:isActive?"#22d3ee":"rgba(71,85,105,0.7)",cursor:"pointer",transition:"all 0.2s",fontSize:16,position:"relative",backdropFilter:isActive?"blur(8px)":"none"}}>
              {isActive&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:28,height:2,background:"linear-gradient(90deg,rgba(34,211,238,0.5),#22d3ee,rgba(34,211,238,0.5))",borderRadius:99,boxShadow:"0 0 8px rgba(34,211,238,0.6)"}}/>}
              <span>{icon}</span>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.05em"}}>{label}</span>
            </button>
          );
        })}
      </div>
      <button style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(148,163,184,0.1)",borderRadius:9,padding:"8px 10px",color:"rgba(100,116,139,0.7)",cursor:"pointer",fontSize:15,backdropFilter:"blur(8px)"}}>⚙</button>
    </div>
  );
}

/* ═══════════════════════════════════
   HOME — MAIN EXPORT
═══════════════════════════════════ */
export default function Home() {
  const navigate=useNavigate();
  const [activeTab,setActiveTab]=useState<NavTab>("Dashboard");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        html, body, #root {
          margin: 0; padding: 0;
          background: #020b18;
          font-family: 'Outfit', 'Segoe UI', sans-serif;
          min-height: 100vh;
        }

        /* ── Animated diagonal stripe background ── */
        .wiq-scene {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: #020b18;
        }

        /* Deep base gradient */
        .wiq-scene::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(30,64,175,0.35) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(7,89,133,0.25) 0%, transparent 55%),
            radial-gradient(ellipse 50% 60% at 50% 50%, rgba(15,23,60,0.4) 0%, transparent 70%),
            linear-gradient(180deg, #020b18 0%, #030d1f 50%, #020a16 100%);
        }

        /* Diagonal blue stripes */
        .wiq-stripes {
          position: absolute;
          inset: -50%;
          width: 200%;
          height: 200%;
          background-image: repeating-linear-gradient(
            -55deg,
            transparent 0px,
            transparent 38px,
            rgba(30, 90, 180, 0.055) 38px,
            rgba(30, 90, 180, 0.055) 40px,
            transparent 40px,
            transparent 80px,
            rgba(20, 70, 150, 0.03) 80px,
            rgba(20, 70, 150, 0.03) 82px
          );
          animation: stripeShift 22s linear infinite;
        }

        @keyframes stripeShift {
          0%   { transform: translateX(0) translateY(0); }
          100% { transform: translateX(80px) translateY(80px); }
        }

        /* Subtle noise grain */
        .wiq-grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          background-size: 180px 180px;
          opacity: 0.4;
        }

        /* Light bloom spots */
        .wiq-bloom-1 {
          position: absolute;
          top: -10%; left: -5%;
          width: 55%; height: 55%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 65%);
          animation: bloomDrift1 18s ease-in-out infinite;
        }
        .wiq-bloom-2 {
          position: absolute;
          bottom: -15%; right: -10%;
          width: 60%; height: 55%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(7,89,133,0.15) 0%, transparent 60%);
          animation: bloomDrift2 24s ease-in-out infinite;
        }
        .wiq-bloom-3 {
          position: absolute;
          top: 30%; left: 40%;
          width: 40%; height: 40%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(30,58,138,0.12) 0%, transparent 65%);
          animation: bloomDrift1 30s ease-in-out infinite reverse;
        }

        @keyframes bloomDrift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%  { transform: translate(3%,-4%) scale(1.04); }
          66%  { transform: translate(-2%,3%) scale(0.97); }
        }
        @keyframes bloomDrift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%  { transform: translate(-4%,3%) scale(1.05); }
          80%  { transform: translate(2%,-2%) scale(0.96); }
        }

        /* Horizontal dot grid */
        .wiq-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(148,163,184,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        /* Widget enter animation */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .widget-enter {
          animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }
      `}</style>

      {/* ── Animated scene background ── */}
      <div className="wiq-scene">
        <div className="wiq-stripes"/>
        <div className="wiq-grain"/>
        <div className="wiq-bloom-1"/>
        <div className="wiq-bloom-2"/>
        <div className="wiq-bloom-3"/>
        <div className="wiq-dots"/>
      </div>

      {/* ── App shell ── */}
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",position:"relative",zIndex:1}}>
        <TopHeader onNavigate={navigate}/>
        <SubtitleBar onNavigate={navigate}/>

        <div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
          <SystemStatusBar/>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>

            <div className="widget-enter" style={{animationDelay:"0ms"}}>
              <WidgetCard title="Weather Widget" settingsKey="Station sensor" accentColor="#38bdf8">
                <WeatherWidget/>
              </WidgetCard>
            </div>

            <div className="widget-enter" style={{animationDelay:"60ms"}}>
              <WidgetCard title="Radar / Level" settingsKey="Pump station 5" onClick={()=>navigate("/live")} accentColor="#22d3ee">
                <RadarWidget/>
              </WidgetCard>
            </div>

            <div className="widget-enter" style={{animationDelay:"120ms"}}>
              <WidgetCard title="Graph" settingsKey="Pump station 5" onClick={()=>navigate("/live")} accentColor="#22d3ee">
                <GraphWidget/>
              </WidgetCard>
            </div>

            <div className="widget-enter" style={{animationDelay:"180ms"}}>
              <WidgetCard title="Toggle" settingsKey="Pump station 5" accentColor="#818cf8">
                <ToggleWidget/>
              </WidgetCard>
            </div>

            <div className="widget-enter" style={{animationDelay:"240ms"}}>
              <WidgetCard title="3D View" settingsKey="Pump station 5" onClick={()=>navigate("/live")} accentColor="#a78bfa">
                <ThreeDWidget/>
              </WidgetCard>
            </div>

            <div className="widget-enter" style={{animationDelay:"300ms"}}>
              <WidgetCard title="History" settingsKey="Session records" onClick={()=>navigate("/history")} accentColor="#fbbf24">
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{fontSize:13,color:"rgba(100,116,139,0.7)"}}>Saved iterations</div>
                  {[{name:"Run #14",bracket:"F2",time:"14:22"},{name:"Run #13",bracket:"F4",time:"13:08"},{name:"Run #12",bracket:"F1",time:"11:54"}].map(r=>{
                    const bc=r.bracket==="F1"?"#22d3ee":r.bracket==="F2"?"#86efac":r.bracket==="F4"?"#f97316":"#f87171";
                    return (
                      <div key={r.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",backdropFilter:"blur(8px)"}}>
                        <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{r.name}</span>
                        <span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:800,background:`${bc}12`,color:bc,border:`1px solid ${bc}44`}}>{r.bracket}</span>
                        <span style={{fontSize:11,color:"rgba(71,85,105,0.8)"}}>{r.time}</span>
                      </div>
                    );
                  })}
                </div>
              </WidgetCard>
            </div>

            <div className="widget-enter" style={{animationDelay:"360ms"}}>
              <WidgetCard title="Settings" settingsKey="System config" onClick={()=>navigate("/settings")} accentColor="#94a3b8">
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
                  {[{icon:"📡",label:"Sensor thresholds",status:"Configured"},{icon:"⏱",label:"Polling interval",status:"4 sec"},{icon:"🔔",label:"Alert rules",status:"1 active"},{icon:"🗄",label:"Data retention",status:"30 days"}].map(s=>(
                    <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(8px)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>{s.icon}</span><span style={{fontSize:12,color:"rgba(148,163,184,0.8)"}}>{s.label}</span></div>
                      <span style={{fontSize:11,color:"#22d3ee",fontWeight:700}}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>

            <div className="widget-enter" style={{animationDelay:"420ms"}}>
              <WidgetCard title="Applications" settingsKey="Reuse scenarios" onClick={()=>navigate("/applications/aquaculture")} accentColor="#34d399">
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
                  {[{icon:"🐟",label:"Aquaculture",pct:74,color:"#22d3ee"},{icon:"🌾",label:"Agriculture",pct:88,color:"#34d399"},{icon:"🏭",label:"Industrial",pct:55,color:"#818cf8"},{icon:"🏙️",label:"Municipal Reuse",pct:62,color:"#fbbf24"}].map(a=>(
                    <div key={a.label}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:12,color:"rgba(148,163,184,0.75)"}}>{a.icon} {a.label}</span>
                        <span style={{fontSize:12,fontWeight:700,color:a.color}}>{a.pct}%</span>
                      </div>
                      <div style={{height:4,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${a.pct}%`,borderRadius:99,background:`linear-gradient(90deg,${a.color}88,${a.color})`,boxShadow:`0 0 6px ${a.color}55`,transition:"width 1s ease"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </WidgetCard>
            </div>

          </div>
        </div>

        <BottomNav active={activeTab} onChange={setActiveTab} onNavigate={navigate}/>
      </div>
    </>
  );
}
