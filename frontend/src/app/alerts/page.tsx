"use client";
import { useState, useEffect } from "react";

interface Alert {
    id: string;
    transaction_id: string;
    alert_type: string;
    severity: "critical" | "high" | "medium";
    fraud_reason: string;
    risk_score: number;
    recommended_action: string;
    is_resolved: boolean;
    created_at: string;
    account_name: string;
    account_number: string;
    amount: number;
    location: string;
}

interface Summary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    unresolved: number;
}

function getRiskColor(score: number) {
    if (score >= 0.9) return "#ef4444";
    if (score >= 0.7) return "#f97316";
    if (score >= 0.4) return "#eab308";
    return "#22c55e";
}

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
            <div className="sidebar-logo">
                <div className="logo-text">FinShield</div>
                <div className="logo-sub">Fraud Intelligence Platform</div>
            </div>
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

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [severityFilter, setSeverityFilter] = useState("");
    const [resolving, setResolving] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const params = new URLSearchParams({ limit: "100" });
                if (severityFilter) params.set("severity", severityFilter);
                const [aRes, sRes] = await Promise.all([
                    fetch(`/api/alerts/?${params}`),
                    fetch("/api/alerts/summary"),
                ]);
                setAlerts(await aRes.json());
                setSummary(await sRes.json());
            } catch { }
        }
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, [severityFilter]);

    async function resolveAlert(id: string) {
        setResolving(id);
        await fetch(`/api/alerts/${id}/resolve`, { method: "PATCH" });
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: true } : a));
        setResolving(null);
    }

    return (
        <div className="app-layout">
            <SidebarNav active="/alerts" />
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Fraud Alerts Center</h1>
                        <div className="subtitle">Centralized fraud event management & triage</div>
                    </div>
                    <div className="live-dot"><span className="dot" /> Auto-refreshing</div>
                </div>

                <div className="page-body">
                    {summary && (
                        <div className="stat-grid">
                            <div className="stat-card blue">
                                <div className="stat-label">Total Alerts</div>
                                <div className="stat-value">{summary.total}</div>
                                <div className="stat-icon" style={{ background: "rgba(37,99,235,0.15)", color: "#3b82f6" }}>ALT</div>
                            </div>
                            <div className="stat-card red">
                                <div className="stat-label">Critical</div>
                                <div className="stat-value" style={{ color: "#ef4444" }}>{summary.critical}</div>
                                <div className="stat-icon" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>CRI</div>
                            </div>
                            <div className="stat-card yellow">
                                <div className="stat-label">High Severity</div>
                                <div className="stat-value" style={{ color: "#f97316" }}>{summary.high}</div>
                                <div className="stat-icon" style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}>HI</div>
                            </div>
                            <div className="stat-card green">
                                <div className="stat-label">Unresolved</div>
                                <div className="stat-value" style={{ color: "#eab308" }}>{summary.unresolved}</div>
                                <div className="stat-icon" style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}>OPEN</div>
                            </div>
                        </div>
                    )}

                    <div className="toolbar">
                        <select className="filter-select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                            <option value="">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                        </select>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{alerts.length} alerts</span>
                    </div>

                    {alerts.map(alert => (
                        <div key={alert.id} className={`alert-card ${alert.severity}`} style={{ opacity: alert.is_resolved ? 0.5 : 1 }}>
                            <div className="alert-card-header">
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span className={`badge badge-${alert.severity}`}>
                                        {alert.severity.toUpperCase()}
                                    </span>
                                    <span className="mono" style={{ fontSize: 12, color: "var(--accent-cyan)" }}>{alert.transaction_id}</span>
                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{alert.account_name} ({alert.account_number})</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: getRiskColor(alert.risk_score) }}>
                                        Risk: {alert.risk_score.toFixed(2)}
                                    </span>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                        {new Date(alert.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    {!alert.is_resolved && (
                                        <button
                                            className="btn btn-ghost"
                                            style={{ fontSize: 11, padding: "4px 12px" }}
                                            onClick={() => resolveAlert(alert.id)}
                                            disabled={resolving === alert.id}
                                        >
                                            {resolving === alert.id ? "Resolving…" : "✓ Resolve"}
                                        </button>
                                    )}
                                    {alert.is_resolved && <span style={{ fontSize: 11, color: "#22c55e" }}>✓ Resolved</span>}
                                </div>
                            </div>
                            <div className="alert-card-body">
                                <div className="alert-reason">
                                    <strong style={{ color: "var(--text-primary)" }}>Fraud Signal: </strong>{alert.fraud_reason}
                                </div>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                                    <span>Location: {alert.location}</span>
                                    <span>Amount: ₹{alert.amount?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                                    <span>Account: {alert.account_number}</span>
                                </div>
                                <div className="alert-action">
                                    Recommendation: {alert.recommended_action}
                                </div>
                            </div>
                        </div>
                    ))}

                    {alerts.length === 0 && (
                        <div className="empty-state">
                            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>No Alerts Found</div>
                            <div style={{ fontSize: 12, marginTop: 6 }}>Start the backend and run the seed script to populate data.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
