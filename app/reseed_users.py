from app.database import SessionLocal, init_db
from app.models import User, Role
import hashlib

def simple_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

init_db()
db = SessionLocal()

# Ensure seed admin
admin = db.query(User).filter(User.email == "admin@ncpor.gov.in").first()
if not admin:
    admin = User(
        name="Admin Administrator",
        email="admin@ncpor.gov.in",
        role=Role.admin,
        password_hash=simple_hash("admin123"),
        is_approved=True,
        institution="National Centre for Polar and Ocean Research",
        designation="Chief System Administrator",
        researcher_id="ADMIN-001"
    )
    db.add(admin)
else:
    admin.role = Role.admin
    admin.is_approved = True
    admin.password_hash = simple_hash("admin123")

# Ensure Approved Researcher
approved_res = db.query(User).filter(User.email == "dr.sharma@ncpor.gov.in").first()
if not approved_res:
    approved_res = User(
        name="Dr. Rajesh Sharma",
        email="dr.sharma@ncpor.gov.in",
        role=Role.researcher,
        password_hash=simple_hash("researcher123"),
        institution="National Centre for Polar and Ocean Research (NCPOR)",
        designation="Senior Polar Scientist",
        research_area="Southern Ocean Dynamics & Sea Ice Physics",
        researcher_id="NCPOR-RES-4091",
        phone_number="+91 9876543210",
        is_approved=True
    )
    db.add(approved_res)
else:
    approved_res.role = Role.researcher
    approved_res.is_approved = True

# Ensure Pending Researcher
pending_res = db.query(User).filter(User.email == "ananya.patel@ncpor.gov.in").first()
if not pending_res:
    pending_res = User(
        name="Dr. Ananya Patel",
        email="ananya.patel@ncpor.gov.in",
        role=Role.researcher,
        password_hash=simple_hash("researcher123"),
        institution="Indian Institute of Technology, Bombay",
        designation="Assistant Professor",
        research_area="Glaciology & Himalayan Ice Sheet Modeling",
        researcher_id="IITB-RES-8832",
        phone_number="+91 9123456789",
        is_approved=False
    )
    db.add(pending_res)

# Ensure Normal User (Google Sign in demo)
normal_user = db.query(User).filter(User.email == "explorer.user@gmail.com").first()
if not normal_user:
    normal_user = User(
        name="Polar Explorer (Google User)",
        email="explorer.user@gmail.com",
        role=Role.user,
        password_hash="",
        avatar_url="https://lh3.googleusercontent.com/a/default-user=s96-c",
        is_approved=True
    )
    db.add(normal_user)

db.commit()
print("Users successfully synced in database!")
