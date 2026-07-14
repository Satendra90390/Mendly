# Mediguide/Mendly Migration Plan
## Full Stack: Koyeb + Supabase + Cloudflare Pages

**Date:** July 14, 2026
**Goal:** Migrate from Render + SQLite + custom auth to Koyeb + Supabase + Cloudflare Pages
**Total Cost:** $0/month (all free tier)

---

## Architecture Overview

### Current Stack
```
Frontend (Vercel) → Backend (Render) → SQLite (local file) → Custom Auth (JWT + bcrypt)
                                                              → SendGrid (email OTP)
                                                              → MSG91 (SMS OTP)
```

### Target Stack
```
Frontend (Cloudflare Pages) → Backend (Koyeb) → Supabase PostgreSQL → Supabase Auth
                                                                      → Supabase OTP
```

---

## Phase 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization, project name: `mediguide`
4. Set database password (save this!)
5. Choose region closest to your users
6. Wait for project to be provisioned

### 1.2 Get Supabase Credentials
After project creation, go to **Project Settings → API**:

| Credential | Location | Value |
|---|---|---|
| Project URL | Settings → API → Project URL | `https://<project-ref>.supabase.co` |
| Anon Key | Settings → API → anon public | `eyJhbGciOiJIUzI1NiIs...` |
| Service Role Key | Settings → API → service_role | `eyJhbGciOiJIUzI1NiIs...` |
| JWT Secret | Settings → JWT Settings → JWT Secret | `<your-jwt-secret>` |

**⚠️ NEVER commit these to git. Store in .env only.**

### 1.3 Set Up Database Schema
Run these SQL queries in Supabase SQL Editor:

```sql
-- 1. Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT UNIQUE,
  date_of_birth TEXT,
  blood_type TEXT,
  profile_photo TEXT,
  avatar_color TEXT DEFAULT '#4f46e5',
  auth_provider TEXT DEFAULT 'email',
  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create chat_messages table
CREATE TABLE public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create saved_searches table
CREATE TABLE public.saved_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL CHECK (query_type IN ('medicine', 'disease')),
  query_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create activity_logs table
CREATE TABLE public.activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
-- Profiles: users can read/update their own profile
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Chat messages: users can CRUD their own messages
CREATE POLICY "Users read own chat" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own chat" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own chat" ON public.chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Saved searches: users can CRUD their own
CREATE POLICY "Users read own searches" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own searches" ON public.saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own searches" ON public.saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- Activity logs: users can read their own
CREATE POLICY "Users read own activity" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own activity" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own activity" ON public.activity_logs
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, auth_provider, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 1.4 Configure Supabase Auth Settings
In Supabase Dashboard → Authentication → Settings:

1. **Email Auth**: Enable email/password auth
2. **Phone Auth**: Enable phone auth (free OTP via Supabase)
3. **OAuth Providers**: Enable Google OAuth
4. **SMTP Settings**: Configure email templates (or use Supabase's built-in)
5. **JWT Expiry**: Set to 86400 (24 hours) to match current setting

---

## Phase 2: Backend Migration (FastAPI)

### 2.1 Add Dependencies
Update `requirements.txt`:

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.6
sqlalchemy>=2.0.35
python-jose[cryptography]>=3.3.0
bcrypt>=4.2.0
httpx>=0.27.2
pydantic[email]>=2.9.2
python-multipart>=0.0.9
psycopg2-binary>=2.9.9
python-dotenv>=1.2.2
google-generativeai>=0.8.0
slowapi>=0.1.9
supabase>=2.0.0
```

### 2.2 Update Environment Variables
Update `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres

# Backend
JWT_SECRET=<generate new one>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_ORIGINS=https://your-project.pages.dev,http://localhost:5500
FRONTEND_URL=https://your-project.pages.dev
BACKEND_URL=https://your-app-name.koyeb.app

# Keep existing
CHATBOT_PROVIDER=nvidia
NVIDIA_API_KEY=...
NVIDIA_API_URL=...
NVIDIA_MODEL=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 2.3 Rewrite auth.py
Replace the entire `auth.py` with Supabase Auth integration:

```python
# auth.py — Supabase Auth integration
import os
from functools import lru_cache
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# ─── Supabase Config ───────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if SUPABASE_URL:
    SUPABASE_ISSUER = f"{SUPABASE_URL}/auth/v1"
