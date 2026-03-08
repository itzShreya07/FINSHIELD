import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children, title, subtitle }: {
    children: ReactNode;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <div className="page-header">
                    <div>
                        <h1>{title}</h1>
                        {subtitle && <div className="subtitle">{subtitle}</div>}
                    </div>
                    <div className="live-dot">
                        <span className="dot" /> Live
                    </div>
                </div>
                <div className="page-body">{children}</div>
            </div>
        </div>
    );
}
