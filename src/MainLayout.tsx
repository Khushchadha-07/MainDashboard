import { Outlet, NavLink } from "react-router-dom";

export default function MainLayout() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "10px 14px",
    borderRadius: "8px",
    color: isActive ? "#fff" : "#cfd8e3",
    background: isActive ? "#2b3f55" : "transparent",
    textDecoration: "none",
    display: "block",
    marginBottom: "6px",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          background: "#16202b",
          padding: "20px",
          borderRight: "1px solid #243447",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Water Monitor</h2>

        <NavLink to="/" style={linkStyle}>
          🏠 Home
        </NavLink>

        <div style={{ marginTop: "16px" }}>
          <p style={{ fontSize: "12px", opacity: 0.6 }}>HOME SECTIONS</p>

          <NavLink to="/live-dashboard" style={linkStyle}>
            📊 Live Dashboard
          </NavLink>

          <NavLink to="/history" style={linkStyle}>
            🕘 History
          </NavLink>

          <NavLink to="/settings" style={linkStyle}>
            ⚙️ Settings
          </NavLink>
        </div>

        <div style={{ marginTop: "24px" }}>
          <p style={{ fontSize: "12px", opacity: 0.6 }}>APPLICATIONS</p>

          <NavLink to="/applications" style={linkStyle}>
            🌍 Applications
          </NavLink>

          <NavLink to="/applications/aquaculture" style={linkStyle}>
            🐟 Aquaculture
          </NavLink>

          <NavLink to="/applications/agriculture" style={linkStyle}>
            🌱 Agriculture
          </NavLink>

          <NavLink to="/applications/industrial" style={linkStyle}>
            🏭 Industrial
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: "24px",
          background: "#1b2735",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