else:
    SUPABASE_ISSUER = ""

security = HTTPBearer(auto_error=False)


# ─── JWT Verification ──────────────────────────────────────
def _verify_supabase_token(token: str) -> dict:
    """Verify a Supabase JWT and return decoded claims."""
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Supabase JWT verification not configured"
        )

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            issuer=SUPABASE_ISSUER if SUPABASE_ISSUER else None,
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Dependencies ──────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify Supabase JWT and return user claims."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _verify_supabase_token(credentials.credentials)


async def get_current_user_id(
    user: dict = Depends(get_current_user),
) -> str:
    """Extract user ID from Supabase JWT."""
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: no user ID")
    return user_id


async def get_admin_user(
    user: dict = Depends(get_current_user),
) -> dict:
    """Verify user is admin (check app_metadata or profiles table)."""
    # Option 1: Check app_metadata (set via Supabase admin)
    app_metadata = user.get("app_metadata", {})
    if app_metadata.get("is_admin"):
        return user

    # Option 2: Check profiles table
    # You'll need to query the profiles table here
    # For now, we'll use a simple check
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required."
    )
```

### 2.4 Update database.py
Replace SQLite with Supabase PostgreSQL:

```python
# database.py — Supabase PostgreSQL connection
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load .env
from pathlib import Path
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

# Use Supabase PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Handle Supabase pooler URLs
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Verify connections before use
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.5 Rewrite main.py Auth Routes
Replace all auth routes with Supabase Auth:

