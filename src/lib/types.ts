// Generic Timestamp type to work with both Firebase client and admin SDKs
export type FirestoreTimestamp = any;

// ============================================
// User & Authentication Types
// ============================================

export type UserRole = 'su' | 'admin' | 'member';
export type SubscriptionTier = 'free' | 'standard' | 'pro';
export type AudienceMode = 'casual' | 'professional';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole;
    actingAs?: UserRole; // For role-switching (admin viewing as member)
    subscription: SubscriptionTier;
    audienceMode: AudienceMode;
    createdAt: FirestoreTimestamp;
    updatedAt: FirestoreTimestamp;
}

// Admin email for initial setup
export const ADMIN_EMAILS = ['heidlessemail18@gmail.com'];

// ============================================
// Credit System Types
// ============================================

export type TransactionType = 'purchase' | 'usage' | 'daily_allowance' | 'refund' | 'subscription';

export interface CreditTransaction {
    id: string;
    type: TransactionType;
    amount: number; // positive for additions, negative for deductions
    description: string;
    metadata?: Record<string, any>;
    createdAt: FirestoreTimestamp;
}

export interface UserCredits {
    balance: number;
    dailyAllowance: number;
    dailyAllowanceUsed: number;
    lastDailyReset: FirestoreTimestamp;
    expiresAt: FirestoreTimestamp | null; // null = never expires
    totalPurchased: number;
    totalUsed: number;
}

// Credit costs by quality tier
export const CREDIT_COSTS = {
    standard: 1,  // 1024px
    high: 3,      // 2K
    ultra: 5,     // 4K (Pro only)
} as const;

export type ImageQuality = keyof typeof CREDIT_COSTS;

// Daily allowance by subscription
export const DAILY_ALLOWANCE = {
    free: 5,
    standard: 15,
    pro: 50,
} as const;

// ============================================
// Image Generation Types
// ============================================

export type AspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | '3:4';

export interface GenerationSettings {
    quality: ImageQuality;
    aspectRatio: AspectRatio;
    prompt: string;
    promptType: 'freeform' | 'madlibs';
    madlibsData?: MadLibsSelection;
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
    imageUrl: string;
    storagePath: string;
    creditsCost: number;
    createdAt: FirestoreTimestamp;
    downloadCount: number;
    collectionId?: string;      // For folder/collections organization
    sourceImageId?: string;     // For Img2Img variations - tracks parent image
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
    createdAt: FirestoreTimestamp;
    updatedAt: FirestoreTimestamp;
}

// ============================================
// Subscription & Stripe Types
// ============================================

export interface SubscriptionPlan {
    id: SubscriptionTier;
    name: string;
    price: number; // monthly price in cents
    features: string[];
    creditsPerMonth: number;
    dailyAllowance: number;
    allowedModes: AudienceMode[];
    allowedQualities: ImageQuality[];
    batchGeneration: boolean;
    stripePriceId?: string;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        features: [
            '5 free credits daily',
            'Standard quality images',
            'Casual mode only',
        ],
        creditsPerMonth: 0,
        dailyAllowance: 5,
        allowedModes: ['casual'],
        allowedQualities: ['standard'],
        batchGeneration: false,
    },
    standard: {
        id: 'standard',
        name: 'Standard',
        price: 999, // $9.99
        features: [
            '15 credits daily',
            '100 bonus credits monthly',
            'Standard & High quality',
            'Casual mode',
        ],
        creditsPerMonth: 100,
        dailyAllowance: 15,
        allowedModes: ['casual'],
        allowedQualities: ['standard', 'high'],
        batchGeneration: false,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD,
    },
    pro: {
        id: 'pro',
        name: 'Professional',
        price: 2999, // $29.99
        features: [
            '50 credits daily',
            '500 bonus credits monthly',
            'All quality levels incl. 4K',
            'Professional + Casual modes',
            'Batch generation',
            'Priority support',
        ],
        creditsPerMonth: 500,
        dailyAllowance: 50,
        allowedModes: ['casual', 'professional'],
        allowedQualities: ['standard', 'high', 'ultra'],
        batchGeneration: true,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
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
