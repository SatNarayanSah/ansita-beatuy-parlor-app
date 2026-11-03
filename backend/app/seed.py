"""Creates the tables and fills in the parlour's real starting data.

    python -m app.seed

Safe to run more than once: rows that already exist are left alone. Adds the admin
account (ADMIN_EMAIL / ADMIN_PASSWORD), business settings, service categories,
services, staff and courses (without batches; add those in the app).
"""

from pathlib import Path

from sqlalchemy import select

from .business import get_business
from .config import settings
from .db import SessionLocal, init_db
from .models import Course, Service, ServiceCategory, Staff, Upload, User
from .security import hash_password
from .service_benefits import DEFAULT_BENEFITS

PHOTOS_DIR = Path(__file__).parent / "assets" / "services"


def attach_starter_photos(db) -> int:
    """Gives each seeded service its starter photo (assets/services/<id>.jpg) once.

    Stored as an upload, like an admin's own photo. The upload's `uploaded_by` marks it as the
    starter photo, so a photo an admin later removes or replaces is never put back.
    """
    attached = 0
    for path in sorted(PHOTOS_DIR.glob("svc_*.jpg")):
        service = db.get(Service, path.stem)
        marker = f"seed:{path.stem}"
        if service is None or db.scalar(select(Upload.id).where(Upload.uploaded_by == marker)):
            continue
        data = path.read_bytes()
        upload = Upload(id=f"img_{path.stem}", content_type="image/jpeg", size=len(data), data=data, uploaded_by=marker)
        db.add(upload)
        if not service.image:
            service.image = f"/uploads/{upload.id}"
            attached += 1
    return attached


ALL_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]


def shift(start: str, end: str, off_days: list[str]) -> list[dict]:
    return [{"day": day, "isOff": day in off_days, "start": start, "end": end} for day in ALL_DAYS]


CATEGORIES = [
    {"id": "cat_hair", "name": "Hair", "icon": "cut-outline", "color": "#C2577A", "sort_order": 1},
    {"id": "cat_skin", "name": "Facial & Bleach", "icon": "water-outline", "color": "#2F8F63", "sort_order": 2},
    {"id": "cat_waxing", "name": "Waxing", "icon": "sparkles-outline", "color": "#C49A45", "sort_order": 3},
    {"id": "cat_nails", "name": "Pedicure", "icon": "footsteps-outline", "color": "#D0704F", "sort_order": 4},
]

SERVICES = [
    ("svc_straightening", "Hair Straightening (Any Length)", "cat_hair", 150, 2520, "Sleek, straight hair with a heat-protecting treatment."),
    ("svc_hair_protein", "Hair Protein (Any Length)", "cat_hair", 90, 3500, "Protein treatment that repairs and strengthens damaged hair."),
    ("svc_hair_botox", "Hair Botox (Any Length)", "cat_hair", 120, 3500, "Deep-conditioning repair that restores softness and shine."),
    ("svc_hair_color", "Hair Color (Any Length - Machine Wash)", "cat_hair", 120, 3500, "Full hair colour with professional products, finished with a machine wash."),
    ("svc_smoothing", "Hair Smoothing (Any Length)", "cat_hair", 150, 3220, "Controls frizz and adds shine while keeping natural movement."),
    ("svc_nanoplastia", "Hair Nanoplastia (Any Length)", "cat_hair", 180, 3500, "Formaldehyde-free straightening for smooth, healthy-looking hair."),
    ("svc_cap_highlights", "Cap Highlights (Any Length)", "cat_hair", 60, 700, "Classic cap-method highlights for soft, even streaks."),
    ("svc_ani_facial", "Ani Brand Facial", "cat_skin", 60, 1400, "Cleansing, massage and mask with Ani brand facial products."),
    ("svc_face_bleach", "Face Bleaching", "cat_skin", 20, 420, "Lightens facial hair for an even, brighter look."),
    ("svc_deep_bleach", "Deep Bleaching", "cat_skin", 30, 700, "Stronger bleach for face and neck with a soothing finish."),
    ("svc_body_wax", "Full Body Waxing", "cat_waxing", 90, 2100, "Arms, legs, underarms and back."),
    ("svc_hand_leg_wax", "Waxing (Hand & Leg)", "cat_waxing", 60, 1400, "Full hands and full legs waxing."),
    ("svc_pedicure", "Pedicure", "cat_nails", 50, 1680, "Warm soak, scrub, foot massage and polish."),
]

