---
name: visualize-fq-design
description: Generates visual UI mockups and redesign concepts by using user-provided images or live in-browser screenshots of the Furqan app. Use this before running /impeccable when brainstorming new visual directions.
---

# /visualize-fq-design

This skill helps brainstorm new UI designs by generating visual mockups (via the `generate_image` tool), grounded in Furqan's visual language using reference screenshots.

## Step 1 — Acquire Reference Screenshot(s)

Choose one of two methods:

### Method A: User-Provided Image
- Ask the user if they have an existing screenshot, wireframe, mockup, or reference image they would like to use.
- Use the image path(s) provided by the user.

### Method B: Live In-Browser Screenshot
- If no image is provided, ensure the local dev server for the current task/worktree is running (check the active dev server port, e.g. 3000 or the port assigned to the current worktree/session).
- Launch a browser subagent to navigate to the target screen (e.g., `http://localhost:<port>/ar/pages/1` or `http://localhost:<port>/en`), configure the target viewport/theme or interact with the UI to reach the desired state (e.g. open settings sheet or search modal), and capture a screenshot.
- Save the screenshot to the artifact directory.

## Step 2 — Generate Concept Mockup
1. Select the **1 to 3 most relevant reference images**. (Maximum 3 images can be passed to `generate_image`).
2. Call the `generate_image` tool:
   - `ImagePaths`: Provide the absolute paths to the reference screenshots.
   - `Prompt`: Describe the desired design changes explicitly. Instruct the model to maintain the general layout and core visual identity of the references while applying the requested changes (e.g., "Modernize card surfaces with subtle frosted glass and refined borders", "Redesign navigation capsule with calligraphic accenting").
   - `ImageName`: Use a descriptive name (e.g., `concept_settings_glass`).

## Step 3 — Review & Transition to Implementation
1. Show the user the generated image artifact.
2. Solicit user feedback on aesthetics, hierarchy, and direction.
3. Once the visual concept is agreed upon, transition to the `/impeccable` skill to translate the visual concept into production-ready Next.js and Tailwind code. **Do not write the UI code yourself as part of this skill.** Let `/impeccable` handle the implementation.

