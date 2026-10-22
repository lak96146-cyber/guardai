
import os
import threading

import serial
from serial.tools import list_ports

_connection = None
_lock = threading.Lock()


def get_ports():
    return [
        {"port": p.device, "description": p.description}
        for p in list_ports.comports()
    ]


def connect(port=None):
    global _connection
    port = port or os.getenv("ESP32_PORT")

    if not port:
        return {"connected": False, "ports": get_ports()}

    with _lock:
        try:
            if _connection and _connection.is_open:
                _connection.close()

            _connection = serial.Serial(port, 115200, timeout=1)
            return {"connected": True, "port": port}
        except (serial.SerialException, OSError) as exc:
            _connection = None
            return {"connected": False, "error": str(exc)}


def command(value):
    if value not in ("ALERT", "CLEAR"):
        return False

    with _lock:
        if _connection is None or not _connection.is_open:
            return False
        try:
            _connection.write((value + "\n").encode())
            return True
        except (serial.SerialException, OSError):
            return False


def status():
    return {
        "connected": bool(_connection and _connection.is_open),
        "ports": get_ports(),
    }
