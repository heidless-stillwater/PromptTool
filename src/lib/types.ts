// Generic Timestamp type to work with both Firebase client and admin SDKs
export type FirestoreTimestamp = any;

// ============================================
// User & Authentication Types
// ============================================

export interface Notification {
    id: string;
    userId: string; // The person receiving the notification
    type: 'vote' | 'comment' | 'follow' | 'mention' | 'reaction' | 'system';
    actorId: string; // The person who triggered the notification
    actorName: string;
    actorPhotoURL?: string;
    entryId?: string; // Optional: reference to the community entry
    entryImageUrl?: string;
    text?: string; // Content of the comment or system message
    emoji?: string; // For reaction notifications
    read: boolean;
    createdAt: FirestoreTimestamp;
}

export type UserRole = 'member' | 'admin' | 'su';
export type SubscriptionTier = 'free' | 'standard' | 'pro';
export type AudienceMode = 'casual' | 'professional';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string | null;
    username?: string; // Unique handle for @mentions
    photoURL: string | null;
    role: UserRole;
    actingAs?: UserRole; // For role-switching (admin viewing as member)
    subscription: SubscriptionTier;
    audienceMode: AudienceMode;
    totalInfluence?: number; // Sum of all upvotes across community entries
    publishedCount?: number; // Total number of images published to the community hub
    followerCount?: number;
    followingCount?: number;
    badges?: string[]; // Achievement tags like 'elite', 'verified'
    bio?: string;
    bannerUrl?: string;
    socialLinks?: {
        twitter?: string;
        instagram?: string;
        website?: string;
    };
    createdAt: FirestoreTimestamp;
    updatedAt: FirestoreTimestamp;
}

// Creator Badges Configuration
export const BADGES: Record<string, { label: string, icon: string, color: string }> = {
    'elite': { label: 'Elite Creator', icon: '🎖️', color: 'text-yellow-500' },
    'verified': { label: 'Verified', icon: '✅', color: 'text-blue-500' },
    'og': { label: 'OG Member', icon: '💎', color: 'text-purple-500' },
    'staff': { label: 'Staff', icon: '🛡️', color: 'text-error' },
};

// Admin email for initial setup
export const ADMIN_EMAILS = ['heidlessemail18@gmail.com', 'heidlessemail17@gmail.com'];

// ============================================
// System Configuration & Incentives
// ============================================

export interface SignupIncentives {
    welcomeCredits: {
        enabled: boolean;
        amount: number;
    };
    founderBadge: {
        enabled: boolean;
        badgeId: string;
    };
    masterPass: {
        enabled: boolean;
        durationHours: number;
    };
    communityBoost: {
        enabled: boolean;
        multiplier: number;
    };
    knowledgeBounty: {
        enabled: boolean;
        rewardAmount: number;
    };
    vanguardRole: {
        enabled: boolean;
        roleId: string;
    };
}

export interface SystemConfig {
    announcement: string;
    showBanner: boolean;
    defaultModel: 'flash' | 'pro';
    safetyThreshold: 'strict' | 'medium' | 'permissive';
    incentives: SignupIncentives;
    updatedAt: FirestoreTimestamp;
    updatedBy: string;
}

// ============================================
// Credit System Types
// ============================================

export type TransactionType = 'purchase' | 'usage' | 'refund' | 'subscription' | 'overdraft_recovery';

export interface CreditTransaction {
    id: string;
    type: TransactionType;
    amount: number; // positive for additions, negative for deductions
    description: string;
    metadata?: {
        stripeSessionId?: string;
        recoveryAmount?: number; // How much of this purchase paid off the negative balance
        actualAdded?: number;    // The net credits available to the user
        [key: string]: any;
    };
    createdAt: FirestoreTimestamp;
}

export interface UserCredits {
    balance: number;            // Can be negative (down to -maxOverdraft)
    totalPurchased: number;
    totalUsed: number;

    // Prepaid / Overdraft Integration
    maxOverdraft: number;       // Default from config (e.g., 3)
    isOxygenDeployed: boolean;  // Whether the burst has been used since last refill
    isOxygenAuthorized: boolean;// Whether user has "armed" the tank

    // Pay-As-You-Go (Auto-Refill) Config
    autoRefillEnabled: boolean;
    refillThreshold: number;    // Balance at which to trigger modal
    refillPackId?: string;      // Preferred pack for refill

    lastPurchaseAt: FirestoreTimestamp | null;
}

