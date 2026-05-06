"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[satorial:error]", error);
  }, [error]);

  const isDbError = /database|sqlite|EROFS|ENOENT|EACCES|read-only/i.test(error.message || "");

  return (
    <div className="max-w-2xl mx-auto py-16">
      <div className="card p-8">
        <div className="label mb-2">Server error</div>
        <h1 className="serif text-3xl mb-3">Something went sideways.</h1>
        <p className="text-[var(--ink-soft)] mb-4">
          {isDbError
            ? "The app can't read or write its database. On Vercel and other serverless platforms only /tmp is writable, and storage there is wiped between cold starts."
            : "An unexpected error occurred while rendering this page."}
        </p>
        {isDbError && (
          <div className="rounded-lg border border-[var(--line-soft)] p-4 mb-4 text-sm space-y-2">
            <div className="font-medium">Quick fix</div>
            <ol className="list-decimal pl-5 space-y-1 text-[var(--ink-soft)]">
              <li>In Vercel → Project → Settings → Environment Variables, add <span className="kbd">SATORIAL_DB_PATH</span> = <span className="kbd">/tmp/satorial.db</span></li>
              <li>Redeploy.</li>
              <li>Note: data on /tmp is <em>ephemeral</em>. For real use, see <span className="kbd">README.md</span> &rarr; Deployment.</li>
            </ol>
          </div>
        )}
        {error.digest && <div className="text-[11px] mono text-[var(--ink-mute)] mb-4">digest: {error.digest}</div>}
        <pre className="text-[11px] mono text-[var(--ink-mute)] bg-[var(--bg)] border border-[var(--line-soft)] rounded p-3 overflow-x-auto scrollbar mb-4">{error.message}</pre>
        <div className="flex items-center gap-2">
          <button onClick={() => reset()} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn">Home</Link>
        </div>
      </div>
    </div>
  );
}
