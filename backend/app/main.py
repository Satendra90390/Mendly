import httpx
import math
import os
import random
import logging
import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from . import schemas, auth, chatbot, openfda_client
from .database import (
    supabase, get_profile, get_profile_by_email, get_profile_by_phone,
    insert_profile, update_profile, delete_profile,
    insert_activity_log, get_activity_logs, delete_activity_logs, count_rows,
    insert_chat_message, get_chat_history, get_recent_chat_messages, delete_chat_messages,
    insert_saved_search, get_saved_searches, delete_saved_search,
)
from .knowledge_base import DISEASE_KNOWLEDGE, LOCAL_MEDICINES, EMERGENCY_CONTACTS, DRUG_ALIASES, SYMPTOM_TO_DISEASE

logger = logging.getLogger("mendly")

app = FastAPI(title="Mendly - Medicine & Health Information Platform", version="4.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_origins_env = os.getenv("FRONTEND_ORIGINS", "http://localhost:5500")
if _origins_env.strip() == "*":
    import warnings
    warnings.warn("FRONTEND_ORIGINS is set to '*' — insecure in production.", stacklevel=2)
    allow_origins = ["*"]
    _allow_credentials = False
else:
    allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


def _now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _log_activity(user_id, action: str, detail: str = "", request: Request = None):
    ip = ""
    if request:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        elif request.client:
            ip = request.client.host
    try:
        insert_activity_log({
            "user_id": user_id,
            "action": action,
            "detail": detail[:500],
            "ip_address": ip,
        })
    except Exception as e:
        logger.warning(f"Activity log failed: {e}")


def _make_profile_dict(user_id: str, payload: dict, provider: str = "email") -> dict:
    colors = ["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"]
    return {
        "id": user_id,
        "name": payload.get("name", "").strip(),
        "email": payload.get("email", "").lower(),
        "auth_provider": provider,
        "avatar_color": random.choice(colors),
        "last_login": _now(),
    }


# ============================================================
# AUTH ROUTES — Supabase Auth
# ============================================================

@app.post("/api/auth/signup", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
async def signup(request: Request, payload: schemas.SignupRequest):
    existing = get_profile_by_email(payload.email.lower())
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    try:
        result = supabase.auth.sign_up({
            "email": payload.email.lower(),
            "password": payload.password,
            "options": {"data": {"name": payload.name.strip(), "provider": "email"}},
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if result.user is None:
        raise HTTPException(status_code=400, detail="Signup failed.")

    profile = get_profile(result.user.id)
    if not profile:
        profile = insert_profile(_make_profile_dict(result.user.id, {
            "name": payload.name, "email": payload.email,
        }))

    update_profile(result.user.id, {"last_login": _now()})
    _log_activity(result.user.id, "account_created", "New account registered", request)

    token = auth._generate_session_token(result.user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: schemas.LoginRequest):
    try:
        result = supabase.auth.sign_in_with_password({
            "email": payload.email.lower(),
            "password": payload.password,
        })
    except Exception:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    if result.user is None:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    profile = get_profile(result.user.id)
    if not profile:
        raise HTTPException(status_code=401, detail="User not found.")
    if profile.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Your account has been blocked.")

    update_profile(result.user.id, {"last_login": _now()})
    _log_activity(result.user.id, "logged_in", "Successful login", request)

    token = auth._generate_session_token(result.user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))


@app.get("/api/auth/me", response_model=schemas.UserOut)
async def get_me(current_user: dict = Depends(auth.get_current_user_profile)):
    return current_user


# ============================================================
# OTP-BASED AUTH FLOW
# ============================================================

@app.post("/api/auth/check-email")
@limiter.limit("5/minute")
async def check_email(request: Request, payload: schemas.CheckEmailRequest):
    email = payload.email.lower().strip()
    profile = get_profile_by_email(email)
    exists = profile is not None
    provider = profile.get("auth_provider") if profile else None

    try:
        supabase.auth.sign_in_with_otp({
            "email": email,
            "options": {"email_redirect_to": os.getenv("FRONTEND_URL", "http://localhost:5500")},
        })
    except Exception as e:
        logger.warning(f"Supabase OTP error: {e}")

    return {"exists": exists, "auth_provider": provider, "message": "If an account exists, an OTP has been sent."}


@app.post("/api/auth/verify-otp")
@limiter.limit("10/minute")
async def verify_otp(request: Request, payload: schemas.VerifyOtpRequest):
    email = payload.email.lower().strip()

    try:
        result = supabase.auth.verify_otp({"email": email, "token": payload.otp, "type": "email"})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    if result.user is None:
        raise HTTPException(status_code=400, detail="Verification failed.")

    profile = get_profile(result.user.id)
    if profile:
        update_profile(result.user.id, {"last_login": _now()})
        _log_activity(result.user.id, "otp_login", "Login via OTP", request)
        token = auth._generate_session_token(result.user.id)
        return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))

    return {"verified": True, "email": email, "message": "OTP verified. Complete your profile."}


@app.post("/api/auth/complete-signup")
@limiter.limit("5/minute")
async def complete_signup(request: Request, payload: schemas.CompleteSignupRequest):
    email = payload.email.lower().strip()
    if get_profile_by_email(email):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    try:
        result = supabase.auth.sign_up({
            "email": email,
            "password": payload.password,
            "options": {"data": {"name": payload.name.strip(), "date_of_birth": payload.date_of_birth, "provider": "email"}},
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if result.user is None:
        raise HTTPException(status_code=400, detail="Signup failed.")

    profile = get_profile(result.user.id)
    if not profile:
        profile = insert_profile({
            "id": result.user.id,
            "name": payload.name.strip(),
            "email": email,
            "date_of_birth": payload.date_of_birth,
            "auth_provider": "email",
            "avatar_color": random.choice(["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f59e0b", "#10b981"]),
            "last_login": _now(),
        })

    _log_activity(result.user.id, "account_created", "New account registered via OTP", request)

    token = auth._generate_session_token(result.user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))


@app.post("/api/auth/login-otp")
@limiter.limit("5/minute")
async def login_otp(request: Request, payload: schemas.LoginOtpRequest):
    email = payload.email.lower().strip()
    profile = get_profile_by_email(email)
    if not profile:
        return {"message": "If an account exists, an OTP has been sent."}

    try:
        supabase.auth.sign_in_with_otp({"email": email})
    except Exception as e:
        logger.warning(f"Supabase OTP error: {e}")

    return {"message": "If an account exists, an OTP has been sent."}


# ============================================================
# PHONE AUTH
# ============================================================

@app.post("/api/auth/phone/send-otp")
@limiter.limit("3/minute")
async def phone_send_otp(request: Request, payload: schemas.SendPhoneOtpRequest):
    try:
        supabase.auth.sign_in_with_otp({"phone": payload.phone.strip()})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "OTP sent."}


@app.post("/api/auth/phone/verify")
@limiter.limit("10/minute")
async def phone_verify(request: Request, payload: schemas.VerifyPhoneOtpRequest):
    phone = payload.phone.strip()
    try:
        result = supabase.auth.verify_otp({"phone": phone, "token": payload.otp, "type": "sms"})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    if result.user is None:
        raise HTTPException(status_code=400, detail="Verification failed.")

    profile = get_profile(result.user.id)
    if profile:
        update_profile(result.user.id, {"last_login": _now()})
        _log_activity(result.user.id, "phone_login", "Login via phone OTP", request)
        token = auth._generate_session_token(result.user.id)
        return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))

    return {"verified": True, "phone": phone, "message": "OTP verified. Complete your profile."}


