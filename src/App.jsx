
import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertTriangle, Camera, CheckCircle2, Cpu,
  Eye, LayoutDashboard, Play, ShieldCheck, Square,
  Trash2, Wifi, WifiOff, FileText, Download, RefreshCw,
  GraduationCap
} from "lucide-react";
import "./App.css";
import ExamSession from "./ExamSession";

const API = "http://127.0.0.1:8001";

export default function App() {
  const [health, setHealth] = useState(false);
  const [camera, setCamera] = useState(false);
  const [active, setActive] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [hardware, setHardware] = useState([]);
  const [hardwareInfo, setHardwareInfo] = useState({ connected: false, message: "Checking hardware..." });
  const [tab, setTab] = useState("Overview");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("Checking");

  const refresh = useCallback(async () => {
    try {
      const urls = [
        "/api/health",
        "/api/camera/status",
        "/api/monitoring/status",
        "/api/incidents",
        "/api/hardware/status",
      ];

      const responses = await Promise.all(
        urls.map((url) => fetch(API + url))
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("API request failed");
      }

      const [h, c, m, i, hw] = await Promise.all(
        responses.map((response) => response.json())
      );

      setHealth(h.status === "online");
      setCamera(Boolean(c.available));
      setActive(Boolean(m.active));
      setIncidents(Array.isArray(i) ? i : (i.incidents || []));
      setHardware(hw.components || []);
      setHardwareInfo(hw);
      setPhoneStatus(h.phone_detection || m.phone_detection || "Not reported");
    } catch {
      setHealth(false);
      setCamera(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  async function post(path, successMessage) {
    if (busy) return;
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch(API + path, { method: "POST" });
      if (!response.ok) throw new Error("Request failed");

      setNotice(successMessage);
      await refresh();
    } catch {
      setNotice("Could not reach the backend. Check that it is running.");
    } finally {
      setBusy(false);
    }
  }

  async function hardwareAction(path, successMessage) {
    if (busy) return;
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch(API + path, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Hardware request failed");
      }

      setNotice(
        data.message ||
        (data.success === false ? "Hardware command failed." : successMessage)
      );
      await refresh();
    } catch (error) {
      setNotice(error.message || "Could not contact the hardware backend.");
    } finally {
      setBusy(false);
    }
  }

  function exportCSV() {
    const columns = ["id", "type", "message", "severity", "time", "timestamp"];
    const quote = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const csv = [
      columns.join(","),
      ...incidents.map((item) =>
        columns.map((column) => quote(item[column])).join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fairexam-incident-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Incident report exported.");
  }

  const navigation = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Incidents", icon: AlertTriangle },
    { name: "Reports", icon: FileText },
    { name: "Exam Session", icon: GraduationCap },
    { name: "Hardware", icon: Cpu },
  ];

  const shownIncidents =
    tab === "Incidents" ? incidents : incidents.slice(0, 5);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo"><ShieldCheck size={25} /></div>
          <div>
            <h2>FairExam <span>AI</span></h2>
            <small>SMART PROCTORING</small>
          </div>
        </div>

        <p className="nav-heading">WORKSPACE</p>
        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              type="button"
              key={name}
              className={`nav-button ${tab === name ? "selected" : ""}`}
              onClick={() => setTab(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Incidents" && incidents.length > 0 && (
                <span className="count">{incidents.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <ShieldCheck size={18} />
          <div>
            <b>Privacy first</b>
            <small>Local camera processing</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">EXAM INTEGRITY PLATFORM</p>
            <h1>{tab === "Overview" ? "Monitoring overview" : tab}</h1>
          </div>
          <div className="connection">
            <span className={`dot ${health ? "green" : "red"}`} />
            {health ? "API Connected" : "API Offline"}
            <button
              type="button"
              className="icon-button"
              onClick={refresh}
              title="Refresh dashboard"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>

        {notice && (
          <div className="notice" role="status">{notice}</div>
        )}

        <section className="metrics">
          <Metric
            icon={Activity}
            title="SYSTEM STATUS"
            value={health ? "Operational" : "Offline"}
            detail={health ? "Backend responding" : "Start backend"}
          />
          <Metric
            icon={Camera}
            title="CAMERA"
            value={camera ? "Connected" : "Not detected"}
            detail={camera ? "Camera feed available" : "Check webcam"}
          />
          <Metric
            icon={Eye}
            title="MONITORING"
            value={active ? "Active" : "Standby"}
            detail={active ? "Monitoring is running" : "Ready to start"}
          />
          <Metric
            icon={AlertTriangle}
            title="INCIDENTS"
            value={incidents.length}
            detail="Recorded events"
          />
        </section>

        {tab === "Overview" && (
          <>
            <section className="panel">
              <div className="hero-copy">
                <p className="eyebrow">AI-ASSISTED EXAM MONITORING</p>
                <h2>Ready to secure your exam?</h2>
                <p className="muted">
                  Face-presence checks, multiple-face alerts and optional
                  phone detection when its model is available.
                </p>
              </div>

              <div className="camera-frame">
                {health ? (
                  <img
                    src={`${API}/api/camera`}
                    alt="Live webcam feed"
                  />
                ) : (
                  <div className="camera-placeholder">
                    <Camera size={38} />
                    <b>Waiting for backend</b>
                    <span>Start the backend first.</span>
                  </div>
                )}
                <span className="live-label">
                  <span className={`dot ${camera ? "green" : "red"}`} />
                  {camera ? "CAMERA LIVE" : "CAMERA UNAVAILABLE"}
                </span>
              </div>

              <div className="camera-info">
                <span>
                  <span className={`dot ${camera ? "green" : "red"}`} />
                  {camera ? "Camera signal detected" : "Camera unavailable"}
                </span>
                <span><Wifi size={15} /> Local processing</span>
              </div>

              <div className="controls">
                <div>
                  <b>{active ? "Monitoring is running" : "Monitoring is stopped"}</b>
                  <p className="muted">
                    Phone model: {String(phoneStatus)}
                  </p>
                </div>

                {!active ? (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || !health}
                    onClick={() =>
                      post("/api/monitoring/start", "Monitoring started.")
                    }
                  >
                    <Play size={16} /> {busy ? "Please wait..." : "Start Monitoring"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="stop"
                    disabled={busy || !health}
                    onClick={() =>
                      post("/api/monitoring/stop", "Monitoring stopped.")
                    }
                  >
                    <Square size={15} /> {busy ? "Please wait..." : "Stop Monitoring"}
                  </button>
                )}
              </div>
            </section>

            <IncidentPanel
              incidents={incidents.slice(0, 5)}
              busy={busy}
              health={health}
              onClear={() => post("/api/incidents/clear", "Incident log cleared.")}
              onViewAll={() => setTab("Incidents")}
              showViewAll={incidents.length > 5}
            />
          </>
        )}

        {tab === "Incidents" && (
          <IncidentPanel
            incidents={incidents}
            busy={busy}
            health={health}
            onClear={() => post("/api/incidents/clear", "Incident log cleared.")}
          />
        )}

        {tab === "Reports" && (
          <section className="panel">
            <SectionTitle eyebrow="REPORT CENTER" title="Incident reports" />
            <p className="muted">
              Export recorded events for review. Reports contain detected
              events, not a definitive finding of cheating.
            </p>
            <div className="report-summary">
              <Metric
                icon={FileText}
                title="TOTAL EVENTS"
                value={incidents.length}
                detail="Currently in memory"
              />
              <Metric
                icon={AlertTriangle}
                title="ALERT EVENTS"
                value={incidents.filter((item) => item.severity === "alert").length}
                detail="Marked as alerts"
              />
            </div>
            <button
              type="button"
              className="primary"
              onClick={exportCSV}
              disabled={incidents.length === 0}
            >
              <Download size={17} /> Export CSV Report
            </button>
            <IncidentPanel
              incidents={incidents}
              busy={busy}
              health={health}
              onClear={() => post("/api/incidents/clear", "Incident log cleared.")}
            />
          </section>
        )}

        {tab === "Exam Session" && (
          <section className="panel">
            <SectionTitle eyebrow="SESSION MANAGEMENT" title="Exam session" />
            <ExamSession />
          </section>
        )}

        {tab === "Hardware" && (
          <section className="panel">
            <SectionTitle eyebrow="DEVICE CONNECTIONS" title="Hardware control" />

            <div className="hardware-connection-status">
              <span className={`dot ${hardwareInfo.connected ? "green" : "red"}`} />
              <b>{hardwareInfo.connected ? "ESP32 Connected" : "ESP32 Disconnected"}</b>
              <p className="muted">
                {hardwareInfo.message || "Waiting for hardware status."}
              </p>
              {hardwareInfo.device && (
                <p className="muted">Serial port: {hardwareInfo.device}</p>
              )}
            </div>

            <p className="muted">
              Connect the ESP32 using USB and upload the warning sketch before
              testing the buzzer and LED. These controls send commands to the
              backend; they do not simulate a physical connection.
            </p>

            <div className="controls hardware-controls">
              <button
                type="button"
                className="primary"
                disabled={busy || !health}
                onClick={() =>
                  hardwareAction("/api/hardware/connect", "Hardware connection requested.")
                }
              >
                <Wifi size={16} /> {busy ? "Please wait..." : "Connect ESP32"}
              </button>

              <button
                type="button"
                className="primary"
                disabled={busy || !hardwareInfo.connected}
                onClick={() =>
                  hardwareAction("/api/hardware/alert/on", "Alert ON command sent.")
                }
              >
                <AlertTriangle size={16} /> Test Alert ON
              </button>

              <button
                type="button"
                className="stop"
                disabled={busy || !hardwareInfo.connected}
                onClick={() =>
                  hardwareAction("/api/hardware/alert/off", "Alert OFF command sent.")
                }
              >
                <Square size={15} /> Test Alert OFF
              </button>

              <button
                type="button"
                className="clear-button"
                disabled={busy || !hardwareInfo.connected}
                onClick={() =>
                  hardwareAction("/api/hardware/disconnect", "Hardware disconnected.")
                }
              >
                <WifiOff size={16} /> Disconnect
              </button>
            </div>

            <div className="hardware-list">
              {(hardware.length ? hardware : [
                { name: "ESP32", status: "Not connected" },
                { name: "Buzzer", status: "Not connected" },
                { name: "Warning LED", status: "Not connected" },
              ]).map((item) => (
                <div className="hardware-row" key={item.name}>
                  <Cpu size={20} />
                  <b>{item.name}</b>
                  <span>{item.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer>
          <span><ShieldCheck size={14} /> FairExam AI</span>
          <span>Prototype · Review alerts manually</span>
        </footer>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, title, value, detail }) {
  return (
    <div className="metric">
      <div className="metric-icon"><Icon size={20} /></div>
      <small>{title}</small>
      <h2>{value}</h2>
      <p>{detail}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
    </div>
  );
}

function IncidentPanel({
  incidents, busy, health, onClear, onViewAll, showViewAll = false
}) {
  return (
    <section className="panel">
      <div className="section-header">
        <SectionTitle eyebrow="EVENT TIMELINE" title="Incident log" />
        <button
          type="button"
          className="clear-button"
          disabled={busy || !health || incidents.length === 0}
          onClick={onClear}
          title="Clear incidents"
        >
          <Trash2 size={17} /> Clear
        </button>
      </div>

      {incidents.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={30} />
          <b>No incidents recorded</b>
          <p>Start monitoring to see events here.</p>
        </div>
      ) : (
        <div className="incident-list">
          {incidents.map((item, index) => (
            <div className="incident" key={item.id ?? index}>
              <div className={`incident-symbol ${item.severity || "warning"}`}>
                <AlertTriangle size={17} />
              </div>
              <div className="incident-text">
                <b>{item.message || item.type || "Event detected"}</b>
                <small>{String(item.type || "event").replaceAll("_", " ")}</small>
              </div>
              <time>{item.time || ""}</time>
            </div>
          ))}
        </div>
      )}

      {showViewAll && onViewAll && (
        <button type="button" className="view-all" onClick={onViewAll}>
          View all incidents →
        </button>
      )}
    </section>
  );
}
