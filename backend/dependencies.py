from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from security import decode_token

bearer = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
):
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401,
                            detail="Not authenticated")
    user = db.execute(
        text("SELECT * FROM users WHERE id = :id"),
        {"id": payload["sub"]}
    ).fetchone()
    if not user:
        raise HTTPException(status_code=401,
                            detail="User not found")
    return dict(user._mapping)
