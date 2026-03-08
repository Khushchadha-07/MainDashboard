import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout/Layout";

/* ===============================
   CORE PAGES
================================= */
import Home from "./pages/Home";
import LiveDashboard from "./pages/LiveDashboard";
import HistoryPage from "./pages/history/HistoryPage";
import Settings from "./pages/Settings";

/* ===============================
   VISUALIZATION
================================= */
import GreywaterViz from "./pages/GreywaterViz";

/* ===============================
   APPLICATIONS
================================= */
import Aquaculture from "./pages/applications/Aquaculture";
import Agriculture from "./pages/applications/Agriculture";
import Industrial from "./pages/applications/Industrial";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Layout wraps ALL routes — BottomNavigation lives inside Layout */}
        <Route element={<Layout />}>

          {/* DEFAULT REDIRECT */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* HOME */}
          <Route path="/home" element={<Home />} />

          {/* CORE SYSTEM */}
          <Route path="/live" element={<LiveDashboard />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<Settings />} />

          {/* 3D VISUALIZATION */}
          <Route path="/chamber" element={<GreywaterViz />} />

          {/* APPLICATIONS */}
          <Route path="/applications/aquaculture" element={<Aquaculture />} />
          <Route path="/applications/agriculture" element={<Agriculture />} />
          <Route path="/applications/industrial" element={<Industrial />} />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/home" replace />} />

        </Route>

      </Routes>
    </BrowserRouter>
  );
            }
