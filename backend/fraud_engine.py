"""
Fraud Risk Scoring Engine
Rule-based scoring that evaluates transaction risk across 5 dimensions.
"""
from typing import Dict, Tuple


AMOUNT_THRESHOLD_HIGH = 50000    # ₹50,000
AMOUNT_THRESHOLD_MEDIUM = 20000  # ₹20,000
BEHAVIORAL_MULTIPLIER = 3.0      # Flag if amount > 3× avg


def compute_risk_score(
    amount: float,
    avg_transaction_amount: float,
    is_new_recipient: bool,
    is_new_device: bool,
    geo_mismatch: bool,
    behavioral_anomaly: bool,
) -> Tuple[float, str, Dict[str, float]]:
    """
    Returns (total_score, status, breakdown_dict, reasons_list)
    Score components:
      - Abnormal amount:      0–0.30
      - New recipient:        0.20
      - New device:           0.20
      - Geo mismatch:         0.20
      - Behavioral anomaly:   0.10
    """
    reasons = []
    breakdown = {
        "amount_score": 0.0,
        "new_recipient_score": 0.0,
        "new_device_score": 0.0,
        "geo_mismatch_score": 0.0,
        "behavioral_score": 0.0,
    }

    # --- Amount score ---
    if amount >= AMOUNT_THRESHOLD_HIGH:
        breakdown["amount_score"] = 0.30
        reasons.append("Unusually high transaction amount (>₹50,000)")
    elif amount >= AMOUNT_THRESHOLD_MEDIUM:
        breakdown["amount_score"] = 0.15
        reasons.append("Elevated transaction amount (>₹20,000)")

    # --- New recipient ---
    if is_new_recipient:
        breakdown["new_recipient_score"] = 0.20
        reasons.append("First-time transfer to this recipient")

    # --- New device ---
    if is_new_device:
        breakdown["new_device_score"] = 0.20
        reasons.append("Transaction initiated from a new/unrecognized device")

    # --- Geo mismatch ---
    if geo_mismatch:
        breakdown["geo_mismatch_score"] = 0.20
        reasons.append("Geographic location mismatch detected")

    # --- Behavioral anomaly ---
    if behavioral_anomaly:
        breakdown["behavioral_score"] = 0.10
        reasons.append("Amount significantly exceeds historical average")

    total = sum(breakdown.values())
    total = round(min(total, 1.0), 2)

    status = "suspicious" if total >= 0.70 else "normal"

    fraud_reason = " | ".join(reasons) if reasons else "No anomalies detected"

    return total, status, breakdown, fraud_reason


def assess_transaction(
    amount: float,
    avg_transaction_amount: float,
    is_new_recipient: bool,
    is_new_device: bool,
    geo_mismatch: bool,
) -> Tuple[float, str, Dict[str, float], str, bool]:
    """
    Full assessment: determines behavioral_anomaly automatically,
    then delegates to compute_risk_score.
    Returns (risk_score, status, breakdown, fraud_reason, behavioral_anomaly)
    """
    behavioral_anomaly = (
        avg_transaction_amount > 0
        and amount > BEHAVIORAL_MULTIPLIER * avg_transaction_amount
    )
    risk_score, status, breakdown, fraud_reason = compute_risk_score(
        amount=amount,
        avg_transaction_amount=avg_transaction_amount,
        is_new_recipient=is_new_recipient,
        is_new_device=is_new_device,
        geo_mismatch=geo_mismatch,
        behavioral_anomaly=behavioral_anomaly,
    )
    return risk_score, status, breakdown, fraud_reason, behavioral_anomaly
