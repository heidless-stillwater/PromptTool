import { z } from 'zod';

// ============================================
// User Profile Schema
// ============================================

export const UserProfileSchema = z.object({
    uid: z.string(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    username: z.string().optional(),
    photoURL: z.string().nullable(),
    role: z.enum(['member', 'admin', 'su']).default('member'),
    actingAs: z.enum(['member', 'admin', 'su']).optional(),
    subscription: z.enum(['free', 'standard', 'pro']).default('free'),
    audienceMode: z.enum(['casual', 'professional']).default('casual'),
    totalInfluence: z.number().default(0),
    publishedCount: z.number().default(0),
    followerCount: z.number().default(0),
    followingCount: z.number().default(0),
    badges: z.array(z.string()).default([]),
    bio: z.string().max(160).optional(),
    bannerUrl: z.string().optional(),
    socialLinks: z.object({
        twitter: z.string().optional(),
        instagram: z.string().optional(),
        website: z.string().optional(),
    }).optional(),
    createdAt: z.any().optional(), // Firebase Timestamp
    updatedAt: z.any().optional(),
});

// ============================================
// League Entry Schema
// ============================================

export const LeagueEntrySchema = z.object({
    id: z.string(),
    originalImageId: z.string(),
    originalUserId: z.string(),
    imageUrl: z.string().url(),
    videoUrl: z.string().optional(),
    duration: z.number().optional(),
    prompt: z.string(),
    settings: z.any(), // GenerationSettings
    authorName: z.string(),
    authorPhotoURL: z.string().nullable(),
    authorBadges: z.array(z.string()).default([]),
    publishedAt: z.any(), // Firebase Timestamp
    voteCount: z.number().default(0),
    commentCount: z.number().default(0),
    shareCount: z.number().default(0),
    authorFollowerCount: z.number().default(0),
    reportCount: z.number().default(0),
    isModerated: z.boolean().default(false),
    votes: z.record(z.string(), z.boolean()).default({}),
    reactions: z.record(z.string(), z.array(z.string())).optional(),
    collectionIds: z.array(z.string()).default([]),
    collectionNames: z.array(z.string()).default([]),
    variationCount: z.number().default(0),
    tags: z.array(z.string()).default([]),
    promptSetID: z.string().optional(),
    isStack: z.boolean().optional(),
    stackSize: z.number().optional(),
});

// ============================================
// API Response Schema
// ============================================

export const ApiResponseSchema = z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
});

// ============================================
// Environment Validation
// ============================================

export const envSchema = z.object({
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API key is required'),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
});

/**
 * Validates critical environment variables at startup.
 * Call this in layout.tsx or a provider to fail fast.
 */
export function validateEnv() {
    const result = envSchema.safeParse({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    if (!result.success) {
        console.error('❌ Environment validation failed:', result.error.flatten().fieldErrors);
    }

    return result;
}
