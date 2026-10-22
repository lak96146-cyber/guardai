const API = "http://127.0.0.1:8001";

export async function getHealth() {
  const r = await fetch(`${API}/api/health`);
  if (!r.ok) throw new Error("Backend unavailable");
  return r.json();
}

export async function getIncidents() {
  const r = await fetch(`${API}/api/incidents`);
  if (!r.ok) throw new Error("Could not load incidents");
  return r.json();
}

export async function getMonitoringStatus() {
  const r = await fetch(`${API}/api/monitoring/status`);
  if (!r.ok) throw new Error("Could not load monitoring status");
  return r.json();
}

export async function startMonitoring() {
  const r = await fetch(`${API}/api/monitoring/start`, { method: "POST" });
  if (!r.ok) throw new Error("Could not start monitoring");
  return r.json();
}

export async function stopMonitoring() {
  const r = await fetch(`${API}/api/monitoring/stop`, { method: "POST" });
  if (!r.ok) throw new Error("Could not stop monitoring");
  return r.json();
}

export async function clearIncidents() {
  const r = await fetch(`${API}/api/incidents/clear`, { method: "POST" });
  if (!r.ok) throw new Error("Could not clear incidents");
  return r.json();
}