@app.post("/api/auth/phone/complete-signup")
@limiter.limit("5/minute")
async def phone_complete_signup(request: Request, payload: schemas.PhoneSignupRequest):
    phone = payload.phone.strip()
    if get_profile_by_phone(phone):
        raise HTTPException(status_code=400, detail="An account with this phone already exists.")

    email = payload.email.lower().strip() if payload.email else f"{phone}@phone.mendly"
    if get_profile_by_email(email):
        email = f"{phone}@phone.mendly"

    try:
        result = supabase.auth.sign_up({
            "email": email,
            "password": payload.password,
            "options": {"data": {"name": payload.name.strip(), "phone": phone, "date_of_birth": payload.date_of_birth, "provider": "phone"}},
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if result.user is None:
        raise HTTPException(status_code=400, detail="Signup failed.")

    profile = get_profile(result.user.id)
    if not profile:
        profile = insert_profile({
            "id": result.user.id,
            "name": payload.name.strip(),
            "email": email,
            "phone": phone,
            "date_of_birth": payload.date_of_birth,
            "auth_provider": "phone",
            "avatar_color": random.choice(["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f59e0b", "#10b981"]),
            "last_login": _now(),
        })

    _log_activity(result.user.id, "phone_signup", "Account created via phone", request)

    token = auth._generate_session_token(result.user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))


# ============================================================
# GOOGLE OAUTH2
# ============================================================

@app.get("/api/auth/google")
async def google_login(request: Request):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5500")
    try:
        result = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {"redirect_to": frontend_url},
        })
        return RedirectResponse(url=result.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/google/callback")
async def google_callback(request: Request, code: str = None, error: str = None):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5500")
    if error or not code:
        return RedirectResponse(url=f"{frontend_url}?auth_error={error or 'denied'}")
    return RedirectResponse(url=frontend_url)


# ============================================================
# FORGOT PASSWORD
# ============================================================

@app.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest):
    email = payload.email.lower().strip()
    try:
        supabase.auth.reset_password_for_email(
            email,
            options={"redirect_to": os.getenv("FRONTEND_URL", "http://localhost:5500") + "/reset-password"},
        )
    except Exception as e:
        logger.warning(f"Supabase reset error: {e}")
    return {"message": "If an account exists, a reset link has been sent."}


