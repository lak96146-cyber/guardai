from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

_lock = Lock()
_session = None

def start_session(student_name: str, exam_name: str):
    global _session
    with _lock:
        if _session and _session["status"] == "running":
            return dict(_session)
        _session = {
            "id": str(uuid4()),
            "student_name": student_name.strip() or "Student",
            "exam_name": exam_name.strip() or "General Exam",
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "ended_at": None,
        }
        return dict(_session)

def get_session():
    with _lock:
        return dict(_session) if _session else {
            "status": "not_started",
            "session": None,
        }

def end_session():
    global _session
    with _lock:
        if not _session or _session["status"] != "running":
            return {"status": "not_started", "message": "No active exam session"}
        _session["status"] = "completed"
        _session["ended_at"] = datetime.now(timezone.utc).isoformat()
        return dict(_session)
