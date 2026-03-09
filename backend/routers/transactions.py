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
from database import get_db, SessionLocal # Added SessionLocal import
from models import Transaction, Account, RiskScore, FraudAlert # Imported RiskScore, FraudAlert
from fraud_engine import assess_transaction
from faker import Faker
import logging # New import

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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

    # Determine receiver city: pick a different city from LOCATIONS based on txn id
    sender_city = next((name for name, lat, lng in LOCATIONS if lat == round(txn.latitude or 0, 3)), None)
    txn_hash = sum(ord(c) for c in txn.transaction_id) if txn.transaction_id else 0
    recv_city_name, recv_lat, recv_lng = LOCATIONS[txn_hash % len(LOCATIONS)]
    # Avoid same-city arcs: shift by 1 if same
    if recv_city_name == (txn.location or ""):
        recv_city_name, recv_lat, recv_lng = LOCATIONS[(txn_hash + 1) % len(LOCATIONS)]

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
        "receiver_city": recv_city_name,
        "receiver_lat": recv_lat,
        "receiver_lng": recv_lng,
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


def _save_one_transaction() -> dict | None:
    """
    Fully self-contained: opens its own fresh SessionLocal, generates a
    transaction, persists Transaction + RiskScore + FraudAlert, commits,
    closes the session, and returns the dict for the SSE event.

    Key design decisions:
    - No shared session parameter: every call is completely isolated so a
      previous DB error can never poison the next iteration.
    - UUID-based transaction_id: zero possibility of collision.
    """
    db = SessionLocal()
    try:
        accounts = db.query(Account).all()
        if not accounts:
            logger.warning("No accounts found — run seed_data.py first.")
            return None

        sender = random.choice(accounts)
        receiver = random.choice([a for a in accounts if a.id != sender.id])
        loc = random.choice(LOCATIONS)
        amount = random.choice([
            random.uniform(500, 5000),
            random.uniform(5000, 25000),
            random.uniform(25000, 200000),
        ])
        is_new_device   = random.random() < 0.25
        is_new_recipient = random.random() < 0.30
        geo_mismatch    = random.random() < 0.20
        device_id = f"DEV-{fake.md5()[:8].upper()}"
        txn_id    = f"LIVE-{uuid.uuid4().hex[:10].upper()}"  # guaranteed unique
        now = datetime.utcnow()

        risk_score, status, breakdown, fraud_reason, behavioral = assess_transaction(
            amount=amount,
            avg_transaction_amount=sender.avg_transaction_amount or 10000,
            is_new_recipient=is_new_recipient,
            is_new_device=is_new_device,
            geo_mismatch=geo_mismatch,
        )

        txn_row = Transaction(
            id=str(uuid.uuid4()),
            transaction_id=txn_id,
            sender_account_id=sender.id,
            receiver_account_id=receiver.id,
            amount=round(amount, 2),
            timestamp=now,
            location=loc[0],
            latitude=loc[1],
            longitude=loc[2],
            device_id=device_id,
            is_new_device=is_new_device,
            is_new_recipient=is_new_recipient,
            geo_mismatch=geo_mismatch,
            behavioral_anomaly=behavioral,
            risk_score=risk_score,
            status=status,
            fraud_reason=fraud_reason,
        )
        db.add(txn_row)

        rs_row = RiskScore(
            id=str(uuid.uuid4()),
            transaction_id=txn_row.id,
            amount_score=breakdown.get("amount_score", 0.0),
            new_recipient_score=breakdown.get("new_recipient_score", 0.0),
            new_device_score=breakdown.get("new_device_score", 0.0),
            geo_mismatch_score=breakdown.get("geo_mismatch_score", 0.0),
            behavioral_score=breakdown.get("behavioral_score", 0.0),
            total_score=risk_score,
        )
        db.add(rs_row)

        if status == "suspicious":
            sev = "critical" if risk_score >= 0.90 else "high" if risk_score >= 0.80 else "medium"
            action_map = {
                "critical": "Immediately freeze account and escalate to fraud team",
                "high":     "Block transaction and request identity verification",
                "medium":   "Flag for manual review within 24 hours",
            }
            db.add(FraudAlert(
                id=str(uuid.uuid4()),
                transaction_id=txn_row.id,
                alert_type="high_risk",
                severity=sev,
                fraud_reason=fraud_reason,
                risk_score=risk_score,
                recommended_action=action_map[sev],
                account_id=sender.id,
            ))
            sender.is_flagged = True

        db.commit()  # ← commit happens HERE, inside the function
        logger.info(
            "[DB SAVED] %s | %s → %s | ₹%.0f | risk=%.2f | %s",
            txn_id, sender.account_number, receiver.account_number,
            amount, risk_score, status.upper(),
        )

        return {
            "transaction_id": txn_id,
            "sender_account":  sender.account_number,
            "sender_name":     sender.owner_name,
            "receiver_account": receiver.account_number,
            "receiver_name":   receiver.owner_name,
            "amount":          round(amount, 2),
            "timestamp":       now.isoformat(),
            "location":        loc[0],
            "latitude":        loc[1],
            "longitude":       loc[2],
            "device_id":       device_id,
            "account_age_days": sender.account_age_days,
            "is_new_device":   is_new_device,
            "is_new_recipient": is_new_recipient,
            "geo_mismatch":    geo_mismatch,
            "behavioral_anomaly": behavioral,
            "risk_score":      risk_score,
            "status":          status,
            "fraud_reason":    fraud_reason,
        }

    except Exception as exc:
        db.rollback()
        logger.error("[DB ERROR] Failed to save transaction: %s", exc)
        raise
    finally:
        db.close()  # always released, even on error



@router.get("/stream")
async def stream_transactions():
    """
    SSE endpoint — every 2 seconds:
    1. asyncio.to_thread(_save_one_transaction) runs the synchronous DB write
       in a thread pool so the async event loop stays responsive.
    2. _save_one_transaction() opens its OWN fresh session, commits, and closes
       it — a broken session from one iteration cannot affect the next.
    3. The saved transaction is immediately yielded as an SSE event.
    """
    async def event_generator():
        count = 0
        while count < 500:
            try:
                txn_data = await asyncio.to_thread(_save_one_transaction)
                if txn_data:
                    yield f"data: {json.dumps(txn_data)}\n\n"
            except Exception as exc:
                logger.error("Stream iteration error: %s", exc)
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            await asyncio.sleep(2)
            count += 1

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

