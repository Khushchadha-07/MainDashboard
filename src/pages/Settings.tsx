
import React, { useState, useCallback } from "react";
import { useBackendConnectivity } from "../hooks/useBackendConnectivity";
import SystemStatus from "../components/SystemStatus";

/* ═══════════════════════════════════════════════════════════════
   WATERIQ — SETTINGS PAGE  v2.0
   Full-featured settings with export, calibration, thresholds,
   session control, display preferences, and diagnostics.
═══════════════════════════════════════════════════════════════ */

// ─── TYPES ────────────────────────────────────────────────────
type Mode = "live" | "simulation";
type Tab = "system" | "thresholds" | "display" | "session" | "diagnostics" | "about";

interface SensorThresholds {
  phMin: number;
  phMax: number;
  turbidityF1: number;
  turbidityF2: number;
  turbidityF3: number;
  turbidityF4: number;
  tdsReusable: number;
  tdsSevere: number;
  orpMin: number;
  nh3Max: number;
}

interface DisplayPrefs {
  showOilLayer: boolean;
  showSludge: boolean;
  showDriftRing: boolean;
  showSparklines: boolean;
  showPhaseTimeline: boolean;
  animationSpeed: number; // 0.5–2.0
  particleDensity: number; // 25–150 %
  cameraFOV: number; // 30–70
}

interface SessionConfig {
  samplesRequired: number;
  autoExportOnComplete: boolean;
  alertOnBracketChange: boolean;
  cycleTimeoutSeconds: number;
  logRetentionCycles: number;
}

interface CalibrationOffsets {
  ph: number;
  turbidity: number;
  tds: number;
  orp: number;
  nh3: number;
}

// ─── DEFAULT VALUES ───────────────────────────────────────────
const DEFAULT_THRESHOLDS: SensorThresholds = {
  phMin: 6.5, phMax: 8.5,
  turbidityF1: 2, turbidityF2: 4, turbidityF3: 8, turbidityF4: 15,
  tdsReusable: 500, tdsSevere: 800,
  orpMin: 100, nh3Max: 1.0,
};

const DEFAULT_DISPLAY: DisplayPrefs = {
  showOilLayer: true, showSludge: true, showDriftRing: false,
  showSparklines: true, showPhaseTimeline: true,
  animationSpeed: 1.0, particleDensity: 100, cameraFOV: 40,
};

const DEFAULT_SESSION: SessionConfig = {
  samplesRequired: 10,
  autoExportOnComplete: false,
  alertOnBracketChange: true,
  cycleTimeoutSeconds: 120,
  logRetentionCycles: 20,
};

const DEFAULT_CALIB: CalibrationOffsets = { ph: 0, turbidity: 0, tds: 0, orp: 0, nh3: 0 };