STAFF = [
    {"id": "stf_ansita", "name": "Ansita Shrestha", "role": "owner", "phone": "+9779854028392", "email": "admin@ansita.com",
     "specialties": ["cat_hair", "cat_skin"], "working_hours": shift("11:00", "17:00", ["tue"])},
    {"id": "stf_sarita", "name": "Sarita Maharjan", "role": "senior_stylist", "phone": "+9779851023344", "email": "sarita@ansita.com",
     "specialties": ["cat_hair"], "working_hours": shift("10:00", "19:00", ["wed"])},
    {"id": "stf_puja", "name": "Puja Tamang", "role": "beautician", "phone": "+9779803344120", "email": "puja@ansita.com",
     "specialties": ["cat_skin", "cat_waxing"], "working_hours": shift("10:00", "18:00", ["mon"])},
    {"id": "stf_rojina", "name": "Rojina Gurung", "role": "beautician", "phone": "+9779818876543", "email": "rojina@ansita.com",
     "specialties": ["cat_nails", "cat_waxing"], "working_hours": shift("11:00", "19:00", ["thu"])},
]


def module(id_: str, title: str, topics: list[str], hours: int) -> dict:
    return {"id": id_, "title": title, "topics": topics, "hours": hours}


COURSES = [
    {"id": "crs_beautician", "title": "Basic Beautician Course", "type": "certification", "duration": "3 months", "fee": 35000,
     "level": "beginner", "instructor": "stf_ansita", "seats": 12,
     "description": "Our most popular course for beginners. Learn skin care, threading, waxing, hair basics and everyday makeup with daily practice on live models. Ideal for starting your own parlour.",
     "syllabus": [
         module("mod_bb1", "Salon Basics & Hygiene", ["Tools and sterilisation", "Client consultation", "Skin and hair types"], 12),
         module("mod_bb2", "Threading & Waxing", ["Eyebrow shaping", "Full face threading", "Rica and honey wax"], 30),
         module("mod_bb3", "Skin Care", ["Clean-up", "Fruit and gold facials", "Bleach and de-tan"], 36),
         module("mod_bb4", "Hair Care", ["Hair spa", "Basic cuts", "Blow-dry and ironing", "Mehendi application"], 36),
         module("mod_bb5", "Makeup Basics", ["Colour theory", "Day and party makeup", "Sari draping"], 30),
         module("mod_bb6", "Manicure & Pedicure", ["Classic manicure", "Spa pedicure", "Nail care"], 18),
         module("mod_bb7", "Running a Parlour", ["Pricing services", "Customer handling", "Basic accounts"], 6),
     ]},
    {"id": "crs_adv_makeup", "title": "Advanced Makeup Course", "type": "certification", "duration": "6 weeks", "fee": 30000,
     "level": "intermediate", "instructor": "stf_puja", "seats": 10,
     "description": "Take your makeup skills to a professional level: HD and airbrush bases, cut-crease and glam eyes, contouring for camera, and party looks for every skin tone.",
     "syllabus": [
         module("mod_am1", "Skin Prep & Base", ["Skin analysis", "Colour correction", "HD vs airbrush"], 12),
         module("mod_am2", "Eye Artistry", ["Cut crease", "Smokey eyes", "Glitter and foil", "Lash application"], 16),
         module("mod_am3", "Contour & Highlight", ["Face shapes", "Cream vs powder", "Makeup for photography"], 10),
         module("mod_am4", "Party & Festive Looks", ["Teej and Tihar looks", "Cocktail glam", "Reception looks"], 12),
     ]},
    {"id": "crs_bridal", "title": "Bridal Makeup Course", "type": "diploma", "duration": "1 month", "fee": 45000,
     "level": "advanced", "instructor": "stf_ansita", "seats": 8,
     "description": "Master the complete Nepali bridal look, from skin prep to jewellery setting. Covers traditional Brahmin-Chhetri, Newari and modern brides, with hairstyling, sari draping and portfolio shoots.",
     "syllabus": [
         module("mod_bm1", "Bridal Skin & Base", ["Pre-bridal skin care plan", "Long-wear HD base", "Sweat-proofing"], 10),
         module("mod_bm2", "Traditional Nepali Brides", ["Brahmin-Chhetri bride", "Newari bride and haku patasi", "Gurung and Tamang bridal looks"], 18),
         module("mod_bm3", "Modern & Reception Looks", ["Soft glam bride", "Reception and cocktail looks", "Engagement makeup"], 12),
         module("mod_bm4", "Hair, Draping & Jewellery", ["Bridal buns and braids", "Sari and lehenga draping", "Tilhari, sirbandi and jewellery setting"], 14),
         module("mod_bm5", "Business & Portfolio", ["Pricing bridal packages", "Photography basics", "Instagram and TikTok marketing"], 6),
     ]},
    {"id": "crs_hair", "title": "Hair Styling Course", "type": "certification", "duration": "2 months", "fee": 25000,
     "level": "intermediate", "instructor": "stf_sarita", "seats": 10,
     "description": "Learn classic and trending cuts, colouring, rebonding and keratin, plus party and bridal hairstyles from our senior stylist.",
     "syllabus": [
         module("mod_hs1", "Cutting Fundamentals", ["Sectioning", "Blunt and layer cuts", "Fringes and face framing"], 20),
         module("mod_hs2", "Colour Techniques", ["Global colour", "Highlights", "Balayage basics"], 16),
         module("mod_hs3", "Chemical Treatments", ["Rebonding", "Keratin", "Smoothening aftercare"], 14),
         module("mod_hs4", "Styling", ["Curls and waves", "Party updos", "Bridal hairdos"], 16),
     ]},
    {"id": "crs_nail_art", "title": "Nail Art Course", "type": "workshop", "duration": "2 weeks", "fee": 12000,
     "level": "beginner", "instructor": "stf_rojina", "seats": 12,
     "description": "A hands-on two-week course on gel polish, extensions and trending nail art. Take-home starter kit included.",
     "syllabus": [
         module("mod_na1", "Nail Prep & Gel Polish", ["Nail anatomy and hygiene", "Gel application", "Safe removal"], 6),
         module("mod_na2", "Extensions", ["Tips", "Gel extensions", "Shaping and filing"], 8),
         module("mod_na3", "Nail Art Designs", ["Ombre", "Stamping", "Chrome, glitter and stones"], 10),
     ]},
    {"id": "crs_skin", "title": "Skin Care Specialist Course", "type": "diploma", "duration": "6 weeks", "fee": 28000,
     "level": "intermediate", "instructor": "stf_puja", "seats": 8,
     "description": "Go beyond basic facials. Understand skin science, treat acne and pigmentation, and run machine facials safely for every Nepali skin type and season.",
     "syllabus": [
         module("mod_sc1", "Skin Science", ["Skin layers and types", "Seasonal care in Nepal", "Product ingredients"], 12),
         module("mod_sc2", "Treatments", ["Acne and blackheads", "Pigmentation and tan", "Anti-ageing basics"], 16),
         module("mod_sc3", "Machine Facials", ["Hydra facial", "High frequency", "Galvanic and ultrasonic"], 14),
         module("mod_sc4", "Consultation & Safety", ["Patch tests", "Contraindications", "Home-care plans"], 8),
     ]},
]


