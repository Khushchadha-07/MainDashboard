import { useState } from "react";

export default function ExpandableSection({
  title,
  icon,
  children,
}: any) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #334155",
        borderRadius: "12px",
        marginBottom: "16px",
        background: "#1e293b",
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "22px" }}>{icon}</span>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>

      {open && (
        <div style={{ padding: "16px", borderTop: "1px solid #334155" }}>
          {children}
        </div>
      )}
    </div>
  );
}
