"use client";
import { useState, useEffect, useRef } from "react";
import RiskScoreModal from "@/components/RiskScoreModal";
import SimulationPanel from "@/components/SimulationPanel";
import FraudAssistant from "@/components/FraudAssistant";

interface Transaction {
    transaction_id: string;
    sender_account: string;
    sender_name: string;
    receiver_account: string;
    receiver_name: string;
    amount: number;
    timestamp: string;
    location: string;
    device_id: string;
    account_age_days: number;
    is_new_device: boolean;
    is_new_recipient: boolean;
    geo_mismatch: boolean;
    behavioral_anomaly: boolean;
    risk_score: number;
    status: "normal" | "suspicious";
    fraud_reason: string;
}

function getRiskColor(score: number) {
    if (score >= 0.9) return "#ef4444";
    if (score >= 0.7) return "#f97316";
    if (score >= 0.4) return "#eab308";
    return "#22c55e";
}

function RiskBar({ score }: { score: number }) {
    return (
        <div className="risk-bar-wrap">
            <div className="risk-bar-bg">
                <div
                    className="risk-bar-fill"
                    style={{ width: `${score * 100}%`, background: getRiskColor(score) }}
                />
            </div>
            <span className="risk-score-num mono" style={{ color: getRiskColor(score) }}>
                {score.toFixed(2)}
            </span>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`badge badge-${status}`}>
            {status === "suspicious" ? "⚠ Suspicious" : "✓ Normal"}
        </span>
    );
}

