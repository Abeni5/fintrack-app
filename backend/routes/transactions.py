from fastapi import APIRouter, HTTPException
from models.transactions import TransactionCreate, TransactionOut
from typing import List
import uuid
from datetime import date

router = APIRouter()

transactions_db: List[dict] = []

@router.get("/", response_model=List[TransactionOut])
def get_transactions():
    return transactions_db

@router.post("/", response_model=TransactionOut)
def create_transaction(transaction: TransactionCreate):
    new_transaction = {
        "id": str(uuid.uuid4()),
        "amount": transaction.amount,
        "currency": transaction.currency,
        "type": transaction.type,
        "cost_type": transaction.cost_type,
        "category": transaction.category,
        "note": transaction.note,
        "transaction_date": transaction.transaction_date,
        "amount_in_etb": None,
        "amount_in_usd": None,
    }
    transactions_db.append(new_transaction)
    return new_transaction

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: str):
    global transactions_db
    before = len(transactions_db)
    transactions_db = [t for t in transactions_db
                       if t["id"] != transaction_id]
    if len(transactions_db) == before:
        raise HTTPException(status_code=404,
                            detail="Transaction not found")
    return {"message": "Deleted successfully"}