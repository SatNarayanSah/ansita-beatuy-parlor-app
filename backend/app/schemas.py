"""Request bodies. Field names are camelCase on the wire (same as the app's service inputs)."""

from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

PaymentMethod = Literal["cash", "esewa", "khalti", "fonepay", "card", "bank"]
# Methods a customer can pay by themselves and then ask the parlour to verify.
OnlineMethod = Literal["esewa", "khalti", "fonepay", "bank"]
Weekday = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
Gender = Literal["female", "male", "other"]
AppointmentStatus = Literal["pending", "confirmed", "completed", "cancelled", "no_show"]
EnrollmentStatus = Literal["pending", "active", "completed", "dropped"]
AttendanceStatus = Literal["present", "absent", "late"]
CustomerTag = Literal["vip", "regular", "new", "bridal", "student", "inactive"]
StaffRole = Literal["owner", "senior_stylist", "stylist", "beautician", "trainer", "receptionist"]
CourseLevel = Literal["beginner", "intermediate", "advanced"]
CourseType = Literal["certification", "diploma", "workshop"]
BatchStatus = Literal["upcoming", "ongoing", "completed"]
DiscountType = Literal["percent", "flat"]

DateStr = str  # yyyy-MM-dd, validated in the routes for friendly messages
TimeStr = str  # HH:mm


def _web_image(value: str | None) -> str | None:
    """A photo must be a web link (from `POST /uploads`). A path on a phone (file://...)
    only ever opens on that phone, so the website and other devices would show nothing."""
    if value is None or not value.strip():
        return None
    if not value.startswith(("http://", "https://")):
        raise ValueError("Upload the photo first (POST /uploads) and save its URL.")
    return value


ImageUrl = Annotated[str | None, Field(max_length=2048), AfterValidator(_web_image)]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


# ---------- Push devices ----------


class PushDeviceInput(CamelModel):
    token: str = Field(min_length=10, max_length=255)
    platform: Literal["android", "ios"] = "android"
    offer_alerts: bool = True


class PushDeviceRemove(CamelModel):
    token: str = Field(min_length=10, max_length=255)


# ---------- Auth ----------


