# Design Document: Global Tooltip Control System (Help Mode)

## 1. Overview
The **Global Tooltip Control System** (rebranded as **Help Mode**) introduces a user-switchable layer of contextual information across the Stillwater Studio. It allows users to toggle between a "Clean HUD" for focused work and an "Information HUD" for discovery and learning.

## 2. Architecture

### 2.1 SettingsContext
A new `SettingsContext` will be established to manage UI-only preferences.
- **State**: `helpModeEnabled: boolean`
- **Persistence**: Synchronized with `localStorage` (`'stillwater_help_enabled'`).
- **Provider**: `SettingsProvider` will wrap the application root, providing real-time parity across all components.

### 2.2 Tooltip Component Evolution
The existing `Tooltip` component will be refactored to be "Context Aware."
- **Behavior**: If `helpModeEnabled` is `false`, the tooltip will not render its popup content or attach its event listeners, returning a clean version of the child element.
- **Performance**: Minimizes DOM overhead and re-renders when the system is inactive.

## 3. User Interface

### 3.1 The Help Mode Toggle
A new interactive element will be added to the `DashboardHeader`.
- **Visual**: A question mark icon (`Icons.help` or `Icons.info`).
- **States**:
    - **Active**: Primary color glow, indicating "Help Mode: Online."
    - **Inactive**: Muted, subtle outline.
- **Placement**: Adjacent to the Experience (Casual/Pro) toggle.

### 3.2 Key Information Targets
Initial deployment will focus on elements with high technical density:
- **Studio Builder**: DNA Strip categories, Magic Enhance, Neural Vault, and Modality selectors.
* **Refrence ID**: Explain seed and promptID persistence.
- **Media Cards**: Remix, Download, and Share actions.
- **Account Panels**: Credit balance breakdown (Balance vs. Daily Allowance).

## 4. Implementation Plan (High Level)
1. Create `src/lib/context/SettingsContext.tsx`.
2. Wrap `src/app/layout.tsx` with `SettingsProvider`.
3. Update `src/components/Tooltip.tsx` to consume the context.
4. Integrate the toggle into `src/components/dashboard/DashboardHeader.tsx`.
5. Perform a "Tooltip Audit" across `src/app/generate/page.tsx` and `src/app/gallery/page.tsx` to add high-value content.
