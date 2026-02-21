# Refactor Project Plan: "Clean Slate"

> **Status**: 100% Complete ✅
> **Priority**: High
> **Objective**: Improve code maintainability, reduce technical debt, and prepare the architecture for scaling features like Social 2.0 and Advanced Generation.

## 1. High Priority: Component Decomposition & Architecture

These items address "God Components" that are becoming difficult to maintain and extend.

### 1.1 Refactor `ImageDetailModal` (Props Explosion) ✅ **Completed**
- **Problem**: The component takes ~30 props and handles too many responsibilities (display, editing, tagging, collections, navigation).
- **Execution**:
    - Extracted `ImageDisplay`, `ImageMetadataSidebar`, `CollectionSelector`, `TagManager`, `PromptSetIDManager`, `ActionsBar`.
    - Created `useImageDetails` hook to encapsulate logic.
    - Simplified `ImageDetailModal` significantly.

### 1.2 Refactor `ImageEditor` (Logic Handling) ✅ **Completed**
- **Problem**: A 600+ line file mixing complex Canvas manipulation logic with UI state and rendering.
- **Execution**:
    - Created `useImageEditor` hook to encapsulate all canvas logic, state, and history management.
    - Updated `ImageEditor` component to focus purely on UI rendering.

### 1.3 Refactor `RecentCreations` & Gallery Grids (Duplication) ✅ **Completed**
- **Problem**: Duplicate layout logic for rendering image cards in "Grouped" vs "Grid" modes, and overlap with `GalleryGrid`.
- **Execution**:
    - Created a unified `ImageCard` component handling both Gallery (grid/stack) and Dashboard (list/stack) variants.
    - Updated `GalleryGrid` and `RecentCreations` to use `ImageCard`.
    - Consolidated stack visualization and selection logic.

### 1.4 Refactor `LeaguePage` (Logic Handling & Decomposition) ✅ **Completed**
- **Problem**: The main League page was a 300+ line component managing multiple states (votes, follows, comments, reactions, pagination) and rendering a giant nested structure.
- **Execution**:
    - Created `useLeague` hook to encapsulate all data fetching, voting, and social logic.
    - Extracted `LeagueHeader`, `LeagueGrid`, `LeagueEntryCard`, and `LeagueEntryModal`.
    - Simplified routing navigation and auth checks.

## 2. Medium Priority: Shared Logic & Hooks

Refactoring repeated logic into reusable hooks to ensure consistency across the Dashboard, Gallery, and Modals.

### 2.1 `useImageActions` Hook ✅ **Completed**
- **Problem**: Download, Delete, Copy Prompt, and Share logic is repeated or passed down through many layers.
- **Execution**:
    - Created `useImageActions(image)` hook.
    - Integrated with `ImageCard`, `ImageDetailModal`, and Gallery views.
    - Centralized Toast notifications and proxy-based downloading.

### 2.2 Service Layer Extraction ✅ **Completed**
- **Problem**: API Routes (e.g., `api/generate/route.ts`) likely contain heavy business logic mixed with HTTP handling.
- **Execution**:
    - Moved business logic to `src/lib/services` (League, Credits, Generation, Leaderboard).
    - Standardized API response patterns.

## 3. Low Priority: Design System & Styling

Standardizing visual elements to reduce CSS maintenance.

### 3.1 CSS Utility Migration ✅ **Completed**
- **Problem**: `globals.css` defines many custom classes (`.btn-primary`, `.card`) that exist outside the Tailwind configuration.
- **Execution**:
    - Created UI primitives: `Button`, `Card`, `Input`, `Select`, `Badge` components.
    - Integrated standardized `cn` utility for Tailwind merging.
    - Migrated **all pages** to use new primitives: League, Dashboard, Gallery, Generate, Profile, Settings, Admin, Collections, Pricing, Home, Edit.
    - Removed legacy `.btn-primary`, `.btn-secondary`, `.card`, `.glass-card`, `.input-field` from `globals.css`.