def seed() -> None:
    init_db()
    with SessionLocal() as db:
        get_business(db)
        for data in CATEGORIES:
            if db.get(ServiceCategory, data["id"]) is None:
                db.add(ServiceCategory(**data))
        db.flush()
        for id_, name, category_id, duration, price, description in SERVICES:
            if db.get(Service, id_) is None:
                db.add(Service(id=id_, name=name, category_id=category_id, duration=duration, price=price,
                               description=description, image=None, is_active=True,
                               benefits=DEFAULT_BENEFITS.get(id_, [])))
        for data in STAFF:
            if db.get(Staff, data["id"]) is None:
                db.add(Staff(**data, avatar=None, rating=0, is_active=True))
        for data in COURSES:
            if db.get(Course, data["id"]) is None:
                db.add(Course(**data, batches=[], image=None, certificate=True, is_active=True))
        db.flush()
        photos = attach_starter_photos(db)
        if photos:
            print(f"Added starter photos to {photos} services.")

        email = settings.admin_email.strip().lower()
        if not email or not settings.admin_password:
            print("ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin account created.")
        elif db.scalar(select(User).where(User.email == email)) is None:
            if len(settings.admin_password) < 8:
                raise SystemExit("ADMIN_PASSWORD must be at least 8 characters.")
            db.add(User(
                id="usr_admin",
                role="admin",
                name=settings.admin_name,
                email=email,
                phone=settings.admin_phone,
                avatar=None,
                customer_id=None,
                staff_id="stf_ansita",
                password_hash=hash_password(settings.admin_password),
                token_version=0,
            ))
            print(f"Created admin account {email}")
        db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    seed()
