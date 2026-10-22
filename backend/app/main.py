
import cv2
import threading
import time
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.exam_router import router as exam_router
from app.hardware_controller import (
    get_hardware_status,
    connect_hardware,
    send_hardware_command,
    disconnect_hardware,
)

# Optional YOLO phone detector.
# If the package/model is unavailable, other features still work.
phone_model = None
PHONE_MODEL_STATUS = "unavailable"

try:
    from ultralytics import YOLO

    phone_model = YOLO("yolov8n.pt")
    PHONE_MODEL_STATUS = "loaded"
except Exception as exc:
    PHONE_MODEL_STATUS = f"unavailable: {type(exc).__name__}"


app = FastAPI(title="FairExam AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

lock = threading.Lock()

camera = None
camera_ok = False
latest_frame = None
monitoring = False

incidents = []
event_times = {}
event_id = 1

# Head movement tracking state
previous_face_center = None
last_head_alert = 0.0

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades
    + "haarcascade_frontalface_default.xml"
)


def add_incident(kind, message, severity="warning"):
    global event_id

    now = time.time()

    if now - event_times.get(kind, 0) < 8:
        return

    event_times[kind] = now

    item = {
        "id": event_id,
        "type": kind,
        "message": message,
        "severity": severity,
        "time": datetime.now().strftime("%H:%M:%S"),
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    }

    event_id += 1

    with lock:
        incidents.insert(0, item)
        del incidents[200:]


def open_camera():
    global camera, camera_ok

    if camera is not None and camera.isOpened():
        return True

    for index in (0, 1, 2):
        cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)

        if cap.isOpened():
            camera = cap
            camera_ok = True
            return True

        cap.release()

    camera = None
    camera_ok = False
    return False


