# Project Plan 2: "Premium Experience & Robustness"

> **Status**: Planning
> **Priority**: High
> **Objective**: Building on the "Clean Slate" foundation to deliver a world-class user experience, bulletproof infrastructure, and advanced AI capabilities.

## Phase 1: Robust Infrastructure (Data & Validation)
Standardize how data moves through the app and ensure it's validated at the boundaries.

### 1.1 TanStack Query (React Query) Integration 🔄 **Proposed**
- **Problem**: Manual `fetch` and `useEffect` state management is brittle and results in unnecessary re-fetches.
- **Goal**: Centralize loading/error states and implement intelligent caching.
- **Execution**:
    - Set up `QueryClientProvider`.
    - Create hooks for League data, User Profile, and Generation History.
    - Implement optimistic updates for Votes and Social follows.

### 1.2 Zod Validation Layer 🔄 **Proposed**
- **Problem**: Runtime errors from missing or unexpected API data/Environment variables.
- **Goal**: Fail fast with descriptive errors.
- **Execution**:
    - Create schemas for API Request/Response bodies.
    - Validate `process.env` on startup.
    - Integrate with TanStack Query for type-safe data fetching.

## Phase 2: Premium UX & Motion
Bridge the gap between "functional" and "delightful" with modern UI patterns.

### 2.1 Skeleton Loaders & Perceived Performance 🔄 **Proposed**
- **Problem**: Full-page spinners feel slow and disruptive.
- **Goal**: Content-aware loading states.
- **Execution**:
    - Create `SkeletonCard`, `SkeletonHeader`, and `SkeletonFeed` components.
    - Implement smooth transitions from skeleton to content.

### 2.2 Framer Motion Orchestration 🔄 **Proposed**
- **Problem**: Static UI feels "stiff".
- **Goal**: Fluid, premium micro-animations.
- **Execution**:
    - Staggered entrance animations for Gallery grids.
    - Smooth layout transitions for Modals.
    - Hover-aware physics for interactive components.

## Phase 3: Intelligence & Community Depth
Harnessing AI to add value and social loops to keep users engaged.

### 3.1 "Magic Wand" Prompt Enhancement 🔄 **Proposed**
- **Problem**: Users often struggle to write detailed image prompts.
- **Goal**: One-click prompt optimization using Gemini.
- **Execution**:
    - New API route `/api/generate/enhance` using Gemini 1.5.
    - Integration into the `Generate` page UI.

### 3.2 Global Activity & Real-time Social 🔄 **Proposed**
- **Problem**: The app feels "empty" despite having many users.
- **Goal**: Show life within the community.
- **Execution**:
    - "Trending Now" dashboard tile.
    - Real-time notification toast for community reactions.
    - Improved `NotificationBell` logic.

## Phase 4: Quality & Testing
Ensuring the platform stays stable as it scales.

### 4.1 Unit & Integration Testing (Vitest) 🔄 **Proposed**
- **Goal**: Test business logic in `/src/lib/services`.
- **Execution**: Set up Vitest + React Testing Library for service and hook validation.

### 4.2 End-to-End Testing (Playwright) 🔄 **Proposed**
- **Goal**: Critical path verification.
- **Execution**: Automate testing for "Login -> Generate -> Publish to League" flow.

---

## Success Metrics
- **Performance**: 50% reduction in unnecessary API calls via caching.
- **Retention**: Increased engagement on the "League" and "Activity" views.
- **Stability**: Zero runtime crashes due to malformed API data (via Zod).
