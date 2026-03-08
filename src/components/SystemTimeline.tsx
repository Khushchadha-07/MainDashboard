type Props = {
  session: {
    active: boolean;
    completed: boolean;
    collected: number;
    required: number;
  };
};

export default function SystemTimeline({ session }: Props) {
  const steps = [
    "Idle",
    "Session Started",
    "Collecting Data",
    "Ready for Prediction",
    "Decision Executed",
  ];

  const currentStep = session.completed
    ? 4
    : session.collected === session.required
    ? 3
    : session.active
    ? 2
    : 0;

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ marginBottom: 12 }}>System Timeline</h3>

      <div style={{ display: "flex", gap: 12 }}>
        {steps.map((step, index) => (
          <div
            key={step}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 13,
              background:
                index <= currentStep ? "#22c55e" : "#1e293b",
              color:
                index <= currentStep ? "#020617" : "#94a3b8",
            }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
