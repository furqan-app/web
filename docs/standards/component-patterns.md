# Component Patterns

## Server vs Client Components

**Default to Server Components.** Add `"use client"` only when the component needs:
- Browser APIs (`window`, `localStorage`, etc.)
- React state (`useState`, `useReducer`)
- React effects (`useEffect`)
- Event handlers directly on JSX elements
- React Query hooks (`useQuery`, `useMutation`)
- Context consumers

## Component Location

| Type | Location |
|---|---|
| App-specific components | `app/components/` |
| shadcn/ui primitives | `components/ui/` |
| Page-level server components | `app/[locale]/...` |
| Providers (session, query) | `app/providers/` |

## Deferred Loading

Use `next/dynamic` for components that are:
- Non-critical for initial render (e.g. Sidebar)
- Heavy in JS bundle size
- Only needed after user interaction

```ts
const Sidebar = dynamic(() => import("@/app/components/nav/Sidebar"));
```

## Props Pattern

Use an explicit `type Props = { ... }` at the top of the file. Do not use `React.FC<Props>` — type the function parameter directly.

## Memoization

Wrap client components that receive stable props and re-render frequently in `memo`:

```tsx
const QuranPage = memo(function QuranPage({ page }: Props) { ... });
```

Only memoize when there's a clear performance reason — not by default.

## Data Fetching

- **Static page content:** Fetch via Prisma directly in Server Components (e.g. `getPageWords`, `getSurahs`). No API self-calls for static data.
- **User-specific dynamic data:** Fetch via React Query hooks in Client Components (e.g. `useMarks`, `usePage`).
- **Parallel fetches:** Always use `Promise.all` when fetching multiple independent resources server-side.

## Path Aliases

Always use path aliases, never relative `../../` imports:

```ts
import { QuranSafha } from "@components/QuranSafha";
import { getSurahs } from "@/app/hooks/get-surahs";
import { prisma } from "@/app/utils/db";
```

Available aliases: `@components/*`, `@contexts/*`, `@hooks/*`, `@utils/*`, `@types`, `@constants/*`, `@fonts/*`, `@messages/*`, `@/*`.
