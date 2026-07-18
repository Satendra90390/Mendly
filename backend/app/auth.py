import os
from pathlib import Path
from dotenv import load_dotenv
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from bson import ObjectId
import jwt

# Load .env file
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from . import schemas
from .database import (
    get_profile, get_profile_by_email, get_profile_by_phone,
    insert_profile, update_profile, delete_profile,
    insert_activity_log, get_activity_logs, delete_activity_logs,
    count_rows,
)

security = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise ValueError("JWT_SECRET environment variable is required and must be at least 32 characters")

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def _make_profile_dict(user_id: str, payload: dict, provider: str = "email") -> dict:
    colors = ["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"]
    return {
        "_id": ObjectId(user_id),
        "name": payload.get("name", "").strip(),
        "email": payload.get("email", "").lower(),
        "auth_provider": provider,
        "avatar_color": payload.get("avatar_color") or colors[hash(user_id) % len(colors)],
        "last_login": datetime.now(timezone.utc),
        "is_blocked": False,
        "is_admin": False,
        "phone": payload.get("phone"),
        "date_of_birth": payload.get("date_of_birth"),
        "blood_type": payload.get("blood_type"),
        "profile_photo": payload.get("profile_photo"),
    }


def _now():
    return datetime.now(timezone.utc).isoformat()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required", headers={"WWW-Authenticate": "Bearer"})
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    return payload


async def get_current_user_id(user: dict = Depends(get_current_user)) -> str:
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: no user ID")
    return user_id


async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    profile = await get_profile(user_id)
    if not profile or not profile.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


async def get_current_user_profile(user: dict = Depends(get_current_user)):
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    profile = await get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=401, detail="User not found.")
    if profile.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Your account has been blocked.")
    return profile


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    profile = await get_profile_by_email(email.lower())
    if not profile:
        return None
    if not _verify_password(password, profile.get("password_hash", "")):
        return None
    return profile


async def create_user_token(profile: dict) -> str:
    return create_access_token({"sub": profile["id"], "email": profile["email"], "type": "access"})


# ============================================================
# AUTH ROUTES - to be imported in main.py
# ============================================================

async def signup_route(payload: schemas.SignupRequest, request: Request) -> schemas.TokenResponse:
    existing = await get_profile_by_email(payload.email.lower())
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_id = str(ObjectId())
    password_hash = _hash_password(payload.password)

    profile_data = _make_profile_dict(user_id, {"name": payload.name, "email": payload.email})
    profile_data["password_hash"] = password_hash

    await insert_profile(profile_data)

    token = create_access_token({"sub": user_id})
    await _log_activity(user_id, "account_created", "New account registered", request)

    profile = await get_profile(user_id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))


async def login_route(payload: schemas.LoginRequest, request: Request) -> schemas.TokenResponse:
    profile = await get_profile_by_email(payload.email.lower())
    if not profile:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not _verify_password(payload.password, profile.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if profile.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Your account has been blocked.")

    await update_profile(profile["id"], {"last_login": _now()})
    await _log_activity(profile["id"], "logged_in", "Successful login", request)

    token = create_access_token({"sub": profile["id"]})
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))


async def guest_login_route(request: Request) -> schemas.TokenResponse:
    guest_id = str(ObjectId())
    guest_email = f"guest_{uuid.uuid4().hex[:12]}@mendly.guest"

    profile_data = _make_profile_dict(guest_id, {"name": "Guest User", "email": guest_email}, provider="guest")
    profile_data["password_hash"] = _hash_password(uuid.uuid4().hex)

    await insert_profile(profile_data)

    await _log_activity(guest_id, "guest_login", "Guest session started", request)

    token = create_access_token({"sub": guest_id})
    profile = await get_profile(guest_id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**profile))


async def guest_upgrade_route(payload: schemas.GuestUpgradeRequest, request: Request, current_user: dict = Depends(get_current_user)) -> schemas.TokenResponse:
    if current_user.get("auth_provider") != "guest":
        raise HTTPException(status_code=400, detail="This account is not a guest account.")

    existing = await get_profile_by_email(payload.email.lower())
    if existing and str(existing["id"]) != str(current_user["id"]):
        raise HTTPException(status_code=400, detail="This email is already in use by another account.")

    password_hash = _hash_password(payload.password)
    updates = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "auth_provider": "email",
        "password_hash": password_hash,
    }
    await update_profile(current_user["id"], updates)

    await _log_activity(str(current_user["id"]), "guest_upgraded", "Guest account upgraded to full account", request)

    updated = await get_profile(current_user["id"])
    token = create_access_token({"sub": str(current_user["id"])})
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut(**updated))


