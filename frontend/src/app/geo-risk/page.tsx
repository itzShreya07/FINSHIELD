"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface Transaction {
    transaction_id: string;
    account_number: string;
    amount: number;
    risk_score: number; // Assuming 0-100
    location_from: string;
    location_to: string;
    timestamp: string;
}

const riskColor = { high: "#ef4444", medium: "#eab308", low: "#22c55e" };

// Helper to get risk level from score
const getRiskLevel = (score: number) => {
    if (score > 70) return "high";
    if (score > 40) return "medium";
    return "low";
};

// Approximate world map projection coords for our locations
const LOCATION_COORDS: Record<string, [number, number]> = {
    Mumbai: [72.877, 19.076], Delhi: [77.209, 28.613],
    Chennai: [80.270, 13.083], Bengaluru: [77.594, 12.972],
    Hyderabad: [78.487, 17.385], London: [-0.127, 51.507],
    "New York": [-74.005, 40.712], Dubai: [55.270, 25.204],
    Singapore: [103.819, 1.352], Paris: [2.352, 48.856],
};

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

export default function GeoRiskPage() {
    const svgRef = useRef<SVGSVGElement>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: Transaction } | null>(null);

    useEffect(() => {
        async function loadTransactions() {
            try {
                const response = await fetch("/api/transactions/");
                const data = await response.json();
                setTransactions(data);
            } catch (error) {
                console.error("Failed to fetch transactions:", error);
            }
        }
        loadTransactions();
    }, []);

    // Draw map with D3 using a simple equirectangular projection
    useEffect(() => {
        if (!svgRef.current || transactions.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const W = svgRef.current.clientWidth || 900;
        const H = 420;

        const proj = d3.geoNaturalEarth1()
            .scale(160)
            .translate([W / 2, H / 2]);
        const path = d3.geoPath().projection(proj);

        // Draw a world background
        svg.append("rect").attr("width", W).attr("height", H).attr("fill", "rgba(9,15,30,0.5)");

        // Graticule grid
        const graticule = d3.geoGraticule()();
        svg.append("path").datum(graticule).attr("d", path as any)
            .attr("fill", "none").attr("stroke", "rgba(37,99,235,0.07)").attr("stroke-width", 0.5);

        // Draw transaction arcs
        transactions.forEach(tx => {
            const c1 = LOCATION_COORDS[tx.location_from];
            const c2 = LOCATION_COORDS[tx.location_to];
            if (!c1 || !c2) return;

            const [x1, y1] = proj(c1) || [0, 0];
            const [x2, y2] = proj(c2) || [0, 0];

            // Calculate midpoint for arc curvature
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Adjust curvature based on distance
            const curveFactor = dist / 10; // Smaller factor for less curve
            const controlX = midX + (-dy / dist) * curveFactor;
            const controlY = midY + (dx / dist) * curveFactor;

            const riskLevel = getRiskLevel(tx.risk_score);
            const color = riskColor[riskLevel];

            svg.append("path")
                .attr("d", `M${x1},${y1} Q${controlX},${controlY} ${x2},${y2}`)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 1.5)
                .attr("opacity", 0.7)
                .style("cursor", "pointer")
                .on("mousemove", (event) => {
                    setTooltip({ x: event.offsetX + 10, y: event.offsetY - 10, data: tx });
                })
                .on("mouseleave", () => setTooltip(null));
        });
    }, [transactions]);

    return (
        <div className="app-layout">
            <SidebarNav active="/geo-risk" />
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Geo-Risk Monitor</h1>
                        <div className="subtitle">Real-time transaction flows & risk visualization</div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                        <span style={{ color: "#ef4444" }}>● High Risk</span>
                        <span style={{ color: "#eab308" }}>● Medium Risk</span>
                        <span style={{ color: "#22c55e" }}>● Low Risk</span>
                    </div>
                </div>

                <div className="page-body">
                    {/* Map */}
                    <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative", marginBottom: 24 }}>
                        <div className="card-header">
                            <span className="card-title">🌍 Transaction Flow Map</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Arcs represent transactions, color indicates risk</span>
                        </div>
                        <svg ref={svgRef} style={{ width: "100%", height: 420 }} />
                        {tooltip && (
                            <div style={{
                                position: "absolute", left: tooltip.x, top: tooltip.y,
                                background: "rgba(6,9,26,0.97)", border: "1px solid rgba(37,99,235,0.25)",
                                borderRadius: 8, padding: "10px 14px", fontSize: 12, pointerEvents: "none",
                            }}>
                                <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Transaction ID: {tooltip.data.transaction_id}</div>
                                <div>Account: <strong>{tooltip.data.account_number}</strong></div>
                                <div>Amount: <strong>₹{tooltip.data.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></div>
                                <div>From: <strong>{tooltip.data.location_from}</strong></div>
                                <div>To: <strong>{tooltip.data.location_to}</strong></div>
                                <div>Risk Score: <strong style={{ color: riskColor[getRiskLevel(tooltip.data.risk_score)] }}>{tooltip.data.risk_score} ({getRiskLevel(tooltip.data.risk_score).toUpperCase()})</strong></div>
                            </div>
                        )}
                    </div>

                    {/* Transaction list table */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Recent Transactions</span>
                            <span className="badge badge-info">{transactions.length}</span>
                        </div>
                        <div className="data-table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Account</th>
                                        <th>From</th>
                                        <th>To</th>
                                        <th>Amount</th>
                                        <th>Risk</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(tx => (
                                        <tr key={tx.transaction_id}>
                                            <td>{tx.transaction_id.substring(0, 8)}...</td>
                                            <td>{tx.account_number}</td>
                                            <td>{tx.location_from}</td>
                                            <td>{tx.location_to}</td>
                                            <td>₹{tx.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                                            <td><span className={`badge badge-${getRiskLevel(tx.risk_score)}`}>{tx.risk_score}</span></td>
                                            <td>{new Date(tx.timestamp).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
