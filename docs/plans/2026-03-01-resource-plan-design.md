# Design: Resource Management System (RESOURCE_PLAN)

**Date**: 2026-03-01
**Status**: Approved
**Author**: Antigravity

## 1. Objective
Enable granular control and reporting of system resources (Storage, DB, CPU, etc.) tied to user subscription tiers, enforced via high-performance "Hard Caps."

## 2. Architecture: The "Redis Pulse"
We utilize a distributed "Pulse" pattern using an external Redis (Upstash) to track real-time usage without incurring Firestore latency or consistency issues.

### 2.1 Storage Key Pattern
- `user:{uid}:usage`: Hash containing current monthly/daily usage.
- `user:{uid}:plan`: Cached plan details (Sync every 1hr from Firestore).

### 2.2 Quota Matrix
| Resource | Free | Standard | Pro |
| :--- | :--- | :--- | :--- |
| **Storage (GB)** | 1.0 | 10.0 | 100.0 |
| **DB Writes (Daily)** | 500 | 5,000 | Unlimited |
| **CPU Time (ms/mo)** | 30k | 300k | 3M |
| **Collections** | 3 | 10 | Unlimited |
| **Concurrent Gens** | 1 | 3 | 10 |

## 3. Enforcement: The Resource Guard
A middleware-level `ResourceGuard` will intercept API calls.
1. Fetch plan quotas.
2. Increment/Check Redis Pulse.
3. If `usage >= quota`, return `429 Quota Exceeded`.

## 4. Reporting & Analysis

### 4.1 Pulse Sync
Real-time Redis data is synced back to Firestore every 10 minutes (Vercel Cron) for persistent auditing and historical analysis.

### 4.2 Dashboard Widgets
- **User View**: "Resource Vitality" progress bars with color warnings (Red at 90%).
- **Admin View**: "Global Resource Pulse" for system-wide capacity planning.

## 5. Resilience: The "Oxygen Tank"
Users are granted a monthly, one-time manual "Burst Credit" (e.g., +100MB Storage) to bypass a hard cap in emergencies, reducing immediate churn during critical workflows.

## 6. Implementation Stages
1. **Schema**: Define `ResourceQuotas` and `PlanDefinitions`.
2. **Infrastructure**: Set up Upstash Redis client.
3. **Control**: Implement `ResourceGuard` and apply to `/api/generate/*`.
4. **Visualization**: Build Dashboard vitality widgets.
5. **Sync**: Create the `sync-pulse` background task.