async def get_me(current_user: dict = Depends(get_current_user)) -> schemas.UserOut:
    return current_user


async def update_profile_route(payload: schemas.ProfileUpdateRequest, request: Request, current_user: dict = Depends(get_current_user)) -> schemas.UserOut:
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.email is not None:
        existing = await get_profile_by_email(payload.email.lower())
        if existing and str(existing["id"]) != str(current_user["id"]):
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
        await update_profile(current_user["id"], updates)

    await _log_activity(str(current_user["id"]), "profile_updated", "Profile information updated", request)
    updated = await get_profile(current_user["id"])
    return updated


async def change_password(payload: schemas.PasswordChangeRequest, request: Request, current_user: dict = Depends(get_current_user)) -> dict:
    profile = await get_profile(current_user["id"])
    is_guest = profile and profile.get("auth_provider") == "guest"

    if is_guest:
        # Guest users have no real password — skip current password verification
        # Also upgrade the account from guest to email provider
        updates = {
            "password_hash": _hash_password(payload.new_password),
            "auth_provider": "email",
        }
        await update_profile(current_user["id"], updates)
        await _log_activity(str(current_user["id"]), "password_set", "Password set, guest account upgraded", request)
        return {"status": "ok", "message": "Password set successfully. You can now log in with your email and password."}
    else:
        # Regular users must provide correct current password
        if not profile or not _verify_password(payload.current_password, profile.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        await update_profile(current_user["id"], {"password_hash": _hash_password(payload.new_password)})
        await _log_activity(str(current_user["id"]), "password_changed", "Password was changed", request)
        return {"status": "ok", "message": "Password changed successfully."}


async def get_account_stats(current_user: dict = Depends(get_current_user)) -> schemas.AccountStats:
    uid = str(current_user["id"])
    profile = await get_profile(uid)
    msg_count = await count_rows("chat_messages", uid)
    search_count = await count_rows("saved_searches", uid)
    activity_count = await count_rows("activity_logs", uid)
    member_since = profile.get("created_at", "") if profile else ""
    last_active = profile.get("last_login", "") if profile else ""
    if isinstance(member_since, datetime):
        member_since = member_since.isoformat()
    if isinstance(last_active, datetime):
        last_active = last_active.isoformat()
    return schemas.AccountStats(
        total_messages=msg_count,
        total_searches=search_count,
        total_activities=activity_count,
        member_since=str(member_since),
        last_active=str(last_active),
    )


async def delete_account(request: Request, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = str(current_user["id"])
    profile = await get_profile(user_id)
    user_name = profile.get("name", "") if profile else ""
    try:
        await delete_profile(user_id)
    except Exception as e:
        print(f"User deletion error: {e}")
    await _log_activity(user_id, "account_deleted", f"Account '{user_name}' deleted", request)
    return {"status": "deleted", "message": "Your account has been permanently deleted."}


async def get_activity_log(limit: int = 50, current_user: dict = Depends(get_current_user)) -> list:
    return await get_activity_logs(str(current_user["id"]), limit)


async def clear_activity_log(current_user: dict = Depends(get_current_user)) -> dict:
    await delete_activity_logs(str(current_user["id"]))
    return {"status": "cleared"}


async def block_user(user_id: str, request: Request, admin_user: dict = Depends(get_admin_user)) -> dict:
    target = await get_profile(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if str(admin_user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="You cannot block your own account.")
    await update_profile(user_id, {"is_blocked": True})
    await _log_activity(str(admin_user["id"]), "admin_block_user", f"Blocked user '{target.get('name')}' (ID:{user_id})", request)
    return {"status": "blocked", "message": f"User '{target.get('name')}' has been blocked."}


async def unblock_user(user_id: str, request: Request, admin_user: dict = Depends(get_admin_user)) -> dict:
    target = await get_profile(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    await update_profile(user_id, {"is_blocked": False})
    await _log_activity(str(admin_user["id"]), "admin_unblock_user", f"Unblocked user '{target.get('name')}' (ID:{user_id})", request)
    return {"status": "unblocked", "message": f"User '{target.get('name')}' has been unblocked."}


async def _log_activity(user_id: str, action: str, detail: str = "", request: Request = None):
    ip = ""
    if request:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        elif request.client:
            ip = request.client.host
    try:
        await insert_activity_log({
            "user_id": user_id,
            "action": action,
            "detail": detail[:500],
            "ip_address": ip,
        })
    except Exception as e:
        print(f"Activity log failed: {e}")