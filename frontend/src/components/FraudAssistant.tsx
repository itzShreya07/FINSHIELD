"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
    role: "user" | "assistant";
    content: string | React.ReactNode;
}

interface Transaction {
    transaction_id: string;
    risk_score: number;
    status: string;
    amount: number;
    sender_account: string;
    sender_name: string;
    fraud_reason: string;
    is_new_device: boolean;
    is_new_recipient: boolean;
    geo_mismatch: boolean;
}

// Rule-based response engine — no LLM needed
function analyzeQuery(query: string, transactions: Transaction[]): React.ReactNode {
    const q = query.toLowerCase();
    const suspicious = transactions.filter(t => t.status === "suspicious");
    const avgRisk = transactions.length ? transactions.reduce((s, t) => s + t.risk_score, 0) / transactions.length : 0;

    if (q.includes("high risk") || q.includes("highest risk") || q.includes("most suspicious")) {
        const top5 = [...transactions].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
        return (
            <div>
                <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>Top 5 Highest Risk Transactions</div>
                {top5.map(t => (
                    <div key={t.transaction_id} style={{ padding: "6px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                        <strong>{t.transaction_id}</strong> — <span style={{ color: "#ef4444" }}>{(t.risk_score * 100).toFixed(0)}% risk</span>
                        <div style={{ color: "var(--text-muted)" }}>{t.sender_name} · ₹{t.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                    </div>
                ))}
            </div>
        );
    }

    if (q.includes("flagged") || q.includes("why") || q.includes("explain") || q.includes("reason")) {
        const top = [...suspicious].sort((a, b) => b.risk_score - a.risk_score)[0];
        if (!top) return <span>No suspicious transactions found in the current data.</span>;
        const flags = [];
        if (top.is_new_device) flags.push("New device detected");
        if (top.is_new_recipient) flags.push("Unknown/new recipient");
        if (top.geo_mismatch) flags.push("Geographic location mismatch");
        if (top.amount > 50000) flags.push(`High transaction amount (₹${top.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })})`);
        return (
            <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Analysis: <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>{top.transaction_id}</span></div>
                <div style={{ marginBottom: 8 }}>Transaction flagged due to:</div>
                {flags.map((f, i) => <div key={i} style={{ padding: "4px 8px", marginBottom: 4, borderLeft: "2px solid #ef4444", paddingLeft: 10, fontSize: 12 }}>• {f}</div>)}
                {top.fraud_reason && <div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12 }}>{top.fraud_reason}</div>}
                <div style={{ marginTop: 10, fontWeight: 700 }}>Risk Score: <span style={{ color: "#ef4444" }}>{(top.risk_score * 100).toFixed(0)}%</span></div>
            </div>
        );
    }

    if (q.includes("risk score") || q.includes("score") || q.includes("how is")) {
        return (
            <div>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>FinShield Risk Scoring Model</div>
                <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--text-secondary)" }}>
                    Risk scores are calculated using 5 weighted factors:<br />
                    <strong style={{ color: "#f97316" }}>• Amount Score (30%)</strong> — unusually large transaction relative to account average<br />
                    <strong style={{ color: "#f97316" }}>• New Device (20%)</strong> — transaction from an unrecognized device<br />
                    <strong style={{ color: "#f97316" }}>• Geo Mismatch (20%)</strong> — origin location differs from account's home region<br />
                    <strong style={{ color: "#f97316" }}>• New Recipient (15%)</strong> — first time sending to this account<br />
                    <strong style={{ color: "#f97316" }}>• Behavioral Anomaly (15%)</strong> — spending pattern deviation<br /><br />
                    <strong>Current average risk: <span style={{ color: avgRisk > 0.5 ? "#ef4444" : "#22c55e" }}>{(avgRisk * 100).toFixed(1)}%</span></strong>
                </div>
            </div>
        );
    }

    if (q.includes("summary") || q.includes("overview") || q.includes("status") || q === "") {
        return (
            <div>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Platform Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                    <div style={{ padding: "8px 12px", background: "rgba(37,99,235,0.1)", borderRadius: 8 }}>
                        <div style={{ color: "var(--text-muted)" }}>Total Transactions</div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{transactions.length}</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>
                        <div style={{ color: "var(--text-muted)" }}>Suspicious</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444" }}>{suspicious.length}</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: "rgba(234,179,8,0.1)", borderRadius: 8 }}>
                        <div style={{ color: "var(--text-muted)" }}>Avg Risk Score</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#eab308" }}>{(avgRisk * 100).toFixed(1)}%</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: "rgba(34,197,94,0.1)", borderRadius: 8 }}>
                        <div style={{ color: "var(--text-muted)" }}>Fraud Rate</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>
                            {transactions.length ? ((suspicious.length / transactions.length) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (q.includes("account") || q.includes("sender") || q.includes("user")) {
        const accountMap: Record<string, { name: string; count: number; risk: number }> = {};
        transactions.forEach(t => {
            if (!accountMap[t.sender_account]) accountMap[t.sender_account] = { name: t.sender_name, count: 0, risk: 0 };
            accountMap[t.sender_account].count++;
            accountMap[t.sender_account].risk = Math.max(accountMap[t.sender_account].risk, t.risk_score);
        });
        const topAccounts = Object.entries(accountMap).sort((a, b) => b[1].risk - a[1].risk).slice(0, 5);
        return (
            <div>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Highest Risk Accounts</div>
                {topAccounts.map(([acc, info]) => (
                    <div key={acc} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                        <span><strong>{info.name}</strong> <span style={{ color: "var(--text-muted)" }}>({acc})</span></span>
                        <span style={{ color: info.risk > 0.7 ? "#ef4444" : "#eab308", fontWeight: 700 }}>{(info.risk * 100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            I can help you with:<br /><br />
            • <em>"Why was this transaction flagged?"</em><br />
            • <em>"Show high-risk accounts"</em><br />
            • <em>"Explain the risk score"</em><br />
            • <em>"Give me a summary"</em><br />
            • <em>"Show suspicious transactions"</em>
        </div>
    );
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
}

export default function FraudAssistant({ isOpen, onClose, transactions }: Props) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "I'm your Fraud Copilot. Ask me about flagged transactions, risk scores, or account patterns." }
    ]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function send() {
        if (!input.trim()) return;
        const q = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: q }]);
        setTimeout(() => {
            const response = analyzeQuery(q, transactions);
            setMessages(prev => [...prev, { role: "assistant", content: response }]);
        }, 300);
    }

    return (
        <>
            {/* Backdrop */}
            {isOpen && <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />}

            {/* Drawer */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: 400, maxWidth: "95vw",
                background: "var(--bg-card)", borderLeft: "1px solid var(--border-primary)",
                zIndex: 201, display: "flex", flexDirection: "column",
                transform: isOpen ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
                boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
            }}>
                {/* Header */}
                <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Fraud Copilot</div>
                        <div style={{ fontSize: 11, color: "#22c55e" }}>● Rule-based Analysis Engine</div>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>×</button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{
                            marginBottom: 14,
                            display: "flex",
                            flexDirection: msg.role === "user" ? "row-reverse" : "row",
                            gap: 8,
                        }}>
                            <div style={{
                                maxWidth: "85%",
                                padding: "10px 14px",
                                borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                                background: msg.role === "user" ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                                color: "var(--text-primary)", fontSize: 13, lineHeight: 1.5,
                                border: msg.role === "assistant" ? "1px solid var(--border-subtle)" : "none",
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>

                {/* Quick queries */}
                <div style={{ padding: "8px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--border-subtle)" }}>
                    {["Status summary", "High risk accounts", "Explain risk score", "Why flagged?"].map(q => (
                        <button key={q} onClick={() => { setInput(q); }}
                            style={{ padding: "4px 10px", fontSize: 11, background: "rgba(37,99,235,0.1)", border: "1px solid var(--border-primary)", borderRadius: 20, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                            {q}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
                    <input
                        style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-primary)", borderRadius: 8, padding: "10px 14px", color: "var(--text-primary)", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none" }}
                        placeholder="Ask about flagged transactions..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && send()}
                    />
                    <button onClick={send} style={{ padding: "10px 16px", background: "var(--accent-blue)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                        ↑
                    </button>
                </div>
            </div>
        </>
    );
}
