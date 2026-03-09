import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

interface NavItem  { label:string; to:string; icon:string; badge?:string }
interface NavSection { key:string; title:string; icon:string; items:NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  { key:"core", title:"Core", icon:"◈", items:[
    { label:"Overview",       to:"/home",    icon:"⊞" },
    { label:"Live Dashboard", to:"/live",    icon:"◉", badge:"LIVE" },
    { label:"History",        to:"/history", icon:"◷" },
    { label:"Settings",       to:"/settings",icon:"⚙" },
  ]},
  { key:"viz", title:"Visualization", icon:"⬡", items:[
    { label:"Chamber 3D",     to:"/chamber",       icon:"⬡", badge:"NEW" },
  ]},
  { key:"apps", title:"Applications", icon:"◫", items:[
    { label:"Aquaculture",    to:"/applications/aquaculture",  icon:"◈" },
    { label:"Agriculture",    to:"/applications/agriculture",  icon:"◈" },
    { label:"Industrial",     to:"/applications/industrial",   icon:"◈" },
  ]},
];

const STATUS_ITEMS=[
  {label:"Sensors",value:"12/12",color:"#22d3ee"},
  {label:"Pumps",  value:"3",    color:"#818cf8"},
  {label:"Alerts", value:"1",    color:"#fbbf24"},
];

