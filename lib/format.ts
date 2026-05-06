export function dollars(cents: number | null | undefined): string {
  const c = cents ?? 0;
  return (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function shortDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function shortDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function daysFromNow(s: string | null | undefined): number | null {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.round(ms / 86400000);
}

export function relativeDate(s: string | null | undefined): string {
  const n = daysFromNow(s);
  if (n === null) return "—";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 0 && n < 14) return `In ${n} days`;
  if (n < 0 && n > -14) return `${-n} days ago`;
  return shortDate(s);
}
