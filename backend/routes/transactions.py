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


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = db.execute(text("""
        SELECT
          COALESCE(SUM(CASE WHEN type='income'
            THEN amount ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type='expense'
            THEN amount ELSE 0 END), 0) AS total_expense,
          COALESCE(SUM(CASE WHEN cost_type='fixed'
            THEN amount ELSE 0 END), 0) AS fixed_costs,
          COALESCE(SUM(CASE WHEN cost_type='accidental'
            THEN amount ELSE 0 END), 0) AS accidental_costs,
          COUNT(*) AS total_count
        FROM transactions
        WHERE user_id = :user_id
    """), {"user_id": current_user["id"]})
    row = dict(result.fetchone()._mapping)
    row["balance"] = float(row["total_income"]) - float(row["total_expense"])
    return row


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