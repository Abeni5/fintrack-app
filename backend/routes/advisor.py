from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from dependencies import get_current_user
import pandas as pd
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
from groq import Groq

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

router = APIRouter()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def load_transactions(user_id: str, db: Session) -> pd.DataFrame:
    result = db.execute(text("""
        SELECT amount, currency, type, cost_type,
               category, transaction_date
        FROM transactions
        WHERE user_id = :user_id
        ORDER BY transaction_date DESC
    """), {"user_id": user_id})
    rows = result.fetchall()
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows, columns=[
        "amount", "currency", "type",
        "cost_type", "category", "transaction_date"
    ])
    df["amount"] = df["amount"].astype(float)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    return df


def build_financial_summary(df: pd.DataFrame, user: dict) -> dict:
    today = date.today()
    expenses = df[df["type"] == "expense"]
    income = df[df["type"] == "income"]
    total_income = float(income["amount"].sum())
    total_expense = float(expenses["amount"].sum())
    balance = total_income - total_expense
    savings_rate = round((balance / total_income * 100), 1) if total_income > 0 else 0
    this_month = df[
        (df["transaction_date"].dt.year == today.year) &
        (df["transaction_date"].dt.month == today.month)
    ]
    month_income = float(this_month[this_month["type"] == "income"]["amount"].sum())
    month_expense = float(this_month[this_month["type"] == "expense"]["amount"].sum())
    by_category = (
        expenses.groupby("category")["amount"]
        .sum().sort_values(ascending=False).head(5).to_dict()
    )
    by_cost_type = expenses.groupby("cost_type")["amount"].sum().to_dict()
    accidental = expenses[expenses["cost_type"] == "accidental"]
    accidental_total = float(accidental["amount"].sum())
    accidental_months = max(accidental["transaction_date"].dt.to_period("M").nunique(), 1) if not accidental.empty else 1
    return {
        "user_name": user.get("name", "User"),
        "default_currency": user.get("default_currency", "ETB"),
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "balance": round(balance, 2),
        "savings_rate_percent": savings_rate,
        "this_month_income": round(month_income, 2),
        "this_month_expense": round(month_expense, 2),
        "this_month_balance": round(month_income - month_expense, 2),
        "top_expense_categories": by_category,
        "by_cost_type": by_cost_type,
        "accidental_monthly_average": round(accidental_total / accidental_months, 2),
        "total_transactions": len(df),
    }


def ask_groq(system_prompt: str, user_message: str) -> str:
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        max_tokens=600,
        temperature=0.7
    )
    return response.choices[0].message.content


SYSTEM_PROMPT = """You are FinTrack's personal financial advisor. You analyze real financial data
and give honest, practical, friendly advice. You speak directly to the user by name.
You are specific — you use their actual numbers. You are encouraging but honest about problems.
Keep responses clear and under 200 words. Use simple language.
The user may have income in both USD and ETB (Ethiopian Birr).
Always acknowledge the dual-currency reality when relevant."""


@router.get("/warnings")
def get_warnings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    df = load_transactions(current_user["id"], db)
    if df.empty:
        return {"warnings": [], "ai_advice": "No transactions found yet. Start adding your income and expenses to get personalized advice."}
    summary = build_financial_summary(df, current_user)
    user_message = f"""
{summary['user_name']}'s financial data:
- Total income: {summary['total_income']} {summary['default_currency']}
- Total expenses: {summary['total_expense']}
- This month income: {summary['this_month_income']}
- This month expense: {summary['this_month_expense']}
- Savings rate: {summary['savings_rate_percent']}%
- Top categories: {summary['top_expense_categories']}
- Cost breakdown: {summary['by_cost_type']}
- Monthly accidental avg: {summary['accidental_monthly_average']}
Identify the top 2-3 spending warnings. Be specific with their numbers."""
    advice = ask_groq(SYSTEM_PROMPT, user_message)
    warnings = []
    expenses = df[df["type"] == "expense"]
    today = date.today()
    this_month = expenses[
        (expenses["transaction_date"].dt.year == today.year) &
        (expenses["transaction_date"].dt.month == today.month)
    ]
    three_months_ago = today - timedelta(days=90)
    past = expenses[expenses["transaction_date"].dt.date >= three_months_ago]
    if not past.empty:
        avg_by_cat = (
            past.groupby(["category", past["transaction_date"].dt.to_period("M")])
            ["amount"].sum().groupby("category").mean()
        )
        current_by_cat = this_month.groupby("category")["amount"].sum()
        for category, current_total in current_by_cat.items():
            if category in avg_by_cat.index:
                avg = avg_by_cat[category]
                if avg > 0 and current_total > avg * 1.2:
                    pct = round(((current_total - avg) / avg) * 100)
                    warnings.append({
                        "category": category,
                        "current_spend": round(float(current_total), 2),
                        "average_spend": round(float(avg), 2),
                        "percent_over": pct
                    })
    return {"warnings": warnings, "count": len(warnings), "ai_advice": advice}


