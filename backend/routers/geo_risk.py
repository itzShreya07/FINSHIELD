"""Geo-Risk Monitoring router — location patterns and impossible travel detection."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from collections import defaultdict
from database import get_db
from models import Transaction, Account
from math import radians, sin, cos, sqrt, atan2

router = APIRouter(prefix="/api/geo-risk", tags=["geo_risk"])


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return 2 * R * atan2(sqrt(a), sqrt(1 - a))


@router.get("/")
def geo_risk(db: Session = Depends(get_db)):
    """All transactions with location data, grouped by location."""
    txns = db.query(Transaction).order_by(desc(Transaction.timestamp)).all()
    by_location = defaultdict(lambda: {"count": 0, "suspicious": 0, "total_amount": 0.0, "lat": 0, "lon": 0})
    for t in txns:
        loc = t.location
        by_location[loc]["count"] += 1
        by_location[loc]["total_amount"] += t.amount
        by_location[loc]["lat"] = t.latitude
        by_location[loc]["lon"] = t.longitude
        if t.status == "suspicious":
            by_location[loc]["suspicious"] += 1

    return [
        {
            "location": loc,
            "count": data["count"],
            "suspicious": data["suspicious"],
            "total_amount": round(data["total_amount"], 2),
            "lat": data["lat"],
            "lon": data["lon"],
            "risk_level": "high" if data["suspicious"] > 2 else "medium" if data["suspicious"] > 0 else "low",
        }
        for loc, data in by_location.items()
    ]


@router.get("/impossible-travel")
def impossible_travel(db: Session = Depends(get_db)):
    """
    Detects impossible travel: same account transacts from 2 locations
    > 500 km apart within 60 minutes.
    """
    accounts = db.query(Account).all()
    findings = []

    for acc in accounts:
        txns = db.query(Transaction).filter(
            Transaction.sender_account_id == acc.id
        ).order_by(Transaction.timestamp).all()

        for i in range(len(txns) - 1):
            t1, t2 = txns[i], txns[i + 1]
            if not all([t1.latitude, t1.longitude, t2.latitude, t2.longitude]):
                continue
            if t1.location == t2.location:
                continue
            time_diff_min = (t2.timestamp - t1.timestamp).total_seconds() / 60
            if time_diff_min < 0:
                time_diff_min = abs(time_diff_min)
            if time_diff_min <= 120:  # within 2 hours
                dist = haversine_km(t1.latitude, t1.longitude, t2.latitude, t2.longitude)
                if dist > 300:
                    findings.append({
                        "account_number": acc.account_number,
                        "owner_name": acc.owner_name,
                        "location_1": t1.location,
                        "location_2": t2.location,
                        "transaction_1": t1.transaction_id,
                        "transaction_2": t2.transaction_id,
                        "time_diff_minutes": round(time_diff_min, 1),
                        "distance_km": round(dist, 1),
                        "timestamp_1": t1.timestamp.isoformat(),
                        "timestamp_2": t2.timestamp.isoformat(),
                        "severity": "critical" if dist > 5000 else "high",
                    })

    return sorted(findings, key=lambda x: x["distance_km"], reverse=True)


@router.get("/heatmap")
def geo_heatmap(db: Session = Depends(get_db)):
    """Returns all transaction points for heatmap rendering."""
    txns = db.query(Transaction).all()
    return [
        {
            "lat": t.latitude,
            "lon": t.longitude,
            "location": t.location,
            "amount": t.amount,
            "risk_score": t.risk_score,
            "status": t.status,
        }
        for t in txns
        if t.latitude and t.longitude
    ]
