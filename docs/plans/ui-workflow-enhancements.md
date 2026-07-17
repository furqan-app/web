# UI Workflow Enhancements

**Type:** feature
**Date:** 2026-06-30
**Status:** implemented

## Summary

Three gaps found after `SurahList` broke the sidebar when it was also added to the home page without checking callers: no component inventory, no written app purpose, and `start-fq-task` loaded no UI context before planning.

## Changes Made

### `docs/architecture/APP_PURPOSE.md` (new)

Furqan is a Quran memorization tool — not a general reader. Core features: word/verse highlighting, commenting/annotation, teacher-student collaborative annotation, page-by-page navigation (604 pages, statically rendered). Users: students memorizing Quran (need distraction-free reading surface) and teachers reviewing student mushafs (need annotation tools that don't obstruct text).

UX principles:
1. Minimize distraction during reading — chrome/controls/overlays must recede; Quran text is the primary element.
2. RTL is the primary direction — all layout decisions must work correctly in RTL first, then adapt for LTR.
3. Annotation must not obstruct — marks/highlights/notes must be legible without covering adjacent words.

### `docs/architecture/COMPONENTS.md` (new)

Lightweight component inventory. One line per component. Update at the end of any `start-fq-task` run that adds, removes, or reorganises components. Do not expand into API/props documentation.

### `.claude/skills/start-fq-task/SKILL.md` (updated)

Added to Step 2 (Load context):
- Read `docs/architecture/COMPONENTS.md` before planning (all tasks — low cost, prevents the SurahList class of mistake on any task).
- For UI tasks (components/pages/layout/styling): also load `styling.md`, `component-patterns.md`; reference `docs/design/full-design.html` as visual design source of truth (read-only, never modify); read `docs/architecture/APP_PURPOSE.md` for UX principles.

Added to Step 4 (Record decisions): update `docs/architecture/COMPONENTS.md` if the task added/removed/reorganised any components.

## Constraints

- `APP_PURPOSE.md` is for both AI agents and human collaborators — no implementation detail, only product intent and UX principles.
- `docs/design/full-design.html` is read-only reference — never modify it.
- Do not load all standards files on every run — only trigger the UI block when the task is clearly UI-related.
