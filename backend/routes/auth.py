from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models.user import UserCreate, UserLogin, UserOut, TokenResponse
from security import hash_password, verify_password, \
                     create_access_token, decode_token
import uuid

router = APIRouter()
bearer = HTTPBearer()

# ── REGISTER ──────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # check if email already exists
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": user.email}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400,
                            detail="Email already registered")

    user_id = str(uuid.uuid4())
    hashed = hash_password(user.password)

    db.execute(text("""
        INSERT INTO users (id, name, email, password_hash, default_currency)
        VALUES (:id, :name, :email, :password_hash, :default_currency)
    """), {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password_hash": hashed,
        "default_currency": user.default_currency,
    })
    db.commit()

    token = create_access_token({"sub": user_id})
    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=user_id,
            name=user.name,
            email=user.email,
            default_currency=user.default_currency
        )
    )

# ── LOGIN ─────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": credentials.email}
    ).fetchone()

    if not user or not verify_password(
        credentials.password, user.password_hash
    ):
        raise HTTPException(status_code=401,
                            detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=str(user.id),
            name=user.name,
            email=user.email,
            default_currency=user.default_currency
        )
    )

# ── GET CURRENT USER ──────────────────────────────────────
@router.get("/me", response_model=UserOut)
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
):
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.execute(
        text("SELECT * FROM users WHERE id = :id"),
        {"id": payload["sub"]}
    ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        default_currency=user.default_currency
    )