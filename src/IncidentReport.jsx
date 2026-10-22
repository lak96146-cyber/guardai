
import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertTriangle, Camera, CheckCircle2, Cpu,
  Eye, LayoutDashboard, Play, ShieldCheck, Square,
  Trash2, Wifi
} from "lucide-react";
import "./App.css";
import ExamSession from "./ExamSession";
import IncidentReport from "./IncidentReport";

const API = "http://127.0.0.1:8001";

export default function App() {
  const [health, setHealth] = useState(false);
  const [camera, setCamera] = useState(false);
  const [active, setActive] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [hardware, setHardware] = useState([]);
  const [tab, setTab] = useState("Overview");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

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

      if (responses.some((r) => !r.ok)) {
        throw new Error("API error");
      }

      const [h, c, m, i, hw] = await Promise.all(
        responses.map((r) => r.json())
      );

      setHealth(h.status === "online");
      setCamera(Boolean(c.available));
      setActive(Boolean(m.active));
      setIncidents(Array.isArray(i) ? i : i.incidents || []);
      setHardware(hw.components || []);
    } catch {
      setHealth(false);
      setCamera(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function post(path, message) {
    setBusy(true);
    try {
      const response = await fetch(API + path, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Request failed");

      setNotice(message);
      await refresh();
    } catch {
      setNotice("Backend offline or request failed.");
    } finally {
      setBusy(false);
      setTimeout(() => setNotice(""), 3500);
    }
  }

  const navigation = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Incidents", icon: AlertTriangle },
    { name: "Hardware", icon: Cpu },
    { name: "Reports", icon: Activity },
  ];

  const shownIncidents =
    tab === "Incidents" ? incidents : incidents.slice(0, 5);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h2>FairExam <span>AI</span></h2>
            <small>SMART PROCTORING</small>
          </div>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-button ${tab === name ? "selected" : ""}`}
              onClick={() => setTab(name)}
            >
              <Icon size={18} />
              {name}
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
        {tab !== "Reports" && (
          <div style={{ padding: "0 24px" }}>
            <ExamSession />
          </div>
        )}

        <header className="topbar">
          <div>
            <p className="eyebrow">EXAM INTEGRITY PLATFORM</p>
            <h1>
              {tab === "Overview" ? "Monitoring overview" : tab}
            </h1>
          </div>
          <div className="connection">
            <span className={`dot ${health ? "green" : "red"}`} />
            {health ? "API Connected" : "API Offline"}
            <div className="avatar">LK</div>
          </div>
        </header>

        {notice && <div className="notice">{notice}</div>}

        {tab === "Reports" ? (
          <div style={{ padding: "0 24px" }}>
            <IncidentReport />
          </div>
        ) : (
          <>
            <section className="metrics">
              <Metric
                icon={Activity}
                title="SYSTEM STATUS"
                value={health ? "Operational" : "Offline"}
                detail={health ? "Backend responding" : "Check backend"}
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
                detail={active ? "Face checks enabled" : "Ready to start"}
              />
              <Metric
                icon={AlertTriangle}
                title="INCIDENTS"
                value={incidents.length}
                detail="Recorded events"
              />
            </section>

            {tab === "Hardware" ? (
              <section className="panel">
                <SectionTitle
                  eyebrow="DEVICE CONNECTIONS"
                  title="Hardware status"
                />
                <p className="muted">
                  Hardware integration can be connected after software
                  testing. ESP32, buzzer and LED are optional.
                </p>
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
            ) : (
              <>
                {tab === "Overview" && (
                  <section className="panel">
                    <SectionTitle
                      eyebrow="LIVE ANALYSIS"
                      title="Candidate camera"
                    />

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
                          <span>Start the backend terminal first.</span>
                        </div>
                      )}

                      <span className="live-label">
                        <span className="dot red" /> LIVE
                      </span>

                      {health && !camera && (
                        <div className="camera-warning">
                          Webcam not detected. Connect it and close other
                          camera apps.
                        </div>
                      )}
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
                        <b>
                          {active
                            ? "Monitoring session is running"
                            : "Ready to start monitoring"}
                        </b>
                        <p className="muted">
                          Checks face presence and multiple faces in the frame.
                        </p>
                      </div>

                      {!active ? (
                        <button
                          className="primary"
                          disabled={busy || !health}
                          onClick={() =>
                            post("/api/monitoring/start", "Monitoring started.")
                          }
                        >
                          <Play size={16} /> Start monitoring
                        </button>
                      ) : (
                        <button
                          className="stop"
                          disabled={busy}
                          onClick={() =>
                            post("/api/monitoring/stop", "Monitoring stopped.")
                          }
                        >
                          <Square size={15} /> Stop monitoring
                        </button>
                      )}
                    </div>
                  </section>
                )}

                <section className="panel">
                  <div className="section-header">
                    <SectionTitle
                      eyebrow="EVENT TIMELINE"
                      title={
                        tab === "Incidents"
                          ? "All incidents"
                          : "Recent incidents"
                      }
                    />
                    <button
                      className="clear-button"
                      disabled={busy || !health}
                      onClick={() =>
                        post("/api/incidents/clear", "Incident log cleared.")
                      }
                      title="Clear incidents"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  {shownIncidents.length === 0 ? (
                    <div className="empty-state">
                      <CheckCircle2 size={30} />
                      <b>No incidents recorded</b>
                      <p>Start monitoring to see session events here.</p>
                    </div>
                  ) : (
                    <div className="incident-list">
                      {shownIncidents.map((item, index) => (
                        <div className="incident" key={item.id ?? index}>
                          <div
                            className={`incident-symbol ${item.severity || "warning"}`}
                          >
                            <AlertTriangle size={17} />
                          </div>
                          <div className="incident-text">
                            <b>{item.message || item.type || "Incident"}</b>
                            <small>
                              {(item.type || "event").replaceAll("_", " ")}
                            </small>
                          </div>
                          <time>{item.time || item.timestamp || ""}</time>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === "Overview" && incidents.length > 5 && (
                    <button
                      className="view-all"
                      onClick={() => setTab("Incidents")}
                    >
                      View all incidents →
                    </button>
                  )}
                </section>
              </>
            )}
          </>
        )}

        <footer>
          <span><ShieldCheck size={14} /> FairExam AI</span>
          <span>Prototype · Face-presence monitoring</span>
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
