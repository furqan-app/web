"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Replaces the ENTIRE root layout (app/layout.tsx) on error, so none of its
// theme flash-prevention script, fonts, or locale context are available here
// — this must render its own <html>/<body> with safe, self-contained styling
// rather than the app's theme tokens (see plan: docs/plans/sentry-error-tracking.md).
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <style>{`
          body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #111; }
          @media (prefers-color-scheme: dark) {
            body { background: #16232f; color: #f5f5f5; }
          }
          .fq-error-wrap {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 0 1rem;
          }
          .fq-error-title { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; }
          .fq-error-desc { max-width: 28rem; font-size: 0.875rem; opacity: 0.7; line-height: 1.5; }
          .fq-error-actions { margin-top: 2rem; display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }
          .fq-error-btn {
            display: inline-flex;
            align-items: center;
            border-radius: 0.75rem;
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 500;
            border: 1px solid currentColor;
            background: transparent;
            color: inherit;
            cursor: pointer;
            text-decoration: none;
          }
        `}</style>
        <div className="fq-error-wrap">
          <p style={{ fontSize: "3.5rem", fontWeight: 800 }}>:(</p>
          <h1 className="fq-error-title">Something went wrong</h1>
          <p className="fq-error-desc">
            An unexpected error occurred. Please try again.
          </p>
          <div className="fq-error-actions">
            <button className="fq-error-btn" onClick={reset}>
              Try again
            </button>
            <a className="fq-error-btn" href="/">
              Go back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
