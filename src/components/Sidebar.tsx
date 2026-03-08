import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

/* ─────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────── */
interface NavItem {
  label: string;
  to: string;
  icon: string;
  badge?: string;
}

interface NavSection {
  key: string;
  title: string;
  icon: string;
  items: NavItem[];
}

/* ─────────────────────────────────────────────────────
   NAV STRUCTURE
───────────────────────────────────────────────────── */
const NAV_SECTIONS: NavSection[] = [
  {
    key: "core",
    title: "Core",
    icon: "◈",
    items: [
      { label: "Overview",         to: "/home",    icon: "⊞" },
      { label: "Live Dashboard",   to: "/live",    icon: "◉", badge: "LIVE" },
      { label: "History",          to: "/history", icon: "◷" },
      { label: "Settings",         to: "/settings",icon: "⚙" },
    ],
  },
  {
    key: "viz",
    title: "Visualization",
    icon: "⬡",
    items: [
      { label: "Chamber 3D",       to: "/chamber",       icon: "⬡", badge: "NEW" },
    ],
  },
  {
    key: "apps",
    title: "Applications",
    icon: "◫",
    items: [
      { label: "Aquaculture",      to: "/applications/aquaculture",  icon: "◈" },
      { label: "Agriculture",      to: "/applications/agriculture",  icon: "◈" },
      { label: "Industrial",       to: "/applications/industrial",   icon: "◈" },
    ],
  },
];

/* ─────────────────────────────────────────────────────
   SYSTEM STATUS (bottom strip)
───────────────────────────────────────────────────── */
const STATUS_ITEMS = [
  { label: "Sensors",  value: "12/12", color: "#22c55e" },
  { label: "Pumps",    value: "3",     color: "#38bdf8" },
  { label: "Alerts",   value: "1",     color: "#fbbf24" },
];

