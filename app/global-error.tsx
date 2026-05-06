"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[satorial:global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0b0c10", color: "#f3eee2", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "48px 24px", margin: 0 }}>
        <div style={{ maxWidth: 640, margin: "40px auto", border: "1px solid #2a2e3a", borderRadius: 14, padding: 32, background: "#14161d" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#7c7768", marginBottom: 8 }}>Server error</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, margin: "0 0 12px" }}>Satorial hit a snag.</h1>
          <p style={{ color: "#b8b3a6", margin: "0 0 16px" }}>
            The application crashed before the layout could load. Most often this happens on Vercel because the database needs a writable filesystem.
          </p>
          <p style={{ color: "#b8b3a6", margin: "0 0 16px" }}>
            Add an env var <code style={{ background: "#1b1e27", padding: "2px 6px", borderRadius: 4 }}>SATORIAL_DB_PATH=/tmp/satorial.db</code> in your Vercel project settings, then redeploy.
          </p>
          {error.digest && <div style={{ fontSize: 11, fontFamily: "monospace", color: "#7c7768", marginBottom: 16 }}>digest: {error.digest}</div>}
          <pre style={{ fontSize: 11, fontFamily: "monospace", color: "#7c7768", background: "#0b0c10", border: "1px solid #20232c", borderRadius: 8, padding: 12, overflow: "auto", marginBottom: 16 }}>{error.message}</pre>
          <button onClick={() => reset()} style={{ background: "#c69f5a", color: "#1a1408", border: 0, padding: "10px 16px", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
