import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

if SUPABASE_URL:
    SUPABASE_ISSUER = f"{SUPABASE_URL}/auth/v1"
else:
    SUPABASE_ISSUER = ""

security = HTTPBearer(auto_error=False)


def _verify_supabase_token(token: str) -> dict:
    from jose import jwt, JWTError

    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="Supabase JWT not configured")

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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _verify_supabase_token(credentials.credentials)


async def get_current_user_id(user: dict = Depends(get_current_user)) -> str:
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: no user ID")
    return user_id


async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    from .database import get_profile

    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    profile = get_profile(user_id)
    if not profile or not profile.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


def get_current_user_profile(user: dict = Depends(get_current_user)):
    from .database import get_profile

    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    profile = get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=401, detail="User not found.")
    if profile.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Your account has been blocked.")
    return profile


def _generate_session_token(user_id: str) -> str:
    import time
    from jose import jwt

    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "iss": SUPABASE_ISSUER if SUPABASE_ISSUER else "mendly",
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400,
        "role": "authenticated",
    }
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm="HS256")