```python
# main.py — Auth routes using Supabase Auth
from supabase import create_client, Client
from . import models, schemas, auth

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")  # Use service_role for backend
)

# ─── SIGNUP ────────────────────────────────────────────────
@app.post("/api/auth/signup", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
async def signup(request: Request, payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    # Check if email already exists in profiles
    existing = db.query(models.Profile).filter(models.Profile.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    # Sign up with Supabase Auth
    try:
        result = supabase.auth.sign_up({
            "email": payload.email.lower(),
            "password": payload.password,
            "options": {
                "data": {
                    "name": payload.name.strip(),
                    "provider": "email"
                }
            }
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if result.user is None:
        raise HTTPException(status_code=400, detail="Signup failed.")

    # Get the profile (auto-created by trigger)
    profile = db.query(models.Profile).filter(models.Profile.id == result.user.id).first()
    if not profile:
        # Fallback: create profile manually
        profile = models.Profile(
            id=result.user.id,
            name=payload.name.strip(),
            email=payload.email.lower(),
            auth_provider="email",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Generate our own JWT token for the backend
    token = auth.create_access_token({"sub": str(profile.id)})

    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserOut.model_validate(profile)
    )

# ─── LOGIN ─────────────────────────────────────────────────
@app.post("/api/auth/login", response_model=schemas.TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Sign in with Supabase Auth
    try:
        result = supabase.auth.sign_in_with_password({
            "email": payload.email.lower(),
            "password": payload.password,
        })
    except Exception as e:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    if result.user is None:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    # Get profile
    profile = db.query(models.Profile).filter(models.Profile.id == result.user.id).first()
    if not profile:
        raise HTTPException(status_code=401, detail="User not found.")

    if profile.is_blocked:
        raise HTTPException(status_code=403, detail="Your account has been blocked.")

    # Update last login
    profile.last_login = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    # Generate our own JWT
    token = auth.create_access_token({"sub": str(profile.id)})

    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserOut.model_validate(profile)
    )

# ─── EMAIL OTP ─────────────────────────────────────────────
@app.post("/api/auth/check-email")
@limiter.limit("5/minute")
async def check_email(request: Request, payload: schemas.CheckEmailRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    profile = db.query(models.Profile).filter(models.Profile.email == email).first()
    exists = profile is not None
    provider = profile.auth_provider if profile else None

    # Send OTP via Supabase Auth
    try:
        supabase.auth.sign_in_with_otp({
            "email": email,
            "options": {
                "email_redirect_to": os.getenv("FRONTEND_URL", "http://localhost:5500")
            }
        })
    except Exception as e:
        print(f"[SUPABASE OTP] Error: {e}")

    return {
        "exists": exists,
        "auth_provider": provider,
        "message": "If an account exists, an OTP has been sent."
    }

# ─── PHONE OTP ─────────────────────────────────────────────
@app.post("/api/auth/phone/send-otp")
@limiter.limit("3/minute")
async def phone_send_otp(request: Request, payload: schemas.SendPhoneOtpRequest, db: Session = Depends(get_db)):
    phone = payload.phone.strip()

    # Send OTP via Supabase Auth
    try:
        supabase.auth.sign_in_with_otp({"phone": phone})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "OTP sent."}

@app.post("/api/auth/phone/verify")
@limiter.limit("10/minute")
async def phone_verify(request: Request, payload: schemas.VerifyPhoneOtpRequest, db: Session = Depends(get_db)):
    phone = payload.phone.strip()

    # Verify OTP via Supabase Auth
    try:
        result = supabase.auth.verify_otp({
            "phone": phone,
            "token": payload.otp,
            "type": "sms"
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    if result.user is None:
        raise HTTPException(status_code=400, detail="Verification failed.")

    # Get or create profile
    profile = db.query(models.Profile).filter(models.Profile.id == result.user.id).first()
    if profile:
        profile.last_login = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        token = auth.create_access_token({"sub": str(profile.id)})
        return schemas.TokenResponse(
            access_token=token,
            user=schemas.UserOut.model_validate(profile)
        )

    return {"verified": True, "phone": phone, "message": "OTP verified. Complete your profile."}

# ─── GOOGLE OAUTH ──────────────────────────────────────────
@app.get("/api/auth/google")
async def google_login(request: Request):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5500")

    # Use Supabase Auth for Google OAuth
    try:
        result = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": frontend_url,
                "scopes": "openid email profile"
            }
        })
        return RedirectResponse(url=result.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/google/callback")
async def google_callback(request: Request, code: str = None, error: str = None, db: Session = Depends(get_db)):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5500")

    if error or not code:
        return RedirectResponse(url=f"{frontend_url}?auth_error={error or 'denied'}")

    # Supabase handles the callback and creates the user
    # For now, redirect to frontend with a message
    return RedirectResponse(url=f"{frontend_url}?auth_error=please_use_supabase_callback")

# ─── FORGOT PASSWORD ──────────────────────────────────────
@app.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest):
    email = payload.email.lower().strip()

    # Use Supabase Auth to send reset email
    try:
        supabase.auth.reset_password_for_email(
            email,
            options={
                "redirect_to": os.getenv("FRONTEND_URL", "http://localhost:5500") + "/reset-password"
            }
        )
    except Exception as e:
        print(f"[SUPABASE RESET] Error: {e}")

    return {"message": "If an account exists, a reset link has been sent."}
```

### 2.6 Update models.py
Replace `User` model with `Profile` (syncs with `auth.users`):

```python
# models.py — Updated for Supabase
import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base

class Profile(Base):
    __tablename__ = "profiles"

    # Use UUID as primary key (matches Supabase auth.users.id)
    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    name = Column(String(150), nullable=False, default="")
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(20), unique=True, nullable=True)
    date_of_birth = Column(String(10), nullable=True)
    blood_type = Column(String(5), nullable=True)
    profile_photo = Column(Text, nullable=True)
    avatar_color = Column(String(7), default="#4f46e5")
    auth_provider = Column(String(20), default="email")
    is_active = Column(Boolean, default=True)
    is_blocked = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, default=datetime.datetime.utcnow)

    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    saved_searches = relationship("SavedSearch", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    role = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("Profile", back_populates="chat_messages")


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    query_type = Column(String(50), nullable=False)
    query_value = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("Profile", back_populates="saved_searches")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    action = Column(String(100), nullable=False)
    detail = Column(Text, default="")
    ip_address = Column(String(45), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("Profile", back_populates="activities")
```

