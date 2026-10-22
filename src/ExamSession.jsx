import { useCallback, useEffect, useState } from "react";

const API = "http://127.0.0.1:8001";

function getActiveStatus(data) {
  if (!data || typeof data !== "object") return false;

  const status = String(data.status || "").toLowerCase();

  if (
    data.active === true ||
    data.running === true ||
    data.is_active === true ||
    ["active", "running", "started"].includes(status)
  ) return true;

  if (
    data.active === false ||
    data.running === false ||
    data.is_active === false ||
    ["inactive", "ended", "stopped", "completed", "not_running"].includes(status)
  ) return false;

  if (data.session && typeof data.session === "object") {
    return getActiveStatus(data.session);
  }

  return false;
}

async function readResponse(response) {
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }

  if (!response.ok) {
    throw new Error(data.detail || `Request failed (${response.status})`);
  }

  return data;
}

export default function ExamSession() {
  const [studentName, setStudentName] = useState("");
  const [examName, setExamName] = useState("");
  const [session, setSession] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/exam/session`);
      const data = await readResponse(response);
      setSession(data);
      setIsRunning(getActiveStatus(data));
    } catch (error) {
      setMessage(`Session status unavailable: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  async function startExam(event) {
    event.preventDefault();
    if (busy || isRunning) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/api/exam/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: studentName.trim() || "Student",
          exam_name: examName.trim() || "General Exam",
        }),
      });

      const data = await readResponse(response);
      setSession(data);
      setIsRunning(true);
      setMessage("Exam session started successfully.");
      await refreshSession();
    } catch (error) {
      setMessage(`Could not start exam: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function endExam() {
    if (busy || !isRunning) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/api/exam/end`, {
        method: "POST",
      });

      const data = await readResponse(response);
      setSession(data);
      setIsRunning(false);
      setMessage("Exam session ended successfully.");
      await refreshSession();
    } catch (error) {
      setMessage(`Could not end exam: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={s.panel}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Exam Session</h2>
          <p style={s.muted}>Manage the monitored examination</p>
        </div>

        <span style={{
          ...s.badge,
          color: isRunning ? "#4ade80" : "#fbbf24",
          borderColor: isRunning ? "#166534" : "#92400e",
        }}>
          {isRunning ? "● Exam Active" : "● No Active Exam"}
        </span>
      </div>

      <form onSubmit={startExam} style={s.form}>
        <label style={s.label}>
          Student name
          <input
            style={s.input}
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter student name"
            disabled={busy || isRunning}
          />
        </label>

        <label style={s.label}>
          Exam name
          <input
            style={s.input}
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder="Enter exam name"
            disabled={busy || isRunning}
          />
        </label>

        <button
          type="submit"
          disabled={busy || isRunning}
          style={{
            ...s.button,
            background: busy || isRunning ? "#475569" : "#2563eb",
          }}
        >
          {busy ? "Please wait..." : "Start Exam"}
        </button>

        <button
          type="button"
          onClick={endExam}
          disabled={busy || !isRunning}
          style={{
            ...s.button,
            background: busy || !isRunning ? "#475569" : "#dc2626",
          }}
        >
          {busy ? "Please wait..." : "End Exam"}
        </button>
      </form>

      <div style={s.details}>
        <strong>Session details</strong>
        <p>Student: {session?.student_name || studentName || "—"}</p>
        <p>Exam: {session?.exam_name || examName || "—"}</p>
        <p>Status: {isRunning ? "Active" : "Inactive"}</p>
        <button type="button" onClick={refreshSession} disabled={busy} style={s.refresh}>
          Refresh status
        </button>
      </div>

      {message && (
        <p role="status" style={s.message}>{message}</p>
      )}
    </section>
  );
}

const s = {
  panel: {
    margin: "24px",
    padding: 24,
    borderRadius: 16,
    border: "1px solid #293548",
    background: "#111827",
    color: "#f9fafb",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  title: { margin: 0, fontSize: 22 },
  muted: { color: "#9ca3af", marginTop: 8 },
  badge: {
    border: "1px solid",
    borderRadius: 20,
    padding: "7px 12px",
    fontSize: 13,
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginTop: 22,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 13,
    color: "#cbd5e1",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 11,
    borderRadius: 8,
    border: "1px solid #475569",
    background: "#0f172a",
    color: "white",
  },
  button: {
    alignSelf: "end",
    padding: 12,
    border: 0,
    borderRadius: 8,
    color: "white",
    cursor: "pointer",
  },
  details: {
    marginTop: 20,
    padding: 16,
    background: "#1e293b",
    borderRadius: 10,
  },
  refresh: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #475569",
    background: "transparent",
    color: "white",
    cursor: "pointer",
  },
  message: { marginTop: 16, color: "#93c5fd" },
};
