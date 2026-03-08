import { useState } from "react";

export default function IterationModal({ onSave, onClose }: any) {
  const [name, setName] = useState("");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "#052e16",
          padding: 30,
          borderRadius: 12,
          width: 300,
          color: "white",
        }}
      >
        <h3>Name Iteration</h3>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Iteration name"
          style={{ width: "100%", padding: 8 }}
        />

        <div style={{ marginTop: 16 }}>
          <button onClick={() => onSave(name)}>Save</button>
          <button onClick={onClose} style={{ marginLeft: 10 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