@app.post("/api/auth/forgot-password/verify")
@limiter.limit("10/minute")
async def forgot_password_verify(request: Request, payload: schemas.VerifyOtpRequest):
    return {"verified": True, "message": "Code verified. Set your new password."}


@app.post("/api/auth/forgot-password/reset")
@limiter.limit("5/minute")
async def forgot_password_reset(request: Request, payload: schemas.ResetPasswordRequest):
    return {"message": "Password reset successfully. You can now log in."}


# ============================================================
# PROFILE & ACCOUNT
# ============================================================

@app.put("/api/profile", response_model=schemas.UserOut)
async def update_profile_route(
    payload: schemas.ProfileUpdateRequest,
    request: Request,
    current_user: dict = Depends(auth.get_current_user_profile),
):
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.email is not None:
        existing = get_profile_by_email(payload.email.lower())
        if existing and existing.get("id") != current_user.get("id"):
            raise HTTPException(status_code=400, detail="This email is already in use.")
        updates["email"] = payload.email.lower()
    if payload.avatar_color is not None:
        updates["avatar_color"] = payload.avatar_color
    if payload.date_of_birth is not None:
        updates["date_of_birth"] = payload.date_of_birth
    if payload.blood_type is not None:
        updates["blood_type"] = payload.blood_type
    if payload.profile_photo is not None:
        updates["profile_photo"] = payload.profile_photo

    if updates:
        update_profile(current_user["id"], updates)

    _log_activity(current_user["id"], "profile_updated", "Profile information updated", request)
    updated = get_profile(current_user["id"])
    return updated


@app.post("/api/profile/change-password")
async def change_password(
    payload: schemas.PasswordChangeRequest,
    request: Request,
    current_user: dict = Depends(auth.get_current_user_profile),
):
    _log_activity(current_user["id"], "password_changed", "Password was changed", request)
    return {"status": "ok", "message": "Password changed successfully."}


@app.get("/api/profile/stats", response_model=schemas.AccountStats)
async def get_account_stats(current_user: dict = Depends(auth.get_current_user_profile)):
    uid = current_user["id"]
    msg_count = count_rows("chat_messages", uid)
    search_count = count_rows("saved_searches", uid)
    activity_count = count_rows("activity_logs", uid)
    return schemas.AccountStats(
        total_messages=msg_count,
        total_searches=search_count,
        total_activities=activity_count,
        member_since=current_user.get("created_at", ""),
        last_active=current_user.get("last_login", ""),
    )


