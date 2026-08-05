"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * The true last-resort boundary — only fires if the ROOT layout itself
 * throws (so it must render its own <html>/<body>; nothing above this
 * exists). Imports globals.css directly since it replaces layout.tsx,
 * which is normally what pulls that in. Inline styles as a fallback in case
 * even that fails to apply — this page has to survive worse-than-usual
 * conditions.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 380, textAlign: "center", padding: 24 }}>
          <h1 style={{ fontWeight: 500, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
            The app hit an unexpected error. Please reload the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "#111827",
              color: "#fff",
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
