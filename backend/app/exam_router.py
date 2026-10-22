from fastapi import APIRouter
from pydantic import BaseModel

from app.exam_session import start_session, get_session, end_session

router = APIRouter(prefix="/api/exam", tags=["Exam Session"])

class StartExamRequest(BaseModel):
    student_name: str = "Student"
    exam_name: str = "General Exam"

@router.post("/start")
def start_exam(data: StartExamRequest):
    return start_session(data.student_name, data.exam_name)

@router.get("/session")
def exam_status():
    return get_session()

@router.post("/end")
def finish_exam():
    return end_session()
