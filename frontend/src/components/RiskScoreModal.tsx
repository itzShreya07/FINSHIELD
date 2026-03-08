"use client";
import { useState } from "react";

interface RiskBreakdown {
    transaction_id: string;
    sender_account?: string;
    receiver_account?: string;
    amount?: number;
    risk_score: number;
    status?: string;
    fraud_reason?: string;
    // score components (from /api/network or passed inline)
    amount_score?: number;
    new_recipient_score?: number;
    new_device_score?: number;
    geo_mismatch_score?: number;
    behavioral_score?: number;
}

interface Props {
    data: RiskBreakdown | null;
    onClose: () => void;
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: string }) {
    const pct = Math.round(value * 100);
    const color = value >= 0.7 ? "#ef4444" : value >= 0.4 ? "#eab308" : "#22c55e";
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6 }}>
                    <span>{icon}</span> {label}
                </span>
                <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color, fontWeight: 700 }}>
                    {pct}%
                </span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.07)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                    height: "100%", width: `${pct}%`, borderRadius: 6,
                    background: `linear-gradient(90deg, ${color}cc, ${color})`,
                    transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                    boxShadow: `0 0 8px ${color}66`,
                }} />
            </div>
        </div>
    );
}

export default function RiskScoreModal({ data, onClose }: Props) {
    if (!data) return null;

    const totalPct = Math.round(data.risk_score * 100);
    const totalColor = data.risk_score >= 0.7 ? "#ef4444" : data.risk_score >= 0.4 ? "#eab308" : "#22c55e";
    const isSuspicious = data.status === "suspicious";

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "fadeIn 0.2s ease",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "var(--bg-card)", border: `1px solid ${totalColor}44`,
                    borderRadius: 16, padding: "28px 32px", width: 480, maxWidth: "95vw",
                    boxShadow: `0 0 60px ${totalColor}22, 0 24px 48px rgba(0,0,0,0.5)`,
                    position: "relative",
                    animation: "fadeIn 0.25s ease",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button onClick={onClose} style={{
                    position: "absolute", top: 16, right: 16,
                    background: "transparent", border: "none", color: "var(--text-muted)",
                    fontSize: 20, cursor: "pointer", lineHeight: 1,
                }}>×</button>

                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
                        Risk Score Explanation
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                        {data.transaction_id}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                        <span style={{ fontSize: 48, fontWeight: 900, color: totalColor, lineHeight: 1 }}>{totalPct}</span>
                        <span style={{ fontSize: 20, color: totalColor, fontWeight: 700 }}>/ 100</span>
                        <span className={`badge badge-${isSuspicious ? "suspicious" : "normal"}`} style={{ fontSize: 13, padding: "5px 14px" }}>
                            {isSuspicious ? "⚠️ SUSPICIOUS" : "✅ NORMAL"}
                        </span>
                    </div>
                </div>

                {/* Total bar */}
                <div style={{ height: 10, background: "rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden", marginBottom: 28 }}>
                    <div style={{
                        height: "100%", width: `${totalPct}%`, borderRadius: 8,
                        background: `linear-gradient(90deg, #22c55e, #eab308 50%, #ef4444)`,
                        boxShadow: `0 0 12px ${totalColor}66`,
                        transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
                    }} />
                </div>

                {/* Component breakdown */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 16 }}>
                        Score Breakdown
                    </div>
                    <ScoreBar label="Transaction Amount" value={data.amount_score ?? 0} icon="💰" />
                    <ScoreBar label="New Device Detected" value={data.new_device_score ?? 0} icon="📱" />
                    <ScoreBar label="Geo Location Mismatch" value={data.geo_mismatch_score ?? 0} icon="🌍" />
                    <ScoreBar label="New Recipient" value={data.new_recipient_score ?? 0} icon="👤" />
                    <ScoreBar label="Behavioral Anomaly" value={data.behavioral_score ?? 0} icon="📊" />
                </div>

                {/* Reason */}
                {data.fraud_reason && (
                    <div style={{
                        padding: "12px 16px",
                        background: isSuspicious ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                        border: `1px solid ${isSuspicious ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                        borderRadius: 10, fontSize: 12.5, color: "var(--text-secondary)",
                    }}>
                        <span style={{ fontWeight: 700, color: totalColor }}>Analysis: </span>
                        {data.fraud_reason}
                    </div>
                )}

                {data.amount && (
                    <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                        <span>💸 Amount: <strong style={{ color: "var(--text-primary)" }}>₹{data.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></span>
                        {data.sender_account && <span>From: <strong style={{ color: "var(--text-primary)" }}>{data.sender_account}</strong></span>}
                    </div>
                )}
            </div>
        </div>
    );
}
