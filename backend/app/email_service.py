import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "Mendly")


def send_otp_email(to_email: str, code: str, purpose: str = "verification") -> bool:
    if not SMTP_USER or not SMTP_PASS:
        print(f"\n{'='*50}")
        print(f"  [EMAIL OTP] To: {to_email}")
        print(f"  Code: {code}")
        print(f"  Purpose: {purpose}")
        print(f"{'='*50}\n")
        return False

    subject = f"Your Mendly {purpose.title()} Code"
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

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"[EMAIL] OTP sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        print(f"\n{'='*50}")
        print(f"  [EMAIL OTP - FALLBACK] To: {to_email}")
        print(f"  Code: {code}")
        print(f"  Purpose: {purpose}")
        print(f"{'='*50}\n")
        return False
