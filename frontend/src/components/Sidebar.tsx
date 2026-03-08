"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    {
        section: "Monitoring",
        links: [
            { href: "/", label: "Transaction Monitor", icon: "📊" },
            { href: "/alerts", label: "Fraud Alerts", icon: "🚨" },
        ],
    },
    {
        section: "Intelligence",
        links: [
            { href: "/network", label: "Fraud Network", icon: "🕸️" },
            { href: "/behavioral", label: "Behavioral Analysis", icon: "📈" },
            { href: "/geo-risk", label: "Geo-Risk Monitor", icon: "🌍" },
        ],
    },
    {
        section: "Tools",
        links: [
            { href: "/scam-intel", label: "Scam Intel Tool", icon: "🔍" },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-text">🛡️ FinShield</div>
                <div className="logo-sub">Fraud Intelligence Platform</div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((section) => (
                    <div key={section.section}>
                        <div className="nav-section-label">{section.section}</div>
                        {section.links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`nav-item ${pathname === link.href ? "active" : ""}`}
                            >
                                <span>{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <span className="status-dot" />
                System Online · v1.0.0
                <div style={{ marginTop: 6, fontSize: 10, color: "var(--text-muted)" }}>
                    FinShield AI Engine Active
                </div>
            </div>
        </aside>
    );
}
