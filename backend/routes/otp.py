# ─────────────────────────────────────────────────────────────────────────────
# routes/otp.py
# ─────────────────────────────────────────────────────────────────────────────

import os
import random
import string
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client

# Load environment variables FIRST
load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "FinTrack")

# Validate required variables
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")

if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
    raise RuntimeError("❌ Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in .env file")

# Create Supabase client once
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Helpers ──────────────────────────────────────────────────────────────────

def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def send_otp_email(to_email: str, to_name: str, otp: str):
    """Send OTP via Brevo (Sendinblue) API"""
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
          <hr style="border:none;border-top:1px solid #eee;margin-top:24px;">
          <p style="color:#bbb;font-size:12px;text-align:center;">FinTrack — Personal Finance App</p>
        </div>
        """,
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code not in (200, 201):
        raise Exception(f"Brevo API error: {response.text}")
    return True


# ── Pydantic Models ─────────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    email: EmailStr
    name: str = "User"

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str

class ResendOTPRequest(BaseModel):
    email: EmailStr
    name: str = "User"


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/send-otp")
async def send_otp(req: SendOTPRequest):
    # Delete old unused OTPs
    supabase.table("otp_codes").delete().eq("email", req.email).eq("used", False).execute()

    otp = generate_otp()
    expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

    supabase.table("otp_codes").insert({
        "email": req.email,
        "code": otp,
        "expires_at": expires_at,
        "used": False,
    }).execute()

    try:
        send_otp_email(req.email, req.name, otp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP email: {str(e)}")

    return {"message": "OTP sent successfully", "expires_in_minutes": 10}


@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    result = supabase.table("otp_codes") \
        .select("*") \
        .eq("email", req.email) \
        .eq("code", req.code) \
        .eq("used", False) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    otp_record = result.data[0]

    # Check expiration
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    if datetime.utcnow() > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")

    # Mark OTP as used
    supabase.table("otp_codes").update({"used": True}).eq("id", otp_record["id"]).execute()

    # Mark user as verified
    supabase.table("users").update({"is_verified": True}).eq("email", req.email).execute()

    return {"message": "Email verified successfully", "verified": True}


@router.post("/resend-otp")
async def resend_otp(req: ResendOTPRequest):
    # Anti-spam: check last OTP sent
    recent = supabase.table("otp_codes") \
        .select("created_at") \
        .eq("email", req.email) \
        .eq("used", False) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if recent.data:
        last_sent = datetime.fromisoformat(recent.data[0]["created_at"].replace("Z", "+00:00"))
        if (datetime.utcnow() - last_sent).total_seconds() < 30:
            raise HTTPException(status_code=429, detail="Please wait before requesting a new code")

    return await send_otp(SendOTPRequest(email=req.email, name=req.name))


@router.get("/check-verified/{email}")
async def check_verified(email: str):
    result = supabase.table("users").select("is_verified").eq("email", email).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"is_verified": result.data[0].get("is_verified", False)}