class LoginInput(CamelModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class RegisterInput(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(min_length=5, max_length=32)
    password: str = Field(min_length=6, max_length=128)
    # From POST /auth/email/verify: proves the email belongs to whoever is signing up.
    email_verification_token: str = Field(default="", max_length=2048)


class ProfileInput(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: str | None = Field(default=None, min_length=3, max_length=254)
    phone: str | None = Field(default=None, max_length=32)
    avatar: ImageUrl = None
    # Needed only when `email` changes: from POST /auth/email/verify for the new address.
    email_verification_token: str = Field(default="", max_length=2048)


class EmailCodeRequestInput(CamelModel):
    email: str = Field(min_length=3, max_length=254)


class EmailCodeVerifyInput(CamelModel):
    email: str = Field(min_length=3, max_length=254)
    code: str = Field(max_length=12)


class ChangePasswordInput(CamelModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class PasswordResetRequestInput(CamelModel):
    email: str = Field(max_length=254)


class ResetPasswordInput(CamelModel):
    email: str = Field(max_length=254)
    code: str = Field(max_length=12)
    new_password: str = Field(min_length=6, max_length=128)


# ---------- Appointments ----------


class AppointmentInput(CamelModel):
    customer_id: str
    service_ids: list[str]
    staff_id: str
    date: DateStr
    start_time: TimeStr
    notes: str = Field(default="", max_length=1000)
    preferred_payment_method: PaymentMethod | None = None
    # Promo code entered at booking. Empty: the best automatic offer (if any) is applied.
    offer_code: str | None = Field(default=None, max_length=40)


class AppointmentUpdate(CamelModel):
    service_ids: list[str] | None = None
    staff_id: str | None = None
    date: DateStr | None = None
    start_time: TimeStr | None = None
    notes: str | None = Field(default=None, max_length=1000)
    # Omit to keep the current offer (re-checked against the new services/date); "" to drop the code.
    offer_code: str | None = Field(default=None, max_length=40)


class OfferCodeInput(CamelModel):
    code: str = Field(min_length=1, max_length=40)


class OfferQuoteInput(CamelModel):
    """Preview: what an offer would take off this booking, before it is made."""

    code: str | None = Field(default=None, max_length=40)
    service_ids: list[str]
    date: DateStr


class StatusInput(CamelModel):
    status: AppointmentStatus
    reason: str | None = Field(default=None, max_length=300)


class PaymentInput(CamelModel):
    amount: int
    method: PaymentMethod


class RedeemPointsInput(CamelModel):
    points: int


# ---------- Catalog ----------


def _clean_benefits(items: list[str]) -> list[str]:
    """Trimmed, non-empty, without repeats; at most 8 points of up to 120 characters."""
    seen: list[str] = []
    for item in items:
        text = " ".join(item.split())
        if text and text.lower() not in (s.lower() for s in seen):
            if len(text) > 120:
                raise ValueError("Keep each benefit under 120 characters.")
            seen.append(text)
    if len(seen) > 8:
        raise ValueError("Add at most 8 benefits.")
    return seen


Benefits = Annotated[list[str], AfterValidator(_clean_benefits)]


class ServiceInput(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    category_id: str
    duration: int = Field(gt=0, le=24 * 60)
    price: int = Field(ge=0)
    description: str = ""
    image: ImageUrl = None
    benefits: Benefits = []
    is_active: bool = True


class ServiceUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category_id: str | None = None
    duration: int | None = Field(default=None, gt=0, le=24 * 60)
    price: int | None = Field(default=None, ge=0)
    description: str | None = None
    image: ImageUrl = None
    benefits: Benefits | None = None
    is_active: bool | None = None


class CategoryInput(CamelModel):
    name: str = Field(min_length=2, max_length=80)
    icon: str
    color: str


class CategoryUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    icon: str | None = None
    color: str | None = None


class ActiveInput(CamelModel):
    is_active: bool


# ---------- Staff ----------


class WorkingHours(CamelModel):
    day: Weekday
    is_off: bool
    start: TimeStr
    end: TimeStr


class StaffInput(CamelModel):
    name: str
    role: StaffRole
    phone: str = ""
    email: str = ""
    specialties: list[str]
    working_hours: list[WorkingHours]
    avatar: ImageUrl = None
    is_active: bool = True


class StaffUpdate(CamelModel):
    name: str | None = None
    role: StaffRole | None = None
    phone: str | None = None
    email: str | None = None
    specialties: list[str] | None = None
    working_hours: list[WorkingHours] | None = None
    avatar: ImageUrl = None
    is_active: bool | None = None


# ---------- Customers ----------


class Address(CamelModel):
    line1: str = ""
    line2: str = ""
    city: str = ""
    province: str = ""
    postal_code: str = ""


class CustomerInput(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str
    email: str = ""
    gender: Gender = "female"
    dob: DateStr | None = None
    address: Address = Field(default_factory=Address)
    notes: str = ""
    avatar: ImageUrl = None
    tags: list[CustomerTag] = Field(default_factory=list)


class CustomerUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = None
    email: str | None = None
    gender: Gender | None = None
    dob: DateStr | None = None
    address: Address | None = None
    notes: str | None = None
    avatar: ImageUrl = None
    tags: list[CustomerTag] | None = None


# ---------- Courses ----------


class SyllabusModuleInput(CamelModel):
    id: str | None = None
    title: str
    topics: list[str] = Field(default_factory=list)
    hours: float = 0


class CourseInput(CamelModel):
    title: str = Field(min_length=2, max_length=160)
    type: CourseType
    description: str = ""
    duration: str
    fee: int = Field(ge=0)
    level: CourseLevel
    instructor: str
    seats: int = Field(ge=1)
    image: ImageUrl = None
    certificate: bool = True
    is_active: bool = True
    syllabus: list[SyllabusModuleInput] = Field(default_factory=list)


class CourseUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    type: CourseType | None = None
    description: str | None = None
    duration: str | None = None
    fee: int | None = Field(default=None, ge=0)
    level: CourseLevel | None = None
    instructor: str | None = None
    seats: int | None = Field(default=None, ge=1)
    image: ImageUrl = None
    certificate: bool | None = None
    is_active: bool | None = None
    syllabus: list[SyllabusModuleInput] | None = None


class BatchInput(CamelModel):
    name: str
    start_date: DateStr
    end_date: DateStr
    days: list[Weekday]
    start_time: TimeStr
    end_time: TimeStr
    seats: int
    status: BatchStatus


class BatchUpdate(CamelModel):
    name: str | None = None
    start_date: DateStr | None = None
    end_date: DateStr | None = None
    days: list[Weekday] | None = None
    start_time: TimeStr | None = None
    end_time: TimeStr | None = None
    seats: int | None = None
    status: BatchStatus | None = None


# ---------- Enrollments ----------


class InitialPayment(CamelModel):
    amount: int
    method: PaymentMethod


class EnrollInput(CamelModel):
    student_id: str
    course_id: str
    batch_id: str
    initial_payment: InitialPayment | None = None


class EnrollmentStatusInput(CamelModel):
    status: EnrollmentStatus


class AttendanceInput(CamelModel):
    date: DateStr
    status: AttendanceStatus


class BatchAttendanceEntry(CamelModel):
    enrollment_id: str
    status: AttendanceStatus


class BatchAttendanceInput(CamelModel):
    date: DateStr
    entries: list[BatchAttendanceEntry]


# ---------- Reviews ----------


class ReviewInput(CamelModel):
    appointment_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


class ReplyInput(CamelModel):
    reply: str = Field(max_length=2000)


# ---------- Offers ----------


class OfferInput(CamelModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = ""
    code: str | None = None
    discount_type: DiscountType
    discount_value: float
    max_discount: float | None = None
    min_spend: float = 0
    category_ids: list[str] = Field(default_factory=list)
    valid_from: DateStr
    valid_to: DateStr
    terms: list[str] = Field(default_factory=list)
    image: ImageUrl = None
    is_active: bool = True


class OfferUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = None
    code: str | None = None
    discount_type: DiscountType | None = None
    discount_value: float | None = None
    max_discount: float | None = None
    min_spend: float | None = None
    category_ids: list[str] | None = None
    valid_from: DateStr | None = None
    valid_to: DateStr | None = None
    terms: list[str] | None = None
    image: ImageUrl = None
    is_active: bool | None = None


# ---------- Business settings ----------


class BusinessProfileUpdate(CamelModel):
    name: str | None = None
    tagline: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    address: str | None = None
    open_time: TimeStr | None = None
    close_time: TimeStr | None = None


class HolidayInput(CamelModel):
    date: DateStr
    name: str


class LoyaltyUpdate(CamelModel):
    enabled: bool | None = None
    rupees_per_point: int | None = None
    point_value: float | None = None
    min_redeem_points: int | None = None


class AlertsUpdate(CamelModel):
    new_bookings: bool | None = None
    cancellations: bool | None = None
    payments: bool | None = None
    enrollments: bool | None = None


# ---------- Payment requests ("I've paid") ----------


class PaymentAccountInput(CamelModel):
    enabled: bool | None = None
    account_name: str | None = Field(default=None, max_length=120)
    account_number: str | None = Field(default=None, max_length=64)
    bank_name: str | None = Field(default=None, max_length=120)
    qr: str | None = Field(default=None, max_length=500)
    instructions: str | None = Field(default=None, max_length=300)


class PaymentSettingsUpdate(CamelModel):
    """`requests`: whether customers may send "I've paid" requests at all."""

    requests: bool | None = None
    esewa: PaymentAccountInput | None = None
    khalti: PaymentAccountInput | None = None
    fonepay: PaymentAccountInput | None = None
    bank: PaymentAccountInput | None = None


class PaymentRequestInput(CamelModel):
    target_type: Literal["appointment", "enrollment"]
    target_id: str = Field(min_length=1, max_length=64)
    amount: int
    # Online methods, or "cash" handed over at the parlour that isn't on the bill yet.
    method: OnlineMethod | Literal["cash"]
    # Transaction ID (required for online methods). For cash: optional receipt no. / who took it.
    reference: str = Field(default="", max_length=64)
    paid_on: str
    note: str = Field(default="", max_length=300)
    proof: str | None = Field(default=None, max_length=500)


class PaymentApproveInput(CamelModel):
    """`amount`: what actually arrived, if it differs from what the customer reported."""

    amount: int | None = None
    note: str = Field(default="", max_length=300)


class PaymentRejectInput(CamelModel):
    reason: str = Field(min_length=3, max_length=300)
