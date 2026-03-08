"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, BarChart, Bar } from "recharts";

interface AccountBehavior {
    account_id: string;
    account_number: string;
    owner_name: string;
    avg_transaction_amount: number;
    max_transaction_amount: number;
    transaction_count: number;
    anomaly_count: number;
    suspicious_count: number;
    risk_level: "high" | "medium" | "low";
    time_series: { date: string; total: number; count: number }[];
}

const SidebarNav = ({ active }: { active: string }) => {
    const links = [
        { href: "/", label: "Transaction Monitor", icon: "📊" },
        { href: "/alerts", label: "Fraud Alerts", icon: "🚨" },
        { href: "/network", label: "Fraud Network", icon: "🕸️" },
        { href: "/behavioral", label: "Behavioral Analysis", icon: "📈" },
        { href: "/geo-risk", label: "Geo-Risk Monitor", icon: "🌍" },
        { href: "/scam-intel", label: "Scam Intel Tool", icon: "🔍" },
    ];
    return (
        <aside className="sidebar">
            <div className="sidebar-logo"><div className="logo-text">🛡️ FinShield</div><div className="logo-sub">Fraud Intelligence Platform</div></div>
            <nav className="sidebar-nav">
                <div className="nav-section-label">Monitoring</div>
                {links.slice(0, 2).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.icon}</span><span>{l.label}</span></a>)}
                <div className="nav-section-label">Intelligence</div>
                {links.slice(2, 5).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.icon}</span><span>{l.label}</span></a>)}
                <div className="nav-section-label">Tools</div>
                {links.slice(5).map(l => <a key={l.href} href={l.href} className={`nav-item ${active === l.href ? "active" : ""}`}><span>{l.icon}</span><span>{l.label}</span></a>)}
            </nav>
            <div className="sidebar-footer"><span className="status-dot" /> System Online</div>
        </aside>
    );
};

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "rgba(6,9,26,0.97)", border: "1px solid rgba(37,99,235,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: "#f1f5f9" }}>{label}</div>
            {payload.map((p: any) => (
                <div key={p.name} style={{ color: p.color }}>
                    {p.name}: {p.name.includes("Amount") ? `₹${p.value?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : p.value}
                </div>
            ))}
        </div>
    );
}

export default function BehavioralPage() {
    const [accounts, setAccounts] = useState<AccountBehavior[]>([]);
    const [selected, setSelected] = useState<AccountBehavior | null>(null);
    const [overview, setOverview] = useState<any>(null);

    useEffect(() => {
        async function load() {
            try {
                const [aRes, oRes] = await Promise.all([
                    fetch("/api/behavioral/").then(r => r.json()),
                    fetch("/api/behavioral/overview").then(r => r.json()),
                ]);
                setAccounts(aRes);
                setOverview(oRes);
                if (aRes.length > 0) setSelected(aRes[0]);
            } catch { }
        }
        load();
    }, []);

    return (
        <div className="app-layout">
            <SidebarNav active="/behavioral" />
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Behavioral Analysis</h1>
                        <div className="subtitle">Spending patterns, anomaly detection & account risk profiles</div>
                    </div>
                </div>

                <div className="page-body">
                    {overview && (
                        <div className="stat-grid">
                            <div className="stat-card blue">
                                <div className="stat-label">Total Volume</div>
                                <div className="stat-value" style={{ fontSize: 20 }}>₹{(overview.total_volume / 100000).toFixed(1)}L</div>
                                <div className="stat-icon" style={{ background: "rgba(37,99,235,0.15)", color: "#3b82f6" }}>💰</div>
                            </div>
                            <div className="stat-card yellow">
                                <div className="stat-label">Avg Amount</div>
                                <div className="stat-value" style={{ fontSize: 20 }}>₹{overview.avg_amount?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                                <div className="stat-icon" style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}>📊</div>
                            </div>
                            <div className="stat-card red">
                                <div className="stat-label">Anomalies</div>
                                <div className="stat-value" style={{ color: "#ef4444" }}>{overview.anomaly_count}</div>
                                <div className="stat-icon" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>⚡</div>
                            </div>
                            <div className="stat-card green">
                                <div className="stat-label">Transactions</div>
                                <div className="stat-value">{overview.total_transactions}</div>
                                <div className="stat-icon" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>📈</div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginTop: 8 }}>
                        {/* Account list */}
                        <div className="card" style={{ maxHeight: 580, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                            <div className="card-header"><span className="card-title">Accounts by Risk</span></div>
                            <div style={{ overflowY: "auto", flex: 1 }}>
                                {accounts.map(acc => (
                                    <div
                                        key={acc.account_id}
                                        onClick={() => setSelected(acc)}
                                        style={{
                                            padding: "12px 16px",
                                            borderBottom: "1px solid var(--border-subtle)",
                                            cursor: "pointer",
                                            background: selected?.account_id === acc.account_id ? "rgba(37,99,235,0.1)" : "transparent",
                                            borderLeft: selected?.account_id === acc.account_id ? "3px solid var(--accent-blue-light)" : "3px solid transparent",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{acc.owner_name}</span>
                                            <span className={`badge badge-${acc.risk_level}`} style={{ fontSize: 10 }}>{acc.risk_level}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{acc.account_number} · {acc.transaction_count} txns</div>
                                        <div style={{ fontSize: 11, color: acc.suspicious_count > 0 ? "#ef4444" : "var(--text-muted)", marginTop: 2 }}>
                                            {acc.suspicious_count} suspicious · {acc.anomaly_count} anomalies
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Detail panel */}
                        <div>
                            {selected ? (
                                <>
                                    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 18 }}>{selected.owner_name}</div>
                                                <div className="mono text-muted" style={{ fontSize: 12 }}>{selected.account_number}</div>
                                            </div>
                                            <span className={`badge badge-${selected.risk_level}`}>{selected.risk_level.toUpperCase()} RISK</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 32, fontSize: 13 }}>
                                            <div><div className="text-muted" style={{ fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Avg Amount</div><div style={{ fontWeight: 700 }}>₹{selected.avg_transaction_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div></div>
                                            <div><div className="text-muted" style={{ fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Max Amount</div><div style={{ fontWeight: 700, color: "#ef4444" }}>₹{selected.max_transaction_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div></div>
                                            <div><div className="text-muted" style={{ fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Anomalies</div><div style={{ fontWeight: 700, color: "#f97316" }}>{selected.anomaly_count}</div></div>
                                            <div><div className="text-muted" style={{ fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Suspicious</div><div style={{ fontWeight: 700, color: "#ef4444" }}>{selected.suspicious_count}</div></div>
                                        </div>
                                    </div>

                                    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                                        <div className="card-title" style={{ marginBottom: 16 }}>Daily Transaction Volume</div>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <LineChart data={selected.time_series} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} />
                                                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                                                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} name="Total Amount" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="card" style={{ padding: 20 }}>
                                        <div className="card-title" style={{ marginBottom: 16 }}>Daily Transaction Count</div>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <BarChart data={selected.time_series} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} />
                                                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} name="Count" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state card" style={{ padding: 60 }}>
                                    <div style={{ fontSize: 40 }}>📈</div>
                                    <div style={{ marginTop: 12 }}>Select an account to view analysis</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
