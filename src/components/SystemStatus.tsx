type Props = {
  mode: "live" | "simulation" | "idle";
  session: {
    active: boolean;
    completed: boolean;
    collected: number;
    required: number;
  };
  backendConnected: boolean;
};

export default function SystemStatus({
  mode,
  session,
  backendConnected,
}: Props) {
  const sessionState = session.completed
    ? "Completed"
    : session.active
    ? "Active"
    : "Not Started";

  const dataIntegrity =
    session.active && session.collected < session.required
      ? "Incomplete"
      : session.completed
      ? "Valid"
      : "Idle";

  const actuationReady =
    mode === "live" &&
    backendConnected &&
    session.completed
      ? "Armed"
      : "Locked";

  const badge = (text: string, color: string) => ({
    padding: "4px 10px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    background: color,
    color: "#020617",
    display: "inline-block",
  });

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 16,
        background: "#020617",
        border: "1px solid #22c55e",
        maxWidth: 800,
      }}
    >
      <h2 style={{ color: "#22c55e", marginBottom: 16 }}>
        System Status
      </h2>

      {/* MODE */}
      <Section
        title="Operating Mode"
        description="Defines whether the system is connected to real hardware or running in simulation."
      >
        <span
          style={badge(
            mode.toUpperCase(),
            mode === "live"
              ? "#22c55e"
              : mode === "simulation"
              ? "#38bdf8"
              : "#94a3b8"
          )}
        />
      </Section>

      {/* SESSION */}
      <Section
        title="Session State"
        description="Controls batch-based data collection and decision gating."
      >
        <p>
          <b>Status:</b> {sessionState}
        </p>
        <p>
          <b>Readings:</b> {session.collected} / {session.required}
        </p>
      </Section>

      {/* BACKEND */}
      <Section
        title="Backend Connectivity"
        description="Indicates whether backend services are reachable and responsive."
      >
        <span
          style={badge(
            backendConnected ? "CONNECTED" : "DISCONNECTED",
            backendConnected ? "#22c55e" : "#ef4444"
          )}
        />
      </Section>

      {/* DATA INTEGRITY */}
      <Section
        title="Data Integrity"
        description="Shows whether frontend data and backend session state are synchronized."
      >
        <span
          style={badge(
            dataIntegrity,
            dataIntegrity === "Valid"
              ? "#22c55e"
              : dataIntegrity === "Incomplete"
              ? "#fde047"
              : "#94a3b8"
          )}
        />
      </Section>

      {/* ACTUATION */}
      <Section
        title="Actuation Readiness"
        description="Determines whether pump control commands are allowed."
      >
        <span
          style={badge(
            actuationReady,
            actuationReady === "Armed"
              ? "#22c55e"
              : "#ef4444"
          )}
        />
      </Section>
    </div>
  );
}

/* =========================
   REUSABLE SECTION
========================= */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ marginBottom: 4 }}>{title}</h3>
      <p
        style={{
          fontSize: 13,
          color: "#94a3b8",
          marginBottom: 8,
          maxWidth: 600,
        }}
      >
        {description}
      </p>
      {children}
    </div>
  );
}