def camera_worker():
    global camera_ok, latest_frame
    global previous_face_center, last_head_alert

    frame_number = 0
    last_phone_boxes = []

    while True:
        if camera is None or not camera.isOpened():
            if not open_camera():
                time.sleep(1)
                continue

        ok, frame = camera.read()

        if not ok:
            camera_ok = False
            time.sleep(0.3)
            continue

        camera_ok = True
        frame_number += 1
        display = frame.copy()

        face_count = 0
        phone_count = 0

        if monitoring:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.15,
                minNeighbors=5,
                minSize=(45, 45),
            )

            face_count = len(faces)

            for (x, y, w, h) in faces:
                cv2.rectangle(
                    display,
                    (x, y),
                    (x + w, y + h),
                    (70, 230, 150),
                    2,
                )

            # Face presence and multiple-person alerts
            if face_count == 0:
                add_incident(
                    "face_missing",
                    "Candidate face not detected.",
                    "warning",
                )
                previous_face_center = None

            elif face_count > 1:
                add_incident(
                    "multiple_faces",
                    f"{face_count} faces detected. Please verify.",
                    "alert",
                )
                previous_face_center = None

            else:
                # Approximate head movement using face-box center.
                # This does not identify eye gaze or prove misconduct.
                x, y, w, h = faces[0]
                current_center = (x + w // 2, y + h // 2)

                if previous_face_center is not None:
                    dx = abs(
                        current_center[0] - previous_face_center[0]
                    )
                    dy = abs(
                        current_center[1] - previous_face_center[1]
                    )

                    if (
                        (dx > 65 or dy > 65)
                        and time.time() - last_head_alert > 8
                    ):
                        add_incident(
                            "head_movement",
                            "Significant head-position movement detected; review manually.",
                            "warning",
                        )
                        last_head_alert = time.time()

                previous_face_center = current_center

            # Run phone detection periodically to reduce CPU usage.
            if phone_model is not None and frame_number % 8 == 0:
                try:
                    results = phone_model.predict(
                        frame,
                        imgsz=416,
                        conf=0.45,
                        classes=[67],
                        verbose=False,
                    )

                    detected_boxes = []

                    for result in results:
                        for box in result.boxes:
                            x1, y1, x2, y2 = map(
                                int, box.xyxy[0].tolist()
                            )
                            detected_boxes.append(
                                (x1, y1, x2, y2)
                            )

                    last_phone_boxes = detected_boxes

                except Exception:
                    # Keep the rest of the monitoring system running.
                    last_phone_boxes = []

            for x1, y1, x2, y2 in last_phone_boxes:
                phone_count += 1

                cv2.rectangle(
                    display,
                    (x1, y1),
                    (x2, y2),
                    (0, 70, 255),
                    2,
                )

                cv2.putText(
                    display,
                    "Possible phone",
                    (x1, max(20, y1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 70, 255),
                    2,
                )

            if phone_count:
                add_incident(
                    "phone_detected",
                    "Possible mobile phone detected in camera view.",
                    "alert",
                )

            label = (
                f"MONITORING ON | Faces: {face_count} "
                f"| Phones: {phone_count}"
            )

        else:
            previous_face_center = None
            last_phone_boxes = []
            label = "FAIREXAM AI | CAMERA READY"

        cv2.putText(
            display,
            label,
            (15, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (70, 230, 150),
            2,
        )

        encoded, buffer = cv2.imencode(".jpg", display)

        if encoded:
            with lock:
                latest_frame = buffer.tobytes()

        time.sleep(0.04)


@app.on_event("startup")
def startup():
    threading.Thread(
        target=camera_worker,
        daemon=True,
    ).start()


@app.get("/")
def root():
    return {
        "status": "online",
        "app": "FairExam AI",
    }


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "phone_detection": PHONE_MODEL_STATUS,
    }


@app.get("/api/camera/status")
def camera_status():
    return {
        "available": camera_ok,
        "message": (
            "Camera connected"
            if camera_ok
            else "Camera not detected"
        ),
    }


@app.get("/api/monitoring/status")
def monitoring_status():
    return {
        "active": monitoring,
        "status": "Monitoring" if monitoring else "Standby",
        "phone_detection": PHONE_MODEL_STATUS,
    }


@app.post("/api/monitoring/start")
def start_monitoring():
    global monitoring

    monitoring = True

    add_incident(
        "session_started",
        "Monitoring session started.",
        "info",
    )

    return {
        "ok": True,
        "active": True,
    }


@app.post("/api/monitoring/stop")
def stop_monitoring():
    global monitoring, previous_face_center

    monitoring = False
    previous_face_center = None

    add_incident(
        "session_stopped",
        "Monitoring session stopped.",
        "info",
    )

    return {
        "ok": True,
        "active": False,
    }


@app.get("/api/incidents")
def get_incidents():
    with lock:
        return {
            "incidents": list(incidents),
            "count": len(incidents),
        }


@app.post("/api/incidents/clear")
def clear_incidents():
    global event_times

    with lock:
        incidents.clear()

    event_times.clear()

    return {"ok": True}


@app.get("/api/camera")
def camera_stream():
    def generate():
        while True:
            with lock:
                frame = latest_frame

            if frame:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + frame
                    + b"\r\n"
                )

            time.sleep(0.06)

    return StreamingResponse(
        generate(),
        media_type=(
            "multipart/x-mixed-replace; boundary=frame"
        ),
    )


@app.get("/api/hardware/status")
def hardware_status():
    status = get_hardware_status()
    connected = status["connected"]

    return {
        **status,
        "components": [
            {
                "name": "ESP32",
                "status": "Connected" if connected else "Not connected",
            },
            {
                "name": "Buzzer",
                "status": "Command interface ready" if connected else "Not connected",
            },
            {
                "name": "Warning LED",
                "status": "Command interface ready" if connected else "Not connected",
            },
        ],
    }


@app.post("/api/hardware/connect")
def hardware_connect():
    return connect_hardware()


@app.post("/api/hardware/alert/on")
def hardware_alert_on():
    return send_hardware_command("ALERT_ON")


@app.post("/api/hardware/alert/off")
def hardware_alert_off():
    return send_hardware_command("ALERT_OFF")


@app.post("/api/hardware/disconnect")
def hardware_disconnect():
    return disconnect_hardware()


app.include_router(exam_router)
