import httpx
import math
import os
import random
import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from . import models, schemas, auth, chatbot, openfda_client, otp_store
from .email_service import send_otp_email
from .database import engine, get_db, Base
from .knowledge_base import DISEASE_KNOWLEDGE, LOCAL_MEDICINES, EMERGENCY_CONTACTS, DRUG_ALIASES, SYMPTOM_TO_DISEASE

# Create tables on startup (fine for SQLite/small Postgres; use Alembic for
# real migrations if this grows further).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mendly - Medicine & Health Information Platform", version="2.1.0")

# ------------------------------------------------------------------
# CORS — allow your deployed frontend origin(s). Set FRONTEND_ORIGINS
# as a comma-separated env var in production, e.g.
# "https://mediguide.vercel.app,https://www.mediguide.app"
# ------------------------------------------------------------------
_origins_env = os.getenv("FRONTEND_ORIGINS", "*")
if _origins_env.strip() == "*":
    allow_origins = ["*"]
    _allow_credentials = False
else:
    allow_origins = [o.strip() for o in _origins_env.split(",")]
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ACTIVITY LOGGING HELPER
# ============================================================

@app.get("/api/test-email")
def test_email():
    import smtplib
    from .email_service import SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
        return {"status": "connected", "message": "SMTP login successful"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def _log_activity(db: Session, user_id: int, action: str, detail: str = "", request: Request = None):
    ip = ""
    if request:
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "")
        if "," in ip:
            ip = ip.split(",")[0].strip()
    db.add(models.ActivityLog(user_id=user_id, action=action, detail=detail, ip_address=ip))


# ============================================================
# AUTH ROUTES
# ============================================================

@app.post("/api/auth/signup", response_model=schemas.TokenResponse)
def signup(payload: schemas.SignupRequest, request: Request, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    colors = ["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"]
    user = models.User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        hashed_password=auth.hash_password(payload.password),
        avatar_color=random.choice(colors),
        last_login=datetime.datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id)})
    _log_activity(db, user.id, "account_created", "New account registered", request)
    db.commit()

    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if user.is_blocked:
        raise HTTPException(status_code=403, detail="Your account has been blocked. Please contact support.")

    user.last_login = datetime.datetime.utcnow()
    db.commit()

    token = auth.create_access_token({"sub": str(user.id)})
    _log_activity(db, user.id, "logged_in", "Successful login", request)
    db.commit()

    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@app.get("/api/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ============================================================
# OTP-BASED AUTH FLOW
# ============================================================

@app.post("/api/auth/check-email")
def check_email(payload: schemas.CheckEmailRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    exists = user is not None
    provider = user.auth_provider if user else None

    code = otp_store.create_otp(email, purpose="login" if exists else "signup")
    purpose = "login" if exists else "signup"
    send_otp_email(email, code, purpose)

    return {"exists": exists, "auth_provider": provider, "message": f"OTP sent to {email}"}


@app.post("/api/auth/verify-otp")
def verify_otp(payload: schemas.VerifyOtpRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    ok = otp_store.verify_otp(email, payload.otp)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        user.last_login = datetime.datetime.utcnow()
        db.commit()
        token = auth.create_access_token({"sub": str(user.id)})
        _log_activity(db, user.id, "otp_login", "Login via OTP", request)
        db.commit()
        return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))

    return {"verified": True, "email": email, "message": "OTP verified. Complete your profile."}


@app.post("/api/auth/complete-signup")
def complete_signup(payload: schemas.CompleteSignupRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    if not otp_store.is_pending(email):
        raise HTTPException(status_code=400, detail="OTP session expired. Please start over.")

    colors = ["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"]
    user = models.User(
        name=payload.name.strip(),
        email=email,
        hashed_password=auth.hash_password(payload.password),
        date_of_birth=payload.date_of_birth,
        auth_provider="email",
        avatar_color=random.choice(colors),
        last_login=datetime.datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id)})
    _log_activity(db, user.id, "account_created", "New account registered via OTP", request)
    db.commit()

    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@app.post("/api/auth/login-otp")
