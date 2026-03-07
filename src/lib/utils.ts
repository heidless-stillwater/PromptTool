import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Strips accidental category anchors that the AI might hallucinate in brackets
 * e.g. "An image in [style] with [lighting]" -> "An image in  with "
 */
export function sanitizeAIResponse(text: string): string {
    if (!text) return "";
    const categories = ['action', 'medium', 'style', 'lighting', 'composition', 'color', 'atmosphere', 'magic', 'render', 'environment', 'mood'];
    const regex = new RegExp(`\\[(${categories.join('|')})\\]:?`, "gi");
    return text.replace(regex, "").replace(/\s+/g, " ").trim();
}
