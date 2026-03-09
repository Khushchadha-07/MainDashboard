export default function MetricCard({
  title,
  valueKey,
  rows = [],
  avg,
  onClick,
}: any) {
  const hasData = rows.length > 0;

  const current = hasData
    ? Number(rows[rows.length - 1]?.[valueKey])
    : null;

  const safeAvg =
    typeof avg === "number" && avg > 0 ? avg : null;

  let deviationText = "—";

  if (current !== null && safeAvg) {
    const diff = ((current - safeAvg) / safeAvg) * 100;
    deviationText = `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}% from avg`;
  }

  return (
    <div
      onClick={hasData ? onClick : undefined}
      style={{
        background: "#1e293b",
        padding: 18,
        borderRadius: 12,
        width: 180,
        cursor: hasData ? "pointer" : "default",
        opacity: hasData ? 1 : 0.7,
      }}
    >
      <h4>{title}</h4>
      <h2>{current !== null ? current : "—"}</h2>
      <small>
        Avg: {safeAvg ?? "—"} | {deviationText}
        <br />
        Updated every 4s
      </small>
    </div>
  );
}
