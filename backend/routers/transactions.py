"""Transactions router — list, filter, and SSE live stream."""
import asyncio
import json
import uuid
import random
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import Transaction, Account
from fraud_engine import assess_transaction
from faker import Faker

fake = Faker("en_IN")
router = APIRouter(prefix="/api/transactions", tags=["transactions"])

LOCATIONS = [
    ("Mumbai", 19.076, 72.877), ("Delhi", 28.613, 77.209),
    ("Chennai", 13.083, 80.270), ("Bengaluru", 12.972, 77.594),
    ("Hyderabad", 17.385, 78.487), ("London", 51.507, -0.127),
    ("New York", 40.712, -74.005), ("Dubai", 25.204, 55.270),
    ("Singapore", 1.352, 103.819), ("Paris", 48.856, 2.352),
]


def txn_to_dict(txn: Transaction, db: Session):
    sender = db.query(Account).filter(Account.id == txn.sender_account_id).first()
    receiver = db.query(Account).filter(Account.id == txn.receiver_account_id).first()
    return {
        "id": txn.id,
        "transaction_id": txn.transaction_id,
        "sender_account": sender.account_number if sender else "Unknown",
        "sender_name": sender.owner_name if sender else "Unknown",
        "receiver_account": receiver.account_number if receiver else "Unknown",
        "receiver_name": receiver.owner_name if receiver else "Unknown",
        "amount": txn.amount,
        "timestamp": txn.timestamp.isoformat(),
        "location": txn.location,
        "latitude": txn.latitude,
        "longitude": txn.longitude,
        "device_id": txn.device_id,
        "account_age_days": sender.account_age_days if sender else 0,
        "is_new_device": txn.is_new_device,
        "is_new_recipient": txn.is_new_recipient,
        "geo_mismatch": txn.geo_mismatch,
        "behavioral_anomaly": txn.behavioral_anomaly,
        "risk_score": txn.risk_score,
        "status": txn.status,
        "fraud_reason": txn.fraud_reason,
    }


@router.get("/")
def list_transactions(
    status: Optional[str] = Query(None),
    min_risk: Optional[float] = Query(None),
    max_risk: Optional[float] = Query(None),
    location: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).order_by(desc(Transaction.timestamp))
    if status:
        q = q.filter(Transaction.status == status)
    if min_risk is not None:
        q = q.filter(Transaction.risk_score >= min_risk)
    if max_risk is not None:
        q = q.filter(Transaction.risk_score <= max_risk)
    if location:
        q = q.filter(Transaction.location.ilike(f"%{location}%"))
    txns = q.offset(offset).limit(limit).all()
    return [txn_to_dict(t, db) for t in txns]


@router.get("/stats")
def transaction_stats(db: Session = Depends(get_db)):
    total = db.query(Transaction).count()
    suspicious = db.query(Transaction).filter(Transaction.status == "suspicious").count()
    normal = total - suspicious
    amounts = [t.amount for t in db.query(Transaction).all()]
    avg_amount = round(sum(amounts) / len(amounts), 2) if amounts else 0
    return {
        "total": total,
        "suspicious": suspicious,
        "normal": normal,
        "avg_amount": avg_amount,
        "fraud_rate": round(suspicious / total * 100, 1) if total else 0,
    }


def generate_live_transaction(db: Session):
    """Generate a single simulated transaction using DB accounts."""
    accounts = db.query(Account).all()
    if not accounts:
        return None
    sender = random.choice(accounts)
    receiver = random.choice([a for a in accounts if a.id != sender.id])
    loc = random.choice(LOCATIONS)
    amount = random.choice([
        random.uniform(500, 5000),
        random.uniform(5000, 25000),
        random.uniform(25000, 200000),
    ])
    is_new_device = random.random() < 0.25
    is_new_recipient = random.random() < 0.30
    geo_mismatch = random.random() < 0.20

    risk_score, status, _, fraud_reason, behavioral = assess_transaction(
        amount=amount,
        avg_transaction_amount=sender.avg_transaction_amount or 10000,
        is_new_recipient=is_new_recipient,
        is_new_device=is_new_device,
        geo_mismatch=geo_mismatch,
    )

    return {
        "transaction_id": f"TXN{random.randint(90000, 99999):05d}",
        "sender_account": sender.account_number,
        "sender_name": sender.owner_name,
        "receiver_account": receiver.account_number,
        "receiver_name": receiver.owner_name,
        "amount": round(amount, 2),
        "timestamp": datetime.utcnow().isoformat(),
        "location": loc[0],
        "latitude": loc[1],
        "longitude": loc[2],
        "device_id": f"DEV-{fake.md5()[:8].upper()}",
        "account_age_days": sender.account_age_days,
        "is_new_device": is_new_device,
        "is_new_recipient": is_new_recipient,
        "geo_mismatch": geo_mismatch,
        "behavioral_anomaly": behavioral,
        "risk_score": risk_score,
        "status": status,
        "fraud_reason": fraud_reason,
    }


@router.get("/stream")
async def stream_transactions():
    """SSE endpoint — emits a new simulated transaction every 2 seconds."""
    async def event_generator():
        from database import SessionLocal
        db = SessionLocal()
        try:
            count = 0
            while count < 500:
                txn_data = generate_live_transaction(db)
                if txn_data:
                    yield f"data: {json.dumps(txn_data)}\n\n"
                await asyncio.sleep(2)
                count += 1
        finally:
            db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
