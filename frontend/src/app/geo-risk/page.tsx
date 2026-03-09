"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

interface Transaction {
    transaction_id: string;
    sender_name: string;
    receiver_name: string;
    sender_account: string;
    receiver_account: string;
    amount: number;
    timestamp: string;
    location: string;
    latitude: number;
    longitude: number;
    receiver_city: string;
    receiver_lat: number;
    receiver_lng: number;
    risk_score: number;
    status: "normal" | "suspicious";
    fraud_reason: string;
}

function arcColor(risk: number) {
    if (risk >= 0.6) return "#ef4444";
    if (risk >= 0.3) return "#eab308";
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

export default function GeoRiskPage() {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filter, setFilter] = useState<"all" | "suspicious" | "normal">("all");
    const [hovered, setHovered] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch transactions on load
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/transactions/?limit=200");
                const data: Transaction[] = await res.json();
                setTransactions(data.filter(t => t.latitude && t.longitude && t.receiver_lat && t.receiver_lng));
            } catch { }
            setLoading(false);
        }
        load();

        // SSE: append new transactions as they arrive
        const es = new EventSource("/api/transactions/stream");
        es.onmessage = (e) => {
            try {
                const t: Transaction = JSON.parse(e.data);
                if (t.latitude && t.longitude && t.receiver_lat && t.receiver_lng) {
                    setTransactions(prev => [t, ...prev].slice(0, 300));
                }
            } catch { }
        };
        return () => es.close();
    }, []);

    const filtered = transactions.filter(t =>
        filter === "all" ? true : t.status === filter
    );

    // Draw map
    useEffect(() => {
        if (!svgRef.current) return;
        const el = svgRef.current;
        const rect = el.getBoundingClientRect();
        const W = rect.width || 900;
        const H = rect.height || 500;
        const svg = d3.select(el);
        svg.selectAll("*").remove();

        const projection = d3.geoNaturalEarth1()
            .scale(W / 6.2)
            .translate([W / 2, H / 2]);

        const path = d3.geoPath().projection(projection);

        const g = svg.append("g");

        // Zoom + pan
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", e => g.attr("transform", e.transform));
        svg.call(zoom);

        // Load world map
        fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
            .then(r => r.json())
            .then((world: any) => {
                const countries = topojson.feature(world, world.objects.countries) as any;
                const borders = topojson.mesh(world, world.objects.countries, (a: any, b: any) => a !== b);

                g.append("g").selectAll("path")
                    .data(countries.features)
                    .join("path")
                    .attr("d", path as any)
                    .attr("fill", "#1a2035")
                    .attr("stroke", "#2d3a55")
                    .attr("stroke-width", 0.4);

                g.append("path")
                    .datum(borders)
                    .attr("d", path as any)
                    .attr("fill", "none")
                    .attr("stroke", "#2d3a55")
                    .attr("stroke-width", 0.3);

                // Draw transaction arcs
                filtered.forEach(t => {
                    const src = projection([t.longitude, t.latitude]);
                    const dst = projection([t.receiver_lng, t.receiver_lat]);
                    if (!src || !dst) return;

                    const [x1, y1] = src;
                    const [x2, y2] = dst;
                    // Bezier control point (curved upward)
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.25;

                    const color = arcColor(t.risk_score);
                    const isSusp = t.status === "suspicious";

                    g.append("path")
                        .attr("d", `M${x1},${y1} Q${mx},${my} ${x2},${y2}`)
                        .attr("fill", "none")
                        .attr("stroke", color)
                        .attr("stroke-width", isSusp ? 1.8 : 0.9)
                        .attr("stroke-opacity", isSusp ? 0.85 : 0.5)
                        .attr("stroke-dasharray", isSusp ? "4,3" : "none")
                        .style("cursor", "pointer")
                        .on("mousemove", (event) => {
                            setHovered(t);
                            if (tooltipRef.current) {
                                tooltipRef.current.style.display = "block";
                                tooltipRef.current.style.left = (event.offsetX + 16) + "px";
                                tooltipRef.current.style.top = (event.offsetY - 12) + "px";
                            }
                        })
                        .on("mouseleave", () => {
                            setHovered(null);
                            if (tooltipRef.current) tooltipRef.current.style.display = "none";
                        });

                    // Sender dot
                    g.append("circle")
                        .attr("cx", x1).attr("cy", y1).attr("r", isSusp ? 4 : 2.5)
                        .attr("fill", color).attr("fill-opacity", 0.9)
                        .attr("stroke", "rgba(0,0,0,0.4)").attr("stroke-width", 0.5);

                    // Receiver dot
                    g.append("circle")
                        .attr("cx", x2).attr("cy", y2).attr("r", 2)
                        .attr("fill", color).attr("fill-opacity", 0.6);
                });
            })
            .catch(() => {
                // Fallback: plain background
                g.append("rect").attr("width", W).attr("height", H).attr("fill", "#111827");
            });
    }, [filtered]);

    const suspicious = transactions.filter(t => t.status === "suspicious").length;
    const normal = transactions.length - suspicious;

    return (
        <div className="app-layout">
            <SidebarNav active="/geo-risk" />
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Geo-Risk Monitor</h1>
                        <div className="subtitle">Global transaction flow visualization — real-time arc map</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {(["all", "suspicious", "normal"] as const).map(f => (
                            <button
                                key={f}
                                className={`btn ${filter === f ? "btn-primary" : "btn-ghost"}`}
                                style={{ fontSize: 12, padding: "6px 16px", textTransform: "capitalize" }}
                                onClick={() => setFilter(f)}
                            >
                                {f === "all" ? "All Flows" : f === "suspicious" ? "Suspicious" : "Normal"}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="page-body">
                    {/* Stats strip */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                        <div className="card" style={{ padding: "12px 20px", display: "flex", gap: 16, alignItems: "center", flex: 1, minWidth: 200 }}>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Total Flows</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{transactions.length}</div>
                            </div>
                            <div style={{ borderLeft: "1px solid var(--border-subtle)", height: 36, marginLeft: 8 }} />
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Suspicious</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{suspicious}</div>
                            </div>
                            <div style={{ borderLeft: "1px solid var(--border-subtle)", height: 36, marginLeft: 8 }} />
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Normal</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>{normal}</div>
                            </div>
                            <div style={{ borderLeft: "1px solid var(--border-subtle)", height: 36, marginLeft: 8 }} />
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Shown</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-cyan)" }}>{filtered.length}</div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="card" style={{ padding: "12px 20px", display: "flex", gap: 20, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>ARC COLOR</span>
                            <span style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 5 }}>
                                <svg width="28" height="4"><line x1="0" y1="2" x2="28" y2="2" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,3" /></svg> High Risk (≥0.6)
                            </span>
                            <span style={{ fontSize: 12, color: "#eab308", display: "flex", alignItems: "center", gap: 5 }}>
                                <svg width="28" height="4"><line x1="0" y1="2" x2="28" y2="2" stroke="#eab308" strokeWidth="2" /></svg> Medium (≥0.3)
                            </span>
                            <span style={{ fontSize: 12, color: "#22c55e", display: "flex", alignItems: "center", gap: 5 }}>
                                <svg width="28" height="4"><line x1="0" y1="2" x2="28" y2="2" stroke="#22c55e" strokeWidth="2" /></svg> Normal (&lt;0.3)
                            </span>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative", height: 500 }}>
                        {loading && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,12,25,0.8)", zIndex: 10, flexDirection: "column", gap: 12 }}>
                                <div style={{ width: 36, height: 36, border: "3px solid #1e3a5f", borderTopColor: "var(--accent-cyan)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading transaction flows...</div>
                            </div>
                        )}
                        <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />

                        {/* Hover tooltip */}
                        <div
                            ref={tooltipRef}
                            style={{
                                display: "none", position: "absolute", zIndex: 20,
                                background: "rgba(6,9,26,0.97)", border: "1px solid rgba(99,179,237,0.2)",
                                borderRadius: 8, padding: "10px 14px", fontSize: 12, pointerEvents: "none", minWidth: 240,
                            }}
                        >
                            {hovered && (
                                <div>
                                    <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 4, fontSize: 13 }}>{hovered.transaction_id}</div>
                                    <div style={{ color: "var(--text-muted)", marginBottom: 8 }}>
                                        {hovered.sender_name} → {hovered.receiver_name}
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>ORIGIN</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>DESTINATION</div>
                                        <div style={{ fontWeight: 600 }}>{hovered.location}</div>
                                        <div style={{ fontWeight: 600 }}>{hovered.receiver_city}</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>AMOUNT</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>RISK SCORE</div>
                                        <div style={{ fontWeight: 600 }}>₹{hovered.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                                        <div style={{ fontWeight: 700, color: arcColor(hovered.risk_score) }}>{hovered.risk_score.toFixed(2)}</div>
                                    </div>
                                    <div style={{
                                        marginTop: 8, padding: "5px 10px", borderRadius: 5,
                                        background: hovered.status === "suspicious" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                                        color: hovered.status === "suspicious" ? "#ef4444" : "#22c55e",
                                        fontSize: 11, fontWeight: 600,
                                    }}>
                                        {hovered.status === "suspicious" ? "SUSPICIOUS" : "NORMAL"}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transaction table */}
                    <div className="card" style={{ marginTop: 20 }}>
                        <div className="card-header">
                            <span className="card-title">Transaction Flows</span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{filtered.length} records</span>
                        </div>
                        <div className="data-table-wrap scroll-x" style={{ maxHeight: 280 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Origin</th>
                                        <th>Destination</th>
                                        <th>Sender</th>
                                        <th>Receiver</th>
                                        <th>Amount</th>
                                        <th>Risk</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.slice(0, 60).map(t => (
                                        <tr key={t.transaction_id} className={t.status === "suspicious" ? "suspicious-row" : ""}>
                                            <td className="mono" style={{ fontSize: 10, color: "var(--accent-cyan)" }}>{t.transaction_id}</td>
                                            <td style={{ fontSize: 12 }}>{t.location}</td>
                                            <td style={{ fontSize: 12 }}>{t.receiver_city}</td>
                                            <td style={{ fontSize: 12 }}>{t.sender_name}</td>
                                            <td style={{ fontSize: 12 }}>{t.receiver_name}</td>
                                            <td style={{ fontWeight: 600 }}>₹{t.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                                            <td style={{ color: arcColor(t.risk_score), fontWeight: 700 }}>{t.risk_score.toFixed(2)}</td>
                                            <td>
                                                <span className={`badge badge-${t.status === "suspicious" ? "suspicious" : "normal"}`}>
                                                    {t.status === "suspicious" ? "Suspicious" : "Normal"}
                                                </span>
                                            </td>
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
