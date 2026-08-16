import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin();

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // `globPublicPatterns` defaults to ["**/*"], which swept ALL of public/ into
  // the service worker's install-time precache manifest: 604 base fonts, 604
  // tajweed COLRv1 fonts and 1208 page JSON files — ~138 MiB downloaded
  // unconditionally by every production visitor in a plain browser tab, since
  // install precache ignores display-mode and is all-or-nothing. That directly
  // contradicted ADR 0014 ("regular web visitors see zero behavior change",
  // "never unconditionally pre-cache page fonts") and ADR 0023 (tajweed fonts
  // excluded from precache), and made the consent-gated download in
  // app/sw.ts pointless because the bytes had already been fetched.
  //
  // Keep this list to the app shell only. Page fonts and page JSON are reached
  // two other ways that both respect consent: the runtime CacheFirst rules in
  // app/sw.ts (cache-as-visited) and the user-initiated bulk precache.
  // `launch.html` is the PWA's start_url (ADR 0042) — precaching it here is what
  // makes an offline cold launch redirect instead of falling through to the
  // service worker's catch handler. ~1 KB, so it fits the app-shell pin above.
  // `offline-{ar,en}.html` (ADR 0014 Addendum 4) are the non-reader-route
  // offline fallback documents `setCatchHandler` serves in app/sw.ts — same
  // static, no-React-runtime shape as launch.html, same reason to precache here.
  globPublicPatterns: [
    'icon.svg',
    'icons/**/*',
    'quran/chapters.json',
    'launch.html',
    'offline-ar.html',
    'offline-en.html',
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Required pre-Next-15 for instrumentation.ts to run (see ADR 0017).
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        // RSC flight responses must never be stored by intermediate caches.
        // Hostinger's reverse proxy strips ?_rsc=<hash> from cache keys and
        // ignores the Vary: RSC header, causing RSC wire format to be served
        // for plain navigation requests (users see raw JSON instead of HTML).
        source: "/(.*)",
        has: [{ type: "query", key: "_rsc" }],
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        // Font paths are versioned (/v1/, /v4/) — safe to cache forever. Also
        // means an accidental FontFace recreation (ADR 0029) costs no
        // revalidation round-trip, not just no reset.
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    })

    return config
  },
  reactStrictMode: false
};

export default withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});

