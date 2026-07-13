import os
import httpx

MSG91_AUTH_KEY = os.getenv("MSG91_AUTH_KEY", "")
MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID", "")
MSG91_API_BASE = "https://api.msg91.com/api/v5"


def send_otp_sms(phone: str, code: str) -> bool:
    if not MSG91_AUTH_KEY:
        print(f"\n{'='*50}")
        print(f"  [SMS OTP] To: {phone}")
        print(f"  Code: {code}")
        print(f"{'='*50}\n")
        return False

    phone_clean = phone.replace(" ", "").replace("-", "")
    if not phone_clean.startswith("+"):
        if phone_clean.startswith("91") and len(phone_clean) > 10:
            phone_clean = "+" + phone_clean
        else:
            phone_clean = "+91" + phone_clean

    payload = {
        "mobile": phone_clean,
        "otp": code,
    }
    if MSG91_TEMPLATE_ID:
        payload["template_id"] = MSG91_TEMPLATE_ID

    try:
        resp = httpx.post(
            f"{MSG91_API_BASE}/otp",
            headers={
                "authkey": MSG91_AUTH_KEY,
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if resp.status_code == 200:
            print(f"[SMS] OTP sent to {phone_clean}")
            return True
        else:
            print(f"[SMS ERROR] {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"[SMS ERROR] {e}")
        return False


def verify_otp_sms(phone: str, code: str) -> bool:
    if not MSG91_AUTH_KEY:
        return False

    phone_clean = phone.replace(" ", "").replace("-", "")
    if not phone_clean.startswith("+"):
        if phone_clean.startswith("91") and len(phone_clean) > 10:
            phone_clean = "+" + phone_clean
        else:
            phone_clean = "+91" + phone_clean

    try:
        resp = httpx.post(
            f"{MSG91_API_BASE}/otp/verify",
            headers={
                "authkey": MSG91_AUTH_KEY,
                "Content-Type": "application/json",
            },
            json={
                "mobile": phone_clean,
                "otp": code,
            },
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("type") == "success"
        return False
    except Exception as e:
        print(f"[SMS VERIFY ERROR] {e}")
        return False
