import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)


def _get_supabase():
    from .database import supabase
    return supabase


def _verify_supabase_token(token: str) -> dict:
    supabase = _get_supabase()
    try:
        result = supabase.auth.get_user(token)
        if result.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {
            "sub": result.user.id,
            "email": result.user.email,
            "user_metadata": result.user.user_metadata or {},
            "app_metadata": result.user.app_metadata or {},
        }
    except HTTPException:
        raise
    except Exception as e:
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
