# Design Document: Dashboard Restructure & Member Experience
**Date**: 2026-02-21
**Status**: Approved

## 1. Overview
Restructure the existing `/dashboard` route to dynamically serve specialized experiences based on user roles and audience modes. Effectively splits the platform into a "Super User" management console and a "Member" creative studio.

## 2. Architecture
### 2.1 Route Dispatcher
The `/dashboard/page.tsx` will serve as an orchestrator using the `useAuth` hook.
- **SU Users**: Render `SuDashboard`.
- **Regular Members**: Render `MemberDashboard`.

### 2.2 Component Hierarchy
- `DashboardPage` (Dispatcher)
  - `SuDashboard` (Global oversight, legacy UI + SU extras)
  - `MemberDashboard` (Mode orchestrator)
    - `CasualModeView` (Simplified, guided)
    - `ProModeView` (Efficient, functional)

## 3. Member Experience
### 3.1 Casual Mode (The Guide)
- **Goal**: Support and enable users with zero-friction entry.
- **Key Features**:
  - **3-Tier Credit Management**: Smart Labels ("5 images left"), Wallet Wisdom (visual bars), and Action Prompts.
  - **Starter Prompts**: Visual carousels to kickstart creativity.
  - **Contextual Help**: Pulse-based tooltips for new features.

### 3.2 Pro Mode (The Workstation)
- **Goal**: Maximize creative efficiency for power users.
- **Key Features**:
  - **Content-Specific Analytics**: Generation stats and trends for the user's own work.
  - **Power Tools Bar**: Quick access to batch actions (tagging, collections).
  - **Data-Dense UI**: Information-rich creation cards.

## 4. Technical Implementation
- **State Management**: Use the existing `audienceMode` in `UserProfile` to toggle between Casual and Pro.
- **Transitions**: Framer Motion for cross-fading and layout shifts between modes.
- **Permissions**: Verify `isAdmin` helper for the SU split.

## 5. Success Criteria
- [ ] Role-based dashboard splitting verified.
- [ ] Zero-jargon credit management implemented for Casual users.
- [ ] Seamless mode toggling with persisted state.
