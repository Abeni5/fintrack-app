from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.transactions import router as transactions_router
from routes.auth import router as auth_router
from routes.reports import router as reports_router
from routes.currency import router as currency_router

load_dotenv()

app = FastAPI(
    title="FinTrack API",
    description="Personal finance — USD + ETB, AI advisor",
    version="0.4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(transactions_router, prefix="/transactions", tags=["Transactions"])
app.include_router(reports_router, prefix="/reports", tags=["Reports"])
app.include_router(currency_router, prefix="/currency", tags=["Currency"])

@app.get("/")
def root():
    return {"app": "FinTrack API", "version": "0.4.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}
