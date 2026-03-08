"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface Node {
    id: string;
    label: string;
    owner: string;
    total_amount: number;
    txn_count: number;
    max_risk_score: number;
    is_flagged: boolean;
    group: "critical" | "high" | "medium";
    x?: number; y?: number; fx?: number | null; fy?: number | null;
}

interface Edge {
    id: string;
    source: string | Node;
    target: string | Node;
    transaction_id: string;
    amount: number;
    risk_score: number;
    status: string;
    label: string;
}

const groupColor = { critical: "#ef4444", high: "#f97316", medium: "#eab308" };

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

export default function NetworkPage() {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [clusters, setClusters] = useState<any[]>([]);

    useEffect(() => {
        async function load() {
            try {
                const [g, c] = await Promise.all([
                    fetch("/api/network/graph").then(r => r.json()),
                    fetch("/api/network/clusters").then(r => r.json()),
                ]);
                setGraphData(g);
                setClusters(c);
            } catch { }
        }
        load();
    }, []);

    useEffect(() => {
        if (!graphData || !svgRef.current) return;
        const { nodes, edges } = graphData;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        const rect = svgRef.current.getBoundingClientRect();
        const W = rect.width || 800, H = rect.height || 520;

        // Background
        svg.append("rect").attr("width", W).attr("height", H).attr("fill", "transparent");

        const g = svg.append("g");

        // Zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on("zoom", e => g.attr("transform", e.transform));
        svg.call(zoom);

        const nodesD = nodes.map(n => ({ ...n }));
        const linksD = edges.map(e => ({
            ...e,
            source: typeof e.source === "string" ? e.source : (e.source as Node).id,
            target: typeof e.target === "string" ? e.target : (e.target as Node).id,
        }));

        const sim = d3.forceSimulation(nodesD as any)
            .force("link", d3.forceLink(linksD).id((d: any) => d.id).distance(120))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(W / 2, H / 2))
            .force("collision", d3.forceCollide(40));

        const link = g.append("g").selectAll("line").data(linksD).join("line")
            .attr("stroke", d => d.risk_score >= 0.9 ? "#ef4444" : d.risk_score >= 0.7 ? "#f97316" : "#eab308")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => Math.max(1, d.risk_score * 4));

        const linkLabel = g.append("g").selectAll("text").data(linksD).join("text")
            .attr("text-anchor", "middle")
            .attr("fill", "#94a3b8")
            .attr("font-size", 9)
            .text(d => d.label);

        const node = g.append("g").selectAll("g").data(nodesD).join("g")
            .style("cursor", "pointer")
            .call(d3.drag<SVGGElement, any>()
                .on("start", (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
                .on("end", (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
            )
            .on("click", (_, d) => setSelectedNode(d as Node))
            .on("mousemove", (event, d: any) => {
                if (!tooltipRef.current) return;
                tooltipRef.current.style.display = "block";
                tooltipRef.current.style.left = (event.offsetX + 14) + "px";
                tooltipRef.current.style.top = (event.offsetY - 10) + "px";
                tooltipRef.current.innerHTML = `
          <div style="font-weight:700;color:#f1f5f9;margin-bottom:4px">${d.owner}</div>
          <div style="color:#94a3b8;font-size:11px">${d.label}</div>
          <div style="margin-top:6px;font-size:11px">
            <span style="color:${groupColor[d.group as keyof typeof groupColor]}">●</span>
            Risk: ${d.max_risk_score.toFixed(2)}<br/>
            Txns: ${d.txn_count}<br/>
            Volume: ₹${d.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>`;
            })
            .on("mouseleave", () => { if (tooltipRef.current) tooltipRef.current.style.display = "none"; });

        node.append("circle")
            .attr("r", d => 18 + (d as any).txn_count * 1.5)
            .attr("fill", d => groupColor[(d as any).group as keyof typeof groupColor] + "22")
            .attr("stroke", d => groupColor[(d as any).group as keyof typeof groupColor])
            .attr("stroke-width", 2);

        node.append("text")
            .attr("text-anchor", "middle").attr("dy", "0.3em")
            .attr("fill", "#f1f5f9").attr("font-size", 9).attr("font-weight", "600")
            .text(d => (d as any).label);

        node.append("text")
            .attr("text-anchor", "middle").attr("dy", "1.8em")
            .attr("fill", "#94a3b8").attr("font-size", 8)
            .text(d => (d as any).max_risk_score.toFixed(2));

        sim.on("tick", () => {
            link.attr("x1", d => (d as any).source.x).attr("y1", d => (d as any).source.y)
                .attr("x2", d => (d as any).target.x).attr("y2", d => (d as any).target.y);
            linkLabel.attr("x", d => ((d as any).source.x + (d as any).target.x) / 2)
                .attr("y", d => ((d as any).source.y + (d as any).target.y) / 2);
            node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
        });
    }, [graphData]);

    return (
        <div className="app-layout">
            <SidebarNav active="/network" />
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Fraud Network Graph</h1>
                        <div className="subtitle">Interactive visualization of suspicious transaction chains & clusters</div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                        <span style={{ color: "#ef4444" }}>● Critical</span>
                        <span style={{ color: "#f97316" }}>● High</span>
                        <span style={{ color: "#eab308" }}>● Medium</span>
                    </div>
                </div>

                <div className="page-body">
                    <div className="graph-container">
                        <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
                        <div ref={tooltipRef} className="graph-tooltip" style={{ display: "none" }} />
                    </div>

                    {selectedNode && (
                        <div className="card mt-4" style={{ padding: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{selectedNode.owner}</div>
                                    <div className="mono text-muted" style={{ fontSize: 12 }}>{selectedNode.label}</div>
                                </div>
                                <span className={`badge badge-${selectedNode.group}`}>{selectedNode.group.toUpperCase()}</span>
                            </div>
                            <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 13 }}>
                                <div><div className="text-muted" style={{ fontSize: 11 }}>MAX RISK</div><div style={{ fontWeight: 700, color: groupColor[selectedNode.group] }}>{selectedNode.max_risk_score.toFixed(2)}</div></div>
                                <div><div className="text-muted" style={{ fontSize: 11 }}>TRANSACTIONS</div><div style={{ fontWeight: 700 }}>{selectedNode.txn_count}</div></div>
                                <div><div className="text-muted" style={{ fontSize: 11 }}>TOTAL VOLUME</div><div style={{ fontWeight: 700 }}>₹{selectedNode.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div></div>
                                <div><div className="text-muted" style={{ fontSize: 11 }}>FLAGGED</div><div style={{ fontWeight: 700, color: selectedNode.is_flagged ? "#ef4444" : "#22c55e" }}>{selectedNode.is_flagged ? "Yes" : "No"}</div></div>
                            </div>
                        </div>
                    )}

                    {clusters.length > 0 && (
                        <div className="mt-4">
                            <div className="section-title">🔗 Detected Fraud Clusters</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                                {clusters.map(c => (
                                    <div key={c.cluster_id} className="card" style={{ padding: 16 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                                            <span style={{ fontWeight: 700, fontSize: 13 }}>Cluster #{c.cluster_id}</span>
                                            <span className="badge badge-high">{c.size} accounts</span>
                                        </div>
                                        {c.members.slice(0, 4).map((m: any) => (
                                            <div key={m.account_id} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
                                                <span>{m.owner_name}</span>
                                                <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.account_number}</span>
                                            </div>
                                        ))}
                                        {c.members.length > 4 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>+{c.members.length - 4} more</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!graphData && (
                        <div className="empty-state">
                            <div style={{ fontSize: 48 }}>🕸️</div>
                            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>Loading Fraud Network…</div>
                            <div style={{ fontSize: 12, marginTop: 6 }}>Connect to the backend to render the graph.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
