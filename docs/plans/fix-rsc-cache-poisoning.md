# Fix RSC Cache Poisoning on Hostinger

**Type:** bug  
**Date:** 2026-07-06  
**Status:** implemented

## Root Cause

Hostinger's reverse proxy cache strips `?_rsc=<hash>` from the cache key (or ignores `Vary: RSC, ...`) and stores RSC wire-format responses (`Content-Type: text/x-component`) under bare URLs like `/ar`. Plain navigation requests then receive the cached flight data — rendered as plain text by the browser.

## Fix

Add `Cache-Control: no-store` to RSC responses via `next.config.mjs`'s `async headers()` export with a `has` conditional on `?_rsc`:

```js
// in next.config.mjs (chained with withNextIntl)
async headers() {
  return [{
    source: '/:path*',
    has: [{ type: 'query', key: '_rsc' }],
    headers: [{ key: 'Cache-Control', value: 'no-store' }],
  }];
}
```

Also added to `DECISIONS.md` as a standing constraint: RSC responses must have `Cache-Control: no-store`.

## Constraints

- Use `no-store`, not `private` — `private` still allows browser cache to store flight data, causing stale RSC on back-navigation.
- Only apply to `?_rsc=*` URLs — HTML navigation responses benefit from normal caching semantics.
- Config-only fix — no middleware runtime logic for this.
