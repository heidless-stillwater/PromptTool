# Implementation Plan: PSKILL Prototype Evolution

## Phase 1: Foundation & Onboarding
1. **Initialize Directory & Types:**
   - Create directory: `src/app/prototypes/pskill`
   - Create foundational file: `src/app/prototypes/pskill/page.tsx`
   - Define types for User Types (`UserLevel` = 'novice' | 'journeyman' | 'master'), `Exemplar` object structure, and core Generator State.

2. **The "Welcome/Onboarding" Modal:**
   - Create an `<OnboardingModal />` component in the same file or a sub-components folder.
   - It should intercept the initial load if no level is stored in local storage.
   - Present three selectable cards (Novice, Journeyman, Master).
   - Once selected, save to local component state (and mock local storage persistence).

## Phase 2: State Management & Layout Scaffolding
1. **Top-Level State Container:**
   - Implement state for: `currentLevel`, `activeExemplarId`, `presentationMode` (gallery|dropdown|carousel).
   - Implement Generation State: `batchSize` (1,2,4), `quality`, `aspectRatio`, `mediaType`, `promptSetId`.
   - Implement Modifier State (reuse the categorical arrays from original nanobanana prototype).

2. **Structural Skeleton:**
   - Set up the Split-pane layout.
   - Left Pane: Dynamic "Builder" area.
   - Right Pane: Static "Output Canvas" area representing where the generated image batches and "Compiled Prompt" will appear.

## Phase 3: Dynamic Forms & Components (The Left Pane)
1. **Exemplar Source Data:**
   - Hardcode an array of `EXEMPLARS_DATA` containing at least 3 distinct objects containing Title, Thumbnails, Subject Base, and Pre-selected Modifiers.

2. **Journeyman & Master Conditionals:**
   - Build out the presentation mode toggle (Carousel vs Gallery vs List) that sits above the Exemplar UI.
   - Build the "Start from Scratch" mechanism (hidden for Novice, visible for Journeymen+).

3. **Progressive Disclosure Modifiers:**
   - Create the `<ModifiersPanel />`.
   - If `Novice`: Render clean, essential modifiers only (or hide them by default until they click 'Customize').
   - If `Journeyman` / `Master`: Render the full expanded stack.

4. **The Pro Settings Sidebar (Master Only):**
   - Create a side drawer/expanded panel that houses explicitly:
     - Media Type Toggle.
     - Batch Size (with Up/Down arrows).
     - Quality Slider.
     - Aspect ratio chips.
     - Prompt Set ID regenerator.

## Phase 4: Data Flow & Stub Integrations
1. **Preview Mechanics:**
   - Create real-time text combination: `Compiled Prompt = Exemplar Subject + Active Modifiers string`.
   - Show this compilation in the output panel to verify state is working.
2. **Action Buttons:**
   - Stub out the "Generate Batch" button to trigger a timeout simulating an API call.
3. **Refinement:**
   - Ensure tooltips exist for Novice features.
   - Add aesthetic polishing (glassmorphism on sidebars, rich gradients).

*Note: AI integration for prompt compilation and hitting the real image generation API via the new schema will be handled post-prototype scaffolding.*
