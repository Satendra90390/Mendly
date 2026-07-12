import time
import random
import string

OTP_TTL_SECONDS = 300  # 5 minutes
MAX_OTP_ATTEMPTS = 5

# { email: { "code": "123456", "expires": timestamp, "attempts": 0, "purpose": "login"|"signup" } }
_store: dict = {}


def _generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def create_otp(email: str, purpose: str = "login") -> str:
    code = _generate_code()
    _store[email.lower()] = {
        "code": code,
        "expires": time.time() + OTP_TTL_SECONDS,
        "attempts": 0,
        "purpose": purpose,
    }
    return code


def verify_otp(email: str, code: str, purpose: str = "login") -> bool:
    entry = _store.get(email.lower())
    if not entry:
        return False
    if entry["expires"] < time.time():
        _store.pop(email.lower(), None)
        return False
    if entry["attempts"] >= MAX_OTP_ATTEMPTS:
        _store.pop(email.lower(), None)
        return False
    entry["attempts"] += 1
    if entry["code"] != code:
        return False
    _store.pop(email.lower(), None)
    return True


def is_pending(email: str) -> bool:
    entry = _store.get(email.lower())
    if not entry:
        return False
    if entry["expires"] < time.time():
        _store.pop(email.lower(), None)
        return False
    return True


def get_pending_purpose(email: str) -> str | None:
    entry = _store.get(email.lower())
    if not entry:
        return None
    return entry.get("purpose")
