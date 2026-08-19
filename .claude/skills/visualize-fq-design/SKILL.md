---
name: visualize-fq-design
description: Generates visual UI mockups and redesign concepts by using actual screenshots of the Furqan app as reference images. Use this before running /impeccable when the user wants to brainstorm new visual directions for an existing screen or a new screen.
---

# /visualize-fq-design

This skill helps you brainstorm new UI designs by generating visual mockups (via the `generate_image` tool), grounded in Furqan's existing visual language using reference screenshots.

## Setup
1. Identify the target surface the user wants to redesign or create (e.g., "the settings sidebar", "the home page").
2. Look in `docs/design/references/` for relevant existing screenshots that match the platform (desktop/mobile) and theme (light/dark).
3. If screenshots are missing or out of date, ask the user to run `npm run capture-references` (while the dev server is running on localhost:3000) to automatically use Playwright to regenerate all reference images before proceeding.

## Execution
1. Select the **1 to 3 most relevant screenshots** for the task. (You cannot pass more than 3 to the `generate_image` tool).
2. Call the `generate_image` tool.
   - `ImagePaths`: Provide the absolute paths to the selected screenshots.
   - `Prompt`: Describe the desired design changes explicitly. Instruct the model to maintain the general layout and color scheme of the references but apply the requested changes (e.g., "Apply a glassmorphism effect", "Make the typography bolder and modernize the layout").
   - `ImageName`: Give it a descriptive name like `concept_settings_sidebar_glass`.

## Next Steps
Once the image is generated:
1. Show the user the resulting image artifact.
2. Ask for their feedback: Do they like this direction? What should be tweaked?
3. If they approve the general direction, recommend using the `/impeccable` skill to actually translate this visual concept into production-ready Next.js and Tailwind code. **Do not write the UI code yourself as part of this skill.** Let `/impeccable` handle the implementation.
