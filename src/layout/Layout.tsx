import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Layout() {
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#020b18" }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:"auto", overflowX:"hidden", display:"flex", flexDirection:"column" }}>
        <Outlet />
      </main>
    </div>
  );
}