export default function Sidebar() {
  const location=useLocation();
  const [collapsed,setCollapsed]=useState(false);
  const [openSections,setOpenSections]=useState<Record<string,boolean>>({core:true,viz:true,apps:true});
  const [hoveredItem,setHoveredItem]=useState<string|null>(null);
  const W=collapsed?64:228;

  const toggleSection=(key:string)=>{ if(!collapsed) setOpenSections(p=>({...p,[key]:!p[key]})); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes sb-fadeIn { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
        @keyframes sb-badgePulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes sb-liveDot { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,211,238,0.4)} 50%{opacity:0.6;box-shadow:0 0 0 5px rgba(34,211,238,0)} }
      `}</style>
      <aside style={{
        width:W, minWidth:W, maxWidth:W,
        background:"rgba(2,8,22,0.9)",
        backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
        height:"100vh",
        borderRight:"1px solid rgba(148,163,184,0.07)",
        display:"flex",flexDirection:"column",
        transition:"width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s, max-width 0.28s",
        overflow:"hidden",position:"relative",flexShrink:0,
        fontFamily:"'Outfit', system-ui, sans-serif",
        boxShadow:"2px 0 24px rgba(0,0,0,0.5)",
      }}>

        {/* Subtle left border glow */}
        <div style={{position:"absolute",left:0,top:"15%",bottom:"15%",width:1,background:"linear-gradient(180deg,transparent,rgba(34,211,238,0.25),transparent)",pointerEvents:"none"}}/>

        {/* Logo */}
        <div style={{padding:collapsed?"16px 0":"16px 16px 14px",borderBottom:"1px solid rgba(148,163,184,0.06)",display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",gap:8,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
            <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,rgba(34,211,238,0.9),rgba(56,189,248,0.7))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#020b18",flexShrink:0,boxShadow:"0 0 16px rgba(34,211,238,0.35)"}}>W</div>
            {!collapsed&&(
              <div style={{animation:"sb-fadeIn 0.22s ease",minWidth:0}}>
                <div style={{fontWeight:900,fontSize:15,color:"#f1f5f9",letterSpacing:"-0.02em",lineHeight:1,whiteSpace:"nowrap"}}>Water<span style={{color:"#22d3ee"}}>IQ</span></div>
                <div style={{fontSize:9,color:"rgba(71,85,105,0.7)",marginTop:2,letterSpacing:"0.08em",textTransform:"uppercase"}}>Smart Water System</div>
              </div>
            )}
          </div>
          {!collapsed&&(
            <button onClick={()=>setCollapsed(true)}
              style={{background:"none",border:"1px solid rgba(148,163,184,0.1)",borderRadius:6,color:"rgba(71,85,105,0.7)",cursor:"pointer",padding:"3px 6px",fontSize:12,lineHeight:1,flexShrink:0,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(34,211,238,0.35)";e.currentTarget.style.color="#22d3ee";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(148,163,184,0.1)";e.currentTarget.style.color="rgba(71,85,105,0.7)";}}>‹‹</button>
          )}
        </div>

        {/* Collapsed expand button */}
        {collapsed&&(
          <button onClick={()=>setCollapsed(false)}
            style={{background:"none",border:"none",color:"rgba(71,85,105,0.6)",cursor:"pointer",padding:"8px 0",fontSize:14,width:"100%",transition:"color 0.15s",flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.color="#22d3ee"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(71,85,105,0.6)"}>››</button>
        )}

        {/* Nav */}
        <nav style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:collapsed?"6px 0":"10px 10px",scrollbarWidth:"none"}}>
          {NAV_SECTIONS.map(section=>{
            const isOpen=openSections[section.key];
            return (
              <div key={section.key} style={{marginBottom:collapsed?4:6}}>
                {!collapsed?(
                  <button onClick={()=>toggleSection(section.key)}
                    style={{width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 6px 5px 8px",borderRadius:6,marginBottom:2,transition:"background 0.15s",color:"inherit"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,color:"rgba(34,211,238,0.3)"}}>{section.icon}</span>
                      <span style={{fontSize:9.5,fontWeight:700,color:"rgba(71,85,105,0.8)",letterSpacing:"0.10em",textTransform:"uppercase"}}>{section.title}</span>
                    </div>
                    <span style={{fontSize:9,color:"rgba(71,85,105,0.6)",transition:"transform 0.22s",display:"inline-block",transform:isOpen?"rotate(0deg)":"rotate(-90deg)"}}>▾</span>
                  </button>
                ):(
                  <div style={{height:1,background:"rgba(148,163,184,0.06)",margin:"6px 10px"}}/>
                )}
                {(collapsed||isOpen)&&(
                  <div style={{display:"flex",flexDirection:"column",gap:1}}>
                    {section.items.map(item=>{
                      const isActive=location.pathname===item.to||location.pathname.startsWith(item.to+"/");
                      return (
                        <div key={item.to} style={{position:"relative"}} onMouseEnter={()=>setHoveredItem(item.to)} onMouseLeave={()=>setHoveredItem(null)}>
                          <NavLink to={item.to} style={{
                            display:"flex",alignItems:"center",gap:collapsed?0:9,
                            padding:collapsed?"9px 0":"7px 10px",borderRadius:9,
                            textDecoration:"none",justifyContent:collapsed?"center":"flex-start",
                            position:"relative",transition:"background 0.15s,box-shadow 0.15s",
                            background:isActive?"rgba(34,211,238,0.08)":"transparent",
                            boxShadow:isActive?"inset 3px 0 0 #22d3ee":"none",
                          }}
                          onMouseEnter={e=>{ if(!isActive)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; }}
                          onMouseLeave={e=>{ if(!isActive)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                            <span style={{fontSize:collapsed?16:13,color:isActive?"#22d3ee":"rgba(71,85,105,0.7)",transition:"color 0.15s",lineHeight:1,flexShrink:0}}>{item.icon}</span>
                            {!collapsed&&(
                              <span style={{fontSize:13,fontWeight:isActive?600:400,color:isActive?"#f1f5f9":"rgba(100,116,139,0.8)",transition:"color 0.15s",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>
                            )}
                            {!collapsed&&item.badge&&(
                              <span style={{fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:4,letterSpacing:"0.06em",animation:item.badge==="LIVE"?"sb-badgePulse 1.4s ease infinite":"none",background:item.badge==="LIVE"?"rgba(34,211,238,0.12)":item.badge==="NEW"?"rgba(129,140,248,0.12)":"rgba(167,139,250,0.12)",color:item.badge==="LIVE"?"#22d3ee":item.badge==="NEW"?"#818cf8":"#a78bfa",border:`1px solid ${item.badge==="LIVE"?"rgba(34,211,238,0.3)":item.badge==="NEW"?"rgba(129,140,248,0.3)":"rgba(167,139,250,0.3)"}`}}>{item.badge}</span>
                            )}
                            {collapsed&&isActive&&<div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",width:4,height:4,borderRadius:"50%",background:"#22d3ee",boxShadow:"0 0 6px #22d3ee"}}/>}
                          </NavLink>
                          {collapsed&&hoveredItem===item.to&&(
                            <div style={{position:"fixed",left:72,transform:"translateY(-50%)",background:"rgba(4,12,28,0.97)",backdropFilter:"blur(20px)",border:"1px solid rgba(148,163,184,0.12)",borderRadius:9,padding:"6px 12px",fontSize:12,color:"#f1f5f9",fontWeight:600,whiteSpace:"nowrap",zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.7)",animation:"sb-fadeIn 0.15s ease",pointerEvents:"none"}}>
                              {item.label}
                              {item.badge&&<span style={{marginLeft:7,fontSize:8,fontWeight:800,color:item.badge==="LIVE"?"#22d3ee":"#818cf8"}}>{item.badge}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* System Status strip */}
        {!collapsed&&(
          <div style={{padding:"10px 12px",borderTop:"1px solid rgba(148,163,184,0.06)",flexShrink:0,animation:"sb-fadeIn 0.2s ease"}}>
            <div style={{fontSize:9,color:"rgba(71,85,105,0.7)",letterSpacing:"0.10em",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>System Status</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {STATUS_ITEMS.map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px",borderRadius:7,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:10,color:"rgba(71,85,105,0.8)"}}>{s.label}</span>
                  <span style={{fontSize:11,fontWeight:700,color:s.color,fontFamily:"'JetBrains Mono',monospace",textShadow:`0 0 8px ${s.color}44`}}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed live dot */}
        {collapsed&&(
          <div style={{display:"flex",justifyContent:"center",padding:"12px 0",borderTop:"1px solid rgba(148,163,184,0.06)",flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#22d3ee",animation:"sb-liveDot 1.4s ease infinite"}}/>
          </div>
        )}

        {/* Version tag */}
        {!collapsed&&(
          <div style={{padding:"8px 14px",fontSize:9,color:"rgba(30,41,59,0.9)",letterSpacing:"0.06em",borderTop:"1px solid rgba(15,23,42,0.9)",display:"flex",justifyContent:"space-between",flexShrink:0}}>
            <span>WaterIQ v2.1</span><span>Build In Bharat</span>
          </div>
        )}
      </aside>
    </>
  );
}
