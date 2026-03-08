"""Fraud Alerts router."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from database import get_db
from models import FraudAlert, Transaction, Account

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def alert_to_dict(alert: FraudAlert, db: Session):
    txn = db.query(Transaction).filter(Transaction.id == alert.transaction_id).first()
    acc = db.query(Account).filter(Account.id == alert.account_id).first()
    return {
        "id": alert.id,
        "transaction_id": txn.transaction_id if txn else "N/A",
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "fraud_reason": alert.fraud_reason,
        "risk_score": alert.risk_score,
        "recommended_action": alert.recommended_action,
        "is_resolved": alert.is_resolved,
        "created_at": alert.created_at.isoformat(),
        "account_name": acc.owner_name if acc else "Unknown",
        "account_number": acc.account_number if acc else "Unknown",
        "amount": txn.amount if txn else 0,
        "location": txn.location if txn else "Unknown",
    }


@router.get("/")
def list_alerts(
    severity: Optional[str] = Query(None),
    is_resolved: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(FraudAlert).order_by(desc(FraudAlert.created_at))
    if severity:
        q = q.filter(FraudAlert.severity == severity)
    if is_resolved is not None:
        q = q.filter(FraudAlert.is_resolved == is_resolved)
    alerts = q.offset(offset).limit(limit).all()
    return [alert_to_dict(a, db) for a in alerts]


@router.get("/summary")
def alert_summary(db: Session = Depends(get_db)):
    total = db.query(FraudAlert).count()
    critical = db.query(FraudAlert).filter(FraudAlert.severity == "critical").count()
    high = db.query(FraudAlert).filter(FraudAlert.severity == "high").count()
    medium = db.query(FraudAlert).filter(FraudAlert.severity == "medium").count()
    unresolved = db.query(FraudAlert).filter(FraudAlert.is_resolved == False).count()
    return {
        "total": total,
        "critical": critical,
        "high": high,
        "medium": medium,
        "unresolved": unresolved,
    }


@router.patch("/{alert_id}/resolve")
def resolve_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(FraudAlert).filter(FraudAlert.id == alert_id).first()
    if not alert:
        return {"error": "Alert not found"}
    alert.is_resolved = True
    db.commit()
    return {"success": True, "alert_id": alert_id}
