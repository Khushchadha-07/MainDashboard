import { useEffect, useState } from "react";

/* ======================================================
   BACKEND ENDPOINT
====================================================== */
const BACKEND_TANK_LEVELS_URL =
  "https://water-quality-backend-10-kijx.onrender.com/tank-levels";

/* ======================================================
   TYPES
====================================================== */
type TankLevels = {
  tankA: number;
  tankB: number;
  updatedAt: number | null;
};

/* ======================================================
   COMPONENT
====================================================== */
export default function TankView() {
  const [levels, setLevels] = useState<TankLevels>({
    tankA: 0,
    tankB: 0,
    updatedAt: null,
  });

  /* ===============================
     FETCH TANK LEVELS
  ============================== */
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const res = await fetch(BACKEND_TANK_LEVELS_URL);
        if (!res.ok) return;

        const data = await res.json();
        setLevels(data);
      } catch (err) {
        console.error("Tank level fetch failed", err);
      }
    };

    fetchLevels();
    const id = setInterval(fetchLevels, 5000);

    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding: 32 }}>
      {/* HEADER */}
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
        Tank View
      </h1>

      <p style={{ color: "#94a3b8", marginBottom: 32 }}>
        Live ultrasonic-based tank level monitoring
      </p>

      {/* TANK GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 32,
        }}
      >
        <TankCircle label="Tank A" value={levels.tankA} />
        <TankCircle label="Tank B" value={levels.tankB} />
      </div>

      {/* FOOTER INFO */}
      {levels.updatedAt && (
        <p style={{ marginTop: 32, color: "#64748b", fontSize: 13 }}>
          Last updated:{" "}
          {new Date(levels.updatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

/* ======================================================
   TANK CIRCLE COMPONENT
====================================================== */
function TankCircle({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const radius = 90;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset =
    circumference - (value / 100) * circumference;

  return (
    <div
      style={{
        background: "#020617",
        border: "1px solid #22c55e",
        borderRadius: 18,
        padding: 24,
        textAlign: "center",
      }}
    >
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#1e293b"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#22c55e"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fontSize="28"
          fontWeight="800"
          fill="#ecfdf5"
        >
          {value}%
        </text>
      </svg>

      <div
        style={{
          marginTop: 12,
          fontSize: 18,
          fontWeight: 700,
          color: "#22c55e",
        }}
      >
        {label}
      </div>
    </div>
  );
}
