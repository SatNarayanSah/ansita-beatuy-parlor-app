from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Course, Enrollment, Staff, User
from ..schemas import ActiveInput, BatchInput, BatchUpdate, CourseInput, CourseUpdate
from ..security import get_current_user, require_admin
from ..serializers import apply, changes, to_dict, to_list
from ..utils import generate_id, is_valid_iso_date, is_valid_time

router = APIRouter(prefix="/courses", tags=["courses"])

# Enrollments that occupy a seat in their batch.
SEAT_HOLDING_STATUSES = ("pending", "active", "completed")
LIVE_STATUSES = ("pending", "active")


def get_course(db: Session, id_: str, *, lock: bool = False) -> Course:
    return ensure_found(db.get(Course, id_, with_for_update=lock), "Course")


def find_batch(course: Course, batch_id: str) -> dict | None:
    return next((batch for batch in course.batches if batch.get("id") == batch_id), None)


def seats_taken(db: Session, batch_id: str) -> int:
    stmt = select(func.count()).select_from(Enrollment).where(
        Enrollment.batch_id == batch_id, Enrollment.status.in_(SEAT_HOLDING_STATUSES))
    return db.scalar(stmt) or 0


def _with_module_ids(modules: list[dict]) -> list[dict]:
    return [{**module, "id": module.get("id") or generate_id("mod")} for module in modules]


def _assert_instructor(db: Session, staff_id: str) -> None:
    ensure_found(db.get(Staff, staff_id), "Instructor")


def _validate_batch(batch: dict) -> None:
    if not is_valid_iso_date(batch["startDate"]) or not is_valid_iso_date(batch["endDate"]):
        raise ApiError("VALIDATION", "Choose valid batch dates.")
    if not is_valid_time(batch["startTime"]) or not is_valid_time(batch["endTime"]):
        raise ApiError("VALIDATION", "Choose valid class times.")
    if batch["endDate"] < batch["startDate"]:
        raise ApiError("VALIDATION", "Batch end date must be on or after the start date.")
    if batch["endTime"] <= batch["startTime"]:
        raise ApiError("VALIDATION", "Class end time must be after the start time.")
    if not batch["days"]:
        raise ApiError("VALIDATION", "Select at least one class day.")
    if batch["seats"] < 1:
        raise ApiError("VALIDATION", "A batch needs at least one seat.")


@router.get("")
def list_courses(query: str = "", active_only: bool = Query(False, alias="activeOnly"),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Customers only ever see active courses."""
    stmt = select(Course)
    if user.role == "customer" or active_only:
        stmt = stmt.where(Course.is_active.is_(True))
    if query.strip():
        needle = f"%{query.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Course.title).like(needle), func.lower(Course.description).like(needle)))
    return to_list(list(db.scalars(stmt.order_by(Course.title))))


@router.get("/{id_}")
def get_course_route(id_: str, db: Session = Depends(get_db)):
    return to_dict(get_course(db, id_))


@router.get("/{id_}/batches/availability")
def batch_availability(id_: str, db: Session = Depends(get_db)):
    course = get_course(db, id_)
    result = []
    for batch in course.batches:
        taken = seats_taken(db, batch["id"])
        left = max(0, batch["seats"] - taken)
        result.append({
            "batch": batch,
            "seatsTaken": taken,
            "seatsLeft": left,
            "isFull": left == 0,
            "isOpen": batch["status"] != "completed" and left > 0,
        })
    return result


@router.post("", status_code=201)
def create_course(body: CourseInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    _assert_instructor(db, body.instructor)
    values = {**body.model_dump(), **changes(body)}
    values["title"] = body.title.strip()
    values["syllabus"] = _with_module_ids([module.model_dump(by_alias=True) for module in body.syllabus])
    course = Course(id=generate_id("crs"), batches=[], **values)
    db.add(course)
    db.commit()
    return to_dict(course)


@router.patch("/{id_}")
def update_course(id_: str, body: CourseUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = get_course(db, id_)
    values = {k: v for k, v in changes(body).items() if v is not None or k == "image"}
    if "instructor" in values:
        _assert_instructor(db, values["instructor"])
    if "syllabus" in values:
        values["syllabus"] = _with_module_ids(values["syllabus"])
    if "title" in values:
        values["title"] = values["title"].strip()
    apply(course, values)
    db.commit()
    return to_dict(course)


@router.post("/{id_}/active")
def set_course_active(id_: str, body: ActiveInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = get_course(db, id_)
    course.is_active = body.is_active
    db.commit()
    return to_dict(course)


@router.delete("/{id_}", status_code=204)
def delete_course(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = get_course(db, id_)
    live = select(Enrollment.id).where(Enrollment.course_id == id_, Enrollment.status.in_(LIVE_STATUSES))
    if db.scalar(live.limit(1)):
        raise ApiError("CONFLICT", "This course has active students. Deactivate it instead.")
    for enrollment in db.scalars(select(Enrollment).where(Enrollment.course_id == id_)):
        db.delete(enrollment)
    db.delete(course)
    db.commit()
    return Response(status_code=204)


@router.post("/{id_}/batches", status_code=201)
def add_batch(id_: str, body: BatchInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = get_course(db, id_, lock=True)
    batch = {"id": generate_id("bat"), **body.model_dump(by_alias=True)}
    _validate_batch(batch)
    course.batches = [*course.batches, batch]
    db.commit()
    return to_dict(course)


@router.patch("/{id_}/batches/{batch_id}")
def update_batch(id_: str, batch_id: str, body: BatchUpdate, _: User = Depends(require_admin),
                 db: Session = Depends(get_db)):
    course = get_course(db, id_, lock=True)
    current = ensure_found(find_batch(course, batch_id), "Batch")
    patch = {k: v for k, v in body.model_dump(by_alias=True, exclude_unset=True).items() if v is not None}
    merged = {**current, **patch}
    _validate_batch(merged)
    taken = seats_taken(db, batch_id)
    if merged["seats"] < taken:
        raise ApiError("VALIDATION", f"{taken} students are already enrolled. Seats cannot be fewer than that.")
    course.batches = [merged if batch.get("id") == batch_id else batch for batch in course.batches]
    db.commit()
    return to_dict(course)


@router.delete("/{id_}/batches/{batch_id}")
def delete_batch(id_: str, batch_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = get_course(db, id_, lock=True)
    ensure_found(find_batch(course, batch_id), "Batch")
    if db.scalar(select(Enrollment.id).where(Enrollment.batch_id == batch_id).limit(1)):
        raise ApiError("CONFLICT", "Students are enrolled in this batch. It cannot be deleted.")
    course.batches = [batch for batch in course.batches if batch.get("id") != batch_id]
    db.commit()
    return to_dict(course)
