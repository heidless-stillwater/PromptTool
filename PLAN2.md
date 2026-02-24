# Project Plan 2: "Premium Experience & Robustness"

> **Status**: In Progress 🚧
> **Priority**: High
> **Objective**: Building on the "Clean Slate" foundation to deliver a world-class user experience, bulletproof infrastructure, and advanced AI capabilities.

## Phase 1: Robust Infrastructure (Data & Validation)
Standardize how data moves through the app and ensure it's validated at the boundaries.

### 1.1 TanStack Query (React Query) Integration ✅ **Migrated**
- **Problem**: Manual `fetch` and `useEffect` state management is brittle and results in unnecessary re-fetches.
- **Goal**: Centralize loading/error states and implement intelligent caching.
- **Execution**:
    - ✅ Installed `@tanstack/react-query` + devtools.
    - ✅ Created `QueryProvider` with global defaults (1min staleTime, no refetch-on-focus).
    - ✅ Wrapped `RootLayout` with `QueryProvider`.
    - ✅ Created `useQueryHooks.ts` with centralized query keys + hooks for:
        - League entries (with profile enrichment)
        - League thumbnails (5min cache)
        - Collections
        - Dashboard recent league entries
        - Dashboard images (personal/admin/global views)
        - Credit history
        - Deep-link single entry lookup
    - ✅ Migrated `useLeague.ts` to consume `useLeagueEntries`, `useLeagueThumbnails`, `useCollectionsQuery`.
    - ✅ Migrated `useDashboard.ts` to consume `useDashboardImages`, `useDashboardLeagueRecent`, `useCollectionsQuery`, `useCreditHistory`.
    - ✅ Added `queryClient.invalidateQueries()` to all bulk actions (delete, collect, publish, tag).
    - 🔄 Implement optimistic updates for Votes and Social follows via `useMutation`.

### 1.2 Zod Validation Layer ✅ **Wired In**
- **Problem**: Runtime errors from missing or unexpected API data/Environment variables.
- **Goal**: Fail fast with descriptive errors.
- **Execution**:
    - ✅ Created `src/lib/schemas.ts` with Zod v4 schemas for `UserProfile`, `LeagueEntry`, `ApiResponse`.
    - ✅ Added `envSchema` + `validateEnv()` function for startup env checks.
    - ✅ Wired `validateEnv()` into `layout.tsx` for fail-fast startup.
    - 🔄 Integrate schemas with TanStack Query `queryFn` for runtime data validation.

## Phase 2: Premium UX & Motion
Bridge the gap between "functional" and "delightful" with modern UI patterns.

### 2.1 Skeleton Loaders & Perceived Performance ✅ **Integrated**
- **Problem**: Full-page spinners feel slow and disruptive.
- **Goal**: Content-aware loading states.
- **Execution**:
    - ✅ Created `src/components/ui/Skeleton.tsx` (consolidated module) with:
        - `Skeleton` (base primitive)
        - `SkeletonCard`, `SkeletonGrid` (image grids)
        - `SkeletonHeader` (page headers)
        - `SkeletonFeedItem`, `SkeletonFeed` (league feed)
        - `SkeletonStatCard`, `SkeletonStats` (dashboard)
        - `SkeletonProfile` (creator cards)
    - ✅ Created `SkeletonDashboard` (full-page dashboard skeleton).
    - ✅ Integrated into League page — view-mode-aware skeletons (grid/feed/compact/creators).
    - ✅ Integrated into Dashboard page — `SkeletonDashboard` for Suspense + auth loading.
    - ✅ Integrated into Gallery page — `SkeletonGrid` replaces old spinner.
    - ✅ Integrated into RecentCreations component.
    - 🔄 Implement smooth fade transitions from skeleton to content (Framer Motion).

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