// Credit costs by model and quality tier
export const CREDIT_COSTS = {
    standard: {
        standard: 1, // 1024px
        high: 3,     // 2K
        ultra: 5,    // 4K
    },
    pro: {
        standard: 2, // 1024px (Pro model)
        high: 6,     // 2K (Pro model)
        ultra: 10,   // 4K (Pro model)
    },
    video: 10,       // 5-second video (Pro only)
} as const;

/**
 * Calculates the cost of a generation based on modality, quality, and model type.
 */
export function getGenerationCost(
    modality: MediaModality,
    quality: ImageQuality | 'video',
    modelType: 'standard' | 'pro' = 'standard'
): number {
    if (modality === 'video' || quality === 'video') {
        return CREDIT_COSTS.video;
    }

    const q = quality as ImageQuality;
    return CREDIT_COSTS[modelType][q];
}

export type ImageQuality = 'standard' | 'high' | 'ultra';
export type MediaModality = 'image' | 'video';


// ============================================
// Image Generation Types
// ============================================

export type AspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | '3:4';

export interface GenerationSettings {
    modality: MediaModality;
    quality: ImageQuality | 'video';
    aspectRatio: AspectRatio;
    prompt: string;
    promptType: 'freeform' | 'madlibs';
    madlibsData?: MadLibsSelection;
    promptSetID?: string;
    negativePrompt?: string;
    seed?: number;
    guidanceScale?: number;
    modifiers?: { category: string, value: string }[];
    coreSubject?: string;
    variables?: Record<string, string>;
    modelType?: 'standard' | 'pro';
}

export interface MadLibsSelection {
    subject: string;
    action: string;
    style: string;
    mood?: string;
    setting?: string;
}

export interface GeneratedImage {
    id: string;
    userId: string;
    prompt: string;
    settings: GenerationSettings;
    imageUrl: string; // Used for thumbnails/images
    videoUrl?: string; // Used if modality is video
    storagePath: string;
    videoStoragePath?: string;
    creditsCost: number;
    createdAt: FirestoreTimestamp;
    downloadCount: number;
    collectionId?: string;      // @deprecated use collectionIds instead
    collectionIds?: string[];   // For multi-collection support
    sourceImageId?: string;     // For Img2Img variations - tracks parent image
    promptSetID?: string;       // Unique ID for the batch/generation set
    publishedToCommunity?: boolean;  // Whether image is published to community hub
    communityEntryId?: string;       // Reference to community hub doc when published
    publishedToLeague?: boolean;     // @deprecated Map to publishedToCommunity
    leagueEntryId?: string;          // @deprecated Map to communityEntryId
    tags?: string[];             // Per-image tagging for discovery
    duration?: number;           // Video duration in seconds
    variationCount?: number;     // Count of variations generated from this image
    isExemplar?: boolean;        // Whether this is an exemplar of high quality (admin set)
    status?: 'draft' | 'completed'; // Added to track drafts vs completed generations
}

// ============================================
// Community Hub Types
// ============================================

export interface CommunityEntry {
    id: string;
    // Source reference
    originalImageId: string;
    originalUserId: string;
    // Denormalized image data
    imageUrl: string;
    videoUrl?: string;
    duration?: number;
    prompt: string;
    settings: GenerationSettings;
    // Author info (denormalized)
    authorName: string;
    authorPhotoURL: string | null;
    authorBadges?: string[];
    // Community metadata
    publishedAt: FirestoreTimestamp;
    // Engagement
    voteCount: number;
    commentCount: number;
    shareCount: number;
    authorFollowerCount?: number;
    reportCount?: number;
    isModerated?: boolean;
    votes: Record<string, boolean>; // userId → true
    reactions?: Record<string, string[]>; // emoji → [userIds]
    collectionIds?: string[];
    collectionNames?: string[];
    variationCount?: number;     // Count of variations generated from this entry
    tags?: string[];
    promptSetID?: string;       // Unique ID for the batch/generation set
    isStack?: boolean;          // UI-only: whether this card represents a stack of variations
    stackSize?: number;         // UI-only: number of variations in the stack
    isExemplar?: boolean;        // Whether this is an exemplar of high quality (admin set)
}

export interface CommunityComment {
    id: string;
    entryId: string;
    userId: string;
    userName: string;
    userPhotoURL: string | null;
    userBadges?: string[];
    text: string;
    createdAt: FirestoreTimestamp;
    reportCount?: number;
}

// ============================================
// Collections System Types
// ============================================

export interface Collection {
    id: string;
    userId: string;
    name: string;
    description?: string;
    coverImageUrl?: string;
    imageCount: number;
    privacy: 'public' | 'private';
    tags?: string[];
    createdAt: FirestoreTimestamp;
    updatedAt: FirestoreTimestamp;
}

// ============================================
// Subscription & Stripe Types
// ============================================

