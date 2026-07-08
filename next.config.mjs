import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin();

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
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

