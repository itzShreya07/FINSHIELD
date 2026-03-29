import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from routers import transactions, alerts, behavioral, geo_risk, scam_intel, network_graph, simulate

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinShield API",
    description="AI Financial Scam Early Warning Platform",
    version="1.0.0",
)

# Build allowed origins — include deployed Vercel URL if set
_frontend_url = os.getenv("FRONTEND_URL", "")
_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(alerts.router)
app.include_router(behavioral.router)
app.include_router(geo_risk.router)
app.include_router(scam_intel.router)
app.include_router(network_graph.router)
app.include_router(simulate.router)


@app.get("/")
def root():
    return {"message": "FinShield API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
