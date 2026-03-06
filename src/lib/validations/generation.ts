import { z } from 'zod';

/**
 * Zod schema for image and video generation requests.
 * Ensures quality, aspect ratio, and modality are valid and count is within bounds.
 */
export const generationSchema = z.object({
    prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long (max 2000 characters)"),
    quality: z.enum(['standard', 'high', 'ultra', 'video']),
    aspectRatio: z.enum(['1:1', '4:3', '16:9', '9:16', '3:4']),
    promptType: z.enum(['freeform', 'madlibs']),
    madlibsData: z.object({
        subject: z.string(),
        action: z.string(),
        style: z.string(),
        mood: z.string().optional(),
        setting: z.string().optional(),
    }).optional(),
    count: z.number().int().min(1).max(4).default(1),
    modifiers: z.array(z.object({
        category: z.string(),
        value: z.string()
    })).optional(),
    coreSubject: z.string().optional(),
    seed: z.number().int().min(0).nullish(),
    negativePrompt: z.string().max(500).optional(),
    guidanceScale: z.number().min(1).max(20).nullish().transform(v => v ?? 7),
    modelType: z.enum(['standard', 'pro']).default('standard'),
    referenceImage: z.string().optional(), // Base64 - for legacy support
    referenceImageUrl: z.string().optional(), // URL for thumbnail initialization - for legacy support
    referenceMimeType: z.string().optional(), // for legacy support
    referenceImages: z.array(z.object({
        data: z.string(), // Base64
        mimeType: z.string().optional(),
        usage: z.enum(['style', 'content']).default('content'),
    })).optional(),
    sourceImageId: z.string().optional(),
    promptSetID: z.string().optional(),
    collectionIds: z.array(z.string()).optional(),
    modality: z.enum(['image', 'video']).default('image'),
    skipWeave: z.boolean().optional(),
    simulation: z.object({
        balance: z.number().optional(),
        isOxygenAuthorized: z.boolean().optional(),
        isOxygenDeployed: z.boolean().optional(),
        maxOverdraft: z.number().optional(),
    }).optional(),
    variables: z.record(z.string(), z.string()).optional(),
});

export type GenerationInput = z.infer<typeof generationSchema>;

/**
 * Zod schema for reporting league content.
 */
export const reportSchema = z.object({
    entryId: z.string().min(1, "Entry ID is required"),
    reason: z.string().min(1, "Reason is required").max(500, "Reason is too long"),
});

export type ReportInput = z.infer<typeof reportSchema>;

/**
 * Zod schema for adding comments to league entries.
 */
export const commentSchema = z.object({
    entryId: z.string().min(1, "Entry ID is required"),
    text: z.string().min(1, "Comment cannot be empty").max(1000, "Comment is too long"),
});

export type CommentInput = z.infer<typeof commentSchema>;

/**
 * Zod schema for prompt enhancement requests.
 */
export const enhancePromptSchema = z.object({
    prompt: z.string().min(1, "Original prompt is required").max(2000, "Prompt is too long to enhance (max 2000 characters)"),
    style: z.string().optional(),
    mood: z.string().optional(),
});

export type EnhancePromptInput = z.infer<typeof enhancePromptSchema>;

/**
 * Zod schema for tag suggestion requests.
 */
export const suggestTagsSchema = z.object({
    prompts: z.array(z.string()).min(1, "At least one prompt is required").max(20, "Too many prompts (max 20)"),
});

export type SuggestTagsInput = z.infer<typeof suggestTagsSchema>;

/**
 * Zod schema for Nanobanana prompt compilation.
 */
export const nanobananaSchema = z.object({
    subject: z.string().min(1, "Core subject is required"),
    modifiers: z.array(z.object({
        category: z.string(),
        value: z.string()
    })).optional(),
    aspectRatio: z.string().optional(),
    proSettings: z.object({
        mediaType: z.enum(['image', 'video']).optional(),
        quality: z.string().optional(),
        guidanceScale: z.number().optional(),
        negativePrompt: z.string().optional(),
        modelType: z.enum(['standard', 'pro']).optional(),
    }).optional(),
    variables: z.record(z.string(), z.string()).optional()
});

export type NanobananaInput = z.infer<typeof nanobananaSchema>;

/**
 * Zod schema for saving a generation draft.
 */
export const draftSchema = z.object({
    prompt: z.string(),
    compiledPrompt: z.string().optional(),
    quality: z.enum(['standard', 'high', 'ultra', 'video']),
    aspectRatio: z.enum(['1:1', '4:3', '16:9', '9:16', '3:4']),
    promptType: z.enum(['freeform', 'madlibs']),
    modifiers: z.array(z.object({
        category: z.string(),
        value: z.string()
    })).optional(),
    coreSubject: z.string().optional(),
    seed: z.number().int().min(0).nullish(),
    negativePrompt: z.string().max(500).optional(),
    guidanceScale: z.number().min(1).max(20).nullish(),
    modelType: z.enum(['standard', 'pro']).default('standard'),
    sourceImageId: z.string().optional(),
    promptSetID: z.string().optional(),
    modality: z.enum(['image', 'video']).default('image'),
    variables: z.record(z.string(), z.string()).optional(),
});

export type DraftInput = z.infer<typeof draftSchema>;
