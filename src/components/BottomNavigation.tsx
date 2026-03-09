import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tab {
  id: string;
  label: string;
  sublabel: string;
  path: string;
  icon: React.FC<{ active: boolean }>;
}

// ─── SVG Icons — purpose-built, not emoji ────────────────────────────────────

const IconDashboard: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect
      x="1.5" y="1.5" width="7" height="7" rx="1"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth={active ? "1.5" : "1"}
      fill={active ? "#22d3ee14" : "none"}
      style={{ transition: "all 0.25s" }}
    />
    <rect
      x="11.5" y="1.5" width="7" height="7" rx="1"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth={active ? "1.5" : "1"}
      fill={active ? "#22d3ee14" : "none"}
      style={{ transition: "all 0.25s" }}
    />
    <rect
      x="1.5" y="11.5" width="7" height="7" rx="1"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth={active ? "1.5" : "1"}
      fill={active ? "#22d3ee14" : "none"}
      style={{ transition: "all 0.25s" }}
    />
    <rect
      x="11.5" y="11.5" width="7" height="7" rx="1"
      stroke={active ? "#34d399" : "#1a3a55"}
      strokeWidth={active ? "1.5" : "1"}
      fill={active ? "#34d39918" : "none"}
      style={{ transition: "all 0.25s" }}
    />
  </svg>
);

const IconLive: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle
      cx="10" cy="10" r="3"
      fill={active ? "#22d3ee" : "#1a3a55"}
      style={{ transition: "all 0.25s" }}
    />
    <circle
      cx="10" cy="10" r="6"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth="1"
      strokeDasharray={active ? "2 2" : "1 3"}
      opacity={active ? 0.7 : 0.4}
      style={{ transition: "all 0.25s" }}
    />
    <circle
      cx="10" cy="10" r="9"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth="0.75"
      opacity={active ? 0.35 : 0.15}
      style={{ transition: "all 0.25s" }}
    />
    {active && (
      <circle cx="10" cy="10" r="3" fill="#22d3ee" opacity="0.5">
        <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
    )}
  </svg>
);

const IconChamber: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M10 2L18 6.5V13.5L10 18L2 13.5V6.5L10 2Z"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth={active ? "1.5" : "1"}
      fill={active ? "#22d3ee0a" : "none"}
      style={{ transition: "all 0.25s" }}
    />
    <path
      d="M10 2V18M2 6.5L18 13.5M18 6.5L2 13.5"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth="0.75"
      opacity={active ? 0.5 : 0.25}
      style={{ transition: "all 0.25s" }}
    />
    <circle cx="10" cy="10" r="2" fill={active ? "#22d3ee" : "#1a3a55"} style={{ transition: "all 0.25s" }} />
  </svg>
);

const IconHistory: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <polyline
      points="3,15 7,9 10,12 13,7 17,5"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth={active ? "1.5" : "1"}
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
      style={{ transition: "all 0.25s" }}
    />
    {[3, 7, 10, 13, 17].map((x, i) => {
      const ys = [15, 9, 12, 7, 5];
      return (
        <circle
          key={i}
          cx={x} cy={ys[i]} r="1.5"
          fill={active ? (i === 4 ? "#34d399" : "#22d3ee") : "#1a3a55"}
          style={{ transition: "all 0.25s" }}
        />
      );
    })}
    <line x1="3" y1="17" x2="17" y2="17" stroke={active ? "#22d3ee" : "#1a3a55"} strokeWidth="0.75" opacity="0.4" />
  </svg>
);

