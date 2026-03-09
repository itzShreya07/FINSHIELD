"use client";
import { useState } from "react";

interface SimResult {
    transaction_id: string;
    amount: number;
    risk_score: number;
    status: string;
    simulation_type: string;
    sender_account: string;
    receiver_account: string;
    location: string;
}

interface SimResponse {
    simulation: string;
    transactions: SimResult[];
    note?: string;
}

const ATTACKS = [
    {
        id: "rapid-transfer",
        label: "Rapid Transfer Attack",
        desc: "5 high-value transfers in seconds — money mule pattern",
        color: "#f97316",
    },
    {
        id: "account-takeover",
        label: "Account Takeover",
        desc: "New device + massive amount + geo mismatch",
        color: "#ef4444",
    },
    {
        id: "geo-anomaly",
        label: "Geo Anomaly Attack",
        desc: "Impossible travel: Mumbai to New York in minutes",
        color: "#8b5cf6",
    },
];

export default function SimulationPanel() {
    const [loading, setLoading] = useState<string | null>(null);
    const [results, setResults] = useState<SimResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    async function runSimulation(attackId: string) {
        setLoading(attackId);
        setResults(null);
        setError(null);
        try {
            const res = await fetch(`/api/simulate/${attackId}`, { method: "POST" });
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const data: SimResponse = await res.json();
            setResults(data);
        } catch (e: any) {
            setError(e.message || "Simulation failed");
        }
        setLoading(null);
    }

    return (
        <div style={{ marginBottom: 24 }}>
            {/* Toggle header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "12px 20px",
                    background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: isOpen ? "12px 12px 0 0" : 12,
                    color: "#ef4444", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", transition: "all 0.2s", fontFamily: "Inter, sans-serif",
                }}
            >
                Fraud Simulation Mode
                <span style={{
                    marginLeft: "auto", fontSize: 11, color: "rgba(239,68,68,0.7)",
                    border: "1px solid rgba(239,68,68,0.3)", borderRadius: 20, padding: "2px 8px",
                }}>
                    DEMO
                </span>
                <span style={{ marginLeft: 4, fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
                <div style={{
                    background: "rgba(6,9,26,0.9)", border: "1px solid rgba(239,68,68,0.2)",
                    borderTop: "none", borderRadius: "0 0 12px 12px",
                    padding: 20, animation: "fadeIn 0.2s ease",
                }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, letterSpacing: "0.5px" }}>
                        Inject synthetic attacks into the live stream. Generated transactions are saved to the database and appear in all dashboards.
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                        {ATTACKS.map(atk => (
                            <button
                                key={atk.id}
                                onClick={() => runSimulation(atk.id)}
                                disabled={loading !== null}
                                style={{
                                    padding: "16px 14px",
                                    background: loading === atk.id ? `${atk.color}22` : `${atk.color}11`,
                                    border: `1px solid ${atk.color}44`,
                                    borderRadius: 10, cursor: loading !== null ? "not-allowed" : "pointer",
                                    textAlign: "left", transition: "all 0.2s", fontFamily: "Inter, sans-serif",
                                    opacity: loading !== null && loading !== atk.id ? 0.5 : 1,
                                }}
                                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = `${atk.color}22`; }}
                                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = `${atk.color}11`; }}
                            >
                                <div style={{ fontSize: 14, fontWeight: 700, color: atk.color, marginBottom: 6 }}>
                                    {loading === atk.id ? "Running..." : atk.label}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{atk.desc}</div>
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 12, color: "#ef4444" }}>
                            {error}
                        </div>
                    )}

                    {results && (
                        <div style={{ animation: "fadeIn 0.3s ease" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                                Simulation Complete — {results.transactions.length} transaction{results.transactions.length > 1 ? "s" : ""} injected
                                {results.note && <span style={{ color: "#8b5cf6", marginLeft: 8, fontWeight: 400, textTransform: "none" }}>({results.note})</span>}
                            </div>
                            <div style={{ maxHeight: 200, overflowY: "auto" }}>
                                {results.transactions.map((t, i) => (
                                    <div key={i} style={{
                                        display: "flex", gap: 12, alignItems: "center",
                                        padding: "8px 12px", background: "rgba(255,255,255,0.025)",
                                        borderRadius: 8, marginBottom: 6, fontSize: 12,
                                        borderLeft: `3px solid ${t.status === "suspicious" ? "#ef4444" : "#22c55e"}`,
                                    }}>
                                        <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)", fontSize: 11 }}>{t.transaction_id}</span>
                                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>₹{t.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                                        <span style={{ color: "var(--text-muted)" }}>{t.location}</span>
                                        <span style={{ marginLeft: "auto", fontWeight: 700, color: t.status === "suspicious" ? "#ef4444" : "#22c55e" }}>
                                            {(t.risk_score * 100).toFixed(0)}% risk
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
