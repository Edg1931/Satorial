import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export const metadata: Metadata = {
  title: "Satorial — AI Retail OS",
  description: "Inventory, sales, appointments, and AI marketing for menswear retail.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <Topbar />
            <main className="flex-1 min-w-0 px-6 lg:px-10 py-8 max-w-[1500px] w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
