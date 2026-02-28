# Design: Architectural DNA UI Refactor (SaaS Multi-Tier)

**Date**: 2026-02-27
**Status**: Approved
**Target**: Studio Generator Modifier Selection

## Overview
Refactor the "Architectural DNA" display and modifier selection process in the Studio Generator to provide real-time visibility and ease of use, tailored to the user's skill level (Novice, Journeyman, Master).

## Context
The current selection process requires excessive scrolling and lacks a persistent view of the currently applied "DNA". This refactor introduces three distinct UI shells triggered by the `userLevel` state.

## Architecture & Components

### 1. Novice Mode: The Blueprint Sidebar
- **Component**: `NoviceDNAView`
- **Location**: Sticky column to the right of the modifier categories (split-screen 70/30).
- **Behavior**: Remains fixed while the user scrolls through categories.
- **Content**: Category-grouped cards showing active selections with large clear text and icons.

### 2. Journeyman Mode: The Ghost HUD
- **Component**: `JourneymanDNAView`
- **Location**: Floating `framer-motion` overlay in bottom-right.
- **Behavior**: Translucent "Glassmorphism" panel. Includes a "Minimize" toggle to clear the workspace.
- **Content**: List of active modifiers with quick-remove tags.

### 3. Master Mode: The DNA Strip
- **Component**: `MasterDNAView`
- **Location**: Horizontal bar pinned to the top of the modifier area.
- **Behavior**: Extremely compact, zero-scrolling impact.
- **Content**: Iconified list of active categories/tokens. Overflows into a "more" chip if necessary.

## Data Flow
- All three views subscribe to the `activeModifiers` and `coreSubject` state in `GeneratePage.tsx`.
- Interactions (remove modifier) within the DNA views will trigger the existing `handleToggleModifier` logic.

## Technical Requirements
- **Responsive Design**: Ensure sidebar collapses to a bottom drawer on mobile for Novice mode.
- **Animations**: Use `AnimatePresence` for smooth entry/exit of modifiers.
- **Theming**: Adhere to existing "Stillwater" brand colors (teal, gold, deep).
