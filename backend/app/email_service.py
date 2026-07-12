import os
import httpx

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "Mendly <onboarding@resend.dev>")


def send_otp_email(to_email: str, code: str, purpose: str = "verification") -> bool:
    if not RESEND_API_KEY:
        print(f"\n{'='*50}")
        print(f"  [EMAIL OTP] To: {to_email}")
        print(f"  Code: {code}")
        print(f"  Purpose: {purpose}")
        print(f"{'='*50}\n")
        return False

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4f46e5; margin: 0;">Mendly</h1>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">Your verification code</h2>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">Use this code to complete your {purpose}:</p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; background: white; border-radius: 8px; padding: 16px; border: 2px dashed #e2e8f0;">{code}</div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">This code expires in 5 minutes.</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">If you didn't request this, ignore this email.</p>
    </div>
    """

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={
                "from": FROM_EMAIL,
                "to": [to_email],
                "subject": f"Your Mendly {purpose.title()} Code",
                "html": html,
            },
            timeout=15,
        )
        if resp.status_code == 200:
            print(f"[EMAIL] OTP sent to {to_email}")
            return True
        else:
            print(f"[EMAIL ERROR] {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
