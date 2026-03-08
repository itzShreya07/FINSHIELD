"""
Fraud Simulation Router — generates high-risk transactions for demo/testing.
POST /api/simulate/rapid-transfer   — 5 transactions in rapid succession
POST /api/simulate/account-takeover — new device + very high amount
POST /api/simulate/geo-anomaly      — impossible-travel pair
"""
import uuid, random, logging
from datetime import datetime
from fastapi import APIRouter
from faker import Faker
from database import SessionLocal
from models import Transaction, Account, RiskScore, FraudAlert
from fraud_engine import assess_transaction

fake = Faker("en_IN")
router = APIRouter(prefix="/api/simulate", tags=["simulation"])
logger = logging.getLogger("finshield.simulate")

LOCATIONS = [
    ("Mumbai",    19.076,  72.877), ("Delhi",     28.613,  77.209),
    ("Chennai",   13.083,  80.270), ("Bengaluru", 12.972,  77.594),
    ("London",    51.507,  -0.127), ("New York",  40.712, -74.005),
    ("Dubai",     25.204,  55.270), ("Singapore",  1.352, 103.819),
    ("Paris",     48.856,   2.352), ("Hyderabad", 17.385,  78.487),
]


def _make_txn(db, sender, receiver, amount, is_new_device=False,
              is_new_recipient=False, geo_mismatch=False,
              location_override=None, txn_prefix="SIM") -> dict:
    """Persist a single simulated transaction with overridden risk flags."""
    loc = location_override or random.choice(LOCATIONS)
    now = datetime.utcnow()
    txn_id = f"{txn_prefix}-{uuid.uuid4().hex[:8].upper()}"

    risk_score, status, breakdown, fraud_reason, behavioral = assess_transaction(
        amount=amount,
        avg_transaction_amount=sender.avg_transaction_amount or 10000,
        is_new_recipient=is_new_recipient,
        is_new_device=is_new_device,
        geo_mismatch=geo_mismatch,
    )

    txn = Transaction(
        id=str(uuid.uuid4()),
        transaction_id=txn_id,
        sender_account_id=sender.id,
        receiver_account_id=receiver.id,
        amount=round(amount, 2),
        timestamp=now,
        location=loc[0], latitude=loc[1], longitude=loc[2],
        device_id=f"DEV-{fake.md5()[:8].upper()}",
        is_new_device=is_new_device,
        is_new_recipient=is_new_recipient,
        geo_mismatch=geo_mismatch,
        behavioral_anomaly=behavioral,
        risk_score=risk_score,
        status=status,
        fraud_reason=fraud_reason,
    )
    db.add(txn)
    db.flush()  # persist txn to DB so its pk is available for FK references

    db.add(RiskScore(
        id=str(uuid.uuid4()), transaction_id=txn.id,
        amount_score=breakdown.get("amount_score", 0.0),
        new_recipient_score=breakdown.get("new_recipient_score", 0.0),
        new_device_score=breakdown.get("new_device_score", 0.0),
        geo_mismatch_score=breakdown.get("geo_mismatch_score", 0.0),
        behavioral_score=breakdown.get("behavioral_score", 0.0),
        total_score=risk_score,
    ))

    if status == "suspicious":
        sev = "critical" if risk_score >= 0.85 else "high" if risk_score >= 0.7 else "medium"
        db.add(FraudAlert(
            id=str(uuid.uuid4()), transaction_id=txn.id,
            alert_type="simulation", severity=sev,
            fraud_reason=f"[SIMULATED] {fraud_reason}",
            risk_score=risk_score,
            recommended_action="Simulated attack — investigate immediately",
            account_id=sender.id,
        ))
        sender.is_flagged = True

    db.commit()
    logger.info("[SIM] %s | risk=%.2f | %s", txn_id, risk_score, status.upper())

    return {
        "transaction_id": txn_id,
        "sender_account": sender.account_number,
        "sender_name": sender.owner_name,
        "receiver_account": receiver.account_number,
        "receiver_name": receiver.owner_name,
        "amount": round(amount, 2),
        "timestamp": now.isoformat(),
        "location": loc[0],
        "risk_score": risk_score,
        "status": status,
        "fraud_reason": fraud_reason,
        "simulation_type": txn_prefix,
    }


def _get_accounts(db):
    accounts = db.query(Account).all()
    if len(accounts) < 2:
        raise ValueError("No accounts found — run seed_data.py first")
    return accounts


@router.post("/rapid-transfer")
def simulate_rapid_transfer():
    """5 high-amount transfers in rapid succession — typical money-mule attack."""
    db = SessionLocal()
    try:
        accounts = _get_accounts(db)
        sender = random.choice(accounts)
        results = []
        for _ in range(5):
            receiver = random.choice([a for a in accounts if a.id != sender.id])
            amount = random.uniform(75000, 200000)  # Very high amounts
            results.append(_make_txn(
                db, sender, receiver, amount,
                is_new_recipient=True,
                txn_prefix="RAPID",
            ))
        return {"simulation": "rapid_transfer", "transactions": results}
    finally:
        db.close()


@router.post("/account-takeover")
def simulate_account_takeover():
    """New device + very high amount + new recipient — account takeover signature."""
    db = SessionLocal()
    try:
        accounts = _get_accounts(db)
        sender = random.choice(accounts)
        receiver = random.choice([a for a in accounts if a.id != sender.id])
        amount = random.uniform(120000, 500000)
        result = _make_txn(
            db, sender, receiver, amount,
            is_new_device=True,
            is_new_recipient=True,
            geo_mismatch=True,
            txn_prefix="ATO",
        )
        return {"simulation": "account_takeover", "transactions": [result]}
    finally:
        db.close()


@router.post("/geo-anomaly")
def simulate_geo_anomaly():
    """Two transactions from opposite ends of the world minutes apart."""
    db = SessionLocal()
    try:
        accounts = _get_accounts(db)
        sender = random.choice(accounts)
        receiver = random.choice([a for a in accounts if a.id != sender.id])
        # loc_a and loc_b are geographically impossible to travel between quickly
        loc_a = ("Mumbai",   19.076,  72.877)
        loc_b = ("New York", 40.712, -74.005)
        t1 = _make_txn(db, sender, receiver, random.uniform(50000, 150000),
                       geo_mismatch=True, location_override=loc_a,
                       txn_prefix="GEO")
        t2 = _make_txn(db, sender, receiver, random.uniform(50000, 150000),
                       geo_mismatch=True, location_override=loc_b,
                       txn_prefix="GEO")
        return {"simulation": "geo_anomaly", "transactions": [t1, t2],
                "note": "Impossible travel: Mumbai → New York in minutes"}
    finally:
        db.close()
