# Nanobanana Prompt Builder Prototype Design

**Date:** 2026-02-25  
**Status:** Approved  

## Overview
A new experimental feature living within the Prototype Framework (`/prototypes/nanobanana`). It aims to test three distinct UI patterns for constructing highly structured, AI-compiled prompts ("Nanobanana" prompts) and generating images directly from them.

## Architecture & Layout
- **Route:** `/prototypes/nanobanana`
- **Layout:** Side-by-side (or stacked on mobile).
  - **Left Pane (The Builder):** Contains the UI for selecting prompt components. Users can switch between 3 experimental UI Tabs.
  - **Right Pane (The Previewer):** Shows the real-time AI-compiled text prompt, a "Generate" button, and the actual image preview canvas where the generated image will appear.

## The Nanobanana Formula (Categories)
Instead of freeform text, prompts are built from specific structural ingredients:
1. **Core Subject** (e.g., "A futuristic cyberpunk city") - *Required Text Input*
2. **Medium** (Photography, Oil Painting, 3D Render, Sketch)
3. **Art Style/Vibe** (Cyberpunk, Fantasy, Minimalist, Vaporwave)
4. **Lighting** (Cinematic, Golden Hour, Volumetric, Studio)
5. **Camera/Lens** (35mm, Macro, Drone, Fisheye)
6. **Color Palette** (Neon, Muted, Pastel, High Contrast)
7. **Environment** (Busy street, Underwater, Deep space)
8. **Magic Words** (Masterpiece, Trending on ArtStation, 8k, Unreal Engine 5)

## The 3 UI Experiments (Tabs)
1. **Linear Form (Structured):** A clean, vertical accordion or list of dropdowns/chips for each category. Familiar and fast.
2. **Visual Blocks (Prioritized):** Users select modifiers which appear as vertical blocks. They can drag and drop these blocks to reorder their priority. The order dictates how the AI weaves the final prompt.
3. **Smart Stack (Exploratory):** A deck of modifier cards. Users flip through and click to "stack" modifiers onto their core subject. Highly visual.

## AI Compilation Skill
- A new method in `AIPromptService`: `compileNanobananaPrompt(subject, modifiers, priorityOrder)`.
- Replaces mechanical concatenation with Gemini's ability to weave the ingredients into a cohesive, highly optimized prompt string tailored for image generation models.

## Generation & Review
- The Right Pane acts as a tight feedback loop.
- The compiled prompt is visible.
- The user clicks **"Generate Prototype"**.
- Uses the existing `/api/generate` endpoint.
- Displays the loading skeleton, then the final generated image.
- Allows the user to quickly iterate: tweak a modifier block -> recompile -> regenerate -> review.
