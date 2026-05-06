import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        {eyebrow && <div className="label mb-2">{eyebrow}</div>}
        <h1 className="serif text-4xl lg:text-5xl leading-none">{title}</h1>
        {subtitle && <p className="text-[var(--ink-soft)] mt-3 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  delta,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-[var(--good)]" : tone === "warn" ? "text-[var(--warn)]" : tone === "bad" ? "text-[var(--bad)]" : "";
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className={`stat-num mt-2 ${toneClass}`}>{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {delta && <span className="text-xs text-[var(--ink-soft)]">{delta}</span>}
        {hint && <span className="text-xs text-[var(--ink-mute)]">{hint}</span>}
      </div>
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-6 ${className || ""}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="serif text-2xl">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, hint, cta, href }: { title: string; hint?: string; cta?: string; href?: string }) {
  return (
    <div className="text-center py-14">
      <div className="serif text-2xl">{title}</div>
      {hint && <div className="text-[var(--ink-soft)] mt-2 text-sm">{hint}</div>}
      {cta && href && <Link href={href} className="btn btn-primary mt-5 inline-flex">{cta}</Link>}
    </div>
  );
}

export function Chip({ children, tone }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" | "accent" }) {
  const cls = tone === "good" ? "chip-good" : tone === "warn" ? "chip-warn" : tone === "bad" ? "chip-bad" : tone === "accent" ? "chip-accent" : "";
  return <span className={`chip ${cls}`}>{children}</span>;
}