def login_otp(payload: schemas.LoginOtpRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")

    code = otp_store.create_otp(email, purpose="login")
    send_otp_email(email, code, "login")

    return {"message": f"OTP sent to {email}"}


# ============================================================
# HELPER: find-or-create user from social provider
# ============================================================

def _find_or_create_social_user(db: Session, provider: str, email: str, name: str):
    email = email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    created = False
    if user:
        user.last_login = datetime.datetime.utcnow()
        if not user.auth_provider or user.auth_provider == "email":
            user.auth_provider = provider
        db.commit()
    else:
        colors = ["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"]
        user = models.User(
            name=name, email=email, auth_provider=provider,
            avatar_color=random.choice(colors), last_login=datetime.datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        created = True
    return user, created


# ============================================================
# GOOGLE OAUTH2
# ============================================================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@app.get("/api/auth/google")
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID == "your_google_client_id_here":
        raise HTTPException(status_code=500, detail="Google OAuth is not configured. Add GOOGLE_CLIENT_ID to .env")
    backend_url = os.getenv("BACKEND_URL", str(request.base_url).rstrip("/"))
    redirect_uri = backend_url + "/api/auth/google/callback"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{qs}")


@app.get("/api/auth/google/callback")
async def google_callback(request: Request, code: str = None, error: str = None, db: Session = Depends(get_db)):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5500")
    if error or not code:
        return RedirectResponse(url=f"{frontend_url}?auth_error={error or 'denied'}")

    backend_url = os.getenv("BACKEND_URL", str(request.base_url).rstrip("/"))
    redirect_uri = backend_url + "/api/auth/google/callback"
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code, "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri, "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            return RedirectResponse(url=f"{frontend_url}?auth_error=token_exchange_failed")
        access_token = token_resp.json().get("access_token")

        userinfo_resp = await client.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if userinfo_resp.status_code != 200:
            return RedirectResponse(url=f"{frontend_url}?auth_error=userinfo_failed")
        info = userinfo_resp.json()

    email = info.get("email", "")
    name = info.get("name", email.split("@")[0])
    if not email:
        return RedirectResponse(url=f"{frontend_url}?auth_error=no_email")

    user, created = _find_or_create_social_user(db, "google", email, name)
    token = auth.create_access_token({"sub": str(user.id)})
    _log_activity(db, user.id, "social_login" if not created else "social_signup", "Google OAuth", request)
    db.commit()
    return RedirectResponse(url=f"{frontend_url}?token={token}")



# ============================================================
# PHONE AUTH — OTP via SMS (console for dev, swap Twilio/MSG91 for prod)
# ============================================================

@app.post("/api/auth/phone/send-otp")
def phone_send_otp(payload: schemas.SendPhoneOtpRequest, db: Session = Depends(get_db)):
    phone = payload.phone.strip()
    code = otp_store.create_otp(f"phone:{phone}", purpose="phone")
    print(f"\n{'='*50}\n  [SMS OTP] To: {phone}\n  Code: {code}\n{'='*50}\n")
    return {"message": f"OTP sent to {phone}", "dev_code": code}


@app.post("/api/auth/phone/verify")
def phone_verify(payload: schemas.VerifyPhoneOtpRequest, request: Request, db: Session = Depends(get_db)):
    phone = payload.phone.strip()
    ok = otp_store.verify_otp(f"phone:{phone}", payload.otp)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    user = db.query(models.User).filter(models.User.phone == phone).first()
    if user:
        user.last_login = datetime.datetime.utcnow()
        db.commit()
        token = auth.create_access_token({"sub": str(user.id)})
        _log_activity(db, user.id, "phone_login", "Login via phone OTP", request)
        db.commit()
        return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))

    return {"verified": True, "phone": phone, "message": "OTP verified. Complete your profile."}


@app.post("/api/auth/phone/complete-signup")
def phone_complete_signup(payload: schemas.PhoneSignupRequest, request: Request, db: Session = Depends(get_db)):
    phone = payload.phone.strip()

    existing_user = db.query(models.User).filter(models.User.phone == phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this phone already exists.")

    if not otp_store.is_pending(f"phone:{phone}"):
        raise HTTPException(status_code=400, detail="OTP session expired. Please start over.")

    email = payload.email.lower().strip() if payload.email else f"{phone}@phone.mendly"
    email_exists = db.query(models.User).filter(models.User.email == email).first()
    if email_exists:
        email = f"{phone}@phone.mendly"

    colors = ["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"]
    user = models.User(
        name=payload.name.strip(),
        email=email,
        phone=phone,
        hashed_password=auth.hash_password(payload.password),
        date_of_birth=payload.date_of_birth,
        auth_provider="phone",
        avatar_color=random.choice(colors),
        last_login=datetime.datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id)})
    _log_activity(db, user.id, "phone_signup", "Account created via phone", request)
    db.commit()

    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