export default function TransactionMonitor() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [isStreaming, setIsStreaming] = useState(true);
    const [newIds, setNewIds] = useState<Set<string>>(new Set());
    const evtRef = useRef<EventSource | null>(null);

    const [showRiskScoreModal, setShowRiskScoreModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showFraudAssistant, setShowFraudAssistant] = useState(false);

    // Load historical transactions
    useEffect(() => {
        async function load() {
            try {
                const params = new URLSearchParams();
                if (statusFilter) params.set("status", statusFilter);
                if (locationFilter) params.set("location", locationFilter);
                params.set("limit", "60");
                const res = await fetch(`/api/transactions/?${params}`);
                setTransactions(await res.json());

                const statsRes = await fetch("/api/transactions/stats");
                setStats(await statsRes.json());
            } catch { /* backend offline – show existing data */ }
        }
        load();
    }, [statusFilter, locationFilter]);

    // SSE live stream
    useEffect(() => {
        if (!isStreaming) { evtRef.current?.close(); return; }
        const es = new EventSource("/api/transactions/stream");
        evtRef.current = es;
        es.onmessage = (e) => {
            const txn = JSON.parse(e.data) as Transaction;
            setTransactions((prev) => {
                const next = [txn, ...prev].slice(0, 100);
                return next;
            });
            setNewIds((prev) => new Set([...prev, txn.transaction_id]));
            setTimeout(() => setNewIds((prev) => { const n = new Set(prev); n.delete(txn.transaction_id); return n; }), 1500);
        };
        return () => es.close();
    }, [isStreaming]);

    const filtered = transactions.filter((t) => {
        if (statusFilter && t.status !== statusFilter) return false;
        if (locationFilter && !t.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="app-layout">
            <nav className="sidebar">
                <SidebarContent active="/" />
            </nav>
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Transaction Monitor</h1>
                        <div className="subtitle">Real-time transaction surveillance & risk assessment</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div className="live-dot"><span className="dot" /> Live Stream</div>
                        <button className="btn btn-ghost" onClick={() => setIsStreaming(v => !v)}>
                            {isStreaming ? "⏸ Pause" : "▶ Resume"}
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowFraudAssistant(true)}>
                            Ask Fraud Assistant
                        </button>
                    </div>
                </div>

                <div className="page-body">
                    {/* Stats */}
                    {stats && (
                        <div className="stat-grid">
                            <div className="stat-card blue">
                                <div className="stat-label">Total Transactions</div>
                                <div className="stat-value">{stats.total.toLocaleString()}</div>
                                <div className="stat-sub">All time</div>
                                <div className="stat-icon" style={{ background: "rgba(37,99,235,0.15)", color: "#3b82f6" }}>📊</div>
                            </div>
                            <div className="stat-card red">
                                <div className="stat-label">Suspicious</div>
                                <div className="stat-value" style={{ color: "#ef4444" }}>{stats.suspicious}</div>
                                <div className="stat-sub">{stats.fraud_rate}% fraud rate</div>
                                <div className="stat-icon" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>🚨</div>
                            </div>
                            <div className="stat-card green">
                                <div className="stat-label">Normal</div>
                                <div className="stat-value" style={{ color: "#22c55e" }}>{stats.normal}</div>
                                <div className="stat-sub">Cleared transactions</div>
                                <div className="stat-icon" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>✅</div>
                            </div>
                            <div className="stat-card yellow">
                                <div className="stat-label">Avg Amount</div>
                                <div className="stat-value" style={{ fontSize: 22, color: "#eab308" }}>₹{stats.avg_amount?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                                <div className="stat-sub">Per transaction</div>
                                <div className="stat-icon" style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}>💰</div>
                            </div>
                        </div>
                    )}

                    {/* Simulation Panel */}
                    <SimulationPanel />

                    {/* Filters */}
                    <div className="toolbar">
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="suspicious">Suspicious</option>
                            <option value="normal">Normal</option>
                        </select>
                        <input
                            className="filter-input"
                            placeholder="Filter by location…"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                        />
                        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                            Showing {filtered.length} transactions
                        </div>
                    </div>

                    {/* Table */}
                    <div className="card">
                        <div className="data-table-wrap scroll-x">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>TXN ID</th>
                                        <th>Sender</th>
                                        <th>Receiver</th>
                                        <th>Amount</th>
                                        <th>Timestamp</th>
                                        <th>Location</th>
                                        <th>Device</th>
                                        <th>Risk Score</th>
                                        <th>Status</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.slice(0, 80).map((t) => (
                                        <tr
                                            key={t.transaction_id}
                                            className={`${t.status === "suspicious" ? "suspicious-row" : ""} ${newIds.has(t.transaction_id) ? "new-row" : ""}`}
                                            onClick={() => { setSelectedTransaction(t); setShowRiskScoreModal(true); }}
                                        >
                                            <td className="mono" style={{ fontSize: 11, color: "var(--accent-cyan)" }}>{t.transaction_id}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 12 }}>{t.sender_name}</div>
                                                <div className="mono text-muted" style={{ fontSize: 10 }}>{t.sender_account}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 12 }}>{t.receiver_name}</div>
                                                <div className="mono text-muted" style={{ fontSize: 10 }}>{t.receiver_account}</div>
                                            </td>
                                            <td style={{ fontWeight: 700, color: "#f1f5f9" }}>
                                                ₹{t.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                            </td>
                                            <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                {new Date(t.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{ fontSize: 13 }}>📍</span>
                                                    <span style={{ fontSize: 12 }}>{t.location}</span>
                                                    {t.geo_mismatch && <span title="Geo Mismatch" style={{ fontSize: 10, color: "#ef4444" }}>⚡</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.device_id}</span>
                                                {t.is_new_device && <span style={{ marginLeft: 4, fontSize: 9, color: "#f97316", fontWeight: 700 }}>NEW</span>}
                                            </td>
                                            <td style={{ minWidth: 140 }}><RiskBar score={t.risk_score} /></td>
                                            <td><StatusBadge status={t.status} /></td>
                                            <td style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 220, whiteSpace: "normal" }}>
                                                {t.fraud_reason !== "No anomalies detected" ? t.fraud_reason : <span style={{ color: "#22c55e" }}>—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <RiskScoreModal
                data={selectedTransaction}
                onClose={() => { setSelectedTransaction(null); setShowRiskScoreModal(false); }}
            />

            <FraudAssistant
                isOpen={showFraudAssistant}
                onClose={() => setShowFraudAssistant(false)}
                transactions={transactions}
            />
        </div>
    );
}

// Inline sidebar to avoid circular import in root page
function SidebarContent({ active }: { active: string }) {
    const links = [
        { href: "/", label: "Transaction Monitor", icon: "📊" },
        { href: "/alerts", label: "Fraud Alerts", icon: "🚨" },
        { href: "/network", label: "Fraud Network", icon: "🕸️" },
        { href: "/behavioral", label: "Behavioral Analysis", icon: "📈" },
        { href: "/geo-risk", label: "Geo-Risk Monitor", icon: "🌍" },
        { href: "/scam-intel", label: "Scam Intel Tool", icon: "🔍" },
    ];
    return (
        <>
            <div className="sidebar-logo">
                <div className="logo-text">🛡️ FinShield</div>
                <div className="logo-sub">Fraud Intelligence Platform</div>
            </div>
            <nav className="sidebar-nav">
                <div className="nav-section-label">Monitoring</div>
                {links.slice(0, 2).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.icon}</span><span>{l.label}</span></a>)}
                <div className="nav-section-label">Intelligence</div>
                {links.slice(2, 5).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.icon}</span><span>{l.label}</span></a>)}
                <div className="nav-section-label">Tools</div>
                {links.slice(5).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.icon}</span><span>{l.label}</span></a>)}
            </nav>
            <div className="sidebar-footer"><span className="status-dot" /> System Online · v1.0.0</div>
        </>
    );
}
