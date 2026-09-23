# ADR 0072: Mobile Apps Ship as a Minimal-Binary Capacitor Hosted Shell

**Date:** 2026-09-16
**Status:** Accepted

## Context

Furqan needs installable phone + tablet apps (iOS + Android) reaching the current web state (print-accurate mushaf reader, word-level marks sync, awrad, recitation, offline tafsir/search, sharing grants) without forking the product. The team is Next.js/TS/Tailwind-only with no Dart/Kotlin/Swift capacity. Three independent evaluations (internal audit, Gemini 3.8 high-reasoning review, Codex terra-xhigh adversarial review) ranked Capacitor first and rejected Flutter and dual-native.

## Options Considered

**Option A — Capacitor local-first static bundle (`output: 'export'` baked into the binary)**
The app ships all rendering code locally for a true zero-network cold start.

**Option B — Capacitor HTTPS-hosted hybrid shell (minimal binary, loads the live web app)**
The native shell is a thin wrapper with bridge plugins; content and offline downloads come from the existing web infrastructure on first launch.

**Option C — React Native + Expo (rewrite UI shell, keep TS logic)**
A real-native app reusing pure logic but rewriting every screen and the mushaf renderer.

**Option D — Flutter / dual-native Kotlin + Swift**
Full rewrite(s) in languages the team does not staff.

## Decision

Ship Option B: a minimal-binary Capacitor hosted shell. First launch requires connectivity, then offers the base mushaf edition download or continue-online (same consent model as the PWA first-run gate). A later native track (Option C) stays open but must not be blocked by this work.

## Consequences

- **+** Print-accurate mushaf stays pixel-identical (per-page WOFF2 + COLRv1 pipeline untouched); ~90% code reuse; one team, one codebase.
- **+** Cookie session, `jsonResponse` envelope, Serwist offline engine, and verify-and-heal logic survive unchanged under HTTPS.
- **+** Binary stays small — no edition is baked in (base V1 ≈48 MiB wire / ≈67 MiB stored, V2 ≈95 MiB, Tajweed ≈51 MiB); App-Bound Domains + TestFlight/Play-internal POC prove the shell before any feature work.
- **-** First launch needs connectivity — accepted explicitly (owner decision 2026-09-16); "offline from first launch" is never promised.
- **-** Static-export of the full app is permanently off the table (26 API route handlers plus cookie-session NextAuth cannot export — there are no true Server Actions; `app/server/actions/` files are browser fetch wrappers); `capacitor://` + service workers is broken on iOS WebKit — never revisit without new platform evidence.
- **-** iOS Tajweed (COLRv1) is a release gate, not an assumption: physical-iPhone screenshot parity decides ship vs omit-on-iOS in v1; a CSS fallback cannot preserve the mushaf.
- **-** Native auth path (system browser session + bootstrap, Sign in with Apple, account linking incl. private-relay email) and native push (APNs/FCM + `DeviceToken` store alongside VAPID) are mandatory server-side work, not wrapper toggles.
- **-** Google OAuth inside the WebView and Web Push for native notifications are both hard platform rejections — never attempt either.

---

> **Rules for a valid ADR:**
> - Name the alternatives — if there were no alternatives, this is a reference doc, not an ADR.
> - Record trade-offs — if there are no downsides, you haven't thought hard enough.
> - Don't describe the bug that triggered the work — that context rots; put it in the PR.
> - After writing an ADR, update `DECISIONS.md` in the same commit.
