# Design Document: Dynamic Prompt Variables System

**Date**: 2026-03-04  
**Status**: DESIGN APPROVED  
**Author**: Senior Full Stack Architect & Systems Designer

---

## 1. Overview
As our SaaS platform grows, users need more granular control over complex prompts without sacrificing ease of use. This system introduces **Dynamic Variables**—reusable, editable placeholders within prompt strings that allow for rapid iteration and template flexibility.

## 2. Key Requirements
- **Hybrid Discovery**: Automatic detection of `[VARIABLE]` syntax combined with a manual management registry.
- **Multi-UI Prototyping**: Support for three distinct interaction models (Smart Panel, Variables Tab, and Inline Pills) to determine optimal UX.
- **Persistence**: Variable overrides are linked to specific templates and saved generations in Firestore.
- **Zero-Breaking Change**: Must integrate with the existing "Neural Weave" AI synthesis engine.

## 3. Architectural Blueprint: The Variable Engine
### 3.1 Data Flow
A new `VariableProvider` (Context API) will be implemented to manage the state.
1. **Scanner**: A hook (`useVariableScanner`) parses `coreSubject` and `activeModifiers` using a regex pattern: `/\[([A-Z0-9_]+)(?::([^\]]+))?\]/gi`.
2. **Registry**: Stores entries as `{ key: string, defaultValue: string, currentValue: string }`.
3. **Resolver**: A computed property `resolvedPrompt` replaces all brackets with `currentValue` before sending to AI or clipboard.

### 3.2 Syntax Support
- **Static**: `[COLOR]` (Uses global if registered, otherwise key name).
- **Inline Definition**: `[STYLE:Cinematic Film Grain]` (Defines name and initial value simultaneously).

## 4. UI Strategy (Prototype Phase)
Users can toggle between these modes in an "Experiments" setting:

| Prototype | Location | Core Function |
| :--- | :--- | :--- |
| **A: Smart Panel** | Designer Sidebar | Auto-generating form fields for every active variable. |
| **B: Variable Vault**| Left Pane Tab | Library-style management for "Global Constants". |
| **C: Interactive DNA**| Inline Editor | "Tokenized" text pills that open edit bubbles when clicked. |

## 5. Data Persistence
- **Firestore Schema Extension**:
    ```typescript
    interface ImageSettings {
      // ... existing
      variables?: Record<string, string>; // Map of variable keys to user-specific values
    }
    ```
- **Sync Logic**: Loading an image from the Neural Vault restores the exact variable values used in that specific generation.

## 6. Testing & Success Criteria
- [x] Tooltips correctly overlay elements (High z-index: 9999).
- [ ] Variables correctly resolve in the the copy-to-clipboard functionality.
- [ ] AI "Weave" receives the resolved strings, not the bracketed placeholders.
- [ ] Switching between UI prototypes A, B, and C does not lose current state.

---

## 7. Next Steps
- Transition to **Implementation Plan** identifying specific file modifications in `src/app/generate/page.tsx` and creation of `VariableContext`.
