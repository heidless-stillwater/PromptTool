# New User Onboarding — Design Document

**Date:** 2026-02-25  
**Status:** Approved  

## Overview

Onboard new users by letting them choose their path: create immediately using exemplars, or explore the community first. Built as the first entry in a **prototype framework** that allows standalone testing at `/prototypes/*` and promotion to main app via feature flags.

## Decisions

1. **"Choose your path"** onboarding — explore community OR create now
2. **"Create now" path** — exemplar gallery → pick one → "Use as-is" or "Customise step-by-step" (3-step MadLibs wizard: Subject, Style, Mood)
3. **"Explore community" path** — interactive showcase of 3-4 curated exemplars with captions → full community
4. **Standalone `/onboarding` route** — auto-redirect on first login, dismissible dashboard chip
5. **Prototype framework** — `/prototypes/*` for standalone testing + Firestore feature flags for promotion

## Prototype Framework

- Each prototype lives at `/prototypes/<name>/page.tsx`
- Admin index page at `/prototypes/page.tsx` lists all prototypes with status
- Firestore doc `system/prototypes` holds feature flags: `{ onboarding: true, ... }`
- When a prototype flag is `true`, the corresponding feature is "live" in the main app
- SU dashboard gets a "Prototypes" toggle panel

## Onboarding Flow

### Screen 1 — Welcome + Choose Your Path
- Hero: app logo, "Welcome to AI Image Studio"
- Two cards: "Create Something Now" / "Explore the Community"
- Skip link for power users

### Screen 2A — Exemplar Picker (Create Path)
- Grid of `isExemplar: true` entries from `leagueEntries`
- Image + video exemplars with badges
- Click → Screen 3

### Screen 2B — Exemplar Showcase (Explore Path)
- Full-width carousel of 3-4 exemplars with captions
- "Try this one" → Screen 3
- "Go to Community Hub" → complete onboarding, redirect

### Screen 3 — Create from Exemplar
- Selected exemplar displayed prominently
- Two options:
  - "Use this prompt" → `/generate` with pre-filled prompt
  - "Make it yours" → 3-step wizard (Subject, Style, Mood) → `/generate`
- Completing either path marks onboarding done

## Data Model

- `users/{uid}.hasCompletedOnboarding: boolean` (default false)
- `system/prototypes.onboarding: boolean` (feature flag)
- Query: `leagueEntries` where `isExemplar == true`

## YAGNI

- No account setup wizard
- No tips/coach marks system
- No progress tracking or gamification
