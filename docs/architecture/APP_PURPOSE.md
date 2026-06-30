# App Purpose

## What Furqan Is

A Quran memorization tool, not a general reader. The primary workflow is a student studying and annotating their mushaf — marking words, highlighting verses, and receiving teacher feedback. Reading is the entry point; annotation and memorization are the goal.

## Core Features

- Word-level and verse-level highlighting and marking
- Student-written comments and annotations
- Teacher-student collaborative annotation (teacher marks on the student's copy)
- Page-by-page Quran navigation (604 pages, statically rendered)

## Who the Users Are

- **Students memorizing Quran** — need a distraction-free reading surface where the text is always the primary focus
- **Teachers reviewing student mushafs** — need annotation tools that overlay the text without obstructing it

## UX Principles

1. **Minimize distraction during reading** — chrome, controls, and overlays must recede; the Quran text is the primary element on every page.
2. **RTL is the primary direction** — Arabic is the default locale; all layout decisions must work correctly in RTL first, then adapt for LTR.
3. **Annotation must not obstruct** — marks, highlights, and teacher notes overlay the text; they must be legible without covering adjacent words.

## Future Direction (context only — do not implement)

The current page-by-page view shows one page at a time. A natural future enhancement is a two-page book layout (recto/verso). The design implication: left-page vs right-page must be visually distinguishable. This is a known UX gap to address when that layout is introduced.
