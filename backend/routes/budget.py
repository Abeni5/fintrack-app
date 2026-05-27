from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()


class BudgetSet(BaseModel):
    category: str
    monthly_limit: float
    currency: str = "ETB"


class GoalSet(BaseModel):
    title: str
    target_amount: float
    currency: str = "ETB"
    deadline: Optional[str] = None


class GoalUpdate(BaseModel):
    amount_to_add: float


# ── BUDGET ENDPOINTS ─────────────────────────────────────

@router.post("/set")
def set_budget(
    budget: BudgetSet,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # upsert — update if exists, insert if not
    existing = db.execute(text("""
        SELECT id FROM budgets
        WHERE user_id = :user_id AND category = :category
    """), {"user_id": current_user["id"],
           "category": budget.category}).fetchone()

    if existing:
        db.execute(text("""
            UPDATE budgets
            SET monthly_limit = :limit, currency = :currency
            WHERE user_id = :user_id AND category = :category
        """), {
            "limit": budget.monthly_limit,
            "currency": budget.currency,
            "user_id": current_user["id"],
            "category": budget.category
        })
    else:
        db.execute(text("""
            INSERT INTO budgets (id, user_id, category, monthly_limit, currency)
            VALUES (:id, :user_id, :category, :limit, :currency)
        """), {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "category": budget.category,
            "limit": budget.monthly_limit,
            "currency": budget.currency
        })
    db.commit()
    return {
        "message": "Budget set successfully",
        "category": budget.category,
        "limit": budget.monthly_limit,
        "currency": budget.currency
    }


@router.get("/status")
def get_budget_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from datetime import date
    today = date.today()

    budgets = db.execute(text("""
        SELECT category, monthly_limit, currency
        FROM budgets
        WHERE user_id = :user_id
    """), {"user_id": current_user["id"]}).fetchall()

    if not budgets:
        return {"budgets": [], "message": "No budgets set yet."}

    results = []
    for b in budgets:
        spent = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM transactions
            WHERE user_id = :user_id
            AND category = :category
            AND type = 'expense'
            AND EXTRACT(YEAR FROM transaction_date) = :year
            AND EXTRACT(MONTH FROM transaction_date) = :month
        """), {
            "user_id": current_user["id"],
            "category": b.category,
            "year": today.year,
            "month": today.month
        }).fetchone()

        spent_amount = float(spent.total)
        limit = float(b.monthly_limit)
        remaining = limit - spent_amount
        percent_used = round((spent_amount / limit * 100), 1) if limit > 0 else 0

        results.append({
            "category": b.category,
            "monthly_limit": limit,
            "spent_this_month": spent_amount,
            "remaining": remaining,
            "percent_used": percent_used,
            "currency": b.currency,
            "status": "over" if spent_amount > limit else
                      "warning" if percent_used >= 80 else "ok"
        })

    return {
        "month": today.month,
        "year": today.year,
        "budgets": results,
        "over_budget": [r for r in results if r["status"] == "over"],
        "warning": [r for r in results if r["status"] == "warning"],
        "on_track": [r for r in results if r["status"] == "ok"]
    }


@router.delete("/remove/{category}")
def remove_budget(
    category: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = db.execute(text("""
        DELETE FROM budgets
        WHERE user_id = :user_id AND category = :category
        RETURNING id
    """), {"user_id": current_user["id"], "category": category})
    db.commit()
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": f"Budget for '{category}' removed"}


# ── GOALS ENDPOINTS ──────────────────────────────────────

@router.post("/goals/set")
def set_goal(
    goal: GoalSet,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    goal_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO savings_goals
        (id, user_id, title, target_amount, current_amount, currency, deadline)
        VALUES (:id, :user_id, :title, :target, 0, :currency, :deadline)
    """), {
        "id": goal_id,
        "user_id": current_user["id"],
        "title": goal.title,
        "target": goal.target_amount,
        "currency": goal.currency,
        "deadline": goal.deadline
    })
    db.commit()
    return {
        "message": "Goal created",
        "id": goal_id,
        "title": goal.title,
        "target_amount": goal.target_amount,
        "currency": goal.currency,
        "deadline": goal.deadline
    }


@router.get("/goals/progress")
def get_goals_progress(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    goals = db.execute(text("""
        SELECT id, title, target_amount, current_amount,
               currency, deadline, created_at
        FROM savings_goals
        WHERE user_id = :user_id
        ORDER BY created_at DESC
    """), {"user_id": current_user["id"]}).fetchall()

    if not goals:
        return {"goals": [], "message": "No savings goals set yet."}

    results = []
    for g in goals:
        target = float(g.target_amount)
        current = float(g.current_amount)
        percent = round((current / target * 100), 1) if target > 0 else 0
        results.append({
            "id": str(g.id),
            "title": g.title,
            "target_amount": target,
            "current_amount": current,
            "remaining": round(target - current, 2),
            "percent_complete": percent,
            "currency": g.currency,
            "deadline": str(g.deadline) if g.deadline else None,
            "status": "completed" if current >= target else "in_progress"
        })

    return {
        "goals": results,
        "completed": len([g for g in results if g["status"] == "completed"]),
        "in_progress": len([g for g in results if g["status"] == "in_progress"])
    }


@router.put("/goals/{goal_id}/add")
def add_to_goal(
    goal_id: str,
    update: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = db.execute(text("""
        UPDATE savings_goals
        SET current_amount = current_amount + :amount
        WHERE id = :id AND user_id = :user_id
        RETURNING id, title, target_amount, current_amount
    """), {
        "amount": update.amount_to_add,
        "id": goal_id,
        "user_id": current_user["id"]
    })
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Goal not found")
    target = float(row.target_amount)
    current = float(row.current_amount)
    return {
        "message": "Progress updated",
        "title": row.title,
        "current_amount": current,
        "target_amount": target,
        "percent_complete": round((current / target * 100), 1) if target > 0 else 0,
        "completed": current >= target
    }


@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = db.execute(text("""
        DELETE FROM savings_goals
        WHERE id = :id AND user_id = :user_id
        RETURNING id
    """), {"id": goal_id, "user_id": current_user["id"]})
    db.commit()
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted"}