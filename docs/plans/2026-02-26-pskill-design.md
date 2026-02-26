# PSKILL_PLAN: Nanobanana Prompt Generator Evolution

## 1. Overview and Goals
Design and develop an evolved "Nanobanana Prompt Generator" prototype (`pskill`). This tool acts as a comprehensive, flexible prompt generation, validation, and enhancing tool. It accommodates three distinct user archetypes: Novice, Journeyman, and Master, leveraging Progressive Disclosure to hide or reveal complexity.

## 2. Architecture & Data Flow
**Location:** `src/app/prototypes/pskill/page.tsx`
**Approach:** "Progressive Disclosure Dashboard" - A single application screen that dynamically reorganizes its layout and exposes more features as the User Level increases.

### Core State & State Management
*   **User Level Context:** `level: 'novice' | 'journeyman' | 'master'`
*   **Active Exemplar:** `activeExemplarId: string | null`
*   **Presentation Mode:** `presentationMode: 'gallery' | 'dropdown' | 'carousel'`
*   **Core Generation Settings:**
    *   `mediaType: 'image' | 'video'` (Default: 'image')
    *   `quality: 'standard' | 'hd' | 'ultra-hd'` (Includes token cost mapping)
    *   `aspectRatio: string`
    *   `batchSize: number` (1, 2, or 4)
    *   `promptSetId: string` (Refreshable Hash)
*   **Modifiers Context:** Uses the 7 `Modifiers` categories from the original Nanobanana builder.

### The Content Pipeline
*   The application fetches prompts explicitly designated as "Exemplar" (via an `isExemplar` flag or tag) to populate the templates.
*   System compiles: Base Exemplar Subject (or User Subject) + Active Modifiers -> `compileNanobananaPrompt(subject, modifiers)`.

## 3. The User Interface By Persona

### 3.1 The Onboarding Modal (The Switch)
*   **First Load:** A glassmorphic modal asks the user to select their experience level.
*   **Persistence:** Selection is saved securely, recallable on next visit.
*   **Manual Toggle:** A header or sidebar toggle allows switching levels at any time.

### 3.2 The Novice Mode (Simple & Guided)
*   **Focus:** Simplicity, guidance, bare essentials.
*   **Tooltips:** Extensive help text and tooltips on every interactive element.
*   **Exemplar Selection:** Users must choose an "Exemplar" template via Gallery, Dropdown, or Carousel.
*   **Customization:** Only the "Core Subject" input and fundamental Modifiers are visible.
*   **Hidden:** "Core Settings" (Batch, Quality, Aspect Ratio, etc.) and "Start from Scratch" are hidden. Defaults are silently applied.

### 3.3 The Journeyman Mode (Accessible Power)
*   **Focus:** Standard functionality, faster workflows.
*   **Exemplar Selection:** Can use Exemplars OR select "Start from Scratch / New Prompt".
*   **Customization:** Full Modifiers panel is immediately accessible.
*   **Quick Settings:** A simplified "Basic Settings" panel appears (e.g., Aspect Ratio, Quality), but hyper-advanced settings (like Prompt Set ID) remain hidden.

### 3.4 The Master Mode (High Density Control)
*   **Focus:** All functionality, zero clutter, high density.
*   **Exemplar Selection:** Present, but minimized (likely forced to Dropdown to save screen real estate).
*   **The Pro Sidebar:** A dedicated drawer/panel that exposes the full "Core Settings" suite:
    *   Media Type Toggle (Image/Video)
    *   Quality Slider (showing costs)
    *   Aspect Ratio Selector
    *   Batch Size Configuration (1, 2, 4 with manual arrows)
    *   Prompt Set Identifier (with Regenerate icon)
*   **Customization:** Maximum space allocated to typing complex Custom Subjects and managing dense Modifier stacks.

## 4. The Output Canvas
*   A persistent canvas area on the right mapping the current image generation status.
*   Supports horizontal or grid stacking for outputs when `batchSize > 1`.
