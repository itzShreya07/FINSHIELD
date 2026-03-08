"""Scam Intelligence router — check UPI IDs, phone numbers, payment links."""
import re
import hashlib
import random
from fastapi import APIRouter, Body

router = APIRouter(prefix="/api/scam-intel", tags=["scam_intel"])

# Simulated scam database (hash-based for demo)
HIGH_RISK_PATTERNS = [
    r"^(9[87654321]\d{8})$",   # Starts with 98/97 — flagged prefixes
    r"^paytm.*scam",
    r"^upi.*free",
    r".*cashback.*now",
    r".*prize.*fund",
]

KNOWN_SCAM_NUMBERS = {"9876543210", "8800000001", "7777777777", "9999988888"}


def score_input(value: str) -> dict:
    val_lower = value.lower().strip()
    reasons = []
    score = 0.0

    # Hash-based deterministic demo score
    h = int(hashlib.md5(val_lower.encode()).hexdigest(), 16) % 100
    base = h / 100.0 * 0.5  # 0–0.5 random base

    # Pattern matching
    for pattern in HIGH_RISK_PATTERNS:
        if re.search(pattern, val_lower):
            score += 0.30
            reasons.append("Matches known scam pattern")
            break

    # Known scam number
    digits = re.sub(r"\D", "", value)
    if digits in KNOWN_SCAM_NUMBERS:
        score += 0.50
        reasons.append("Number found in scam reporting database")

    # UPI suspicious keywords
    if any(w in val_lower for w in ["free", "prize", "cashback", "lottery", "win"]):
        score += 0.25
        reasons.append("UPI ID or link contains suspicious keywords (lottery/cashback/prize)")

    # New non-registered UPI
    if "@" in value and not any(val_lower.endswith(d) for d in [
        "@oksbi", "@okhdfcbank", "@okaxis", "@okicici", "@paytm", "@ybl", "@upi"
    ]):
        score += 0.15
        reasons.append("UPI handle uses non-standard or unverified payment provider")

    # Payment link analysis
    if "http" in val_lower:
        score += 0.20
        reasons.append("Input is a payment link — exercise caution with unsolicited payment links")
        if "bit.ly" in val_lower or "tinyurl" in val_lower or "short" in val_lower:
            score += 0.20
            reasons.append("Shortened URL detected — high risk of phishing")

    score = round(min(score + base * 0.2, 1.0), 2)

    if not reasons:
        reasons.append("No explicit scam patterns detected")

    risk_level = "critical" if score >= 0.80 else "high" if score >= 0.60 else "medium" if score >= 0.35 else "low"
    recommendation = {
        "critical": "Do NOT proceed. Block this contact and report to cybercrime.gov.in immediately.",
        "high": "Highly suspicious. Avoid any transactions and verify identity through official channels.",
        "medium": "Use caution. Verify the recipient's identity before transferring money.",
        "low": "Appears relatively safe, but always verify before sending money.",
    }[risk_level]

    return {
        "input": value,
        "scam_probability": score,
        "risk_level": risk_level,
        "reasons": reasons,
        "recommendation": recommendation,
    }


@router.post("/check")
def check_scam(value: str = Body(..., embed=True)):
    return score_input(value)


@router.get("/check")
def check_scam_get(value: str):
    return score_input(value)
