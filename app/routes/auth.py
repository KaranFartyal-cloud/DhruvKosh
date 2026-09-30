from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import hashlib
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Role
from app.schemas import UserCreate, User as UserSchema, LoginResponse
import os
import httpx

router = APIRouter()

# Request models
class GoogleAuthRequest(BaseModel):
    credential: str

# Security
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# JWT Settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

def simple_hash(password: str) -> str:
    """Simple SHA256 hash for hackathon demo (not production secure)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
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

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: list):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

@router.post("/register", response_model=UserSchema)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        role=user.role,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserSchema.from_orm(user)
    )

@router.post("/google", response_model=LoginResponse)
def google_login(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Google OAuth login endpoint.
    Verifies the Firebase ID token using Google's tokeninfo endpoint.
    """
    try:
        # Verify token with Google's tokeninfo endpoint
        response = httpx.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={request.credential}",
            timeout=10.0
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google ID token")
        
        token_data = response.json()
        email = token_data.get('email')
        name = token_data.get('name', email.split('@')[0] if email else 'Google User')
        
        if not email:
            raise HTTPException(status_code=400, detail="Could not extract email from Google credential")
        
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
        
        # Generate JWT token for our app
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id, "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserSchema.from_orm(user)
        )
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Google verification timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google auth failed: {str(e)}")
