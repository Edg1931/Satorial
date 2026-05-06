"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◇" },
  { href: "/inventory", label: "Inventory", icon: "▦" },
  { href: "/scan", label: "Scan", icon: "▤" },
  { href: "/sales", label: "Sales", icon: "◷" },
  { href: "/appointments", label: "Appointments", icon: "▣" },
  { href: "/customers", label: "Customers", icon: "◐" },
  { href: "/finance", label: "Finance", icon: "◍" },
  { href: "/campaigns", label: "Campaigns", icon: "◈" },
  { href: "/social", label: "Social", icon: "◑" },
  { href: "/ai", label: "AI Partner", icon: "✦" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-[232px] shrink-0 border-r border-[var(--line-soft)] bg-[var(--bg)] sticky top-0 h-screen flex flex-col">
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)] grid place-items-center text-[#1a1408] font-bold serif text-lg">S</div>
          <div>
            <div className="serif text-xl leading-none">Satorial</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-mute)] mt-1">Retail OS</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname?.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active
                  ? "bg-[var(--bg-elev-2)] text-[var(--ink)] border border-[var(--line)]"
                  : "text-[var(--ink-soft)] hover:bg-[var(--bg-elev)] hover:text-[var(--ink)] border border-transparent"
              }`}
            >
              <span className={`w-5 text-center ${active ? "text-[var(--accent)]" : "text-[var(--ink-mute)]"}`}>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[var(--line-soft)]">
        <div className="rounded-lg p-3 bg-[var(--bg-elev)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" />
            <div className="text-xs text-[var(--ink-soft)]">AI Partner is on standby</div>
          </div>
          <Link href="/ai" className="text-xs text-[var(--accent-soft)] hover:underline">Open chat →</Link>
        </div>
      </div>
    </aside>
  );
}