export interface ResourceQuotas {
    storageBytes: number;     // Total storage in bytes
    dbWritesDaily: number;    // Daily database write operations (-1 for unlimited)
    cpuTimeMsPerMonth: number; // Monthly CPU/Function compute time in ms
    maxCollections: number;    // Limit on private collections (-1 for unlimited)
    maxConcurrentGens: number; // Maximum parallel generation tasks
    burstAllowanceBytes: number; // One-time "Oxygen Tank" burst in bytes
}

export const RESOURCE_LABELS: Record<string, string> = {
    storageBytes: 'Storage Space',
    dbWritesDaily: 'Database Operations',
    cpuTimeMsPerMonth: 'AI Compute Time',
    maxCollections: 'Personal Collections',
    maxConcurrentGens: 'Parallel Generations',
};

export interface SubscriptionPlan {
    id: SubscriptionTier;
    name: string;
    price: number; // monthly price in cents
    features: string[];
    creditsPerMonth: number;
    allowedModes: AudienceMode[];
    allowedQualities: ImageQuality[];
    batchGeneration: boolean;
    stripePriceId?: string;
    resourceQuotas: ResourceQuotas;
}

// ============================================
// Prepaid Credit System Config (Admin/SU)
// ============================================

export interface CreditPack {
    id: string;
    name: string;      // e.g., "Starter Pack"
    credits: number;   // e.g., 100
    priceCents: number;// e.g., 1000 ($10.00)
    /** @deprecated Not used by checkout-one-time route (uses inline price_data). Kept for future Stripe Price catalog integration. */
    stripePriceId?: string;
    isMostPopular?: boolean;
}

export interface CreditSystemConfig {
    packs: CreditPack[];
    defaultOverdraftLimit: number;   // e.g., 3
    overdraftGraceThreshold: number; // Max debt allowed before locking (e.g., -10)
    refillOptions: number[];         // User-selectable thresholds (e.g., [10, 20, 50])

    // Phase 5 Additions
    autoRefillGlobalEnabled: boolean;
    minRefillAmount: number;         // Minimum "Refill up to" amount
    highlightOverdraftInvoices: boolean;
    systemMaxOverdraft: number;      // Maximum burst allowed system-wide regardless of user setting
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        features: [
            'Casual mode only',
        ],
        creditsPerMonth: 0,
        allowedModes: ['casual'],
        allowedQualities: ['standard'],
        batchGeneration: false,
        resourceQuotas: {
            storageBytes: 1 * 1024 * 1024 * 1024, // 1GB
            dbWritesDaily: 500,
            cpuTimeMsPerMonth: 30 * 1000, // 30s
            maxCollections: 3,
            maxConcurrentGens: 1,
            burstAllowanceBytes: 100 * 1024 * 1024 // 100MB
        }
    },
    standard: {
        id: 'standard',
        name: 'Standard',
        price: 999, // $9.99
        features: [
            'Casual mode',
        ],
        creditsPerMonth: 100,
        allowedModes: ['casual'],
        allowedQualities: ['standard', 'high'],
        batchGeneration: false,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD,
        resourceQuotas: {
            storageBytes: 10 * 1024 * 1024 * 1024, // 10GB
            dbWritesDaily: 5000,
            cpuTimeMsPerMonth: 300 * 1000, // 300s
            maxCollections: 10,
            maxConcurrentGens: 3,
            burstAllowanceBytes: 500 * 1024 * 1024 // 500MB
        }
    },
    pro: {
        id: 'pro',
        name: 'Professional',
        price: 2999, // $29.99
        features: [
            'Priority support',
        ],
        creditsPerMonth: 500,
        allowedModes: ['casual', 'professional'],
        allowedQualities: ['standard', 'high', 'ultra'],
        batchGeneration: true,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
        resourceQuotas: {
            storageBytes: 100 * 1024 * 1024 * 1024, // 100GB
            dbWritesDaily: -1, // Unlimited
            cpuTimeMsPerMonth: 3000 * 1000, // 3000s (50 mins)
            maxCollections: -1, // Unlimited
            maxConcurrentGens: 10,
            burstAllowanceBytes: 1024 * 1024 * 1024 // 1GB
        }
    },
};

// ============================================
// Font System Types
// ============================================

export interface FontOption {
    family: string;
    category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
    weights: number[];
    googleFontsUrl: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface GenerateImageResponse {
    imageUrl: string;
    imageId: string;
    creditsUsed: number;
    remainingBalance: number;
}
// Backward compatibility aliases
export type LeagueEntry = CommunityEntry;
export type LeagueComment = CommunityComment;
export type CommunityHubNotification = Notification;