# ============================================================
# FORGOT PASSWORD — OTP to email, then reset
# ============================================================

@app.post("/api/auth/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return {"message": "If an account exists, a reset code has been sent."}

    code = otp_store.create_otp(f"reset:{email}", purpose="reset")
    send_otp_email(email, code, "password reset")
    return {"message": "If an account exists, a reset code has been sent."}


@app.post("/api/auth/forgot-password/verify")
def forgot_password_verify(payload: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    ok = otp_store.verify_otp(f"reset:{email}", payload.otp)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired code.")
    return {"verified": True, "message": "Code verified. Set your new password."}


@app.post("/api/auth/forgot-password/reset")
def forgot_password_reset(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()

    if not otp_store.is_pending(f"reset:{email}"):
        raise HTTPException(status_code=400, detail="Session expired. Please start over.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = auth.hash_password(payload.new_password)
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}


# ============================================================
# PROFILE & ACCOUNT
# ============================================================

@app.put("/api/profile", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.ProfileUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.email is not None:
        existing = db.query(models.User).filter(
            models.User.email == payload.email.lower(),
            models.User.id != current_user.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="This email is already in use.")
        current_user.email = payload.email.lower()
    if payload.avatar_color is not None:
        current_user.avatar_color = payload.avatar_color
    if payload.date_of_birth is not None:
        current_user.date_of_birth = payload.date_of_birth
    if payload.blood_type is not None:
        current_user.blood_type = payload.blood_type
    if payload.profile_photo is not None:
        current_user.profile_photo = payload.profile_photo

    _log_activity(db, current_user.id, "profile_updated", "Profile information updated", request)
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/api/profile/change-password")
def change_password(
    payload: schemas.PasswordChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not auth.verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from the current one.")

    current_user.hashed_password = auth.hash_password(payload.new_password)
    _log_activity(db, current_user.id, "password_changed", "Password was changed", request)
    db.commit()
    return {"status": "ok", "message": "Password changed successfully."}


@app.get("/api/profile/stats", response_model=schemas.AccountStats)
def get_account_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    msg_count = db.query(models.ChatMessage).filter(models.ChatMessage.user_id == current_user.id).count()
    search_count = db.query(models.SavedSearch).filter(models.SavedSearch.user_id == current_user.id).count()
    activity_count = db.query(models.ActivityLog).filter(models.ActivityLog.user_id == current_user.id).count()
    return schemas.AccountStats(
        total_messages=msg_count,
        total_searches=search_count,
        total_activities=activity_count,
        member_since=current_user.created_at.strftime("%B %d, %Y") if current_user.created_at else "",
        last_active=current_user.last_login.strftime("%B %d, %Y %H:%M") if current_user.last_login else "",
    )


@app.delete("/api/profile")
def delete_account(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    user_id = current_user.id
    user_name = current_user.name
    _log_activity(db, user_id, "account_deleted", f"Account '{user_name}' deleted", request)
    db.commit()
    db.delete(current_user)
    db.commit()
    return {"status": "deleted", "message": "Your account has been permanently deleted."}


# ============================================================
# ACTIVITY LOG
# ============================================================

@app.get("/api/activity", response_model=List[schemas.ActivityLogOut])
def get_activity_log(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    logs = (
        db.query(models.ActivityLog)
        .filter(models.ActivityLog.user_id == current_user.id)
        .order_by(models.ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return logs


@app.delete("/api/activity")
def clear_activity_log(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db.query(models.ActivityLog).filter(models.ActivityLog.user_id == current_user.id).delete()
    db.commit()
    return {"status": "cleared"}


# ============================================================
# ADMIN — BLOCK / UNBLOCK USERS
# ============================================================

@app.post("/api/admin/users/{user_id}/block")
def block_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot block your own account.")
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    target.is_blocked = True
    _log_activity(db, current_user.id, "admin_block_user", f"Blocked user '{target.name}' (ID:{user_id})", request)
    db.commit()
    return {"status": "blocked", "message": f"User '{target.name}' has been blocked."}


@app.post("/api/admin/users/{user_id}/unblock")
def unblock_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    target.is_blocked = False
    _log_activity(db, current_user.id, "admin_unblock_user", f"Unblocked user '{target.name}' (ID:{user_id})", request)
    db.commit()
    return {"status": "unblocked", "message": f"User '{target.name}' has been unblocked."}


# ============================================================
# CHAT (persisted per-user)
# ============================================================

@app.post("/api/chat")
async def chat(
    request: schemas.ChatRequest,
    req: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Fetch the last 10 messages from DB to give AI conversation context
    recent = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.user_id == current_user.id)
        .order_by(models.ChatMessage.created_at.desc())
        .limit(10)
        .all()
    )
    history = [schemas.ConversationMessage(role=m.role, content=m.content) for m in reversed(recent)]
    if not history and request.history:
        history = request.history

    reply = await chatbot.chatbot_response(request.message, request.location, history)

    db.add(models.ChatMessage(user_id=current_user.id, role="user", content=request.message))
    db.add(models.ChatMessage(user_id=current_user.id, role="bot", content=reply))
    _log_activity(db, current_user.id, "chat_message", f"Asked: {request.message[:80]}", req)
    db.commit()

    return {"reply": reply, "response": reply}


@app.get("/api/chat/status")
def get_chat_status(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "provider": chatbot.get_ai_provider(),
        "gemini_active": chatbot.is_gemini_active(),
    }


@app.get("/api/chat/history", response_model=List[schemas.ChatMessageOut])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    limit: int = 100,
):
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.user_id == current_user.id)
        .order_by(models.ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(messages))


@app.delete("/api/chat/history")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db.query(models.ChatMessage).filter(models.ChatMessage.user_id == current_user.id).delete()
    db.commit()
    return {"status": "cleared"}


# ============================================================
# MEDICINES — local curated list + live OpenFDA search
# ============================================================

@app.get("/api/medicines")
async def get_medicines():
    """Returns the curated local medicine list (fast, for browsing/dashboard)."""
    return LOCAL_MEDICINES


@app.get("/api/medicines/{medicine_id}")
async def get_medicine(medicine_id: str):
    med = next((m for m in LOCAL_MEDICINES if m["id"] == medicine_id), None)
    if med:
        return med
    # Fall back to live lookup by treating the id as a drug name
    live = await openfda_client.get_medicine_detail_live(medicine_id.replace("-", " "))
    if live:
        return live
    raise HTTPException(status_code=404, detail="Medicine not found")


@app.post("/api/medicines/search")
async def search_medicines(payload: schemas.MedicineSearch):
    """
    Searches ANY medicine by name. Checks the local curated list first
    (fast + always available), then supplements with live results from the
    FDA's public drug label database so users can search virtually any
    approved medicine, not just the curated ones.
    """
    q = payload.query.lower().strip()
    if not q:
        return {"results": [], "count": 0}

    # Resolve abbreviations / brand aliases to real drug names
    resolved = DRUG_ALIASES.get(q, q)

    # Also try partial alias match (e.g. "sugar tab" → "metformin")
    alias_match = q
    for alias, real in DRUG_ALIASES.items():
        if alias in q or q in alias:
            alias_match = real
            break

    search_terms = list(dict.fromkeys([q, resolved, alias_match]))  # deduplicate, preserve order

    local_results = []
    for m in LOCAL_MEDICINES:
        name_l = m["name"].lower()
        brand_l = m.get("brand", "").lower()
        if any(
            term in name_l or term in brand_l
            or any(term in use.lower() for use in m.get("uses", []))
            or any(term in s.lower() for s in m.get("symptoms_treated", []))
            for term in search_terms
        ):
            if m not in local_results:
                local_results.append(m)

    # Search openFDA with resolved terms
    live_results = await openfda_client.search_medicines_live(resolved, limit=10)

    # Merge, avoiding duplicate names (prefer the curated local entry).
    local_names = {m["name"].lower() for m in local_results}
    merged = local_results + [m for m in live_results if m["name"].lower() not in local_names]

    # If no medicine found, check if query is a disease name and return its treatments
    if not merged:
        for disease_name, info in DISEASE_KNOWLEDGE.items():
            if q in disease_name or disease_name in q:
                treatment_meds = info.get("treatment", [])
                for med_name in treatment_meds:
                    # Try to find each treatment medicine in local or FDA
                    found = next((m for m in LOCAL_MEDICINES if m["name"].lower() in med_name.lower()), None)
                    if not found:
                        found = await openfda_client.get_medicine_detail_live(med_name)
                    if found and found["name"].lower() not in local_names:
                        merged.append(found)
                        local_names.add(found["name"].lower())
                break

    return {"results": merged, "count": len(merged)}


@app.post("/api/medicines/conditions")
async def search_by_condition(payload: schemas.MedicineSearch):
    q = payload.query.lower()
    results = []

    # Also resolve abbreviations for condition queries
    q_resolved = DRUG_ALIASES.get(q, q)

    for m in LOCAL_MEDICINES:
        matches = any(
            term in s.lower() for term in [q, q_resolved]
            for s in m.get("symptoms_treated", [])
        ) or any(
            term in u.lower() for term in [q, q_resolved]
            for u in m.get("uses", [])
        )
        if matches:
            results.append({
                "name": m["name"],
                "brand": m["brand"],
                "uses": m.get("uses", []),
                "dosage": m.get("dosage", {}).get("adult", "Consult doctor"),
                "category": m.get("category", "General"),
            })

    # Also search openFDA for medicines related to the condition
    if len(results) < 3:
        try:
            live = await openfda_client.search_medicines_live(q, limit=5)
            existing_names = {r["name"].lower() for r in results}
            for med in live:
                if med["name"].lower() not in existing_names:
                    results.append({
                        "name": med["name"],
                        "brand": med.get("brand", ""),
                        "uses": med.get("uses", []),
                        "dosage": med.get("dosage", {}).get("adult", "Consult doctor"),
                        "category": med.get("category", ""),
                    })
        except Exception:
            pass

    return {"condition": payload.query, "possible_medicines": results, "count": len(results)}


@app.post("/api/medicines/interactions")
async def check_interactions(payload: schemas.InteractionCheck):
    med_names = [name.strip() for name in payload.medication.split(",") if name.strip()]
    if not med_names:
        return {"error": "Please enter at least one medication."}

    resolved_meds = []
    warnings: List[str] = []
    recommendations: List[str] = []
    
    # Resolve all medications
    for m_name in med_names:
        med = next((m for m in LOCAL_MEDICINES if m["name"].lower() == m_name.lower()), None)
        if not med:
            live = await openfda_client.get_medicine_detail_live(m_name)
            if live:
                med = live
        if med:
            resolved_meds.append(med)
        else:
            warnings.append(f"⚠️ Medication '{m_name}' could not be resolved or found. Check spelling.")

    # Check drug-to-drug interactions if multiple medicines are checked
    resolved_names = [m["name"].lower() for m in resolved_meds]
    
    # Dual NSAIDs
    nsaids = ["ibuprofen", "aspirin", "naproxen", "diclofenac", "meloxicam"]
    detected_nsaids = [n for n in nsaids if any(n in name for name in resolved_names)]
    if len(detected_nsaids) > 1:
        warnings.append(f"⚠️ Combination of {', '.join(detected_nsaids).title()} (multiple NSAIDs) significantly increases risk of stomach ulcers and GI bleeding.")

    # Blood thinners + NSAIDs
    thinners = ["warfarin", "clopidogrel", "apixaban", "rivaroxaban", "heparin"]
    has_thinner = any(t in name for name in resolved_names) or "warfarin" in resolved_names or "apixaban" in resolved_names
    has_nsaid = any(n in name for name in resolved_names if n != "aspirin") or "ibuprofen" in resolved_names or "naproxen" in resolved_names
    if has_thinner and has_nsaid:
        warnings.append("⚠️ Combining blood thinners with NSAIDs (like Ibuprofen) greatly increases risk of severe internal bleeding.")

    # Alcohol/CNS depressants + antihistamines/opioids
    depressants = ["alcohol", "ethanol", "xanax", "diazepam", "lorazepam", "gabapentin", "tramadol", "codeine"]
    has_depressant = any(d in name for name in resolved_names)
    has_antihistamine = any(a in name for name in resolved_names for a in ["cetirizine", "loratadine", "diphenhydramine", "fexofenadine"])
    if has_depressant and has_antihistamine:
        warnings.append("⚠️ Combining alcohol/sedatives with antihistamines can cause severe drowsiness and impaired coordination.")

    # Grapefruit / Clarithromycin + Statins
    has_statin = any(s in name for name in resolved_names for s in ["atorvastatin", "simvastatin", "rosuvastatin", "statin"])
    has_inhibitor = any(i in name for name in resolved_names for i in ["grapefruit", "clarithromycin", "erythromycin"])
    if has_statin and has_inhibitor:
        warnings.append("⚠️ Grapefruit juice or macrolide antibiotics can increase statin levels, elevating muscle toxicity (rhabdomyolysis) risk.")

    # Nitrates + Sildenafil
    has_nitrate = any(n in name for name in resolved_names for n in ["nitroglycerin", "isosorbide", "nitrate"])
    has_sildenafil = any(s in name for name in resolved_names for s in ["sildenafil", "viagra", "tadalafil", "cialis"])
    if has_nitrate and has_sildenafil:
        warnings.append("🚨 DANGEROUS INTERACTION: Combining nitrates and PDE5 inhibitors (Sildenafil/Tadalafil) can cause a life-threatening drop in blood pressure.")

    # Check drug-to-condition interactions
    for med in resolved_meds:
        med_name = med["name"].lower()
        for condition in payload.conditions:
            c = condition.lower()
            if any(w in c for w in ["liver", "hepatic"]):
                if "paracetamol" in med_name or "acetaminophen" in med_name:
                    warnings.append(f"⚠️ {med['name']}: High risk of liver damage with liver disease. Do not exceed 4g/day.")
                if "metformin" in med_name:
                    warnings.append(f"⚠️ {med['name']}: Metformin with liver disease increases lactic acidosis risk.")
            if any(w in c for w in ["kidney", "renal"]):
                if "ibuprofen" in med_name or "naproxen" in med_name:
                    warnings.append(f"⚠️ {med['name']}: NSAIDs can worsen kidney function.")
                if "amoxicillin" in med_name:
                    warnings.append(f"⚠️ {med['name']}: Amoxicillin dose adjustment may be needed for kidney impairment.")
            if any(w in c for w in ["stomach", "ulcer", "gastritis"]):
                if "ibuprofen" in med_name or "aspirin" in med_name or "naproxen" in med_name:
                    warnings.append(f"⚠️ {med['name']}: High risk of stomach bleeding/irritation. Take with food.")
            if "pregnan" in c or "breastfeed" in c:
                if "ibuprofen" in med_name or "aspirin" in med_name:
                    warnings.append(f"⚠️ {med['name']}: Should be avoided in the third trimester of pregnancy.")
                recommendations.append(f"👶 {med['name']}: Consult your obstetrician before taking during pregnancy/breastfeeding.")
            if "allerg" in c:
                if "penicillin" in med_name or "amoxicillin" in med_name:
                    warnings.append(f"⚠️ {med['name']}: Penicillin allergy warning — do NOT use Amoxicillin/Penicillin.")

    # Recommendations
    if not warnings:
        recommendations.append("✅ No critical interactions detected for this combination.")
    else:
        recommendations.append("💊 Please consult a qualified pharmacist or doctor before taking this combination.")

    resolved_display_names = ", ".join([m["name"] for m in resolved_meds]) or payload.medication
    return {
        "medication": resolved_display_names,
        "warnings": warnings,
        "recommendations": list(set(recommendations)),
    }


# ============================================================
# DISEASES
# ============================================================

@app.get("/api/diseases")
async def get_diseases():
    return [{"name": name, **info} for name, info in DISEASE_KNOWLEDGE.items()]


@app.get("/api/diseases/{disease_name}")
async def get_disease(disease_name: str):
    key = disease_name.lower().replace("-", " ")
    info = DISEASE_KNOWLEDGE.get(key)
    if not info:
        raise HTTPException(status_code=404, detail="Disease not found")
    return {"name": key, **info}


@app.post("/api/diseases/search")
async def search_diseases(payload: schemas.MedicineSearch):
    q = payload.query.lower().strip()
    results = [
        {"name": name, **info}
        for name, info in DISEASE_KNOWLEDGE.items()
        if q in name or any(q in s.lower() for s in info.get("symptoms", []))
    ]
    return {"results": results, "count": len(results)}


# ============================================================
# SAVED SEARCHES (per-user bookmarks)
# ============================================================

@app.post("/api/saved-searches", response_model=schemas.SavedSearchOut)
def create_saved_search(
    payload: schemas.SavedSearchCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    item = models.SavedSearch(
        user_id=current_user.id,
        query_type=payload.query_type,
        query_value=payload.query_value,
    )
    db.add(item)
    _log_activity(db, current_user.id, "bookmark_added", f"Bookmarked {payload.query_type}: {payload.query_value}", req)
    db.commit()
    db.refresh(item)
    return item


@app.get("/api/saved-searches", response_model=List[schemas.SavedSearchOut])
def list_saved_searches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.SavedSearch)
        .filter(models.SavedSearch.user_id == current_user.id)
        .order_by(models.SavedSearch.created_at.desc())
        .all()
    )


@app.delete("/api/saved-searches/{item_id}")
def delete_saved_search(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    item = (
        db.query(models.SavedSearch)
        .filter(models.SavedSearch.id == item_id, models.SavedSearch.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}


# ============================================================
# EMERGENCY & LOCATION (kept compatible with existing frontend)
# ============================================================

demo_hospitals = [
    {"name": "City General Hospital", "address": "123 Health Avenue, Downtown", "phone": "+91 9876543210", "distance": 1.2, "types": ["Hospital"], "available": True},
    {"name": "Apollo Medical Center", "address": "456 Wellness Road, Medical District", "phone": "+91 9876543211", "distance": 2.5, "types": ["Hospital"], "available": True},
    {"name": "MediHeal Clinic", "address": "789 Care Street, Central", "phone": "+91 9876543212", "distance": 1.8, "types": ["Clinic"], "available": True},
    {"name": "National Institute of Health", "address": "321 Research Boulevard, West End", "phone": "+91 9876543213", "distance": 3.0, "types": ["Hospital"], "available": True},
]

demo_pharmacies = [
    {"name": "MediPharm Pharmacy", "address": "123 Health Avenue, Downtown", "phone": "+91 9876543220", "distance": 0.5, "services": ["Home Delivery"]},
    {"name": "Wellness Drug Store", "address": "456 Wellness Road, Medical District", "phone": "+91 9876543221", "distance": 1.0, "services": ["Home Delivery"]},
    {"name": "24-Hour Health Plus", "address": "789 Care Street, Central", "phone": "+91 9876543222", "distance": 1.5, "services": ["24/7 Service", "Home Delivery"]},
    {"name": "GoodLife Medical Supplies", "address": "321 Research Boulevard, West End", "phone": "+91 9876543223", "distance": 2.0, "services": ["Medical Equipment"]},
]


def _haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    # returns distance in kilometers
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _build_osm_viewbox(lat: float, lng: float, radius_km: float) -> str:
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / max(1e-6, 111.0 * math.cos(math.radians(lat)))
    west = lng - lng_delta
    east = lng + lng_delta
    south = lat - lat_delta
    north = lat + lat_delta
    return f"{west},{south},{east},{north}"


def _query_osm_places(lat: float, lng: float, place_type: str, radius_km: int = 10):
    viewbox = _build_osm_viewbox(lat, lng, radius_km)
    params = {
        "format": "json",
        "q": place_type,
        "addressdetails": 1,
        "limit": 50,
        "bounded": 1,
        "viewbox": viewbox,
    }
    headers = {
        "User-Agent": "MendlyHealthPlatform/1.0 (contact@mendlyhealth.com)",
        "Accept-Language": "en",
    }
    url = "https://nominatim.openstreetmap.org/search"
    with httpx.Client(timeout=10.0) as client:
        response = client.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()


def _search_osm_by_name(query: str, place_type: str):
    """Search OSM Nominatim for hospitals/pharmacies by name anywhere."""
    search_query = f"{query} {place_type}"
    params = {
        "format": "json",
        "q": search_query,
        "addressdetails": 1,
        "limit": 20,
    }
    headers = {
        "User-Agent": "MendlyHealthPlatform/1.0 (contact@mendlyhealth.com)",
        "Accept-Language": "en",
    }
    url = "https://nominatim.openstreetmap.org/search"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()
            results = response.json()
            if isinstance(results, list) and results:
                places = []
                for item in results:
                    raw_address = item.get("display_name", "")
                    address = ", ".join(raw_address.split(",")[:3]) if raw_address else "Address not available"
                    lat_val = float(item.get("lat", 0))
                    lng_val = float(item.get("lon", 0))
                    places.append({
                        "name": item.get("display_name", place_type).split(",")[0],
                        "address": address,
                        "phone": "N/A",
                        "distance": None,
                        "lat": lat_val,
                        "lng": lng_val,
                        "types": [place_type.capitalize()],
                        "available": True,
                        "services": ["Name search"],
                    })
                return places
    except Exception:
        pass
    return []


def get_nearby_places(lat: float, lng: float, place_type: str, radius: int = 10):
    type_query = "hospital" if place_type == "hospital" else "pharmacy"
    try:
        osm_results = _query_osm_places(lat, lng, type_query, radius)
        if isinstance(osm_results, list) and osm_results:
            places = []
            for item in osm_results:
                distance = _haversine_distance(lat, lng, float(item.get("lat", lat)), float(item.get("lon", lng)))
                raw_address = item.get("display_name", "")
                address = ", ".join(raw_address.split(",")[:3]) if raw_address else "Address not available"
                places.append(
                    {
                        "name": item.get("display_name", type_query).split(",")[0],
                        "address": address,
                        "phone": "N/A",
                        "distance": round(distance, 1),
                        "types": [place_type.capitalize()],
                        "available": True,
                        "services": ["Near you"],
                    }
                )
            places.sort(key=lambda x: x["distance"])
            return places[:25]
    except Exception:
        return []

    return []


@app.get("/api/emergency/contacts")
async def get_emergency_contacts(country: Optional[str] = None):
    if country:
        found = next((c for c in EMERGENCY_CONTACTS if c["country"].lower() == country.lower()), None)
        if found:
            return found
    return EMERGENCY_CONTACTS


@app.post("/api/emergency/hospitals/nearby")
async def get_nearby_hospitals(location: schemas.LocationRequest):
    # Only try OSM if valid location coordinates provided
    if location.lat != 0 and location.lng != 0:
        hospitals = get_nearby_places(location.lat, location.lng, "hospital")
        if hospitals:
            return {"hospitals": hospitals, "count": len(hospitals)}
    # Fall back to demo hospitals if no location or OSM returns empty
    return {"hospitals": demo_hospitals, "count": len(demo_hospitals)}


@app.get("/api/emergency/hospitals")
async def get_hospitals():
    return demo_hospitals


@app.post("/api/emergency/hospitals/search")
async def search_hospitals(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    hospitals = []
    
    # Try nearby search first if location available
    if request.lat != 0 and request.lng != 0:
        hospitals = get_nearby_places(request.lat, request.lng, "hospital")
    
    # If query provided, also search by name anywhere
    if q:
        name_results = _search_osm_by_name(request.query, "hospital")
        # Merge name results (avoid duplicates by name)
        existing_names = {h["name"].lower() for h in hospitals}
        for nr in name_results:
            if nr["name"].lower() not in existing_names:
                hospitals.append(nr)
        
        # Filter by query
        hospitals = [h for h in hospitals if q in h["name"].lower() or q in h["address"].lower()]
    elif not hospitals:
        # No query, no location — show demo data
        hospitals = demo_hospitals
    
    return {"hospitals": hospitals, "count": len(hospitals)}


@app.post("/api/emergency/pharmacies/nearby")
async def get_nearby_pharmacies(location: schemas.LocationRequest):
    # Only try OSM if valid location coordinates provided
    if location.lat != 0 and location.lng != 0:
        pharmacies = get_nearby_places(location.lat, location.lng, "pharmacy")
        if pharmacies:
            return {"pharmacies": pharmacies, "count": len(pharmacies)}
    # Fall back to demo pharmacies if no location or OSM returns empty
    return {"pharmacies": demo_pharmacies, "count": len(demo_pharmacies)}


@app.get("/api/emergency/pharmacies")
async def get_pharmacies():
    return demo_pharmacies


@app.post("/api/emergency/pharmacies/search")
async def search_pharmacies(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    pharmacies = []
    
    # Try nearby search first if location available
    if request.lat != 0 and request.lng != 0:
        pharmacies = get_nearby_places(request.lat, request.lng, "pharmacy")
    
    # If query provided, also search by name anywhere
    if q:
        name_results = _search_osm_by_name(request.query, "pharmacy")
        # Merge name results (avoid duplicates by name)
        existing_names = {p["name"].lower() for p in pharmacies}
        for nr in name_results:
            if nr["name"].lower() not in existing_names:
                pharmacies.append(nr)
        
        # Filter by query
        pharmacies = [p for p in pharmacies if q in p["name"].lower() or q in p["address"].lower()]
    elif not pharmacies:
        # No query, no location — show demo data
        pharmacies = demo_pharmacies
    
    return {"pharmacies": pharmacies, "count": len(pharmacies)}


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Mendly API", "version": "2.0.0"}
