export default function DatasetTable({ rows = [] }: { rows: any[] }) {
  return (
    <div
      style={{
        marginTop: 20,
        maxHeight: 260,
        overflowY: "auto",
        background: "#052e16",
        border: "1px solid #22c55e",
        borderRadius: 10,
        padding: 10,
      }}
    >
      <table
        style={{
          width: "100%",
          color: "white",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>SL</th>
            <th>Time</th>
            <th>pH</th>
            <th>TDS</th>
            <th>Turbidity</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", opacity: 0.6 }}>
                Waiting for sensor data…
              </td>
            </tr>
          )}

          {rows.map((r) => (
            <tr key={r.slNo}>
              <td>{r.slNo}</td>
              <td>{r.time}</td>
              <td>{r.ph}</td>
              <td>{r.tds}</td>
              <td>{r.turbidity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