@router.get("/suggestions")
def get_suggestions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    df = load_transactions(current_user["id"], db)
    if df.empty:
        return {"ai_advice": "Add your transactions first to get personalized suggestions."}
    summary = build_financial_summary(df, current_user)
    user_message = f"""
{summary['user_name']}'s data:
- Income: {summary['total_income']} | Expenses: {summary['total_expense']}
- Balance: {summary['balance']} | Savings rate: {summary['savings_rate_percent']}%
- Top categories: {summary['top_expense_categories']}
- Fixed: {summary['by_cost_type'].get('fixed', 0)} | Variable: {summary['by_cost_type'].get('variable', 0)} | Accidental: {summary['by_cost_type'].get('accidental', 0)}
Give 3 specific actionable suggestions using their real numbers."""
    advice = ask_groq(SYSTEM_PROMPT, user_message)
    return {"ai_advice": advice, "summary": summary}


@router.get("/fixed-detector")
def detect_fixed_costs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    df = load_transactions(current_user["id"], db)
    if df.empty:
        return {"detected": [], "ai_advice": "No transactions to analyze yet."}
    expenses = df[df["type"] == "expense"]
    variable = expenses[expenses["cost_type"] == "variable"]
    detected = []
    if not variable.empty:
        variable = variable.copy()
        variable["month"] = variable["transaction_date"].dt.to_period("M")
        cat_months = variable.groupby("category")["month"].nunique()
        recurring = cat_months[cat_months >= 2].index.tolist()
        already_fixed = expenses[expenses["cost_type"] == "fixed"]["category"].unique().tolist()
        detected = [c for c in recurring if c not in already_fixed]
    advice = "All your recurring costs are correctly classified."
    if detected:
        user_message = f"""{current_user.get('name','User')} has these categories appearing every month but NOT marked as fixed: {detected}. Explain why classifying these correctly matters and what they should do. Under 100 words."""
        advice = ask_groq(SYSTEM_PROMPT, user_message)
    return {
        "detected": [{"category": c, "message": f"'{c}' appears every month but is not marked as fixed."} for c in detected],
        "count": len(detected),
        "ai_advice": advice
    }


@router.get("/accidental-average")
def accidental_average(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    df = load_transactions(current_user["id"], db)
    if df.empty:
        return {"monthly_average": 0, "total": 0, "months_tracked": 0, "ai_advice": "No data yet."}
    accidental = df[(df["type"] == "expense") & (df["cost_type"] == "accidental")]
    if accidental.empty:
        return {"monthly_average": 0, "total": 0, "months_tracked": 0, "ai_advice": "No accidental costs recorded yet. Mark unexpected expenses as 'accidental' to track them."}
    total = float(accidental["amount"].sum())
    months = int(accidental["transaction_date"].dt.to_period("M").nunique())
    monthly_avg = round(total / months, 2)
    by_category = (
        accidental.groupby("category")["amount"].sum()
        .reset_index().rename(columns={"amount": "total"})
        .assign(total=lambda x: x["total"].astype(float))
        .sort_values("total", ascending=False).to_dict(orient="records")
    )
    user_message = f"""{current_user.get('name','User')}'s unexpected costs: monthly avg={monthly_avg} {current_user.get('default_currency','ETB')}, total={round(total,2)}, months tracked={months}, categories={by_category}. Advise on emergency fund size using their real numbers. Under 120 words."""
    advice = ask_groq(SYSTEM_PROMPT, user_message)
    return {
        "monthly_average": monthly_avg,
        "total": round(total, 2),
        "months_tracked": months,
        "recommended_buffer": round(monthly_avg * 3, 2),
        "by_category": by_category,
        "ai_advice": advice
    }


@router.post("/chat")
def chat_with_advisor(
    message: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    df = load_transactions(current_user["id"], db)
    summary = build_financial_summary(df, current_user) if not df.empty else {}
    context = f"User financial context: {summary}\n" if summary else ""
    user_message = f"{context}User question: {message.get('message', '')}"
    reply = ask_groq(SYSTEM_PROMPT, user_message)
    return {"reply": reply}