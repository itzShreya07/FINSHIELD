from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime


def gen_uuid():
    return str(uuid.uuid4())


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=gen_uuid)
    account_number = Column(String, unique=True, nullable=False)
    owner_name = Column(String, nullable=False)
    account_age_days = Column(Integer, default=0)
    country = Column(String, default="India")
    avg_transaction_amount = Column(Float, default=0.0)
    transaction_count = Column(Integer, default=0)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sent_transactions = relationship("Transaction", foreign_keys="Transaction.sender_account_id", back_populates="sender")
    received_transactions = relationship("Transaction", foreign_keys="Transaction.receiver_account_id", back_populates="receiver")


class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, default=gen_uuid)
    device_id = Column(String, unique=True, nullable=False)
    account_id = Column(String, ForeignKey("accounts.id"))
    device_type = Column(String, default="mobile")
    is_new = Column(Boolean, default=True)
    registered_at = Column(DateTime, default=datetime.utcnow)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=gen_uuid)
    transaction_id = Column(String, unique=True, nullable=False)
    sender_account_id = Column(String, ForeignKey("accounts.id"))
    receiver_account_id = Column(String, ForeignKey("accounts.id"))
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    location = Column(String, default="Unknown")
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    device_id = Column(String, nullable=True)
    is_new_device = Column(Boolean, default=False)
    is_new_recipient = Column(Boolean, default=False)
    geo_mismatch = Column(Boolean, default=False)
    behavioral_anomaly = Column(Boolean, default=False)
    risk_score = Column(Float, default=0.0)
    status = Column(String, default="normal")  # normal | suspicious
    fraud_reason = Column(Text, nullable=True)

    sender = relationship("Account", foreign_keys=[sender_account_id], back_populates="sent_transactions")
    receiver = relationship("Account", foreign_keys=[receiver_account_id], back_populates="received_transactions")


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(String, primary_key=True, default=gen_uuid)
    transaction_id = Column(String, ForeignKey("transactions.id"))
    amount_score = Column(Float, default=0.0)
    new_recipient_score = Column(Float, default=0.0)
    new_device_score = Column(Float, default=0.0)
    geo_mismatch_score = Column(Float, default=0.0)
    behavioral_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    computed_at = Column(DateTime, default=datetime.utcnow)


class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id = Column(String, primary_key=True, default=gen_uuid)
    transaction_id = Column(String, ForeignKey("transactions.id"))
    alert_type = Column(String, nullable=False)  # high_risk | suspicious_account | fraud_cluster
    severity = Column(String, default="medium")   # low | medium | high | critical
    fraud_reason = Column(Text, nullable=True)
    risk_score = Column(Float, default=0.0)
    recommended_action = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=True)
