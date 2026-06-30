# UI Workflow Enhancements

**Type:** feature  
**Date:** 2026-06-30  
**Status:** implemented  
**Triggered by:** Shared `SurahList` component breaking sidebar when home page grid was added without checking callers

---

## Summary

Three gaps found in one session: no record of which components exist (or who uses them), no written app purpose for agents to reason from, and `start-fq-task` loads no UI context before planning. This plan closes all three by adding two architecture docs and updating the skill. Task 4 (DECISIONS.md font update) was already applied — DECISIONS.md already reads "Three global fonts."

---

## Root Cause / Approach

The `SurahList` incident happened because there was no lightweight component inventory to check before modifying a shared component. The fix is documentation + a skill change that makes loading that documentation automatic.

---

## Files to Change

### Task 1 — Create `docs/architecture/APP_PURPOSE.md`

New file. Content to include:

**What Furqan is:**  
A Quran memorization tool, not a general reader. The primary workflow is a student studying and annotating their mushaf — marking words, highlighting verses, and receiving teacher feedback. Reading is the entry point; annotation and memorization are the goal.

**Core features:**
- Word-level and verse-level highlighting / marking
- Commenting and annotation (student-written)
- Teacher-student collaborative annotation (teacher marks student's copy)
- Page-by-page Quran navigation (604 pages, statically rendered)

**Who the users are:**
- Students memorizing Quran — need a distraction-free reading surface
- Teachers reviewing student mushafs — need annotation tools that don't obstruct the text

**UX principles:**
1. **Minimize distraction during reading** — chrome, controls, and overlays must recede; the Quran text is the primary element on every page.
2. **RTL is the primary direction** — Arabic is the default locale; all layout decisions must work correctly in RTL first, then adapt for LTR.
3. **Annotation must not obstruct** — marks, highlights, and teacher notes overlay the text; they must be legible without covering adjacent words.

**Future direction (do not implement, context only):**  
The current page-by-page view shows one page at a time. A natural future enhancement is a two-page book layout (recto/verso). The design implication: left-page vs right-page must be visually distinguishable — this is a known UX gap to address when that layout is introduced.

---

### Task 2 — Create `docs/architecture/COMPONENTS.md`

New file. Map the component hierarchy as it exists on 2026-06-30.

**Zone: nav**
```
Nav                          — top bar, always visible
  FurqanLogo                 — brand mark (SVG, links to home)
  SearchBar                  — Quran word/verse search trigger
  SettingsSidebar            — font scale + theme controls panel (Sheet)
    QuranFontScaleControls   — 1–10 scale slider, reads/writes QuranFontScaleContext
    ThemeToggle              — cycles named themes
    LanguageToggle           — ar ↔ en locale switch
  UserMenu                   — sign in / account dropdown
  Sidebar                    — surah/rub navigation panel (Sheet, lazy-loaded via next/dynamic)
    SurahList                — grid of surah cards [SHARED — also used on home page]
      SurahListItem          — single surah card
    RubList                  — list of rub markers
```

**Zone: home** (`app/[locale]/page.tsx`)
```
(page)
  SurahList                  — same component as in Sidebar; receives full surah list, default grid layout
    SurahListItem
```

**Zone: reader** (`app/[locale]/pages/[id]/page.tsx`)
```
(page — server component, statically generated)
  QuranSafha                 — client shell: handles word selection, mark state, scroll
    QuranLine                — one line of the page
      QuranWord              — single word; click triggers mark flow
    MarkModal                — mark/highlight dialog (opens on word click, authenticated)
      MarkerColorPicker      — color swatch grid
    SignInModal              — shown instead of MarkModal when unauthenticated
```

**Zone: vertical reader** (`app/[locale]/pages/vertical/page.tsx`)
```
(page)
  VerticalQuranPages         — virtualized infinite scroll (react-virtuoso)
    QuranPage                — renders one page worth of lines (also used standalone in reader zone)
```

**Zone: shared / UI primitives**
```
components/ui/               — shadcn/ui primitives (button, dialog, dropdown-menu, input, sheet, tabs)
app/components/ui/FQModal    — project-specific modal wrapper around shadcn Dialog
```

**Contexts**
```
QuranFontScaleContext        — font scale (1–10), persisted to localStorage
QueryProvider                — React Query client provider (wraps everything)
SessionProvider              — NextAuth session provider
```

**Update cadence:** At the end of any `start-fq-task` run that adds, removes, or reorganises components, update this file to reflect the new state.

---

### Task 3 — Update `.claude/skills/start-fq-task/SKILL.md`

Three additions to the existing skill:

**Addition 1 — At the start of Step 2 (Load context), prepend:**
> Read `docs/architecture/COMPONENTS.md` before planning implementation.

**Addition 2 — After the existing standards-loading list, add a UI mode block:**
> If the task involves components, pages, layout, or styling, also load:
> - `docs/standards/styling.md`
> - `docs/standards/component-patterns.md`
> - Reference `docs/design/full-design.html` as the visual design source of truth (do not modify it)
> - Read `docs/architecture/APP_PURPOSE.md` for UX principles before making any layout decisions

**Addition 3 — In Step 4 (Record decisions), add before the decisions check:**
> If the task added, removed, or reorganised any components: update `docs/architecture/COMPONENTS.md` to reflect the new state.

---

### Task 4 — Update DECISIONS.md Font System entry

**Already done.** DECISIONS.md already reads "Three global fonts are loaded in `app/layout.tsx`..." — no action needed.

---

## Constraints

- `APP_PURPOSE.md` is written for both AI agents and human collaborators — no implementation detail, only product intent and UX principles.
- `COMPONENTS.md` is a lightweight inventory, not a props/data-flow doc. One line per component. Do not expand it into API documentation.
- `docs/design/full-design.html` is read-only reference — never modify it.
- The `start-fq-task` skill change must not make the skill load all standards files on every run — only trigger the UI block when the task is clearly UI-related.

## Decisions Made

- Component hierarchy doc is loaded on all `start-fq-task` runs (not just UI tasks) — cost is low, benefit is preventing the SurahList class of mistake on any task.
- `APP_PURPOSE.md` lives in `docs/architecture/`, not `docs/product/` — consistent with existing doc location pattern.
- Task 4 confirmed complete — no re-work needed.