const IconSettings: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle
      cx="10" cy="10" r="2.5"
      stroke={active ? "#22d3ee" : "#1a3a55"}
      strokeWidth={active ? "1.5" : "1"}
      fill={active ? "#22d3ee14" : "none"}
      style={{ transition: "all 0.25s" }}
    />
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = 10 + Math.cos(angle) * 5;
      const y1 = 10 + Math.sin(angle) * 5;
      const x2 = 10 + Math.cos(angle) * 7;
      const y2 = 10 + Math.sin(angle) * 7;
      return (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={active ? "#22d3ee" : "#1a3a55"}
          strokeWidth={active ? "1.5" : "1"}
          strokeLinecap="round"
          style={{ transition: "all 0.25s" }}
        />
      );
    })}
  </svg>
);

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { id: "dashboard", label: "Dashboard",   sublabel: "OVERVIEW",  path: "/",        icon: IconDashboard },
  { id: "live",      label: "Live",        sublabel: "REALTIME",  path: "/live",     icon: IconLive      },
  { id: "chamber",   label: "Chamber 3D",  sublabel: "SIM",       path: "/chamber",  icon: IconChamber   },
  { id: "history",   label: "History",     sublabel: "LOG",       path: "/history",  icon: IconHistory   },
  { id: "settings",  label: "Settings",    sublabel: "CONFIG",    path: "/settings", icon: IconSettings  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTabActive(tabPath: string, locationPath: string): boolean {
  if (tabPath === "/") return locationPath === "/";
  return locationPath === tabPath || locationPath.startsWith(tabPath + "/");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BottomNavigation() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const navRef    = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);

  // Active index for the sliding indicator
  const activeIndex = TABS.findIndex((t) => isTabActive(t.path, location.pathname));

  const handleNavigate = useCallback(
    (tab: Tab) => {
      if (!isTabActive(tab.path, location.pathname)) {
        navigate(tab.path);
      }
    },
    [location.pathname, navigate]
  );

  // Keyboard: left/right arrow navigation
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const focused = document.activeElement as HTMLElement;
      const buttons = Array.from(el.querySelectorAll("button")) as HTMLButtonElement[];
      const idx = buttons.indexOf(focused as HTMLButtonElement);
      if (idx === -1) return;
      if (e.key === "ArrowRight") { e.preventDefault(); buttons[(idx + 1) % buttons.length].focus(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); buttons[(idx - 1 + buttons.length) % buttons.length].focus(); }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <style>{STYLES}</style>

      <nav
        ref={navRef}
        role="navigation"
        aria-label="Primary navigation"
        className="bnav"
      >
        {/* Sliding background pill behind active tab */}
        {activeIndex >= 0 && (
          <div
            className="bnav__pill"
            style={{ left: `calc(${activeIndex} * 20%)`, width: "20%" }}
          />
        )}

        {TABS.map((tab) => {
          const active  = isTabActive(tab.path, location.pathname);
          const hover   = hovered === tab.id && !active;
          const Icon    = tab.icon;

          return (
            <button
              key={tab.id}
              className={[
                "bnav__tab",
                active  ? "bnav__tab--active"  : "",
                hover   ? "bnav__tab--hover"   : "",
                pressed === tab.id ? "bnav__tab--pressed" : "",
              ].join(" ")}
              onClick={() => handleNavigate(tab)}
              onMouseEnter={() => setHovered(tab.id)}
              onMouseLeave={() => { setHovered(null); setPressed(null); }}
              onMouseDown={() => setPressed(tab.id)}
              onMouseUp={() => setPressed(null)}
              aria-current={active ? "page" : undefined}
              aria-label={`${tab.label} – ${tab.sublabel}`}
            >
              {/* Top indicator bar */}
              <span className={`bnav__bar ${active ? "bnav__bar--active" : ""}`} aria-hidden="true" />

              {/* Glow pool */}
              {active && <span className="bnav__glow" aria-hidden="true" />}

              {/* Icon */}
              <span className="bnav__icon">
                <Icon active={active} />
              </span>

              {/* Labels */}
              <span className="bnav__labels">
                <span className="bnav__label">{tab.label}</span>
                <span className="bnav__sublabel">{tab.sublabel}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap');

  /* ── Shell ── */
  .bnav {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 72px;
    z-index: 9999;

    display: flex;
    align-items: stretch;

    background: linear-gradient(
      180deg,
      rgba(2, 8, 20, 0.92) 0%,
      rgba(2, 8, 22, 0.98) 100%
    );
    border-top: 1px solid rgba(34, 211, 238, 0.10);
    box-shadow:
      0 -1px 0 rgba(34, 211, 238, 0.06),
      0 -8px 32px rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  /* ── Subtle grid texture overlay ── */
  .bnav::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(
        90deg,
        rgba(34, 211, 238, 0.025) 0px,
        rgba(34, 211, 238, 0.025) 1px,
        transparent 1px,
        transparent calc(100% / 5)
      );
    pointer-events: none;
  }

  /* ── Sliding background pill ── */
  .bnav__pill {
    position: absolute;
    top: 0;
    bottom: 0;
    background: rgba(34, 211, 238, 0.045);
    transition: left 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
    pointer-events: none;
  }

  /* ── Individual tab button ── */
  .bnav__tab {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 4px 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.18s ease;
    overflow: hidden;
  }

  .bnav__tab:focus-visible {
    box-shadow: inset 0 0 0 1.5px rgba(34, 211, 238, 0.6);
  }

  .bnav__tab--hover {
    background: rgba(34, 211, 238, 0.028);
  }

  .bnav__tab--pressed {
    transform: scale(0.94);
  }

  /* ── Top indicator bar ── */
  .bnav__bar {
    position: absolute;
    top: 0;
    left: 18%;
    width: 64%;
    height: 2px;
    background: transparent;
    transition: background 0.25s ease, box-shadow 0.25s ease, width 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
    border-radius: 0 0 2px 2px;
  }

  .bnav__bar--active {
    background: linear-gradient(90deg, #22d3ee, #34d399);
    box-shadow:
      0 0 8px rgba(34, 211, 238, 0.9),
      0 0 20px rgba(34, 211, 238, 0.4);
    width: 64%;
  }

  /* ── Glow pool behind active icon ── */
  .bnav__glow {
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 56px;
    height: 44px;
    background: radial-gradient(
      ellipse at 50% 30%,
      rgba(34, 211, 238, 0.18) 0%,
      transparent 72%
    );
    pointer-events: none;
    animation: bnavGlowPulse 3s ease-in-out infinite;
  }

  @keyframes bnavGlowPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }

  /* ── Icon wrapper ── */
  .bnav__icon {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .bnav__tab--active .bnav__icon {
    transform: translateY(-2px);
  }

  .bnav__tab--hover .bnav__icon {
    transform: translateY(-1px);
  }

  /* ── Label group ── */
  .bnav__labels {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0px;
  }

  .bnav__label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.03em;
    line-height: 1;
    color: #1a4060;
    transition: color 0.22s ease;
    white-space: nowrap;
  }

  .bnav__sublabel {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5px;
    font-weight: 400;
    letter-spacing: 0.14em;
    line-height: 1;
    color: #0d2235;
    transition: color 0.22s ease, opacity 0.22s ease;
    opacity: 0;
  }

  /* Active label states */
  .bnav__tab--active .bnav__label  { color: #c8e8f8; font-weight: 700; }
  .bnav__tab--active .bnav__sublabel { color: #22d3ee; opacity: 0.7; }

  /* Hover label states */
  .bnav__tab--hover .bnav__label   { color: #3a7a9a; }
  .bnav__tab--hover .bnav__sublabel { color: #1a4060; opacity: 0.7; }

  /* ── Scan line shimmer on hover ── */
  .bnav__tab::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(34, 211, 238, 0.04),
      transparent
    );
    pointer-events: none;
    transition: none;
  }

  .bnav__tab--hover::after {
    animation: bnavScan 0.55s ease-out forwards;
  }

  @keyframes bnavScan {
    from { left: -60%; }
    to   { left: 140%; }
  }

  /* ── Responsive: tighten on very small screens ── */
  @media (max-width: 360px) {
    .bnav { height: 66px; }
    .bnav__label { font-size: 10px; }
    .bnav__sublabel { display: none; }
    .bnav__icon { width: 20px; height: 20px; }
  }

  /* ── Responsive: widen comfortably on large screens ── */
  @media (min-width: 900px) {
    .bnav {
      left: 50%;
      transform: translateX(-50%);
      width: 640px;
      border-radius: 16px 16px 0 0;
      border-left: 1px solid rgba(34, 211, 238, 0.10);
      border-right: 1px solid rgba(34, 211, 238, 0.10);
    }
    .bnav::before {
      border-radius: 16px 16px 0 0;
    }
    .bnav__pill {
      border-radius: 12px 12px 0 0;
    }
  }
`;

// ─── Usage ────────────────────────────────────────────────────────────────────
// Place inside root layout or main component:
//
// import BottomNavigation from "./components/BottomNavigation";
//
// export default function Layout() {
//   return (
//     <div style={{ paddingBottom: 72 }}>
//       <Outlet />
//       <BottomNavigation />
//     </div>
//   );
// }
