import os
import random
import string
import requests
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "FinTrack")

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))


def send_otp_email(to_email: str, to_name: str, otp: str):
    """Send OTP via Brevo API"""
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }
    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email, "name": to_name}],
        "subject": f"FinTrack — Your verification code is {otp}",
        "htmlContent": f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#378ADD;margin-bottom:8px;">FinTrack</h2>
          <p style="color:#444;margin-bottom:24px;">Your money. Understood.</p>
          <hr style="border:none;border-top:1px solid #eee;margin-bottom:24px;">
          <p style="color:#333;font-size:16px;">Hi {to_name},</p>
          <p style="color:#333;font-size:15px;">Enter this code to verify your email address:</p>
          <div style="background:#0D1117;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#378ADD;">{otp}</span>
          </div>
          <p style="color:#888;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color:#888;font-size:13px;">If you didn't create a FinTrack account, ignore this email.</p>
        </div>
        """,
    }

    # DEBUG: print env vars (masked) and full Brevo response to Render logs
    print(f"[OTP DEBUG] Sender email: {BREVO_SENDER_EMAIL}")
    print(f"[OTP DEBUG] API key present: {bool(BREVO_API_KEY)}, length: {len(BREVO_API_KEY) if BREVO_API_KEY else 0}")
    print(f"[OTP DEBUG] Sending to: {to_email}")

    response = requests.post(url, json=payload, headers=headers)

    print(f"[OTP DEBUG] Brevo status code: {response.status_code}")
    print(f"[OTP DEBUG] Brevo response body: {response.text}")

    if response.status_code not in (200, 201):
        raise Exception(f"Brevo error: {response.text}")
    return True

# ── Pydantic models ───────────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    email: EmailStr
    name: str = "User"

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str

class ResendOTPRequest(BaseModel):
    email: EmailStr
    name: str = "User"

def ensure_otp_table(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS otp_codes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))
    db.commit()


def ensure_verified_column(db: Session):
    db.execute(text("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE
    """))
    db.commit()

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    ensure_otp_table(db)
    ensure_verified_column(db)

    user = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": req.email}
    ).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")

    db.execute(
        text("DELETE FROM otp_codes WHERE email = :email AND used = FALSE"),
        {"email": req.email}
    )

    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    db.execute(text("""
        INSERT INTO otp_codes (email, code, expires_at, used)
        VALUES (:email, :code, :expires_at, FALSE)
    """), {
        "email": req.email,
        "code": otp,
        "expires_at": expires_at,
    })
    db.commit()

    print(f"[OTP DEBUG] Generated OTP {otp} for {req.email}")  # remove after debugging

    try:
        send_otp_email(req.email, req.name, otp)
    except Exception as e:
        print(f"[OTP DEBUG] send_otp_email raised: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"message": "OTP sent successfully", "expires_in_minutes": 10}


@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    ensure_otp_table(db)
    ensure_verified_column(db)

    record = db.execute(text("""
        SELECT * FROM otp_codes
        WHERE email = :email AND code = :code AND used = FALSE
        ORDER BY created_at DESC LIMIT 1
    """), {"email": req.email, "code": req.code}).fetchone()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    if datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")

    db.execute(
        text("UPDATE otp_codes SET used = TRUE WHERE id = :id"),
        {"id": record.id}
    )

    result = db.execute(
        text("UPDATE users SET is_verified = TRUE WHERE email = :email"),
        {"email": req.email}
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Email verified successfully", "verified": True}


@router.post("/resend-otp")
def resend_otp(req: ResendOTPRequest, db: Session = Depends(get_db)):
    ensure_otp_table(db)

    recent = db.execute(text("""
        SELECT created_at FROM otp_codes
        WHERE email = :email AND used = FALSE
        ORDER BY created_at DESC LIMIT 1
    """), {"email": req.email}).fetchone()

    if recent:
        seconds_ago = (datetime.utcnow() - recent.created_at).total_seconds()
        if seconds_ago < 30:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {int(30 - seconds_ago)} seconds before requesting a new code"
            )

    return send_otp(SendOTPRequest(email=req.email, name=req.name), db)


@router.get("/check-verified/{email}")
def check_verified(email: str, db: Session = Depends(get_db)):
    ensure_verified_column(db)

    user = db.execute(
        text("SELECT is_verified FROM users WHERE email = :email"),
        {"email": email}
    ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"is_verified": bool(user.is_verified)}