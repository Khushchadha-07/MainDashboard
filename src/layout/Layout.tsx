import { Outlet } from "react-router-dom";

/**
 * Layout.tsx
 * - Bottom navigation removed (Task 7)
 * - No background override — pages control their own backgrounds
 */
export default function Layout() {
  return (
    <div style={styles.root}>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    color: "#ecfdf5",
  },
  main: {
    flex: 1,
    overflowY: "auto",
  },
};
