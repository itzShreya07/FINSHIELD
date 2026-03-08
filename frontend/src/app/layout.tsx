import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "FinShield – AI Financial Scam Early Warning Platform",
    description: "Enterprise-grade fraud detection and transaction monitoring for financial institutions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
