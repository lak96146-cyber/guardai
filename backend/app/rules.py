
from collections import deque
from datetime import datetime, timezone
from threading import Lock

events = deque(maxlen=500)
lock = Lock()
last_seen = {}
COOLDOWN = 5


def add_incident(kind, message, severity="warning"):
    now = datetime.now(timezone.utc)

    with lock:
        previous = last_seen.get(kind)
        if previous and (now - previous).total_seconds() < COOLDOWN:
            return None

        last_seen[kind] = now
        event = {
            "id": f"{kind}-{int(now.timestamp() * 1000)}",
            "type": kind,
            "message": message,
            "severity": severity,
            "timestamp": now.isoformat(),
        }
        events.appendleft(event)
        return event


def list_incidents():
    with lock:
        return list(events)


def clear_all():
    with lock:
        events.clear()
        last_seen.clear()