### 3.2 Icon Standardization ✅ **Completed**
- **Problem**: Inline SVGs are scattered throughout the codebase.
- **Execution**:
    - Centralized all icons into `src/components/ui/Icons.tsx` using `lucide-react`.
    - Removed inline SVGs from League, Dashboard, Pricing, and Home page components.
    - Replaced all `<div className="spinner" />` instances with `<Icons.spinner />` across the entire codebase.

## 4. Phase 2: System Hardening & Management

As the user-facing app is now standardized, we focus on the supporting infrastructure and internal tools.

### 4.1 Refactor Admin Portal (Legacy Logic) ✅ **Completed**
- **Problem**: The Admin panel was a monolithic file mixing user management, moderation, and monitoring logic.
- **Goal**: Apply the same decomposition pattern (hooks + sub-components) used in the League and Profile pages.
- **Execution**:
    - Created `useAdminOverview`, `useAdminUsers`, `useAdminModeration`, and `useAdminMonitoring` hooks.
    - Componentized **Moderation**, **User Management**, and **System Status** into manageable sub-components.
    - Migrated the entire Admin portal to use modern UI primitives and `Icons` registry.

### 4.2 Collections Page Migration ✅ **Completed**
- **Problem**: The Collections and individual Collection detail pages still use legacy grid and button styles.
- **Execution**:
    - Migrated `CollectionsPage` to use `Card`, `Button`, `Input`, `Icons` components.
    - Migrated `CollectionCard` to use `Badge`, `Input`, `Icons` components.
    - Migrated `CollectionDetailClient` to use `Card`, `Button`, `Input`, `Icons` components.
    - Replaced all `glass-card` and raw `<input>` elements.

### 4.3 CSS Zero-Debt Cleanup ✅ **Completed**
- **Problem**: `globals.css` contains unused legacy classes and non-Tailwind utilities.
- **Execution**:
    - Removed all unused legacy CSS: `.btn-primary`, `.btn-secondary`, `.card`, `.glass-card`, `.input-field`.
    - `globals.css` now contains only essential reset/base styles, theme variables, animations, scrollbar styles, and 3 remaining utility classes:
      - `.gradient-text` – used widely across pages
      - `.credit-badge` – used in `DashboardHeader` (candidate for `Badge` component)
      - `.select-field` – used in 2 Admin components (candidate for `Select` component)
      - `.spinner` – CSS definition kept for safety but no longer referenced in TSX

### 4.4 Remaining Minor Items ✅ **Completed**
- **`.credit-badge`**: Migrated to `Badge` component in `DashboardHeader.tsx`. ✅
- **`.select-field`**: Migrated to `Select` component in Admin (`UserManagementCard.tsx`, `settings/page.tsx`). ✅
- **`.spinner` CSS class**: Safely removed from `globals.css` (0 remaining TSX usages). ✅

## Execution Strategy

1.  **Stop the Bleeding**: Enforce the new `ImageCard` component for any new lists. ✅ **Enforced**
2.  **Tackle the Giant**: Start `ImageDetailModal` refactor as it affects the most user interactions. ✅ **Completed**
3.  **Service Layer Migration**: Move business logic from API routes (League, Follow, Generation) to `src/lib/services`. ✅ **Completed**
4.  **Component Decomposition**: Refactor `LeaguePage` and `ImageEditor` to use hooks and sub-components. ✅ **Completed**
5.  **Design System Migration**: Migrate global CSS into the unified components. ✅ **Completed**
    - Done: League, Dashboard, Gallery, Generate, Profile, Settings, Admin, Collections, Pricing, Home, Edit.
6.  **Internal Tools (Phase 2)**: Refactor Admin and Collections to match the new architecture. ✅ **Completed**
    - Done: Admin Portal, Collections Migration.
7.  **Final Cleanup**: Remove redundant global CSS classes once migration is 100% complete. ✅ **Completed**
    - Removed: `.btn-primary`, `.btn-secondary`, `.card`, `.glass-card`, `.input-field`, `.credit-badge`, `.select-field`, `.spinner`.

**Refactor Project Successfully Concluded.**