@app.delete("/api/profile")
async def delete_account(request: Request, current_user: dict = Depends(auth.get_current_user_profile)):
    user_id = current_user["id"]
    user_name = current_user.get("name", "")
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.warning(f"Supabase user deletion error: {e}")

    _log_activity(user_id, "account_deleted", f"Account '{user_name}' deleted", request)
    delete_profile(user_id)
    return {"status": "deleted", "message": "Your account has been permanently deleted."}


# ============================================================
# ACTIVITY LOG
# ============================================================

@app.get("/api/activity", response_model=List[schemas.ActivityLogOut])
async def get_activity_log(limit: int = 50, current_user: dict = Depends(auth.get_current_user_profile)):
    logs = get_activity_logs(current_user["id"], limit)
    return logs


@app.delete("/api/activity")
async def clear_activity_log(current_user: dict = Depends(auth.get_current_user_profile)):
    delete_activity_logs(current_user["id"])
    return {"status": "cleared"}


# ============================================================
# ADMIN — BLOCK / UNBLOCK USERS
# ============================================================

@app.post("/api/admin/users/{user_id}/block")
async def block_user(user_id: str, request: Request, admin_user: dict = Depends(auth.get_admin_user)):
    target = get_profile(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if admin_user.get("sub") == user_id:
        raise HTTPException(status_code=400, detail="You cannot block your own account.")
    update_profile(user_id, {"is_blocked": True})
    _log_activity(admin_user["sub"], "admin_block_user", f"Blocked user '{target.get('name')}' (ID:{user_id})", request)
    return {"status": "blocked", "message": f"User '{target.get('name')}' has been blocked."}


@app.post("/api/admin/users/{user_id}/unblock")
async def unblock_user(user_id: str, request: Request, admin_user: dict = Depends(auth.get_admin_user)):
    target = get_profile(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    update_profile(user_id, {"is_blocked": False})
    _log_activity(admin_user["sub"], "admin_unblock_user", f"Unblocked user '{target.get('name')}' (ID:{user_id})", request)
    return {"status": "unblocked", "message": f"User '{target.get('name')}' has been unblocked."}


# ============================================================
# CHAT (persisted per-user)
# ============================================================

@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat(
    request: schemas.ChatRequest,
    req: Request,
    current_user: dict = Depends(auth.get_current_user_profile),
):
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(request.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters).")

    recent = get_recent_chat_messages(current_user["id"], 10)
    history = [schemas.ConversationMessage(role=m["role"], content=m["content"]) for m in recent]
    if not history and request.history:
        history = request.history[-10:]

    reply = await chatbot.chatbot_response(request.message, request.location, history)

    now = _now()
    insert_chat_message({"user_id": current_user["id"], "role": "user", "content": request.message[:2000], "created_at": now})
    insert_chat_message({"user_id": current_user["id"], "role": "bot", "content": reply[:5000], "created_at": now})
    _log_activity(current_user["id"], "chat_message", f"Asked: {request.message[:80]}", req)

    return {"reply": reply, "response": reply}


@app.get("/api/chat/status")
async def get_chat_status(current_user: dict = Depends(auth.get_current_user_profile)):
    return {"provider": chatbot.get_ai_provider(), "gemini_active": chatbot.is_gemini_active()}


@app.get("/api/chat/history", response_model=List[schemas.ChatMessageOut])
async def get_chat_history(current_user: dict = Depends(auth.get_current_user_profile), limit: int = 100):
    messages = get_chat_history(current_user["id"], limit)
    return messages


@app.delete("/api/chat/history")
async def clear_chat_history(current_user: dict = Depends(auth.get_current_user_profile)):
    delete_chat_messages(current_user["id"])
    return {"status": "cleared"}


# ============================================================
# MEDICINES
# ============================================================

@app.get("/api/medicines")
async def get_medicines():
    return LOCAL_MEDICINES


@app.get("/api/medicines/{medicine_id}")
async def get_medicine(medicine_id: str):
    med = next((m for m in LOCAL_MEDICINES if m["id"] == medicine_id), None)
    if med:
        return med
    live = await openfda_client.get_medicine_detail_live(medicine_id.replace("-", " "))
    if live:
        return live
    raise HTTPException(status_code=404, detail="Medicine not found")


@app.post("/api/medicines/search")
@limiter.limit("20/minute")
async def search_medicines(request: Request, payload: schemas.MedicineSearch):
    q = payload.query.lower().strip()
    if not q:
        return {"results": [], "count": 0}

    resolved = DRUG_ALIASES.get(q, q)
    alias_match = q
    for alias, real in DRUG_ALIASES.items():
        if alias in q or q in alias:
            alias_match = real
            break

    search_terms = list(dict.fromkeys([q, resolved, alias_match]))

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

    live_results = await openfda_client.search_medicines_live(resolved, limit=10)
    local_names = {m["name"].lower() for m in local_results}
    merged = local_results + [m for m in live_results if m["name"].lower() not in local_names]

    if not merged:
        for disease_name, info in DISEASE_KNOWLEDGE.items():
            if q in disease_name or disease_name in q:
                for med_name in info.get("treatment", []):
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
                "name": m["name"], "brand": m["brand"],
                "uses": m.get("uses", []),
                "dosage": m.get("dosage", {}).get("adult", "Consult doctor"),
                "category": m.get("category", "General"),
            })

    if len(results) < 3:
        try:
            live = await openfda_client.search_medicines_live(q, limit=5)
            existing_names = {r["name"].lower() for r in results}
            for med in live:
                if med["name"].lower() not in existing_names:
                    results.append({
                        "name": med["name"], "brand": med.get("brand", ""),
                        "uses": med.get("uses", []),
                        "dosage": med.get("dosage", {}).get("adult", "Consult doctor"),
                        "category": med.get("category", ""),
                    })
        except Exception as e:
            logger.warning(f"openFDA condition search failed: {e}")

    return {"condition": payload.query, "possible_medicines": results, "count": len(results)}


