from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.transactions import router as transactions_router

app = FastAPI(
    title="FinTrack API",
    description="Personal finance tracking — USD + ETB, AI advisor",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    transactions_router,
    prefix="/transactions",
    tags=["transactions"]
)

@app.get("/")
def root():
    return {
        "app": "FinTrack API",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/health")
def health():
    return {"status": "ok"}