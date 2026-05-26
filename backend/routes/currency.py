from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from dependencies import get_current_user
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import requests, os

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

router = APIRouter()

EXCHANGE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY")

class BlackMarketRate(BaseModel):
    usd_to_etb: float

def fetch_bank_rate() -> float:
    try:
        url = f"https://v6.exchangerate-api.com/v6/{EXCHANGE_API_KEY}/pair/USD/ETB"
        response = requests.get(url, timeout=5)
        data = response.json()
        if data.get("result") == "success":
            return float(data["conversion_rate"])
    except Exception:
        pass
    return None

@router.get("/rates")
def get_rates(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    bank_rate = fetch_bank_rate()
    black_market = db.execute(text("""
        SELECT usd_to_etb, recorded_at
        FROM exchange_rates
        WHERE rate_type = 'black_market'
        AND set_by_user_id = :user_id
        ORDER BY recorded_at DESC LIMIT 1
    """), {"user_id": current_user["id"]}).fetchone()

    return {
        "bank_rate": bank_rate,
        "black_market_rate": float(black_market.usd_to_etb) if black_market else None,
        "black_market_updated": str(black_market.recorded_at) if black_market else None,
        "note": "Bank rate auto-updated. Black market rate set manually by user."
    }

@router.post("/black-market")
def set_black_market_rate(
    rate: BlackMarketRate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    import uuid
    db.execute(text("""
        INSERT INTO exchange_rates
        (id, rate_type, usd_to_etb, set_by_user_id)
        VALUES (:id, 'black_market', :rate, :user_id)
    """), {
        "id": str(uuid.uuid4()),
        "rate": rate.usd_to_etb,
        "user_id": current_user["id"]
    })
    db.commit()
    return {
        "message": "Black market rate saved",
        "usd_to_etb": rate.usd_to_etb
    }

@router.get("/convert")
def convert(
    amount: float,
    from_currency: str,
    rate_type: str = "bank",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if rate_type == "bank":
        rate = fetch_bank_rate()
        if not rate:
            raise HTTPException(status_code=503,
                detail="Bank rate unavailable")
    else:
        row = db.execute(text("""
            SELECT usd_to_etb FROM exchange_rates
            WHERE rate_type = 'black_market'
            AND set_by_user_id = :user_id
            ORDER BY recorded_at DESC LIMIT 1
        """), {"user_id": current_user["id"]}).fetchone()
        if not row:
            raise HTTPException(status_code=404,
                detail="No black market rate set yet")
        rate = float(row.usd_to_etb)

    if from_currency.upper() == "USD":
        converted = amount * rate
        return {"from": amount, "from_currency": "USD",
                "to": round(converted, 2), "to_currency": "ETB",
                "rate": rate, "rate_type": rate_type}
    else:
        converted = amount / rate
        return {"from": amount, "from_currency": "ETB",
                "to": round(converted, 4), "to_currency": "USD",
                "rate": rate, "rate_type": rate_type}