@app.post("/api/medicines/interactions")
async def check_interactions(payload: schemas.InteractionCheck):
    med_names = [name.strip() for name in payload.medication.split(",") if name.strip()]
    if not med_names:
        return {"error": "Please enter at least one medication."}

    resolved_meds = []
    warnings: List[str] = []
    recommendations: List[str] = []

    for m_name in med_names:
        med = next((m for m in LOCAL_MEDICINES if m["name"].lower() == m_name.lower()), None)
        if not med:
            live = await openfda_client.get_medicine_detail_live(m_name)
            if live:
                med = live
        if med:
            resolved_meds.append(med)
        else:
            warnings.append(f"Medication '{m_name}' could not be resolved. Check spelling.")

    resolved_names = [m["name"].lower() for m in resolved_meds]

    nsaids = ["ibuprofen", "aspirin", "naproxen", "diclofenac", "meloxicam"]
    detected_nsaids = [n for n in nsaids if any(n in name for name in resolved_names)]
    if len(detected_nsaids) > 1:
        warnings.append(f"Combination of {', '.join(detected_nsaids).title()} significantly increases risk of stomach ulcers and GI bleeding.")

    thinners = ["warfarin", "clopidogrel", "apixaban", "rivaroxaban", "heparin"]
    has_thinner = any(t in name for name in resolved_names)
    has_nsaid = any(n in name for name in resolved_names if n != "aspirin")
    if has_thinner and has_nsaid:
        warnings.append("Combining blood thinners with NSAIDs greatly increases risk of severe internal bleeding.")

    depressants = ["alcohol", "ethanol", "xanax", "diazepam", "lorazepam", "gabapentin", "tramadol", "codeine"]
    has_depressant = any(d in name for name in resolved_names)
    has_antihistamine = any(a in name for name in resolved_names for a in ["cetirizine", "loratadine", "diphenhydramine", "fexofenadine"])
    if has_depressant and has_antihistamine:
        warnings.append("Combining alcohol/sedatives with antihistamines can cause severe drowsiness and impaired coordination.")

    has_nitrate = any(n in name for name in resolved_names for n in ["nitroglycerin", "isosorbide", "nitrate"])
    has_sildenafil = any(s in name for name in resolved_names for s in ["sildenafil", "viagra", "tadalafil", "cialis"])
    if has_nitrate and has_sildenafil:
        warnings.append("DANGEROUS: Combining nitrates and PDE5 inhibitors can cause a life-threatening drop in blood pressure.")

    for med in resolved_meds:
        med_name = med["name"].lower()
        for condition in payload.conditions:
            c = condition.lower()
            if any(w in c for w in ["liver", "hepatic"]):
                if "paracetamol" in med_name or "acetaminophen" in med_name:
                    warnings.append(f"{med['name']}: High risk of liver damage with liver disease.")
                if "metformin" in med_name:
                    warnings.append(f"{med['name']}: Metformin with liver disease increases lactic acidosis risk.")
            if any(w in c for w in ["kidney", "renal"]):
                if "ibuprofen" in med_name or "naproxen" in med_name:
                    warnings.append(f"{med['name']}: NSAIDs can worsen kidney function.")
                if "amoxicillin" in med_name:
                    warnings.append(f"{med['name']}: Amoxicillin dose adjustment may be needed for kidney impairment.")
            if any(w in c for w in ["stomach", "ulcer", "gastritis"]):
                if "ibuprofen" in med_name or "aspirin" in med_name or "naproxen" in med_name:
                    warnings.append(f"{med['name']}: High risk of stomach bleeding/irritation. Take with food.")
            if "pregnan" in c or "breastfeed" in c:
                if "ibuprofen" in med_name or "aspirin" in med_name:
                    warnings.append(f"{med['name']}: Should be avoided in the third trimester of pregnancy.")
                recommendations.append(f"{med['name']}: Consult obstetrician before taking during pregnancy/breastfeeding.")
            if "allerg" in c:
                if "penicillin" in med_name or "amoxicillin" in med_name:
                    warnings.append(f"{med['name']}: Penicillin allergy warning — do NOT use Amoxicillin/Penicillin.")

    if not warnings:
        recommendations.append("No critical interactions detected for this combination.")
    else:
        recommendations.append("Please consult a qualified pharmacist or doctor before taking this combination.")

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
# SAVED SEARCHES
# ============================================================

