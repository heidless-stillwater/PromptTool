# Production Hardening Design (HARDEN_PLAN)

**Date**: 2026-02-28
**Status**: Draft
**Objective**: Harden the system, database, and storage for a secure, resilient, invite-only production launch.

## 1. Security Architecture (Firebase Rules)
Transition from permissive access to a "Private by Default" model.

- **Users Collection**: Restrict `match /users/{userId}` to owner-only for full profile data. 
- **Public Profiles**: Implement a specific mechanism for public portfolio data (e.g., a `public` boolean or a `publicProfile` subcollection).
- **Subcollection Isolation**: Refine recursive wildcards to prevent accidental exposure of private data (notifications, settings).
- **Storage MIME Validation**: Validate `request.resource.contentType` in Cloud Storage rules to allow only `image/*`.

## 2. Resilience & API Hardening
Protect costs and handle errors gracefully.

- **Centralized API Wrapper**: Standardize error handling, Zod validation, and Sentry logging across all Next.js API routes.
- **Route-Level Rate Limiting**: Implement token-bucket limiting for expensive AI routes.
- **Environment Validation**: Fail-fast on missing production secrets (Stripe, AI keys).
- **Graceful Degradation**: User-friendly UI patterns for service outages.

## 3. Monitoring & Observability
Gain visibility into production health.

- **Sentry**: Full integration for client/server error tracking and performance monitoring.
- **LogRocket**: Session replay for visual debugging (Optional but recommended).
- **Audit Logs**: A write-only Firestore collection for critical system events.
- **Health Checks**: `/api/health` endpoint for external monitoring.

## 4. Implementation Strategy
- **Phase 1**: Security rules and MIME validation (Highest priority).
- **Phase 2**: API hardening and rate limiting.
- **Phase 3**: Monitoring integration.
