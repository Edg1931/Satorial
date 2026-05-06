"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Topbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        router.push("/scan");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    if (/^\d{8,}$/.test(t)) router.push(`/scan?code=${encodeURIComponent(t)}`);
    else router.push(`/inventory?q=${encodeURIComponent(t)}`);
  };

  return (
    <header className="sticky top-0 z-20 bg-[var(--bg)]/85 backdrop-blur border-b border-[var(--line-soft)]">
      <div className="px-6 lg:px-10 h-16 flex items-center gap-4">
        <form onSubmit={onSubmit} className="flex-1 max-w-xl relative">
          <input
            id="global-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search inventory, customers, scan a barcode…"
            className="input pl-9"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-mute)]">⌕</span>
          <span className="kbd absolute right-3 top-1/2 -translate-y-1/2">⌘K</span>
        </form>
        <div className="flex items-center gap-2">
          <Link href="/scan" className="btn">▤ Scan</Link>
          <Link href="/sales/new" className="btn">+ New Sale</Link>
          <Link href="/appointments/new" className="btn btn-primary">+ Appointment</Link>
        </div>
      </div>
    </header>
  );
}