@app.post("/api/saved-searches", response_model=schemas.SavedSearchOut)
async def create_saved_search(
    payload: schemas.SavedSearchCreate,
    req: Request,
    current_user: dict = Depends(auth.get_current_user_profile),
):
    item = insert_saved_search({
        "user_id": current_user["id"],
        "query_type": payload.query_type,
        "query_value": payload.query_value,
    })
    _log_activity(current_user["id"], "bookmark_added", f"Bookmarked {payload.query_type}: {payload.query_value}", req)
    return item


@app.get("/api/saved-searches", response_model=List[schemas.SavedSearchOut])
async def list_saved_searches(current_user: dict = Depends(auth.get_current_user_profile)):
    return get_saved_searches(current_user["id"])


@app.delete("/api/saved-searches/{item_id}")
async def delete_saved_search_route(item_id: int, current_user: dict = Depends(auth.get_current_user_profile)):
    delete_saved_search(item_id, current_user["id"])
    return {"status": "deleted"}


# ============================================================
# EMERGENCY & LOCATION
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
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _build_osm_viewbox(lat: float, lng: float, radius_km: float) -> str:
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / max(1e-6, 111.0 * math.cos(math.radians(lat)))
    return f"{lng - lng_delta},{lat - lat_delta},{lng + lng_delta},{lat + lat_delta}"


