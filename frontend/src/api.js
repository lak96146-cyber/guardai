
const API = "http://127.0.0.1:8001";

export async function getHealth() {
  const response = await fetch(`${API}/api/health`);
  if (!response.ok) throw new Error("Backend unavailable");
  return response.json();
}

export async function getIncidents() {
  const response = await fetch(`${API}/api/incidents`);
  if (!response.ok) throw new Error("Could not load incidents");
  return response.json();
}

export async function getMonitoringStatus() {
  const response = await fetch(`${API}/api/monitoring/status`);
  if (!response.ok) throw new Error("Could not load monitoring status");
  return response.json();
}

export async function startMonitoring() {
  const response = await fetch(`${API}/api/monitoring/start`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Could not start monitoring");
  return response.json();
}

export async function stopMonitoring() {
  const response = await fetch(`${API}/api/monitoring/stop`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Could not stop monitoring");
  return response.json();
}

export async function clearIncidents() {
  const response = await fetch(`${API}/api/incidents/clear`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Could not clear incidents");
  return response.json();
}
