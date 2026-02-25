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
    - ✅ Implement optimistic updates for Votes and Social follows via `useMutation`.

### 1.2 Zod Validation Layer ✅ **Wired In**
- **Problem**: Runtime errors from missing or unexpected API data/Environment variables.
- **Goal**: Fail fast with descriptive errors.
- **Execution**:
    - ✅ Created `src/lib/schemas.ts` with Zod v4 schemas for `UserProfile`, `LeagueEntry`, `ApiResponse`.
    - ✅ Added `envSchema` + `validateEnv()` function for startup env checks.
    - ✅ Wired `validateEnv()` into `layout.tsx` for fail-fast startup.
    - ✅ Integrate schemas with TanStack Query `queryFn` for runtime data validation.

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
    - ✅ Implement smooth fade transitions from skeleton to content (Framer Motion).

### 2.2 Framer Motion Orchestration ✅ **Done**
- **Problem**: Static UI feels "stiff".
- **Goal**: Fluid, premium micro-animations.
- **Execution**:
    - ✅ Staggered entrance animations for Community Hub and Gallery grids.
    - ✅ Smooth modal slide-up + backdrop fade for CommunityEntryModal.
    - ✅ Hover-aware physics already on ImageCard via existing motion.div.
    - ✅ Expanded `animations.ts` with `cardFadeIn`, `staggerContainer`, `staggerContainerSlow`, `modalSlideUp`, `backdropFade` variants.

## Phase 3: Intelligence & Community Depth
Harnessing AI to add value and social loops to keep users engaged.

### 3.1 "Magic Wand" Prompt Enhancement ✅ **Done**
- **Problem**: Users often struggle to write detailed image prompts.
- **Goal**: One-click prompt optimization using Gemini.
- **Execution**:
    - ✅ API route `/api/generate/enhance` using Gemini 2.5 Flash.
    - ✅ Integration into the `Generate` page UI (freeform mode, purple ✨ Enhance button).
    - ✅ Fixed `seed: null` Zod validation error for Professional mode users.

### 3.2 Global Activity & Real-time Social ✅ **Done**
- **Problem**: The app feels "empty" despite having many users.
- **Goal**: Show life within the community.
- **Execution**:
    - ✅ "Trending Now" dashboard tile — `CommunityPulse` now queries by `voteCount desc` (top 10) instead of `publishedAt`.
    - ✅ Real-time notification toasts for votes, comments, follows, reactions, and mentions (with emoji prefixes).
    - ✅ `NotificationBell` improved — fixed `/league` links → `/community?entry=`, added `reaction` type, animated dropdown open/close and unread badge with Framer Motion.

## Phase 4: Quality & Testing
Ensuring the platform stays stable as it scales.

### 4.1 Unit & Integration Testing (Vitest) ✅ **Done**
- **Goal**: Test business logic in `/src/lib/services`.
- **Execution**:
    - ✅ Installed Vitest + @testing-library/react with jsdom environment.
    - ✅ Created `vitest.config.ts` with `@/` path alias and Firebase mocks.
    - ✅ `src/__tests__/schemas.test.ts` — 18 tests covering `CommunityEntrySchema` null-handling, defaults, required fields, `zParseArray`, `zParseSingle`.
    - ✅ `src/__tests__/generation-schema.test.ts` — 15 tests covering generation + enhance schemas, null seed/guidanceScale bug, range validation.
    - ✅ `src/__tests__/date-utils.test.ts` — 4 tests covering `formatDate` including null guard bug discovered and fixed.
    - ✅ All **37 tests green**. Bug found: `formatDate(null)` returned `'Unknown'` → fixed to `''`.

### 4.2 End-to-End Testing (Playwright) 🔄 **Proposed**
- **Goal**: Critical path verification.
- **Execution**: Automate testing for "Login -> Generate -> Publish to League" flow.

---

## Success Metrics
- **Performance**: 50% reduction in unnecessary API calls via caching.
- **Retention**: Increased engagement on the "League" and "Activity" views.
- **Stability**: Zero runtime crashes due to malformed API data (via Zod).
