# Design: Prepaid Credit-Based Billing Model (PREPAID_CREDITS)

**Date**: 2026-03-02
**Status**: Draft
**Author**: Antigravity

## 1. Objective
Replace the existing Daily Allowance/Subscription model with a pure Prepaid Credit system that supports an "Oxygen Tank" (Overdraft) fallback and a "Refill to X" stabilization logic.

## 2. Architecture: The Unified Ledger
We utilize a **Negative Balance** approach to handle emergency completions. This allows for a single source of truth for the user's credits while maintaining strict accounting.

### 2.1 Credit Guard Logic
- **Check**: `balance >= cost`?
- **Oxygen Check**: If `balance < cost`, check if `isOxygenAuthorized` and if `(cost - balance) <= maxOverdraft` (default 3).
- **Execution**: If successful, `balance = balance - cost`. If overdraft was used, `isOxygenDeployed = true`.
- **Failure**: Return `429 CREDIT_REQUIRED`, triggering the `RefillModal`.

### 2.2 Debt Recovery (Refill Logic)
- When a user purchases `N` credits via Stripe:
- New Balance = `currentBalance (can be negative) + N`.
- `isOxygenDeployed` is reset to `false`.
- A transaction of type `overdraft_recovery` is logged if the starting balance was negative.

## 3. The "Refill to X" Flow
To ensure users can return to a "Healthy State" with one click, the `RefillModal` provides a "Stabilization" option.

- **Threshold (Target X)**: User-configurable target (e.g., "Refill me to 500 Credits").
- **Calculation**: The modal suggests the smallest pack that, when added to the current (possibly negative) balance, results in `balance >= X`.

## 4. Admin Management (Credit Control Center)
A new `/admin/credits` page allows the SU/Admin to:
1.  **CRUD Pricing Packs**: Define Name, Credits, Price (Cents), and Stripe Price ID.
2.  **Global Overdraft Config**: Set the default `maxOverdraft` for all users.
3.  **Risk Monitoring**: View a list of users currently in a negative balance state (Overdraft).
4.  **Analysis**: High-level reporting on system-wide credit liquidity (Total Issued vs Total Used).

## 5. Stripe Transition
We will shift from `stripe.checkout.sessions` with `subscription` mode to `payment` mode (One-Time). 
- **Saved Cards**: Store `stripeCustomerId` in Firestore to allow "One-Click Refill" in the future (Phase 2).
- **Webhooks**: Listening for `checkout.session.completed` to grant credits and reset the Oxygen Tank.

## 6. Implementation Stages
1.  **Schema**: Update `UserCredits` and `CreditTransaction` Firestore structures.
2.  **Service**: Refactor `CreditsService` for atomic sub-zero transactions.
3.  **UI**: Build `RefillModal` with hydration/stabilization math.
4.  **Admin**: Scaffolding the `/admin/credits` dashboard.
5.  **Verification**: E2E testing of the negative-to-positive balance transition.
