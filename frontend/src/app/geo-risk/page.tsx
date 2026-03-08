"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface GeoPoint {
    location: string;
    count: number;
    suspicious: number;
    total_amount: number;
    lat: number;
    lon: number;
    risk_level: "high" | "medium" | "low";
}

interface ImpossibleTravel {
    account_number: string;
    owner_name: string;
    location_1: string;
    location_2: string;
    transaction_1: string;
    transaction_2: string;
    time_diff_minutes: number;
    distance_km: number;
    timestamp_1: string;
    timestamp_2: string;
    severity: string;
}

const riskColor = { high: "#ef4444", medium: "#eab308", low: "#22c55e" };

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
    const [geoData, setGeoData] = useState<GeoPoint[]>([]);
    const [impossibleTravel, setImpossibleTravel] = useState<ImpossibleTravel[]>([]);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: GeoPoint } | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [g, i] = await Promise.all([
                    fetch("/api/geo-risk/").then(r => r.json()),
                    fetch("/api/geo-risk/impossible-travel").then(r => r.json()),
                ]);
                setGeoData(g);
                setImpossibleTravel(i);
            } catch { }
        }
        load();
    }, []);

    // Draw map with D3 using a simple equirectangular projection
    useEffect(() => {
        if (!svgRef.current) return;

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

        // Add location points
        geoData.forEach(pt => {
            const coords = LOCATION_COORDS[pt.location];
            if (!coords) return;
            const [px, py] = proj(coords) || [0, 0];
            const radius = 8 + Math.sqrt(pt.count) * 3;
            const color = riskColor[pt.risk_level];

            // Glow ring
            svg.append("circle")
                .attr("cx", px).attr("cy", py)
                .attr("r", radius + 6)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 1)
                .attr("opacity", 0.3)
                .style("animation", "pulse 2s infinite");

            svg.append("circle")
                .attr("cx", px).attr("cy", py)
                .attr("r", radius)
                .attr("fill", color + "44")
                .attr("stroke", color)
                .attr("stroke-width", 1.5)
                .style("cursor", "pointer")
                .on("mousemove", (event) => {
                    setTooltip({ x: event.offsetX + 10, y: event.offsetY - 10, data: pt });
                })
                .on("mouseleave", () => setTooltip(null));

            svg.append("text")
                .attr("x", px).attr("y", py - radius - 4)
                .attr("text-anchor", "middle")
                .attr("fill", "#f1f5f9")
                .attr("font-size", 10)
                .attr("font-weight", "600")
                .text(pt.location);
        });

        // Draw impossible travel arcs
        impossibleTravel.slice(0, 5).forEach(travel => {
            const c1 = LOCATION_COORDS[travel.location_1];
            const c2 = LOCATION_COORDS[travel.location_2];
            if (!c1 || !c2) return;
            const [x1, y1] = proj(c1) || [0, 0];
            const [x2, y2] = proj(c2) || [0, 0];
            const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 60;

            svg.append("path")
                .attr("d", `M${x1},${y1} Q${mx},${my} ${x2},${y2}`)
                .attr("fill", "none")
                .attr("stroke", "#ef4444")
                .attr("stroke-width", 1.5)
                .attr("stroke-dasharray", "6,4")
                .attr("opacity", 0.7);
        });
    }, [geoData, impossibleTravel]);

    return (
        <div className="app-layout">
            <SidebarNav active="/geo-risk" />
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Geo-Risk Monitor</h1>
                        <div className="subtitle">Geographic transaction patterns & impossible travel detection</div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                        <span style={{ color: "#ef4444" }}>● High Risk</span>
                        <span style={{ color: "#eab308" }}>● Medium</span>
                        <span style={{ color: "#22c55e" }}>● Low</span>
                        <span style={{ color: "#ef4444" }}>--- Impossible Travel</span>
                    </div>
                </div>

                <div className="page-body">
                    {/* Map */}
                    <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative", marginBottom: 24 }}>
                        <div className="card-header">
                            <span className="card-title">🌍 Transaction Origin Map</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Node size = transaction volume</span>
                        </div>
                        <svg ref={svgRef} style={{ width: "100%", height: 420 }} />
                        {tooltip && (
                            <div style={{
                                position: "absolute", left: tooltip.x, top: tooltip.y,
                                background: "rgba(6,9,26,0.97)", border: "1px solid rgba(37,99,235,0.25)",
                                borderRadius: 8, padding: "10px 14px", fontSize: 12, pointerEvents: "none",
                            }}>
                                <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{tooltip.data.location}</div>
                                <div>Transactions: <strong>{tooltip.data.count}</strong></div>
                                <div>Suspicious: <strong style={{ color: "#ef4444" }}>{tooltip.data.suspicious}</strong></div>
                                <div>Volume: <strong>₹{tooltip.data.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></div>
                                <div>Risk: <strong style={{ color: riskColor[tooltip.data.risk_level] }}>{tooltip.data.risk_level.toUpperCase()}</strong></div>
                            </div>
                        )}
                    </div>

                    {/* Location summary table */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div className="card">
                            <div className="card-header"><span className="card-title">Location Risk Summary</span></div>
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Location</th><th>Txns</th><th>Suspicious</th><th>Risk</th></tr></thead>
                                    <tbody>
                                        {geoData.sort((a, b) => b.suspicious - a.suspicious).map(g => (
                                            <tr key={g.location}>
                                                <td>📍 {g.location}</td>
                                                <td>{g.count}</td>
                                                <td style={{ color: g.suspicious > 0 ? "#ef4444" : "var(--text-muted)" }}>{g.suspicious}</td>
                                                <td><span className={`badge badge-${g.risk_level}`}>{g.risk_level}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">⚡ Impossible Travel Alerts</span>
                                <span className="badge badge-critical">{impossibleTravel.length}</span>
                            </div>
                            <div style={{ overflowY: "auto", maxHeight: 380 }}>
                                {impossibleTravel.length === 0 ? (
                                    <div className="empty-state" style={{ padding: 24 }}>
                                        <div>No impossible travel detected</div>
                                    </div>
                                ) : impossibleTravel.map((t, i) => (
                                    <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                            <span style={{ fontWeight: 700, fontSize: 13 }}>{t.owner_name}</span>
                                            <span className={`badge badge-${t.severity}`}>{t.severity}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                                            {t.location_1} → {t.location_2}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                            {t.distance_km.toLocaleString()} km in {t.time_diff_minutes} min
                                        </div>
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