// ─── STORAGE HELPERS ──────────────────────────────────────────
const STORAGE_KEY = "wateriq_settings_v2";
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSettings(data: object) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function Settings() {
  const mode: Mode = "live";
  const session = { active: true, completed: false, collected: 6, required: 10 };
  const backendConnected = useBackendConnectivity(
    "https://water-quality-backend-10-kijx.onrender.com/session/status"
  );

  const saved = loadSettings();

  const [activeTab, setActiveTab] = useState<Tab>("system");
  const [thresholds, setThresholds] = useState<SensorThresholds>(saved?.thresholds ?? DEFAULT_THRESHOLDS);
  const [display, setDisplay] = useState<DisplayPrefs>(saved?.display ?? DEFAULT_DISPLAY);
  const [sessionCfg, setSessionCfg] = useState<SessionConfig>(saved?.session ?? DEFAULT_SESSION);
  const [calibration, setCalibration] = useState<CalibrationOffsets>(saved?.calibration ?? DEFAULT_CALIB);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Save all settings ──
  const handleSave = useCallback(() => {
    try {
      saveSettings({ thresholds, display, session: sessionCfg, calibration });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [thresholds, display, sessionCfg, calibration]);

  // ── Reset to defaults ──
  const handleReset = useCallback((section: string) => {
    if (section === "thresholds") setThresholds({ ...DEFAULT_THRESHOLDS });
    if (section === "display")    setDisplay({ ...DEFAULT_DISPLAY });
    if (section === "session")    setSessionCfg({ ...DEFAULT_SESSION });
    if (section === "calibration") setCalibration({ ...DEFAULT_CALIB });
  }, []);

  // ── Export full snapshot ──
  const exportSnapshot = useCallback(() => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: "2.0",
      mode,
      backendConnected,
      session,
      thresholds,
      display,
      sessionConfig: sessionCfg,
      calibrationOffsets: calibration,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wateriq-snapshot-${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mode, backendConnected, session, thresholds, display, sessionCfg, calibration]);

  // ── Export CSV of current thresholds ──
  const exportThresholdsCSV = useCallback(() => {
    const rows = [
      ["Parameter","Min/Threshold","Max/Threshold","Unit"],
      ["pH Min", thresholds.phMin, "–", ""],
      ["pH Max", "–", thresholds.phMax, ""],
      ["Turbidity F1", "–", thresholds.turbidityF1, "NTU"],
      ["Turbidity F2", "–", thresholds.turbidityF2, "NTU"],
      ["Turbidity F3", "–", thresholds.turbidityF3, "NTU"],
      ["Turbidity F4", "–", thresholds.turbidityF4, "NTU"],
      ["TDS Reusable Max", "–", thresholds.tdsReusable, "mg/L"],
      ["TDS Severe Min", thresholds.tdsSevere, "–", "mg/L"],
      ["ORP Min", thresholds.orpMin, "–", "mV"],
      ["NH₃ Max", "–", thresholds.nh3Max, "mg/L"],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wateriq-thresholds.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [thresholds]);

  // ── Import settings JSON ──
  const importSettings = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.thresholds)    setThresholds(data.thresholds);
          if (data.display)       setDisplay(data.display);
          if (data.sessionConfig) setSessionCfg(data.sessionConfig);
          if (data.calibrationOffsets) setCalibration(data.calibrationOffsets);
          setImportError(null);
        } catch {
          setImportError("Invalid JSON file. Could not import settings.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // ── Ping backend ──
  const pingBackend = useCallback(async () => {
    setPingLoading(true);
    setPingResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch("https://water-quality-backend-10-kijx.onrender.com/session/status", { signal: AbortSignal.timeout(5000) });
      const ms = Math.round(performance.now() - t0);
      setPingResult(res.ok ? `✓ Responded in ${ms}ms  (HTTP ${res.status})` : `✗ HTTP ${res.status} in ${ms}ms`);
    } catch (err: any) {
      const ms = Math.round(performance.now() - t0);
      setPingResult(`✗ Failed after ${ms}ms — ${err?.message ?? "Network error"}`);
    } finally {
      setPingLoading(false);
    }
  }, []);

  // ── Copy backend URL ──
  const copyBackendURL = useCallback(() => {
    navigator.clipboard.writeText("https://water-quality-backend-10-kijx.onrender.com");
  }, []);

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerDot} />
          <span style={S.headerTitle}>Water<span style={{ color: "#00d4ff" }}>IQ</span></span>
          <span style={S.headerSep}>|</span>
          <span style={S.headerSub}>System Settings</span>
        </div>
        <div style={S.headerRight}>
          {importError && <span style={{ color: "#ff3f5a", fontSize: 11, fontFamily: "monospace" }}>{importError}</span>}
          <button className="btn-ghost" onClick={importSettings}>⬆ Import</button>
          <button className="btn-ghost" onClick={exportSnapshot}>⬇ Export JSON</button>
          <button
            className={saveStatus === "saved" ? "btn-saved" : saveStatus === "error" ? "btn-error" : "btn-save"}
            onClick={handleSave}
          >
            {saveStatus === "saved" ? "✓ Saved" : saveStatus === "error" ? "✗ Error" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={S.tabBar}>
        {(["system","thresholds","display","session","diagnostics","about"] as Tab[]).map(t => (
          <button
            key={t}
            className={`tab-btn ${activeTab === t ? "tab-active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {{ system:"⬡ System", thresholds:"◈ Thresholds", display:"◻ Display", session:"▷ Session", diagnostics:"⚙ Diagnostics", about:"ℹ About" }[t]}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={S.content}>

        {/* ── SYSTEM TAB ─────────────────────────────────────── */}
        {activeTab === "system" && (
          <div style={S.grid2}>
            <div style={S.col}>
              <Card title="System Status" accent="#00ff9d">
                <SystemStatus mode={mode} session={session} backendConnected={backendConnected} />
                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  <StatChip label="MODE"    value={mode.toUpperCase()}  color={mode === "live" ? "#00ff9d" : "#ffdb58"} />
                  <StatChip label="BACKEND" value={backendConnected ? "ONLINE" : "OFFLINE"} color={backendConnected ? "#00ff9d" : "#ff3f5a"} />
                  <StatChip label="SESSION" value={session.active ? "ACTIVE" : "IDLE"}      color={session.active ? "#00d4ff" : "#4a6580"} />
                </div>
              </Card>

              <Card title="Sensor Configuration" accent="#00d4ff">
                <InfoRow label="pH Sensor"         value="Analog · ESP32 ADC" />
                <InfoRow label="TDS Sensor"        value="Analog · ESP32 ADC" />
                <InfoRow label="Turbidity Sensor"  value="Analog · ESP32 ADC" />
                <InfoRow label="ORP Sensor"        value="Analog · ESP32 ADC" />
                <InfoRow label="NH₃ Sensor"        value="Analog · ESP32 ADC" />
                <InfoRow label="Sampling"          value="Managed by ESP firmware" />
                <InfoRow label="Sample Rate"       value={`${sessionCfg.samplesRequired} per cycle`} />
              </Card>
            </div>

            <div style={S.col}>
              <Card title="Tank & Pump Routing" accent="#c084fc">
                <InfoRow label="Tank A — Reusable"    value="F1 · F2 brackets" dot="#00ff9d" />
                <InfoRow label="Tank B — Treatment"   value="F3 · F4 · F5 brackets" dot="#ff3f5a" />
                <InfoRow label="Pump control"         value="Relay module" />
                <InfoRow label="Routing authority"    value="Backend API" />
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#00ff9d0a", border: "1px solid #00ff9d22", borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: "#00ff9d", fontFamily: "monospace", marginBottom: 4 }}>ROUTING RULES</div>
                  {[["F1","< 2 NTU, < 200 mg/L","Tank A"],["F2","< 4 NTU, < 300 mg/L","Tank A"],["F3","< 8 NTU, < 500 mg/L","Tank B"],["F4","< 15 NTU, < 800 mg/L","Tank B"],["F5","≥ 800 mg/L TDS","Tank B"]].map(([br,cond,tank]) => (
                    <div key={br} style={{ display:"flex", gap:8, alignItems:"center", padding:"3px 0", borderBottom:"1px solid #071828", fontSize:11 }}>
                      <span style={{ fontFamily:"monospace", fontWeight:700, color: tank==="Tank A" ? "#00ff9d" : "#ff3f5a", minWidth:22 }}>{br}</span>
                      <span style={{ color:"#4a7090", flex:1 }}>{cond}</span>
                      <span style={{ color: tank==="Tank A" ? "#00ff9d" : "#ff3f5a", fontFamily:"monospace", fontSize:10 }}>→ {tank}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Data Handling" accent="#ffdb58">
                <InfoRow label="Data scope"       value="Active session only" />
                <InfoRow label="Persistence"      value="Frontend localStorage" />
                <InfoRow label="PII stored"       value="None" dot="#00ff9d" />
                <InfoRow label="Log retention"    value={`${sessionCfg.logRetentionCycles} cycles`} />
                <InfoRow label="Auto-export"      value={sessionCfg.autoExportOnComplete ? "Enabled" : "Disabled"} dot={sessionCfg.autoExportOnComplete ? "#00ff9d" : "#ff3f5a"} />
              </Card>
            </div>
          </div>
        )}

        {/* ── THRESHOLDS TAB ─────────────────────────────────── */}
        {activeTab === "thresholds" && (
          <div style={S.grid2}>
            <div style={S.col}>
              <Card title="pH Thresholds" accent="#00ff9d" onReset={() => handleReset("thresholds")}>
                <NumField label="pH Minimum" value={thresholds.phMin} min={0} max={14} step={0.1} unit=""
                  onChange={v => setThresholds(p => ({ ...p, phMin: v }))} color="#00ff9d" />
                <NumField label="pH Maximum" value={thresholds.phMax} min={0} max={14} step={0.1} unit=""
                  onChange={v => setThresholds(p => ({ ...p, phMax: v }))} color="#00ff9d" />
                <RangeBar lo={thresholds.phMin} hi={thresholds.phMax} min={0} max={14} color="#00ff9d" label="pH safe window" />
              </Card>

              <Card title="Turbidity Brackets (NTU)" accent="#00d4ff">
                <NumField label="F1 → F2 boundary" value={thresholds.turbidityF1} min={0} max={50} step={0.5} unit=" NTU"
                  onChange={v => setThresholds(p => ({ ...p, turbidityF1: v }))} color="#7fffd4" />
                <NumField label="F2 → F3 boundary" value={thresholds.turbidityF2} min={0} max={50} step={0.5} unit=" NTU"
                  onChange={v => setThresholds(p => ({ ...p, turbidityF2: v }))} color="#00d4ff" />
                <NumField label="F3 → F4 boundary" value={thresholds.turbidityF3} min={0} max={50} step={0.5} unit=" NTU"
                  onChange={v => setThresholds(p => ({ ...p, turbidityF3: v }))} color="#ffdb58" />
                <NumField label="F4 → F5 boundary" value={thresholds.turbidityF4} min={0} max={50} step={0.5} unit=" NTU"
                  onChange={v => setThresholds(p => ({ ...p, turbidityF4: v }))} color="#ff8c42" />
              </Card>

              <Card title="Calibration Offsets" accent="#c084fc" onReset={() => handleReset("calibration")}>
                <p style={{ fontSize: 11, color: "#4a7090", marginBottom: 10, fontFamily: "monospace" }}>
                  Applied additively to raw sensor readings. Use after field calibration.
                </p>
                {(["ph","turbidity","tds","orp","nh3"] as (keyof CalibrationOffsets)[]).map(k => (
                  <NumField key={k}
                    label={`${k.toUpperCase()} offset`}
                    value={calibration[k]}
                    min={-50} max={50} step={0.01}
                    unit={k === "ph" ? "" : k === "tds" ? " mg/L" : k === "orp" ? " mV" : " NTU"}
                    onChange={v => setCalibration(p => ({ ...p, [k]: v }))}
                    color="#c084fc"
                    showSign
                  />
                ))}
              </Card>
            </div>

            <div style={S.col}>
              <Card title="TDS Thresholds" accent="#ff8c42">
                <NumField label="Reusable max (F1–F2)" value={thresholds.tdsReusable} min={50} max={2000} step={10} unit=" mg/L"
                  onChange={v => setThresholds(p => ({ ...p, tdsReusable: v }))} color="#ff8c42" />
                <NumField label="Severe min (F5)" value={thresholds.tdsSevere} min={50} max={2000} step={10} unit=" mg/L"
                  onChange={v => setThresholds(p => ({ ...p, tdsSevere: v }))} color="#ff3f5a" />
                <RangeBar lo={0} hi={thresholds.tdsReusable} min={0} max={2000} color="#00ff9d" label="Reusable TDS zone" />
                <RangeBar lo={thresholds.tdsSevere} hi={2000} min={0} max={2000} color="#ff3f5a" label="Severe TDS zone" />
              </Card>

              <Card title="ORP & NH₃ Limits" accent="#ff6b8a">
                <NumField label="ORP minimum" value={thresholds.orpMin} min={0} max={600} step={5} unit=" mV"
                  onChange={v => setThresholds(p => ({ ...p, orpMin: v }))} color="#c084fc" />
                <NumField label="NH₃ maximum" value={thresholds.nh3Max} min={0} max={10} step={0.1} unit=" mg/L"
                  onChange={v => setThresholds(p => ({ ...p, nh3Max: v }))} color="#ff6b8a" />
              </Card>

              <Card title="Export Thresholds" accent="#4a7090">
                <p style={{ fontSize: 11, color: "#4a7090", marginBottom: 10, fontFamily: "monospace" }}>
                  Download current threshold config for documentation or sharing.
                </p>
                <button className="btn-outline-full" onClick={exportThresholdsCSV}>
                  ⬇ Export as CSV
                </button>
                <button className="btn-outline-full" style={{ marginTop: 6 }} onClick={exportSnapshot}>
                  ⬇ Export as JSON (full snapshot)
                </button>
              </Card>
            </div>
          </div>
        )}

        {/* ── DISPLAY TAB ────────────────────────────────────── */}
        {activeTab === "display" && (
          <div style={S.grid2}>
            <div style={S.col}>
              <Card title="3D Visualisation Layers" accent="#00d4ff" onReset={() => handleReset("display")}>
                <Toggle label="Oil Film Layer"     color="#d4a017" val={display.showOilLayer}      on={() => setDisplay(p => ({ ...p, showOilLayer: !p.showOilLayer }))} />
                <Toggle label="Sludge Zone"        color="#8c5a2a" val={display.showSludge}         on={() => setDisplay(p => ({ ...p, showSludge: !p.showSludge }))} />
                <Toggle label="Drift Monitor Ring" color="#ffdb58" val={display.showDriftRing}      on={() => setDisplay(p => ({ ...p, showDriftRing: !p.showDriftRing }))} />
                <Toggle label="Live Sparklines"    color="#00d4ff" val={display.showSparklines}     on={() => setDisplay(p => ({ ...p, showSparklines: !p.showSparklines }))} />
                <Toggle label="Phase Timeline"     color="#c084fc" val={display.showPhaseTimeline}  on={() => setDisplay(p => ({ ...p, showPhaseTimeline: !p.showPhaseTimeline }))} />
              </Card>

              <Card title="Camera & Optics" accent="#c084fc">
                <SliderField label="Field of View" value={display.cameraFOV} min={25} max={75} step={1} unit="°"
                  onChange={v => setDisplay(p => ({ ...p, cameraFOV: v }))} color="#c084fc" />
              </Card>
            </div>

            <div style={S.col}>
              <Card title="Performance" accent="#ffdb58">
                <SliderField label="Animation Speed" value={display.animationSpeed} min={0.25} max={2.5} step={0.05} unit="×"
                  onChange={v => setDisplay(p => ({ ...p, animationSpeed: v }))} color="#ffdb58"
                  marks={[{ v: 0.5, l: "Slow" }, { v: 1, l: "1×" }, { v: 2, l: "Fast" }]} />
                <SliderField label="Particle Density" value={display.particleDensity} min={10} max={200} step={5} unit="%"
                  onChange={v => setDisplay(p => ({ ...p, particleDensity: v }))} color="#00d4ff"
                  marks={[{ v: 50, l: "Light" }, { v: 100, l: "Default" }, { v: 175, l: "Heavy" }]} />
                <div style={{ marginTop: 10, padding: "8px 10px", background: "#071828", borderRadius: 6, fontSize: 10, color: "#4a7090", fontFamily: "monospace" }}>
                  ⚡ High particle density may reduce performance on low-end devices.
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── SESSION TAB ────────────────────────────────────── */}
        {activeTab === "session" && (
          <div style={S.grid2}>
            <div style={S.col}>
              <Card title="Session Behaviour" accent="#00ff9d" onReset={() => handleReset("session")}>
                <NumField label="Samples required per cycle" value={sessionCfg.samplesRequired} min={1} max={50} step={1} unit=""
                  onChange={v => setSessionCfg(p => ({ ...p, samplesRequired: v }))} color="#00ff9d" />
                <NumField label="Cycle timeout" value={sessionCfg.cycleTimeoutSeconds} min={10} max={600} step={5} unit=" s"
                  onChange={v => setSessionCfg(p => ({ ...p, cycleTimeoutSeconds: v }))} color="#ffdb58" />
                <NumField label="Log retention (cycles)" value={sessionCfg.logRetentionCycles} min={5} max={200} step={5} unit=""
                  onChange={v => setSessionCfg(p => ({ ...p, logRetentionCycles: v }))} color="#c084fc" />
              </Card>

              <Card title="Alerts & Automation" accent="#ffdb58">
                <Toggle label="Auto-export on cycle complete"  color="#00ff9d" val={sessionCfg.autoExportOnComplete} on={() => setSessionCfg(p => ({ ...p, autoExportOnComplete: !p.autoExportOnComplete }))} />
                <Toggle label="Alert on bracket change"        color="#ffdb58" val={sessionCfg.alertOnBracketChange} on={() => setSessionCfg(p => ({ ...p, alertOnBracketChange: !p.alertOnBracketChange }))} />
              </Card>
            </div>

            <div style={S.col}>
              <Card title="Current Session" accent="#00d4ff">
                <InfoRow label="Session active"   value={session.active ? "Yes" : "No"}          dot={session.active ? "#00ff9d" : "#ff3f5a"} />
                <InfoRow label="Completed"        value={session.completed ? "Yes" : "No"}        dot={session.completed ? "#00ff9d" : "#4a7090"} />
                <InfoRow label="Samples collected" value={`${session.collected} / ${session.required}`} />
                <div style={{ marginTop: 12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:11, color:"#4a7090" }}>
                    <span>Collection progress</span>
                    <span style={{ fontFamily:"monospace", color:"#00d4ff" }}>{Math.round(session.collected / session.required * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: "#071828", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height:"100%", width: `${session.collected / session.required * 100}%`, background: "linear-gradient(90deg, #00d4ff, #00ff9d)", borderRadius: 99, transition: "width 0.5s" }} />
                  </div>
                </div>
              </Card>

              <Card title="Danger Zone" accent="#ff3f5a">
                <p style={{ fontSize: 11, color: "#4a7090", marginBottom: 12, fontFamily: "monospace", lineHeight: 1.6 }}>
                  These actions affect stored settings and cannot be undone.
                </p>
                <button className="btn-danger" onClick={() => { handleReset("thresholds"); handleReset("display"); handleReset("session"); handleReset("calibration"); }}>
                  ↺ Reset ALL settings to default
                </button>
                <button className="btn-danger" style={{ marginTop: 6 }} onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }}>
                  ✕ Clear saved settings & reload
                </button>
              </Card>
            </div>
          </div>
        )}

        {/* ── DIAGNOSTICS TAB ────────────────────────────────── */}
        {activeTab === "diagnostics" && (
          <div style={S.grid2}>
            <div style={S.col}>
              <Card title="Backend Connectivity" accent="#00d4ff">
                <InfoRow label="URL" value="water-quality-backend-10-kijx.onrender.com" />
                <InfoRow label="Status" value={backendConnected ? "Online" : "Offline"} dot={backendConnected ? "#00ff9d" : "#ff3f5a"} />
                <InfoRow label="Protocol" value="HTTPS" />
                <InfoRow label="Endpoint" value="/session/status" />
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button className="btn-outline" onClick={pingBackend} disabled={pingLoading}>
                    {pingLoading ? "⟳ Pinging…" : "⚡ Ping backend"}
                  </button>
                  <button className="btn-outline" onClick={copyBackendURL}>
                    ⎘ Copy URL
                  </button>
                </div>
                {pingResult && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: pingResult.startsWith("✓") ? "#00ff9d0a" : "#ff3f5a0a", border: `1px solid ${pingResult.startsWith("✓") ? "#00ff9d33" : "#ff3f5a33"}`, borderRadius: 6, fontFamily: "monospace", fontSize: 11, color: pingResult.startsWith("✓") ? "#00ff9d" : "#ff3f5a" }}>
                    {pingResult}
                  </div>
                )}
              </Card>

              <Card title="Browser Environment" accent="#c084fc">
                <InfoRow label="User Agent"   value={navigator.userAgent.slice(0,40) + "…"} />
                <InfoRow label="Language"     value={navigator.language} />
                <InfoRow label="Online"       value={navigator.onLine ? "Yes" : "No"} dot={navigator.onLine ? "#00ff9d" : "#ff3f5a"} />
                <InfoRow label="Cookies"      value={navigator.cookieEnabled ? "Enabled" : "Disabled"} />
                <InfoRow label="Storage"      value={typeof localStorage !== "undefined" ? "Available" : "Unavailable"} dot={typeof localStorage !== "undefined" ? "#00ff9d" : "#ff3f5a"} />
                <InfoRow label="WebGL"        value={(() => { try { const c = document.createElement("canvas"); return c.getContext("webgl2") ? "WebGL 2" : c.getContext("webgl") ? "WebGL 1" : "None"; } catch { return "Unknown"; } })()} />
              </Card>
            </div>

            <div style={S.col}>
              <Card title="Settings Storage" accent="#ffdb58">
                <InfoRow label="Storage key"    value={STORAGE_KEY} />
                <InfoRow label="Saved"          value={localStorage.getItem(STORAGE_KEY) ? "Yes" : "No"} dot={localStorage.getItem(STORAGE_KEY) ? "#00ff9d" : "#4a7090"} />
                <InfoRow label="Approx. size"   value={`${(localStorage.getItem(STORAGE_KEY)?.length ?? 0)} chars`} />
                <InfoRow label="LocalStorage quota" value="~5MB (browser limit)" />
                <div style={{ marginTop: 12 }}>
                  <button className="btn-outline-full" onClick={() => {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    const blob = new Blob([raw ?? "{}"], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "wateriq-localstorage-dump.json"; a.click(); URL.revokeObjectURL(url);
                  }}>
                    ⬇ Dump raw localStorage entry
                  </button>
                </div>
              </Card>

              <Card title="Sensor Self-Test" accent="#00ff9d">
                <p style={{ fontSize: 11, color: "#4a7090", marginBottom: 12, fontFamily: "monospace", lineHeight: 1.6 }}>
                  Triggers a mock sensor read and validates output against current thresholds.
                </p>
                <SelfTest thresholds={thresholds} calibration={calibration} />
              </Card>
            </div>
          </div>
        )}

        {/* ── ABOUT TAB ──────────────────────────────────────── */}
        {activeTab === "about" && (
          <div style={{ maxWidth: 620 }}>
            <Card title="About WaterIQ" accent="#00d4ff">
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#00d4ff22,#00ff9d22)", border:"1px solid #00d4ff44", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>💧</div>
                <div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontWeight:900, fontSize:18, color:"#c8e8f8" }}>Water<span style={{color:"#00d4ff"}}>IQ</span></div>
                  <div style={{ fontSize:11, color:"#2a5070", fontFamily:"monospace" }}>Advanced Greywater Separation System · v5.0</div>
                </div>
              </div>
              <InfoRow label="Version"      value="5.0.0" />
              <InfoRow label="Build target" value="Academic / experimental" />
              <InfoRow label="Hardware"     value="ESP32 + analog sensors" />
              <InfoRow label="Backend"      value="Render.com hosted API" />
              <InfoRow label="Frontend"     value="React + TypeScript" />
              <InfoRow label="3D engine"    value="Three.js r128" />
            </Card>

            <Card title="Decision Logic" accent="#00ff9d">
              <p style={{ fontSize:12, color:"#8ab0c8", lineHeight:1.7, marginBottom:10 }}>
                Water classification uses averaged batch readings of pH, turbidity, and TDS
                collected during an active live session. Five filtration brackets (F1–F5) are
                evaluated in order — the first match wins and determines routing.
              </p>
              <InfoRow label="F1" value="pH 6.5–8.5, Turb < 2 NTU, TDS < 200 mg/L → Tank A" />
              <InfoRow label="F2" value="Turb < 4 NTU, TDS < 300 mg/L → Tank A" />
              <InfoRow label="F3" value="Turb < 8 NTU, TDS < 500 mg/L → Tank B" />
              <InfoRow label="F4" value="TDS < 800 mg/L → Tank B" />
              <InfoRow label="F5" value="TDS ≥ 800 mg/L → Tank B (severe)" />
            </Card>

            <Card title="Safety Disclaimer" accent="#ff3f5a">
              <p style={{ fontSize:12, color:"#8ab0c8", lineHeight:1.7 }}>
                This system is intended for <strong style={{color:"#ffdb58"}}>academic, experimental, and controlled
                environments only</strong>. It must not be used as a sole decision-making system
                for potable water supply or critical industrial operations. Always verify
                water quality with certified laboratory methods before human consumption.
              </p>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────

function Card({ title, accent, children, onReset }: { title: string; accent: string; children: React.ReactNode; onReset?: () => void }) {
  return (
    <div style={{ background: "#030c16", border: `1px solid #071828`, borderTop: `2px solid ${accent}44`, borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: accent, letterSpacing: "0.18em", textTransform: "uppercase" }}>{title}</span>
        {onReset && <button onClick={onReset} style={{ background: "transparent", border: "none", color: "#1a3a5a", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>↺ reset</button>}
      </div>
      {children}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: color + "0e", border: `1px solid ${color}33`, borderRadius: 6, padding: "6px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 8, color: "#2a5070", fontFamily: "monospace", letterSpacing: "0.12em" }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "monospace", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #071828" }}>
      <span style={{ fontSize: 11, color: "#4a7090", fontFamily: "monospace" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {dot && <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot, boxShadow: `0 0 6px ${dot}88`, flexShrink: 0 }} />}
        <span style={{ fontSize: 11, color: "#8ab0c8", fontFamily: "monospace", textAlign: "right", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      </div>
    </div>
  );
}

function RangeBar({ lo, hi, min, max, color, label }: { lo: number; hi: number; min: number; max: number; color: string; label: string }) {
  const total = max - min;
  const left = ((lo - min) / total) * 100;
  const width = ((hi - lo) / total) * 100;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: "#2a5070", fontFamily: "monospace", marginBottom: 4 }}>{label}</div>
      <div style={{ height: 6, background: "#071828", borderRadius: 99, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: `${left}%`, width: `${width}%`, height: "100%", background: color, borderRadius: 99, opacity: 0.7 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#1a3a5a", fontFamily: "monospace", marginTop: 2 }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function NumField({ label, value, min, max, step, unit, onChange, color, showSign }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; color: string; showSign?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ flex: 1, fontSize: 11, color: "#4a7090", fontFamily: "monospace" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#071828", border: `1px solid ${color}33`, borderRadius: 6, overflow: "hidden" }}>
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(10)))}
          style={{ background: "transparent", border: "none", color, cursor: "pointer", padding: "5px 10px", fontSize: 14, lineHeight: 1 }}>−</button>
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
          style={{ width: 72, background: "transparent", border: "none", color, fontFamily: "monospace", fontSize: 12, fontWeight: 700, textAlign: "center", outline: "none", padding: "5px 0" }}
        />
        <span style={{ fontSize: 10, color: color + "88", paddingRight: 8, fontFamily: "monospace" }}>{unit}</span>
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(10)))}
          style={{ background: "transparent", border: "none", color, cursor: "pointer", padding: "5px 10px", fontSize: 14, lineHeight: 1 }}>+</button>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, unit, onChange, color, marks }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; color: string;
  marks?: { v: number; l: string }[];
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
        <span style={{ color: "#4a7090", fontFamily: "monospace" }}>{label}</span>
        <span style={{ color, fontFamily: "monospace", fontWeight: 700 }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="slider" style={{ "--sc": color } as any} />
      {marks && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          {marks.map(m => (
            <span key={m.l} onClick={() => onChange(m.v)}
              style={{ fontSize: 9, color: Math.abs(value - m.v) < step * 2 ? color : "#1a3a5a", fontFamily: "monospace", cursor: "pointer" }}>
              {m.l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, color, val, on }: { label: string; color: string; val: boolean; on: () => void }) {
  return (
    <div onClick={on} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", cursor: "pointer", userSelect: "none", borderBottom: "1px solid #071828" }}>
      <span style={{ fontSize: 12, color: val ? "#c8e8f8" : "#2a4a6a", transition: "color 0.2s" }}>{label}</span>
      <div style={{ width: 36, height: 20, borderRadius: 99, border: `1.5px solid ${val ? color : "#0d2235"}`, background: val ? color + "25" : "transparent", position: "relative", transition: "all 0.2s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 3, left: val ? 18 : 3, width: 12, height: 12, borderRadius: "50%", background: val ? color : "#1a3a5a", transition: "left 0.2s, background 0.2s", boxShadow: val ? `0 0 8px ${color}` : "none" }} />
      </div>
    </div>
  );
}

function SelfTest({ thresholds, calibration }: { thresholds: SensorThresholds; calibration: CalibrationOffsets }) {
  const [result, setResult] = useState<null | { pass: boolean; readings: any; bracket: string; notes: string[] }>(null);
  const run = () => {
    const raw = { ph: 7.1, turbidity: 1.5, tds: 185, orp: 310, nh3: 0.3 };
    const r = {
      ph:        +(raw.ph        + calibration.ph       ).toFixed(2),
      turbidity: +(raw.turbidity + calibration.turbidity).toFixed(2),
      tds:       +(raw.tds       + calibration.tds      ).toFixed(0),
      orp:       +(raw.orp       + calibration.orp      ).toFixed(0),
      nh3:       +(raw.nh3       + calibration.nh3      ).toFixed(2),
    };
    const notes: string[] = [];
    if (r.ph < thresholds.phMin || r.ph > thresholds.phMax) notes.push(`⚠ pH ${r.ph} outside safe range [${thresholds.phMin}–${thresholds.phMax}]`);
    if (r.orp < thresholds.orpMin) notes.push(`⚠ ORP ${r.orp} mV below minimum ${thresholds.orpMin} mV`);
    if (r.nh3 > thresholds.nh3Max) notes.push(`⚠ NH₃ ${r.nh3} exceeds max ${thresholds.nh3Max}`);
    const bracket = r.turbidity < thresholds.turbidityF1 && r.tds < 200 ? "F1"
      : r.turbidity < thresholds.turbidityF2 && r.tds < 300 ? "F2"
      : r.turbidity < thresholds.turbidityF3 && r.tds < 500 ? "F3"
      : r.tds < thresholds.tdsSevere ? "F4" : "F5";
    setResult({ pass: notes.length === 0, readings: r, bracket, notes });
  };
  return (
    <div>
      <button className="btn-outline-full" onClick={run}>▷ Run mock sensor test</button>
      {result && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: result.pass ? "#00ff9d0a" : "#ffdb580a", border: `1px solid ${result.pass ? "#00ff9d33" : "#ffdb5844"}`, borderRadius: 7 }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: result.pass ? "#00ff9d" : "#ffdb58", marginBottom: 6, fontWeight: 700 }}>
            {result.pass ? "✓ All sensors nominal" : "⚠ Threshold warnings"}  ·  Bracket: <span style={{ color: "#c084fc" }}>{result.bracket}</span>
          </div>
          {(["ph","turbidity","tds","orp","nh3"] as const).map(k => (
            <div key={k} style={{ display:"flex", gap:8, fontSize:10, color:"#4a7090", fontFamily:"monospace", padding:"2px 0" }}>
              <span style={{ minWidth:70 }}>{k.toUpperCase()}</span>
              <span style={{ color:"#8ab0c8" }}>{result.readings[k]}</span>
            </div>
          ))}
          {result.notes.map((n,i) => <div key={i} style={{ marginTop:4, fontSize:10, color:"#ffdb58", fontFamily:"monospace" }}>{n}</div>)}
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: { width: "100%", height: "100vh", background: "#020b14", display: "flex", flexDirection: "column", fontFamily: "'Rajdhani',sans-serif", color: "#c8e8f8", overflow: "hidden" },
  header: { height: 56, background: "linear-gradient(90deg,#020b14,#030e1a 40%,#020b14)", borderBottom: "1px solid #071828", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, gap: 16 },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerDot: { width: 8, height: 8, borderRadius: "50%", background: "#00ff9d", boxShadow: "0 0 14px #00ff9d" },
  headerTitle: { fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 18, letterSpacing: "0.04em", color: "#c8e8f8" },
  headerSep: { color: "#071828", fontSize: 18 },
  headerSub: { fontSize: 13, color: "#2a5070", fontFamily: "monospace" },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  tabBar: { display: "flex", borderBottom: "1px solid #071828", background: "#030c16", flexShrink: 0, padding: "0 24px" },
  content: { flex: 1, overflowY: "auto", padding: "24px 24px", background: "#020b14" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" },
  col: { display: "flex", flexDirection: "column" },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:#0d2235;border-radius:2px;}

  .tab-btn{padding:12px 18px;background:transparent;border:none;border-bottom:2px solid transparent;color:#1a4060;font-family:monospace;font-size:10px;font-weight:700;cursor:pointer;letter-spacing:0.1em;transition:all 0.2s;white-space:nowrap;}
  .tab-btn:hover{color:#4a7090;}
  .tab-active{color:#00d4ff !important;border-bottom-color:#00d4ff !important;background:#00d4ff08;}

  .btn-save{padding:9px 20px;border-radius:6px;border:1px solid #00d4ff66;background:linear-gradient(135deg,#00d4ff0d,#00ff9d0d);color:#00d4ff;font-family:monospace;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s;}
  .btn-save:hover{background:linear-gradient(135deg,#00d4ff1a,#00ff9d1a);box-shadow:0 0 18px #00d4ff22;}
  .btn-saved{padding:9px 20px;border-radius:6px;border:1px solid #00ff9d66;background:#00ff9d0d;color:#00ff9d;font-family:monospace;font-size:11px;font-weight:700;cursor:default;}
  .btn-error{padding:9px 20px;border-radius:6px;border:1px solid #ff3f5a66;background:#ff3f5a0d;color:#ff3f5a;font-family:monospace;font-size:11px;font-weight:700;cursor:default;}
  .btn-ghost{padding:8px 14px;border-radius:6px;border:1px solid #071828;background:transparent;color:#2a5070;font-family:monospace;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s;}
  .btn-ghost:hover{color:#4a7090;border-color:#0d2235;}
  .btn-outline{padding:7px 14px;border-radius:6px;border:1px solid #0d2235;background:transparent;color:#4a7090;font-family:monospace;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s;}
  .btn-outline:hover:not(:disabled){border-color:#00d4ff44;color:#00d4ff;}
  .btn-outline:disabled{opacity:0.4;cursor:not-allowed;}
  .btn-outline-full{width:100%;padding:9px;border-radius:6px;border:1px solid #0d2235;background:transparent;color:#4a7090;font-family:monospace;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s;text-align:center;}
  .btn-outline-full:hover{border-color:#00d4ff44;color:#00d4ff;}
  .btn-danger{width:100%;padding:9px;border-radius:6px;border:1px solid #ff3f5a33;background:transparent;color:#ff3f5a;font-family:monospace;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s;}
  .btn-danger:hover{background:#ff3f5a0e;border-color:#ff3f5a66;}

  input[type=range].slider{width:100%;-webkit-appearance:none;height:3px;border-radius:99px;background:#071828;cursor:pointer;outline:none;}
  input[type=range].slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--sc,#00d4ff);border:2px solid var(--sc,#00d4ff);box-shadow:0 0 8px var(--sc,#00d4ff);cursor:pointer;transition:transform 0.15s;}
  input[type=range].slider::-webkit-slider-thumb:hover{transform:scale(1.4);}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
`;