### 2.7 Delete Obsolete Files
Remove files that Supabase replaces:

```bash
# Delete these files
rm backend/app/otp_store.py      # Supabase handles OTP
rm backend/app/email_service.py  # Supabase handles email
rm backend/app/sms_service.py    # Supabase handles SMS
```

### 2.8 Update schemas.py
Update `UserOut` to use UUID and add new fields:

```python
# schemas.py — Updated for Supabase
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: UUID  # Changed from int to UUID
    name: str
    email: str
    created_at: datetime
    last_login: Optional[datetime] = None
    avatar_color: Optional[str] = "#4f46e5"
    is_blocked: Optional[bool] = False
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    profile_photo: Optional[str] = None
    auth_provider: Optional[str] = "email"
    phone: Optional[str] = None

    class Config:
        from_attributes = True
```

---

## Phase 3: Frontend Migration

### 3.1 Update config.js
Update API base URL for Koyeb:

```javascript
// config.js — Updated for Koyeb
const API_BASE = (() => {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8002/api";
    }
    // Production — Koyeb backend
    return window.__MENDLY_API_BASE__ || "https://your-app-name.koyeb.app/api";
})();
```

### 3.2 Update auth.js
The frontend auth.js can stay mostly the same since we're still using the backend API. The backend handles Supabase Auth internally. The frontend just calls the same API endpoints.

No major changes needed in auth.js — the API contract remains the same.

---

## Phase 4: Deploy Backend to Koyeb

### 4.1 Create Koyeb Account
1. Go to https://app.koyeb.com
2. Sign up with GitHub
3. No credit card required

### 4.2 Connect GitHub Repository
1. In Koyeb dashboard, click "Create App"
2. Select "GitHub" as deployment method
3. Select your repository
4. Configure:
   - **Name**: `mediguide-backend`
   - **Builder**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Port**: 8000

### 4.3 Set Environment Variables
In Koyeb dashboard → Settings → Environment Variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=your-generated-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_ORIGINS=https://your-project.pages.dev
FRONTEND_URL=https://your-project.pages.dev
BACKEND_URL=https://mediguide-backend.koyeb.app
CHATBOT_PROVIDER=nvidia
NVIDIA_API_KEY=your-nvidia-key
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4.4 Deploy
1. Push changes to GitHub
2. Koyeb auto-deploys
3. Verify at: `https://mediguide-backend.koyeb.app/api/health`

---

## Phase 5: Deploy Frontend to Cloudflare Pages

### 5.1 Create Cloudflare Account
1. Go to https://dash.cloudflare.com
2. Sign up (no credit card)

### 5.2 Connect GitHub Repository
1. Go to Pages → Create a project
2. Connect to Git (GitHub)
3. Select your repository
4. Configure:
   - **Project name**: `mediguide`
   - **Production branch**: `main`
   - **Build command**: (leave empty — static site)
   - **Output directory**: `frontend`

### 5.3 Deploy
1. Save and deploy
2. Get URL: `https://mediguide.pages.dev`

### 5.4 Update Frontend URLs
Update these files with the new Cloudflare Pages URL:

1. `frontend/config.js` — API_BASE
2. Backend `.env` — FRONTEND_ORIGINS, FRONTEND_URL
3. Supabase Dashboard → Authentication → URL Configuration → Site URL

---

## Phase 6: Data Migration

### 6.1 Export SQLite Data
```bash
# Export users from SQLite
sqlite3 mediguide.db ".dump users" > users_dump.sql

# Or export as CSV
sqlite3 -header -csv mediguide.db "SELECT * FROM users;" > users.csv
```

### 6.2 Import to Supabase
Use Supabase SQL Editor or `psql` to import data.

