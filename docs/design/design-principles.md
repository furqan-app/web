# Design Principles

Aesthetic direction and UI sensibility for Furqan. Load this alongside `docs/standards/styling.md` for any UI or component task.

---

## Character

Furqan is a **manuscript-inspired reading app**. Every UI choice should evoke the physical act of holding and reading a book, not a generic SaaS dashboard. Distinctive, not templated.

---

## Cards and surfaces

- Use rounded corners with meaningful radius — `rounded-[20px]` for primary content cards (mushaf page, large dialogs), `rounded-xl` / `rounded-lg` for secondary surfaces
- Flat, borderless, unshadowed cards are wrong for this app — every card should feel slightly elevated
- Preferred shadow: `shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]` — subtle at the top edge, soft diffuse lift at the bottom
- **Layered frames**: where the design reference shows a double border, implement it as an outer border + an absolutely-positioned inner frame (`inset-[10px] border border-primary/20 rounded-xl pointer-events-none`) rather than nested padding divs

## Accent colour usage

- Use `text-primary` / `border-primary/20` as the single unifying ornament colour — it adapts automatically across light, gold, and dark themes
- Apply the accent **sparingly but consistently**: corner ornaments, inner frame accent, header separators, footer markers — all the same token, all at low opacity except for the focal element
- Never reach for a second accent colour; one is enough

## Ornamental elements

- **Corner star ornaments** on the mushaf page card — four 18px SVG stars at each corner (`text-primary opacity-60`), path: `M9 1L10.5 7L17 8.5L10.5 10L9 17L7.5 10L1 8.5L7.5 7Z` (viewBox 0 0 18 18)
- **◆ diamond separators** flanking centred titles — `inline-block rotate-45 text-[6px] text-primary`
- Ornaments must be `pointer-events-none` and placed in a high `z-index` layer

## Header bands in reading views

Use a **3-column grid** (`dir="rtl" grid grid-cols-3`):
- Column 1 (RTL → rightmost): primary metadata (e.g. juz number) — `text-[10px] font-bold tracking-widest text-muted-foreground`
- Column 2 (centre): `◆ Title ◆` — title in `text-sm font-bold text-foreground`, diamonds in `text-primary`
- Column 3 (RTL → leftmost): secondary metadata (e.g. hizb) — same style as column 1, `text-end`
- Separated from content by `border-b border-border pb-2 mb-4`

## Navigation buttons

Circular `<Link>` or `<button>`, **not** icon-as-button:
- Size: `w-[52px] h-[52px] rounded-full`
- Surface: `bg-card border border-border shadow-sm`
- Icon: `ChevronLeft` / `ChevronRight` from lucide-react at `size={18} strokeWidth={1.8}` — thin and light
- Hover: `hover:bg-accent hover:text-accent-foreground transition-colors`
- Never use filled or circle-wrapped icon variants (e.g. `ArrowRightCircle`, `CircleChevronRight`) — they read as too heavy

## Icons

- Source: `lucide-react` only (per DECISIONS.md)
- Default `strokeWidth`: prefer `1.6`–`1.8` for UI chrome; `2` only where emphasis is needed
- Choose the bare shape variant over the outlined-circle variant when both exist

## Process

When asked to enhance or polish UI beyond a spec, use `/frontend-design` — it makes opinionated choices grounded in this document rather than defaulting to generic patterns.
