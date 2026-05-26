from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from dependencies import get_current_user
import pandas as pd
from datetime import date, timedelta

router = APIRouter()

def get_user_transactions(user_id: str, db: Session) -> pd.DataFrame:
    result = db.execute(text("""
        SELECT amount, currency, type, cost_type,
               category, transaction_date
        FROM transactions WHERE user_id = :user_id
    """), {"user_id": user_id})
    rows = result.fetchall()
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows, columns=[
        "amount","currency","type",
        "cost_type","category","transaction_date"
    ])
    df["amount"] = df["amount"].astype(float)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    return df

@router.get("/daily")
def daily_report(
    report_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    target = report_date or date.today()
    df = get_user_transactions(current_user["id"], db)
    if df.empty:
        return {"date": str(target), "income": 0, "expense": 0, "balance": 0, "categories": []}
    day_df = df[df["transaction_date"].dt.date == target]
    income = float(day_df[day_df["type"]=="income"]["amount"].sum())
    expense = float(day_df[day_df["type"]=="expense"]["amount"].sum())
    categories = day_df[day_df["type"]=="expense"].groupby("category")["amount"].sum().reset_index().rename(columns={"amount":"total"}).assign(total=lambda x: x["total"].astype(float)).to_dict(orient="records")
    return {"date": str(target), "income": income, "expense": expense, "balance": income - expense, "categories": categories}

@router.get("/weekly")
def weekly_report(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    df = get_user_transactions(current_user["id"], db)
    if df.empty:
        return {"week_start": str(week_start), "week_end": str(today), "days": [], "total_income": 0, "total_expense": 0}
    week_df = df[df["transaction_date"].dt.date >= week_start]
    days = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_df = week_df[week_df["transaction_date"].dt.date == day]
        days.append({"date": str(day), "day": day.strftime("%A"), "income": float(day_df[day_df["type"]=="income"]["amount"].sum()), "expense": float(day_df[day_df["type"]=="expense"]["amount"].sum())})
    return {"week_start": str(week_start), "week_end": str(today), "total_income": float(week_df[week_df["type"]=="income"]["amount"].sum()), "total_expense": float(week_df[week_df["type"]=="expense"]["amount"].sum()), "days": days}

@router.get("/monthly")
def monthly_report(year: int = Query(default=None), month: int = Query(default=None), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    today = date.today()
    year = year or today.year
    month = month or today.month
    df = get_user_transactions(current_user["id"], db)
    if df.empty:
        return {"year": year, "month": month, "income": 0, "expense": 0, "balance": 0, "by_cost_type": {}, "by_category": []}
    month_df = df[(df["transaction_date"].dt.year == year) & (df["transaction_date"].dt.month == month)]
    income = float(month_df[month_df["type"]=="income"]["amount"].sum())
    expense = float(month_df[month_df["type"]=="expense"]["amount"].sum())
    by_cost_type = month_df[month_df["type"]=="expense"].groupby("cost_type")["amount"].sum().astype(float).to_dict()
    by_category = month_df[month_df["type"]=="expense"].groupby("category")["amount"].sum().reset_index().rename(columns={"amount":"total"}).assign(total=lambda x: x["total"].astype(float)).sort_values("total", ascending=False).to_dict(orient="records")
    return {"year": year, "month": month, "income": income, "expense": expense, "balance": income - expense, "by_cost_type": by_cost_type, "by_category": by_category}

@router.get("/categories")
def category_report(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    df = get_user_transactions(current_user["id"], db)
    if df.empty:
        return {"categories": []}
    cat = df[df["type"]=="expense"].groupby("category")["amount"].sum().reset_index().rename(columns={"amount":"total"}).assign(total=lambda x: x["total"].astype(float)).sort_values("total", ascending=False).to_dict(orient="records")
    return {"categories": cat}
