"use client";
import { useState } from "react";

interface ScamResult {
    input: string;
    scam_probability: number;
    risk_level: "critical" | "high" | "medium" | "low";
    reasons: string[];
    recommendation: string;
}

const riskColor = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const riskLabel = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" };

const SidebarNav = ({ active }: { active: string }) => {
    const links = [
        { href: "/", label: "Transaction Monitor" },
        { href: "/alerts", label: "Fraud Alerts" },
        { href: "/network", label: "Fraud Network" },
        { href: "/behavioral", label: "Behavioral Analysis" },
        { href: "/geo-risk", label: "Geo-Risk Monitor" },
        { href: "/scam-intel", label: "Scam Intel Tool" },
    ];
    return (
        <aside className="sidebar">
            <div className="sidebar-logo"><div className="logo-text">FinShield</div><div className="logo-sub">Fraud Intelligence Platform</div></div>
            <nav className="sidebar-nav">
                <div className="nav-section-label">Monitoring</div>
                {links.slice(0, 2).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.label}</span></a>)}
                <div className="nav-section-label">Intelligence</div>
                {links.slice(2, 5).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.label}</span></a>)}
                <div className="nav-section-label">Tools</div>
                {links.slice(5).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.label}</span></a>)}
            </nav>
            <div className="sidebar-footer"><span className="status-dot" /> System Online · v2.0.0</div>
        </aside>
    );
};

const EXAMPLES = [
    { label: "Known Scam Number", value: "9876543210" },
    { label: "Suspicious UPI", value: "freecashback@upi" },
    { label: "Legitimate UPI", value: "suresh.babu@oksbi" },
    { label: "Lottery Link", value: "https://bit.ly/win-prize-now" },
    { label: "Normal UPI", value: "priya.sharma@ybl" },
];

export default function ScamIntelPage() {
    const [inputVal, setInputVal] = useState("");
    const [result, setResult] = useState<ScamResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<ScamResult[]>([]);

    async function check() {
        if (!inputVal.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`/api/scam-intel/check?value=${encodeURIComponent(inputVal.trim())}`);
            const data: ScamResult = await res.json();
            setResult(data);
            setHistory(prev => [data, ...prev].slice(0, 10));
        } catch {
            setResult({
                input: inputVal,
                scam_probability: 0.5,
                risk_level: "medium",
                reasons: ["Backend unavailable — showing demo result"],
                recommendation: "Please start the backend server.",
            });
        }
        setLoading(false);
    }

    function fillExample(val: string) {
        setInputVal(val);
        setResult(null);
    }

    const fillPercent = result ? Math.round(result.scam_probability * 100) : 0;

    return (
        <div className="app-layout">
            <SidebarNav active="/scam-intel" />
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Scam Intelligence Tool</h1>
                        <div className="subtitle">Check UPI IDs, phone numbers & payment links for scam risk</div>
                    </div>
                </div>

                <div className="page-body">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
                        <div>
                            {/* Input form */}
                            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
                                <div className="section-title" style={{ marginBottom: 20 }}>Intelligence Check</div>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                                        ENTER UPI ID / PHONE NUMBER / PAYMENT LINK
                                    </label>
                                    <div style={{ display: "flex", gap: 12 }}>
                                        <input
                                            className="filter-input"
                                            style={{ flex: 1, fontSize: 14, padding: "12px 16px" }}
                                            placeholder="e.g. 9876543210 or prize@upi or https://bit.ly/..."
                                            value={inputVal}
                                            onChange={e => setInputVal(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && check()}
                                        />
                                        <button className="btn btn-primary" onClick={check} disabled={loading} style={{ padding: "12px 24px", fontSize: 14 }}>
                                            {loading ? "Checking..." : "Analyze"}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Quick examples:</div>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {EXAMPLES.map(ex => (
                                            <button key={ex.value} className="btn btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => fillExample(ex.value)}>
                                                {ex.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Result */}
                            {result && (
                                <div className="scam-result" style={{ borderColor: riskColor[result.risk_level] + "44" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 26, fontWeight: 800, color: riskColor[result.risk_level], marginBottom: 4 }}>
                                                {riskLabel[result.risk_level]} — {fillPercent}% Scam Probability
                                            </div>
                                            <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{result.input}</div>
                                        </div>
                                        <span className={`badge badge-${result.risk_level}`} style={{ fontSize: 14, padding: "6px 14px" }}>
                                            {result.risk_level.toUpperCase()} RISK
                                        </span>
                                    </div>

                                    {/* Meter */}
                                    <div className="scam-meter">
                                        <div className="scam-meter-fill" style={{
                                            width: `${fillPercent}%`,
                                            background: `linear-gradient(90deg, #22c55e, #eab308, #ef4444)`,
                                        }} />
                                    </div>

                                    {/* Risk factors */}
                                    <div style={{ marginTop: 20, marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                                            Risk Factors Detected
                                        </div>
                                        {result.reasons.map((r, i) => (
                                            <div key={i} style={{
                                                padding: "8px 12px", marginBottom: 6,
                                                background: "rgba(255,255,255,0.04)",
                                                borderRadius: 6, fontSize: 13,
                                                borderLeft: `3px solid ${riskColor[result!.risk_level]}`,
                                                color: "var(--text-secondary)",
                                            }}>
                                                {r}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recommendation */}
                                    <div style={{
                                        padding: "14px 16px",
                                        background: `${riskColor[result.risk_level]}14`,
                                        border: `1px solid ${riskColor[result.risk_level]}33`,
                                        borderRadius: 8, fontSize: 13,
                                        color: "var(--text-primary)",
                                    }}>
                                        <span style={{ fontWeight: 700, color: riskColor[result.risk_level] }}>Recommendation: </span>
                                        {result.recommendation}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar: history + tips */}
                        <div>
                            <div className="card" style={{ marginBottom: 16 }}>
                                <div className="card-header"><span className="card-title">Recent Checks</span></div>
                                {history.length === 0 ? (
                                    <div style={{ padding: 16, fontSize: 12, color: "var(--text-muted)" }}>No checks yet</div>
                                ) : history.map((h, i) => (
                                    <div key={i} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                                        onClick={() => { setInputVal(h.input); setResult(h); }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {h.input}
                                            </span>
                                            <span className={`badge badge-${h.risk_level}`} style={{ fontSize: 10 }}>
                                                {Math.round(h.scam_probability * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="card" style={{ padding: 16 }}>
                                <div className="card-header" style={{ padding: "0 0 12px" }}><span className="card-title">Safety Tips</span></div>
                                {[
                                    "Never pay to unknown UPI IDs received via SMS",
                                    "Verify payment links before clicking — banks never ask via message",
                                    "Report suspicious UPI IDs to cybercrime.gov.in",
                                    "QR codes from strangers can redirect to scam sites",
                                    "Legitimate cashback/prizes don't require advance payment",
                                ].map((tip, i) => (
                                    <div key={i} style={{ padding: "6px 0", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
                                        <span style={{ color: "var(--accent-cyan)", flexShrink: 0 }}>›</span>{tip}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
