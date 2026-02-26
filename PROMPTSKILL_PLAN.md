# PROMPTSKILL_PLAN: Nanobanana Generator Prototype

**Goal:** Build a prototype image & video generator that uses a custom UI (3 forms: Linear Form, Visual Blocks, Smart Stack) to configure a custom AI Skill ("Nanobanana") that intelligently compiles highly structured, optimized prompts. The user must be able to generate and review the resulting image directly within the prototype.

## Phase 1: Prototype Scaffolding & State Management
1. **Register Prototype:** Add `nanobanana` to `PROTOTYPES` array in `src/app/prototypes/page.tsx`.
2. **Page Structure:** Create `src/app/prototypes/nanobanana/page.tsx` with a split-pane layout:
   - **Left Pane:** Tabs for the 3 experimental UIs (Form, Blocks, Stack).
   - **Right Pane:** The compiled prompt preview, generation settings (model, quality), and the image review area.
3. **Shared State:** Define React state for:
   - `coreSubject` (string)
   - `selectedModifiers` (array of objects: `{ id, category, value }`)
   - `compiledPrompt` (string) - The result of the AI weave.
   - `generatedMedia` (object) - The resulting image/video from the API.

## Phase 2: The Nanobanana AI Skill
1. **Extend `AIPromptService`:** In `src/lib/services/ai-prompt.ts`, add:
   ```typescript
   async compileNanobananaPrompt(subject: string, modifiers: { category: string, value: string }[]): Promise<string>
   ```
2. **Prompt Engineering:** Write a specific system instruction for Gemini: "You are a master AI prompt engineer. Take the user's core subject and weave the provided modifiers (in their strict order of priority) into a single, cohesive, vivid, highly optimized diffusion prompt. Do not add conversational fluff. Return only the prompt string."
3. **API Route Pipeline:** Instead of a separate endpoint, we can call the service directly from the client if using server actions, or create a thin wrapper `src/app/api/generate/nanobanana/route.ts` just to handle the compilation.
   *Wait, calling Gemini from the client violates API key secrecy. Let's create `src/app/api/generate/nanobanana/route.ts` to execute `compileNanobananaPrompt`.*

## Phase 3: The 3 Experimental UIs (Left Pane)
1. **Category Data Source:** Define `NANOBANANA_CATEGORIES` (Medium, Art Style, Lighting, Camera, Color, Environment, Magic Words) with predefined options.
2. **UI 1 - Linear Form:** A clean list of dropdowns or chip selectors for each category.
3. **UI 2 - Visual Blocks:** 
   - Use `framer-motion` (since `dnd-kit` isn't installed) or simple up/down arrows to reorder selected modifiers in a vertical list. The array order dictates priority.
4. **UI 3 - Smart Stack:** A horizontally scrolling carousel of modifier categories. Clicking a modifier adds it to a visual "stack" at the bottom.

## Phase 4: Generation & Review (Right Pane)
1. **Integration with Gen API:** Use the existing `/api/generate` endpoint (which maps to `googleGenAIService.generateImage` or video).
2. **Workflow:** 
   - User types "Subject" -> AI compile triggers (debounced or manual "Weave Prompt" button).
   - User reviews the compiled text, clicks **"Generate Prototype Image."**
   - Show loading spinner skeleton.
   - Render resulting image in a large `ImageCard` or custom review canvas with metadata overlay.
3. **Action Bar:** "Save to Gallery," "Download," or "Discard" actions for the newly generated asset.

## Future / Out of Scope (YAGNI)
- Persistent history of generated prototype images (keep it local state during prototyping).
- Customizing the built-in Gemini system prompt from the UI (hardcode it first).
