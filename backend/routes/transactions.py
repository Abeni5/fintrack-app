from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models.transaction import TransactionCreate, TransactionOut
from dependencies import get_current_user
from typing import List, Optional
import uuid

router = APIRouter()


def row_to_dict(row) -> dict:
    d = dict(row._mapping)
    d["id"] = str(d["id"])
    if d.get("user_id"):
        d["user_id"] = str(d["user_id"])
    return d


@router.post("/", response_model=TransactionOut)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    tx_id = str(uuid.uuid4())
    result = db.execute(text("""
        INSERT INTO transactions
        (id, user_id, amount, currency, type,
         cost_type, category, note, transaction_date)
        VALUES
        (:id, :user_id, :amount, :currency, :type,
         :cost_type, :category, :note, :transaction_date)
        RETURNING *
    """), {
        "id": tx_id,
        "user_id": current_user["id"],
        "amount": transaction.amount,
        "currency": transaction.currency,
        "type": transaction.type,
        "cost_type": transaction.cost_type,
        "category": transaction.category,
        "note": transaction.note,
        "transaction_date": transaction.transaction_date,
    })
    db.commit()
    return row_to_dict(result.fetchone())


# ─────────────────────────────────────────────────────────────────────────────
# Replace the existing /summary endpoint in backend/routes/transactions.py
# with this version. It correctly separates ETB and USD transactions.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = db.execute(text("""
        SELECT
          currency,
          COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expense,
          COALESCE(SUM(CASE WHEN cost_type='fixed' THEN amount ELSE 0 END), 0) AS fixed_costs,
          COALESCE(SUM(CASE WHEN cost_type='accidental' THEN amount ELSE 0 END), 0) AS accidental_costs,
          COUNT(*) AS total_count
        FROM transactions
        WHERE user_id = :user_id
        GROUP BY currency
    """), {"user_id": current_user["id"]})

    rows = result.fetchall()

    # Initialize both currencies at zero in case one has no transactions yet
    etb = {"total_income": 0, "total_expense": 0, "fixed_costs": 0, "accidental_costs": 0, "total_count": 0}
    usd = {"total_income": 0, "total_expense": 0, "fixed_costs": 0, "accidental_costs": 0, "total_count": 0}

    for row in rows:
        data = dict(row._mapping)
        currency = data.pop("currency")
        values = {k: float(v) if k != "total_count" else int(v) for k, v in data.items()}
        if currency == "ETB":
            etb.update(values)
        elif currency == "USD":
            usd.update(values)

    # Combined totals across both currencies — for backward compatibility only.
    # NOTE: this mixed total is NOT meaningful for display (different currencies
    # summed together) and is kept only so older code that reads `summary.balance`
    # doesn't crash. The frontend should use balance_etb / balance_usd instead.
    combined_income = etb["total_income"] + usd["total_income"]
    combined_expense = etb["total_expense"] + usd["total_expense"]

    return {
        # Per-currency breakdown — USE THESE in the frontend
        "balance_etb": etb["total_income"] - etb["total_expense"],
        "total_income_etb": etb["total_income"],
        "total_expense_etb": etb["total_expense"],
        "fixed_costs_etb": etb["fixed_costs"],
        "accidental_costs_etb": etb["accidental_costs"],

        "balance_usd": usd["total_income"] - usd["total_expense"],
        "total_income_usd": usd["total_income"],
        "total_expense_usd": usd["total_expense"],
        "fixed_costs_usd": usd["fixed_costs"],
        "accidental_costs_usd": usd["accidental_costs"],

        # Legacy combined fields (kept for compatibility, not currency-accurate)
        "balance": combined_income - combined_expense,
        "total_income": combined_income,
        "total_expense": combined_expense,
        "fixed_costs": etb["fixed_costs"] + usd["fixed_costs"],
        "accidental_costs": etb["accidental_costs"] + usd["accidental_costs"],
    }


@router.get("/", response_model=List[TransactionOut])
def get_transactions(
    type: Optional[str] = None,
    cost_type: Optional[str] = None,
    currency: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = "SELECT * FROM transactions WHERE user_id = :user_id"
    params = {"user_id": current_user["id"]}
    if type:
        query += " AND type = :type"
        params["type"] = type
    if cost_type:
        query += " AND cost_type = :cost_type"
        params["cost_type"] = cost_type
    if currency:
        query += " AND currency = :currency"
        params["currency"] = currency
    query += " ORDER BY transaction_date DESC"
    result = db.execute(text(query), params)
    return [row_to_dict(row) for row in result]


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: str,
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = db.execute(text("""
        UPDATE transactions SET
          amount=:amount, currency=:currency,
          type=:type, cost_type=:cost_type,
          category=:category, note=:note,
          transaction_date=:transaction_date
        WHERE id=:id AND user_id=:user_id
        RETURNING *
    """), {
        **transaction.model_dump(),
        "id": transaction_id,
        "user_id": current_user["id"]
    })
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404,
                            detail="Transaction not found")
    return row_to_dict(row)


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = db.execute(text("""
        DELETE FROM transactions
        WHERE id=:id AND user_id=:user_id
        RETURNING id
    """), {"id": transaction_id, "user_id": current_user["id"]})
    db.commit()
    if not result.fetchone():
        raise HTTPException(status_code=404,
                            detail="Transaction not found")
    return {"message": "Deleted successfully"}