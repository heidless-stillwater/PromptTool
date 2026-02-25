# Implementation Plan - Resolve Publishing Discrepancy

The goal is to fix a bug where items listed in the Community Hub appear as "not published" in their detail views. This is caused by a field naming discrepancy between old data (using `publishedToLeague`) and new code (using `publishedToCommunity`).

## Phase 1: Client-Side Data Normalization
Ensure that whenever a `GeneratedImage` is fetched from Firestore, old fields are mapped to new ones for backward compatibility.

### 1. Update `src/app/gallery/useGallery.ts`
- Modify `fetchImages` to map `publishedToLeague` -> `publishedToCommunity` and `leagueEntryId` -> `communityEntryId`.

### 2. Update `src/hooks/queries/useQueryHooks.ts`
- Modify `useDashboardImages` (the `queryFn`) to perform the same mapping.

### 3. Update `src/hooks/useProfile.ts`
- Modify `fetchProfile` to perform the same mapping for fetched images.

## Phase 2: Bug Fixes in API & Services

### 1. Update `src/app/api/admin/community/action/route.ts`
- Change `publishedToLeague: false` to `publishedToCommunity: false` (and ideally keep both/delete old).
- Fix the collection reference: `adminDb.collection('images')` is incorrect; images are in `users/{uid}/images`. Use `entryData.originalUserId` to build the correct path.

### 2. Update `src/lib/services/community.ts`
- In `publishImage` and `unpublishImage`, consider updating both old and new fields for maximum compatibility, or just use the new ones if we are confident in the client-side mapping. Recommendation: Use new fields, but ensuring unpublish works even if only old fields exist.

## Phase 3: Verification
- Verify that old "League" entries show up as "Community" entries.
- Verify that "Published to Community" status is correct in Gallery and Detail modes.
- Verify Admin "Remove from Hub" works correctly for personal images.