/* ─────────────────────────────────────────────────────
   SIDEBAR COMPONENT
───────────────────────────────────────────────────── */
export default function Sidebar() {
  const location = useLocation();

  // Sidebar collapsed state (icon-only mode)
  const [collapsed, setCollapsed] = useState(false);

  // Which sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    core: true,
    viz:  true,
    apps: true,
  });

  // Hover state for collapsed tooltip
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Pulse animation for LIVE badge
  const [livePulse, setLivePulse] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setLivePulse((p) => !p), 1400);
    return () => clearInterval(id);
  }, []);

  const toggleSection = (key: string) => {
    if (collapsed) return; // sections don't toggle in collapsed mode
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const W = collapsed ? 64 : 228;

  return (
    <>
      {/* ── KEYFRAMES injected once ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');

        @keyframes sb-fadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes sb-pulse {
          0%,100% { opacity: 1; box-shadow: 0 0 0 0 #22c55e44; }
          50%      { opacity: 0.5; box-shadow: 0 0 0 4px #22c55e22; }
        }
        @keyframes sb-badgePulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        @keyframes sb-sectionReveal {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <aside
        style={{
          width: W,
          minWidth: W,
          maxWidth: W,
          background: "#060d1a",
          height: "100vh",
          boxSizing: "border-box",
          borderRight: "1px solid #0f1f35",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s, max-width 0.28s",
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
          fontFamily: "'DM Mono', 'Courier New', monospace",
        }}
      >
        {/* ── LOGO / BRAND ── */}
        <div
          style={{
            padding: collapsed ? "18px 0" : "18px 16px 14px",
            borderBottom: "1px solid #0f1f35",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {/* Logo mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                color: "#022c22",
                flexShrink: 0,
                boxShadow: "0 0 12px #22c55e44",
                fontFamily: "Syne, sans-serif",
              }}
            >
              W
            </div>
            {!collapsed && (
              <div style={{ animation: "sb-fadeIn 0.22s ease", minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 800,
                    fontSize: 16,
                    color: "#ecfdf5",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  Water<span style={{ color: "#22c55e" }}>IQ</span>
                </div>
                <div style={{ fontSize: 9, color: "#334155", marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Smart Water System
                </div>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              style={{
                background: "none",
                border: "1px solid #1e293b",
                borderRadius: 6,
                color: "#334155",
                cursor: "pointer",
                padding: "3px 6px",
                fontSize: 12,
                lineHeight: 1,
                flexShrink: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget.style.borderColor = "#22c55e44");
                (e.currentTarget.style.color = "#22c55e");
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.borderColor = "#1e293b");
                (e.currentTarget.style.color = "#334155");
              }}
            >
              ‹‹
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            style={{
              background: "none",
              border: "none",
              color: "#334155",
              cursor: "pointer",
              padding: "8px 0",
              fontSize: 14,
              width: "100%",
              transition: "color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#22c55e")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
          >
            ››
          </button>
        )}

        {/* ── NAVIGATION ── */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: collapsed ? "6px 0" : "10px 10px",
            scrollbarWidth: "none",
          }}
        >
          {NAV_SECTIONS.map((section) => {
            const isOpen = openSections[section.key];

            return (
              <div key={section.key} style={{ marginBottom: collapsed ? 4 : 6 }}>

                {/* Section header */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleSection(section.key)}
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "5px 6px 5px 8px",
                      borderRadius: 6,
                      marginBottom: 2,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#0f172a")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#22c55e44" }}>{section.icon}</span>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: "#334155",
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                        }}
                      >
                        {section.title}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        color: "#334155",
                        transition: "transform 0.22s",
                        display: "inline-block",
                        transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                      }}
                    >
                      ▾
                    </span>
                  </button>
                ) : (
                  /* Collapsed: section divider */
                  <div
                    style={{
                      height: 1,
                      background: "#0f1f35",
                      margin: "6px 10px",
                    }}
                  />
                )}

                {/* Section items */}
                {(collapsed || isOpen) && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      animation: !collapsed ? "sb-sectionReveal 0.18s ease" : "none",
                    }}
                  >
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.to ||
                        location.pathname.startsWith(item.to + "/");

                      return (
                        <div
                          key={item.to}
                          style={{ position: "relative" }}
                          onMouseEnter={() => setHoveredItem(item.to)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <NavLink
                            to={item.to}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: collapsed ? 0 : 9,
                              padding: collapsed ? "9px 0" : "7px 10px",
                              borderRadius: 8,
                              textDecoration: "none",
                              justifyContent: collapsed ? "center" : "flex-start",
                              position: "relative",
                              transition: "background 0.15s, box-shadow 0.15s",
                              background: isActive
                                ? "linear-gradient(90deg, #22c55e14, #22c55e08)"
                                : "transparent",
                              boxShadow: isActive
                                ? "inset 3px 0 0 #22c55e"
                                : "none",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.background = "#0f172a";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.background = "transparent";
                              }
                            }}
                          >
                            {/* Icon */}
                            <span
                              style={{
                                fontSize: collapsed ? 16 : 13,
                                color: isActive ? "#22c55e" : "#475569",
                                transition: "color 0.15s",
                                lineHeight: 1,
                                flexShrink: 0,
                              }}
                            >
                              {item.icon}
                            </span>

                            {/* Label */}
                            {!collapsed && (
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: isActive ? 600 : 400,
                                  color: isActive ? "#ecfdf5" : "#64748b",
                                  transition: "color 0.15s",
                                  flex: 1,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {item.label}
                              </span>
                            )}

                            {/* Badge */}
                            {!collapsed && item.badge && (
                              <span
                                style={{
                                  fontSize: 8,
                                  fontWeight: 800,
                                  padding: "2px 5px",
                                  borderRadius: 4,
                                  letterSpacing: "0.06em",
                                  animation: item.badge === "LIVE"
                                    ? "sb-badgePulse 1.4s ease infinite"
                                    : "none",
                                  background:
                                    item.badge === "LIVE"  ? "#22c55e22" :
                                    item.badge === "NEW"   ? "#38bdf822" : "#a78bfa22",
                                  color:
                                    item.badge === "LIVE"  ? "#22c55e" :
                                    item.badge === "NEW"   ? "#38bdf8" : "#a78bfa",
                                  border:
                                    item.badge === "LIVE"  ? "1px solid #22c55e44" :
                                    item.badge === "NEW"   ? "1px solid #38bdf844" : "1px solid #a78bfa44",
                                }}
                              >
                                {item.badge}
                              </span>
                            )}

                            {/* Active dot (collapsed) */}
                            {collapsed && isActive && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 6,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  width: 4,
                                  height: 4,
                                  borderRadius: "50%",
                                  background: "#22c55e",
                                  boxShadow: "0 0 6px #22c55e",
                                }}
                              />
                            )}
                          </NavLink>

                          {/* Collapsed tooltip */}
                          {collapsed && hoveredItem === item.to && (
                            <div
                              style={{
                                position: "fixed",
                                left: 72,
                                transform: "translateY(-50%)",
                                background: "#0f172a",
                                border: "1px solid #1e293b",
                                borderRadius: 8,
                                padding: "6px 12px",
                                fontSize: 12,
                                color: "#ecfdf5",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                zIndex: 9999,
                                boxShadow: "0 4px 20px #000000aa",
                                animation: "sb-fadeIn 0.15s ease",
                                pointerEvents: "none",
                              }}
                            >
                              {item.label}
                              {item.badge && (
                                <span
                                  style={{
                                    marginLeft: 7,
                                    fontSize: 8,
                                    fontWeight: 800,
                                    color:
                                      item.badge === "LIVE" ? "#22c55e" :
                                      item.badge === "NEW"  ? "#38bdf8" : "#a78bfa",
                                  }}
                                >
                                  {item.badge}
                                </span>
                              )}
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

        {/* ── SYSTEM STATUS STRIP ── */}
        {!collapsed && (
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid #0f1f35",
              flexShrink: 0,
              animation: "sb-fadeIn 0.2s ease",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#334155",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              System Status
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {STATUS_ITEMS.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "#0a0f1e",
                    border: "1px solid #0f1f35",
                  }}
                >
                  <span style={{ fontSize: 10, color: "#475569" }}>{s.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: s.color,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LIVE INDICATOR DOT (collapsed bottom) ── */}
        {collapsed && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "12px 0",
              borderTop: "1px solid #0f1f35",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                animation: "sb-pulse 1.4s ease infinite",
              }}
            />
          </div>
        )}

        {/* ── VERSION TAG ── */}
        {!collapsed && (
          <div
            style={{
              padding: "8px 14px",
              fontSize: 9,
              color: "#1e293b",
              letterSpacing: "0.06em",
              borderTop: "1px solid #0a1020",
              display: "flex",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span>WaterIQ v2.1</span>
            <span>Build In Bharat</span>
          </div>
        )}
      </aside>
    </>
  );
}
