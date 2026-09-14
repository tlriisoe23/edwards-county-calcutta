import type { Metadata } from "next";
import "./globals.css";
export const viewport = { width: "device-width", initialScale: 1 };
export const metadata: Metadata = {
    title: "Edwards County | The Calcutta",
    description: "Live golf Calcutta auction, team sales and flight pools.",
    other: {
        "codex-preview": "development",
    },
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
    },
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en">
      <body className="antialiased">{children}</body>
    </html>);
}
