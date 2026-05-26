from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date

class TransactionCreate(BaseModel):
    amount: float
    currency: Literal["USD", "ETB"]
    type: Literal["income", "expense"]
    cost_type: Literal["fixed", "variable", "accidental"]
    category: str
    note: Optional[str] = None
    transaction_date: date

class TransactionOut(BaseModel):
    id: str
    amount: float
    currency: str
    type: str
    cost_type: str
    category: str
    note: Optional[str]
    transaction_date: date
    amount_in_etb: Optional[float] = None
    amount_in_usd: Optional[float] = None