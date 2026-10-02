from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import hashlib
from jose import JWTError, jwt
from datetime import datetime, timedelta
<<<<<<< HEAD
from typing import Optional, List
=======
from typing import Optional
from pydantic import BaseModel
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
from app.database import get_db
from app.models import User, Role
from app.schemas import (
    UserCreate, ResearcherRegister, GoogleAuthRequest, 
    User as UserSchema, LoginResponse, UserApprovalUpdate, LoginRequest
)
import os

router = APIRouter()

# Request models
class GoogleAuthRequest(BaseModel):
    credential: str

# Security
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# JWT Settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

def simple_hash(password: str) -> str:
    """Simple SHA256 hash for hackathon demo"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return simple_hash(plain_password) == hashed_password

def get_password_hash(password: str) -> str:
    return simple_hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from fastapi import Request

def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_header and "Bearer " in auth_header:
            token = auth_header.split("Bearer ")[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required"
        )
    return current_user

def require_social_posting_permission(current_user: User = Depends(get_current_user)):
    """
    Admin can post.
    Researcher can post ONLY if approved by Admin.
    Normal user cannot post social media content.
    """
    if current_user.role == Role.admin:
        return current_user
    elif current_user.role == Role.researcher:
        if not current_user.is_approved:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your researcher account is pending Admin approval. You cannot post content across social media platforms until approved."
            )
        return current_user
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Normal users do not have permissions to post social media content. Please register as a Researcher and get approved by an Admin."
        )

@router.post("/register-researcher", response_model=UserSchema)
def register_researcher(data: ResearcherRegister, db: Session = Depends(get_db)):
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Password and Confirm Password do not match")
    
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")
    
    hashed_password = get_password_hash(data.password)
    
    db_user = User(
        name=data.name,
        email=data.email,
        password_hash=hashed_password,
        role=Role.researcher,
        institution=data.institution,
        designation=data.designation,
        research_area=data.research_area,
        researcher_id=data.researcher_id,
        phone_number=data.phone_number,
        is_approved=False,
        created_at=datetime.utcnow()
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/register", response_model=UserSchema)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password) if user.password else None
    db_user = User(
        name=user.name,
        email=user.email,
        role=user.role,
        password_hash=hashed_password,
        institution=user.institution,
        designation=user.designation,
        research_area=user.research_area,
        researcher_id=user.researcher_id,
        phone_number=user.phone_number,
        is_approved=True if user.role == Role.admin else False,
        avatar_url=user.avatar_url,
        created_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=LoginResponse)
def login(
    req: LoginRequest,
    db: Session = Depends(get_db)
):
    email = req.email
    password = req.password
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": role_val},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserSchema.from_orm(user)
    )

<<<<<<< HEAD
@router.post("/google-login", response_model=LoginResponse)
def google_login(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    
    if not user:
        user = User(
            name=req.name,
            email=req.email,
            role=Role.user, # Normal User role
            password_hash="",
            avatar_url=req.avatar_url or "https://lh3.googleusercontent.com/a/default-user=s96-c",
            is_approved=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if req.avatar_url and not user.avatar_url:
            user.avatar_url = req.avatar_url
            db.commit()
            db.refresh(user)

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": role_val},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserSchema.from_orm(user)
    )

@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/researchers", response_model=List[UserSchema])
def get_all_researchers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin endpoint to fetch all registered researchers with details & approval status"""
    researchers = db.query(User).filter(User.role == Role.researcher).all()
    return researchers

@router.post("/researchers/{user_id}/approve", response_model=UserSchema)
def approve_researcher(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin endpoint to approve a researcher to post content across social media platforms"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_approved = True
    db.commit()
    db.refresh(user)
    return user

@router.post("/researchers/{user_id}/reject", response_model=UserSchema)
def reject_researcher(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin endpoint to revoke/reject approval for a researcher"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_approved = False
    db.commit()
    db.refresh(user)
    return user

=======
@router.post("/google", response_model=LoginResponse)
def google_login(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Google OAuth login endpoint.
    Decodes Firebase ID token (demo mode - no verification).
    In production, use Firebase Admin SDK for proper verification.
    """
    try:
        import json
        import base64

        # Decode JWT (demo mode - no signature verification)
        parts = request.credential.split('.')
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid Google credential")

        # Decode payload (base64url)
        payload = parts[1]
        # Add padding if needed
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        decoded = base64.urlsafe_b64decode(payload)
        payload_data = json.loads(decoded)

        email = payload_data.get('email')
        name = payload_data.get('name', email.split('@')[0] if email else 'Google User')

        if not email:
            raise HTTPException(status_code=400, detail="Could not extract email from Google credential")

        print(f"Google sign-in attempt: {email}")

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        # Create user if doesn't exist
        if not user:
            user = User(
                name=name,
                email=email,
                role=Role.viewer,
                password_hash=get_password_hash("google-auth-user")  # Placeholder password
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created new user: {email}")

        # Generate JWT token for our app
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id, "role": user.role.value},
            expires_delta=access_token_expires
        )

        print(f"Generated token for user: {user.id}")

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserSchema.from_orm(user)
        )

    except json.JSONDecodeError as e:
        print(f"Token decode error: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid Google credential format")
    except Exception as e:
        print(f"Google auth error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google auth failed: {str(e)}")
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
