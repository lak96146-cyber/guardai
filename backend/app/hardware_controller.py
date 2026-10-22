
import os
import threading

try:
    import serial
    from serial.tools import list_ports
except ImportError:
    serial = None
    list_ports = None

_lock = threading.Lock()
_connection = None
_last_message = "Hardware not connected"


def get_hardware_status():
    with _lock:
        connected = _connection is not None and _connection.is_open

        return {
            "connected": connected,
            "device": os.getenv("ESP32_PORT", ""),
            "status": "connected" if connected else "disconnected",
            "message": _last_message,
        }


def connect_hardware():
    global _connection, _last_message

    if serial is None:
        _last_message = "pyserial is not installed"
        return get_hardware_status()

    port = os.getenv("ESP32_PORT", "").strip()

    if not port:
        ports = list(list_ports.comports()) if list_ports else []
        _last_message = (
            "Set ESP32_PORT to the board's serial port. "
            f"Detected ports: {', '.join(p.device for p in ports) or 'none'}"
        )
        return get_hardware_status()

    with _lock:
        try:
            if _connection is not None and _connection.is_open:
                _connection.close()

            _connection = serial.Serial(port, 115200, timeout=1)
            _last_message = f"Connected to {port}"
        except Exception as exc:
            _connection = None
            _last_message = f"Connection failed: {exc}"

    return get_hardware_status()


def send_hardware_command(command: str):
    global _last_message

    if command not in ("ALERT_ON", "ALERT_OFF", "STATUS"):
        return {"success": False, "message": "Invalid hardware command"}

    with _lock:
        if _connection is None or not _connection.is_open:
            return {
                "success": False,
                "message": "ESP32 is not connected",
            }

        try:
            _connection.write((command + "\n").encode("utf-8"))
            _last_message = f"Command sent: {command}"
            return {"success": True, "message": _last_message}
        except Exception as exc:
            _last_message = f"Command failed: {exc}"
            return {"success": False, "message": _last_message}


def disconnect_hardware():
    global _connection, _last_message

    with _lock:
        try:
            if _connection is not None and _connection.is_open:
                _connection.close()
        finally:
            _connection = None
            _last_message = "Hardware disconnected"

    return get_hardware_status()
