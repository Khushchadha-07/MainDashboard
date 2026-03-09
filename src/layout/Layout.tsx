import { Outlet } from "react-router-dom";
import BottomNavigation from "../components/BottomNavigation";

export default function Layout() {
  return (
    <div style={styles.root}>
      <main style={styles.main}>
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "transparent",
    color: "#ecfdf5",
  },
  main: {
    flex: 1,
    overflowY: "auto",
    paddingBottom: 72,
  },
};
