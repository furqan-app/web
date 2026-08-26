import { createHash } from 'node:crypto';
import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin();

// The two reader fallback shells (ADR 0014 Addendum 7, #438). These are real
// SSG'd reader documents, not files under public/, so they cannot come from
// `globPublicPatterns` below — that list is globbed here in the `webpack()`
// config phase, before Next has generated any HTML, so a `public/` copy would
// always be one build stale and its `/_next/static/chunks/*` URLs would 404
// after deploy. They also must NOT be passed as `additionalPrecacheEntries`:
// @serwist/next uses that option to *replace* the public glob, which would
// silently drop launch.html, the offline documents and the icons.
// `manifestTransforms` is the one injection point that appends without
// displacing anything — user transforms run first, ahead of both Serwist's own
// URL rewrite (a no-op for these absolute app paths) and the public-glob merge.
//
// Being manifest entries rather than a best-effort `install`-handler fetch is
// the whole point: PrecacheStrategy throws on a non-cacheable response, so the
// worker cannot activate without its shells, and a failed install leaves the
// previous worker and its caches intact. It does NOT avoid install-time
// network — a hydratable Next document must carry the current build's chunk
// URLs, so it can only be fetched from the build that produced it.
//
// Must stay in sync with FALLBACK_LOCALES in app/constants/offline.ts, which
// is what app/sw.ts passes to matchPrecache. It cannot be imported here — this
// file is plain ESM evaluated by Node before any TS compilation, and that
// module is TS behind a path alias — so it is duplicated for the same reason
// FALLBACK_LOCALES itself hardcodes the locales rather than importing routing.
const READER_FALLBACK_SHELL_LOCALES = ['ar', 'en'];

/** @type {import('@serwist/build').ManifestTransform} */
const appendReaderFallbackShells = (manifestEntries) => {
  // Revision hashed from the webpack build assets this transform receives —
  // the same input class app/sw.ts hashes for READER_HTML_CACHE_NAME, so shell
  // freshness and reader-HTML cache busting move together by construction.
  const revision = createHash('sha256')
    .update(JSON.stringify(manifestEntries))
    .digest('hex')
    .slice(0, 16);

  return {
    manifest: [
      ...manifestEntries,
      // `size` is required by the transform's return schema but unknowable
      // here — these documents are prerendered after the client webpack
      // compile this transform runs in. Zero is safe rather than merely
      // tolerated: Serwist's own maximumFileSizeToCacheInBytes filter is
      // applied ahead of user transforms (so it can never drop these), and the
      // only later reader of `size` sums it for the build-log total before
      // deleting the field from every entry.
      ...READER_FALLBACK_SHELL_LOCALES.map((locale) => ({
        url: `/${locale}/pages/1`,
        revision,
        size: 0,
      })),
    ],
    warnings: [],
  };
};

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
  manifestTransforms: [appendReaderFallbackShells],
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

