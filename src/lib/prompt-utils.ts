/**
 * DNA Anchor Utility
 * Handles synchronization between structured modifiers and unstructured prompt text.
 */

import { MODIFIER_CATEGORIES } from './constants';

export interface Modifier {
    category: string;
    value: string;
    id?: string;
}

/**
 * Synchronizes prompt text with a list of active modifiers.
 * If an anchor for a category exists, its value is updated.
 * If it doesn't exist, it's optionally appended.
 */
export function syncModifiersWithText(text: string, modifiers: Modifier[]): string {
    if (!text) return '';
    let newText = text;

    // 1. Extract all existing anchors from text
    const existingAnchors = extractModifiersFromText(text);

    // 2. Prune: Remove anchors from text that are not in the provided modifiers list
    existingAnchors.forEach(existing => {
        const stillActive = modifiers.some(m =>
            m.category.toLowerCase() === existing.category.toLowerCase() &&
            m.value.toLowerCase() === existing.value.toLowerCase()
        );

        if (!stillActive) {
            // Flexible regex to remove this anchor, handling potential double brackets or weird spacing
            // Matches optional leading space, then [category : value] with any spacing
            const escapedCat = existing.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedVal = existing.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\s?\\[\\s*${escapedCat}\\s*:\\s*${escapedVal}\\s*\\]\\]?`, 'gi');
            newText = newText.replace(regex, '').trim();
        }
    });

    // 3. Update/Inject: Ensure all provided modifiers have an anchor in text
    modifiers.forEach(mod => {
        const category = mod.category.toLowerCase();
        const value = mod.value.toLowerCase();
        const anchor = `[${mod.category.toUpperCase()}:${value}]`;

        const hasExactMatch = newText.toLowerCase().includes(anchor.toLowerCase());

        if (!hasExactMatch) {
            // Find if there's any anchor for this category (for exclusive replacement)
            const valuesInNewList = modifiers.filter(m => m.category.toLowerCase() === category);

            if (valuesInNewList.length === 1) {
                // Potential Replacement: If there's exactly one value for this cat in UI, 
                // and it's not in text, it might have replaced a previous value.
                const catRegex = new RegExp(`\\[${category}:[^\\]]+\\]`, 'gi');
                if (catRegex.test(newText)) {
                    newText = newText.replace(catRegex, anchor);
                } else {
                    newText += ` ${anchor}`;
                }
            } else {
                newText += ` ${anchor}`;
            }
        }
    });

    return newText.replace(/\s\s+/g, ' ').trim();
}

/**
 * Bi-directional Sync: Derives the new array of active modifiers by comparing the raw text 
 * against the currently selected modifiers. Preserves original IDs where possible.
 */
export function getActiveModifiersFromText(text: string, currentModifiers: Modifier[]): Modifier[] {
    const textMods = extractModifiersFromText(text);

    const nextModifiers: Modifier[] = [];

    // 1. Keep existing modifiers that are still present in the text
    currentModifiers.forEach(m => {
        if (textMods.some(tm => tm.category.toLowerCase() === m.category.toLowerCase() && tm.value.toLowerCase() === m.value.toLowerCase())) {
            nextModifiers.push(m);
        }
    });

    // 2. Add new modifiers that the user manually typed into the text box
    textMods.forEach(tm => {
        const alreadyExists = nextModifiers.some(m => m.category.toLowerCase() === tm.category.toLowerCase() && m.value.toLowerCase() === tm.value.toLowerCase());
        if (!alreadyExists) {
            nextModifiers.push({
                id: Math.random().toString(36).substring(7),
                category: tm.category,
                value: tm.value
            });
        }
    });

    return nextModifiers;
}

/**
 * Extracts modifiers from prompt text architectural anchors.
 * Only returns anchors that correspond to valid DNA Helix categories.
 */
export function extractModifiersFromText(text: string): Modifier[] {
    const regex = /\[([a-z0-9_]+):([^\]]+)\]/gi;
    const modifiers: Modifier[] = [];
    const validCategories = new Set(MODIFIER_CATEGORIES.map(c => c.id.toLowerCase()));

    let match;
    while ((match = regex.exec(text)) !== null) {
        const cat = match[1].trim();
        const val = match[2].trim();
        if (validCategories.has(cat.toLowerCase())) {
            modifiers.push({
                category: cat,
                value: val
            });
        }
    }

    return modifiers;
}

/**
 * Synchronizes variable values with prompt text.
 * Replaces [VAR] or [VAR:OLD] with [VAR:NEW].
 */
export function syncVariablesWithText(text: string, variables: Record<string, { currentValue: string }>): string {
    if (!text) return '';

    // Pattern to match [VAR] or [VAR:VALUE]
    // Group 1: Name, Group 2: Optional Value
    return text.replace(/\[([a-z0-9_]+)(?::([^\]]+))?\]/gi, (match, name) => {
        const key = name.toUpperCase();
        const variable = variables[key];

        if (variable) {
            if (variable.currentValue) {
                const cleanValue = String(variable.currentValue).replace(/\]+$/, '');
                return `[${key}:${cleanValue}]`;
            }
            return `[${key}]`;
        }

        return match;
    });
}
