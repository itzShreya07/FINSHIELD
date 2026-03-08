"""
Seed script — generates realistic mock data for FinShield.
Run once after creating the DB tables:  python seed_data.py
"""
import uuid, random
from datetime import datetime, timedelta
from faker import Faker
from database import SessionLocal, engine
from models import Base, Account, Device, Transaction, RiskScore, FraudAlert
from fraud_engine import assess_transaction

fake = Faker("en_IN")

LOCATIONS = [
    ("Mumbai", 19.076, 72.877),
    ("Delhi", 28.613, 77.209),
    ("Chennai", 13.083, 80.270),
    ("Bengaluru", 12.972, 77.594),
    ("Hyderabad", 17.385, 78.487),
    ("London", 51.507, -0.127),
    ("New York", 40.712, -74.005),
    ("Dubai", 25.204, 55.270),
    ("Singapore", 1.352, 103.819),
    ("Paris", 48.856, 2.352),
]

ACCOUNT_NAMES = [
    "Arun Kumar", "Priya Sharma", "Rahul Singh", "Sneha Patel",
    "Mohammed Ali", "Ananya Reddy", "Vikram Nair", "Deepika Mehta",
    "Rohan Gupta", "Kavitha Iyer", "Suresh Babu", "Nisha Kapoor",
    "Arjun Verma", "Pooja Joshi", "Ravi Shankar", "Meera Pillai",
]

def create_tables():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def seed():
    create_tables()
    db = SessionLocal()

    # --- Accounts ---
    accounts = []
    for i, name in enumerate(ACCOUNT_NAMES):
        acc = Account(
            id=str(uuid.uuid4()),
            account_number=f"ACC{1000 + i:04d}",
            owner_name=name,
            account_age_days=random.randint(10, 3650),
            country=random.choice(["India", "India", "India", "UK", "US"]),
            avg_transaction_amount=random.uniform(2000, 30000),
            transaction_count=random.randint(5, 500),
            is_flagged=False,
        )
        accounts.append(acc)
    db.add_all(accounts)
    db.commit()

    # --- Devices ---
    devices = []
    for acc in accounts:
        for j in range(random.randint(1, 3)):
            d = Device(
                id=str(uuid.uuid4()),
                device_id=f"DEV-{fake.md5()[:8].upper()}",
                account_id=acc.id,
                device_type=random.choice(["mobile", "desktop", "tablet"]),
                is_new=(j == 2),
            )
            devices.append(d)
    db.add_all(devices)
    db.commit()

    # --- Transactions (historical) ---
    transactions = []
    alerts = []
    risk_scores = []
    now = datetime.utcnow()

    for i in range(120):
        sender = random.choice(accounts)
        receiver = random.choice([a for a in accounts if a.id != sender.id])
        loc = random.choice(LOCATIONS)
        amount = random.choice([
            random.uniform(500, 5000),
            random.uniform(5000, 20000),
            random.uniform(20000, 150000),
        ])
        is_new_device = random.random() < 0.25
        is_new_recipient = random.random() < 0.30
        geo_mismatch = random.random() < 0.20

        risk_score, status, breakdown, fraud_reason, behavioral = assess_transaction(
            amount=amount,
            avg_transaction_amount=sender.avg_transaction_amount,
            is_new_recipient=is_new_recipient,
            is_new_device=is_new_device,
            geo_mismatch=geo_mismatch,
        )

        txn_time = now - timedelta(hours=random.randint(0, 72))

        txn = Transaction(
            id=str(uuid.uuid4()),
            transaction_id=f"TXN{10000 + i:05d}",
            sender_account_id=sender.id,
            receiver_account_id=receiver.id,
            amount=round(amount, 2),
            timestamp=txn_time,
            location=loc[0],
            latitude=loc[1],
            longitude=loc[2],
            device_id=f"DEV-{fake.md5()[:8].upper()}",
            is_new_device=is_new_device,
            is_new_recipient=is_new_recipient,
            geo_mismatch=geo_mismatch,
            behavioral_anomaly=behavioral,
            risk_score=risk_score,
            status=status,
            fraud_reason=fraud_reason,
        )
        transactions.append(txn)

        rs = RiskScore(
            id=str(uuid.uuid4()),
            transaction_id=txn.id,
            **breakdown,
            total_score=risk_score,
        )
        risk_scores.append(rs)

        if status == "suspicious":
            sev = "critical" if risk_score >= 0.90 else "high" if risk_score >= 0.80 else "medium"
            action_map = {
                "critical": "Immediately freeze account and escalate to fraud team",
                "high": "Block transaction and request identity verification",
                "medium": "Flag for manual review within 24 hours",
            }
            alert = FraudAlert(
                id=str(uuid.uuid4()),
                transaction_id=txn.id,
                alert_type="high_risk",
                severity=sev,
                fraud_reason=fraud_reason,
                risk_score=risk_score,
                recommended_action=action_map[sev],
                account_id=sender.id,
            )
            alerts.append(alert)
            sender.is_flagged = True

    db.add_all(transactions)
    db.add_all(risk_scores)
    db.commit()
    db.add_all(alerts)
    db.commit()
    db.close()
    print(f"✅ Seed complete: {len(accounts)} accounts, {len(transactions)} transactions, {len(alerts)} alerts")

if __name__ == "__main__":
    seed()