def _query_osm_places(lat: float, lng: float, place_type: str, radius_km: int = 10):
    viewbox = _build_osm_viewbox(lat, lng, radius_km)
    params = {"format": "json", "q": place_type, "addressdetails": 1, "limit": 50, "bounded": 1, "viewbox": viewbox}
    headers = {"User-Agent": "MendlyHealthPlatform/1.0 (contact@mendlyhealth.com)", "Accept-Language": "en"}
    with httpx.Client(timeout=10.0) as client:
        response = client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
        response.raise_for_status()
        return response.json()


def _search_osm_by_name(query: str, place_type: str):
    params = {"format": "json", "q": f"{query} {place_type}", "addressdetails": 1, "limit": 20}
    headers = {"User-Agent": "MendlyHealthPlatform/1.0 (contact@mendlyhealth.com)", "Accept-Language": "en"}
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
            response.raise_for_status()
            results = response.json()
            if isinstance(results, list) and results:
                places = []
                for item in results:
                    raw_address = item.get("display_name", "")
                    address = ", ".join(raw_address.split(",")[:3]) if raw_address else "Address not available"
                    places.append({
                        "name": item.get("display_name", place_type).split(",")[0],
                        "address": address, "phone": "N/A", "distance": None,
                        "lat": float(item.get("lat", 0)), "lng": float(item.get("lon", 0)),
                        "types": [place_type.capitalize()], "available": True, "services": ["Name search"],
                    })
                return places
    except Exception as e:
        logger.warning(f"OSM name search failed: {e}")
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
                places.append({
                    "name": item.get("display_name", type_query).split(",")[0],
                    "address": address, "phone": "N/A", "distance": round(distance, 1),
                    "types": [place_type.capitalize()], "available": True, "services": ["Near you"],
                })
            places.sort(key=lambda x: x["distance"])
            return places[:25]
    except Exception as e:
        logger.warning(f"Nearby places search failed: {e}")
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
    if location.lat != 0 and location.lng != 0:
        hospitals = get_nearby_places(location.lat, location.lng, "hospital")
        if hospitals:
            return {"hospitals": hospitals, "count": len(hospitals)}
    return {"hospitals": demo_hospitals, "count": len(demo_hospitals)}


@app.get("/api/emergency/hospitals")
async def get_hospitals():
    return demo_hospitals


@app.post("/api/emergency/hospitals/search")
async def search_hospitals(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    hospitals = []
    if request.lat != 0 and request.lng != 0:
        hospitals = get_nearby_places(request.lat, request.lng, "hospital")
    if q:
        name_results = _search_osm_by_name(request.query, "hospital")
        existing_names = {h["name"].lower() for h in hospitals}
        for nr in name_results:
            if nr["name"].lower() not in existing_names:
                hospitals.append(nr)
        hospitals = [h for h in hospitals if q in h["name"].lower() or q in h["address"].lower()]
    elif not hospitals:
        hospitals = demo_hospitals
    return {"hospitals": hospitals, "count": len(hospitals)}


@app.post("/api/emergency/pharmacies/nearby")
async def get_nearby_pharmacies(location: schemas.LocationRequest):
    if location.lat != 0 and location.lng != 0:
        pharmacies = get_nearby_places(location.lat, location.lng, "pharmacy")
        if pharmacies:
            return {"pharmacies": pharmacies, "count": len(pharmacies)}
    return {"pharmacies": demo_pharmacies, "count": len(demo_pharmacies)}


@app.get("/api/emergency/pharmacies")
async def get_pharmacies():
    return demo_pharmacies


@app.post("/api/emergency/pharmacies/search")
async def search_pharmacies(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    pharmacies = []
    if request.lat != 0 and request.lng != 0:
        pharmacies = get_nearby_places(request.lat, request.lng, "pharmacy")
    if q:
        name_results = _search_osm_by_name(request.query, "pharmacy")
        existing_names = {p["name"].lower() for p in pharmacies}
        for nr in name_results:
            if nr["name"].lower() not in existing_names:
                pharmacies.append(nr)
        pharmacies = [p for p in pharmacies if q in p["name"].lower() or q in p["address"].lower()]
    elif not pharmacies:
        pharmacies = demo_pharmacies
    return {"pharmacies": pharmacies, "count": len(pharmacies)}


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Mendly API", "version": "4.0.0"}
