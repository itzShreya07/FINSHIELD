"""Behavioral Analysis router."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict
from database import get_db
from models import Transaction, Account

router = APIRouter(prefix="/api/behavioral", tags=["behavioral"])


@router.get("/")
def behavioral_analysis(db: Session = Depends(get_db)):
    """Returns per-account behavioral stats and anomaly flags."""
    accounts = db.query(Account).all()
    result = []
    for acc in accounts:
        txns = db.query(Transaction).filter(
            Transaction.sender_account_id == acc.id
        ).all()
        if not txns:
            continue
        amounts = [t.amount for t in txns]
        avg_amt = sum(amounts) / len(amounts)
        max_amt = max(amounts)
        anomalies = [t for t in txns if t.behavioral_anomaly]
        suspicious = [t for t in txns if t.status == "suspicious"]

        # Build time series: group by day
        daily = defaultdict(list)
        for t in txns:
            day = t.timestamp.strftime("%Y-%m-%d")
            daily[day].append(t.amount)

        time_series = [
            {"date": d, "total": round(sum(v), 2), "count": len(v)}
            for d, v in sorted(daily.items())
        ]

        result.append({
            "account_id": acc.id,
            "account_number": acc.account_number,
            "owner_name": acc.owner_name,
            "avg_transaction_amount": round(avg_amt, 2),
            "max_transaction_amount": round(max_amt, 2),
            "transaction_count": len(txns),
            "anomaly_count": len(anomalies),
            "suspicious_count": len(suspicious),
            "risk_level": "high" if len(suspicious) > 3 else "medium" if len(suspicious) > 1 else "low",
            "time_series": time_series,
        })

    result.sort(key=lambda x: x["suspicious_count"], reverse=True)
    return result


@router.get("/overview")
def behavioral_overview(db: Session = Depends(get_db)):
    """High-level spending metrics across all accounts."""
    txns = db.query(Transaction).all()
    if not txns:
        return {}
    amounts = [t.amount for t in txns]
    return {
        "total_transactions": len(txns),
        "total_volume": round(sum(amounts), 2),
        "avg_amount": round(sum(amounts) / len(amounts), 2),
        "max_amount": round(max(amounts), 2),
        "min_amount": round(min(amounts), 2),
        "anomaly_count": sum(1 for t in txns if t.behavioral_anomaly),
    }
