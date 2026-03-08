import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

export default function ChartView({
  title,
  back,
}: {
  title: string;
  back: () => void;
}) {
  const data = Array.from({ length: 30 }, (_, i) => ({
    t: i,
    v: Math.random() * 10,
  }));

  return (
    <>
      <button onClick={back}>← Back</button>
      <h2 style={{ color: "#e5e7eb" }}>{title} Trend</h2>

      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="t" />
            <YAxis />
            <Line dataKey="v" stroke="#38bdf8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