**Note:** You'll need to map integer IDs to UUIDs and hash passwords with Supabase's format.

### 6.3 Alternative: Fresh Start
If you don't have existing users, you can start fresh with the new Supabase Auth system.

---

## Phase 7: Testing & Verification

### 7.1 Test Auth Flows
- [ ] Email signup
- [ ] Email login
- [ ] Email OTP
- [ ] Phone OTP
- [ ] Google OAuth
- [ ] Forgot password
- [ ] Profile update
- [ ] Account deletion

### 7.2 Test Core Features
- [ ] Chat with AI
- [ ] Medicine search
- [ ] Disease info
- [ ] Drug interactions
- [ ] Hospital finder
- [ ] Pharmacy finder
- [ ] Saved searches
- [ ] Activity log

### 7.3 Test Security
- [ ] Rate limiting works
- [ ] CORS configured correctly
- [ ] JWT tokens expire properly
- [ ] RLS policies enforce access control
- [ ] Admin routes require admin role

---

## Rollback Strategy

If anything goes wrong:

1. **Keep Render backend running** during migration
2. **Keep Vercel frontend running** during migration
3. **Test new stack thoroughly** before switching DNS
4. **Switch DNS** only when confident
5. **Keep old stack for 1 week** as backup

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/requirements.txt` | Edit | Add `supabase`, `psycopg2-binary` |
| `backend/.env` | Edit | Add Supabase credentials |
| `backend/app/auth.py` | Rewrite | Use Supabase Auth |
| `backend/app/database.py` | Rewrite | Use Supabase PostgreSQL |
| `backend/app/models.py` | Rewrite | Use UUID, new Profile model |
| `backend/app/schemas.py` | Edit | Update UserOut for UUID |
| `backend/app/main.py` | Edit | Update auth routes |
| `backend/app/otp_store.py` | Delete | Supabase handles OTP |
| `backend/app/email_service.py` | Delete | Supabase handles email |
| `backend/app/sms_service.py` | Delete | Supabase handles SMS |
| `frontend/config.js` | Edit | Update API_BASE for Koyeb |
| `frontend/vercel.json` | Delete or keep | Moving to Cloudflare Pages |

---

## Cost Summary

| Service | Current | After Migration |
|---------|---------|-----------------|
| **Backend Hosting** | Render (free tier, cold starts) | Koyeb (free, always-on) |
| **Frontend Hosting** | Vercel (free, 100GB) | Cloudflare Pages (free, unlimited) |
| **Database** | SQLite (local file) | Supabase PostgreSQL (free, 500MB) |
| **Auth** | Custom (JWT + bcrypt) | Supabase Auth (free, 50K MAUs) |
| **Email OTP** | SendGrid (paid after limit) | Supabase Auth (free) |
| **SMS OTP** | MSG91 (paid per SMS) | Supabase Auth (free with Twilio) |
| **AI Chatbot** | NVIDIA NIM (keep) | NVIDIA NIM (keep) |
| **Total** | ~$0-5/month | **$0/month** |

---

## Timeline

| Phase | Estimated Time | Priority |
|-------|---------------|----------|
| Phase 1: Supabase Setup | 30 minutes | High |
| Phase 2: Backend Migration | 2-3 hours | High |
| Phase 3: Frontend Migration | 15 minutes | High |
| Phase 4: Koyeb Deployment | 30 minutes | High |
| Phase 5: Cloudflare Deployment | 15 minutes | High |
| Phase 6: Data Migration | 1-2 hours | Medium |
| Phase 7: Testing | 1-2 hours | High |
| **Total** | **5-8 hours** | |

---

## Success Criteria

- [ ] All auth flows work (email, phone, Google OAuth)
- [ ] Chat with AI works
- [ ] Medicine search works
- [ ] No cold starts on backend
- [ ] No data loss
- [ ] All security features intact (rate limiting, brute force protection, etc.)
- [ ] Frontend loads fast (Cloudflare CDN)
- [ ] Total cost: $0/month
