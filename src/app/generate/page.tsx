'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { PROMPT_CATEGORIES, buildPromptFromMadLibs, FEATURED_PROMPTS } from '@/lib/prompt-templates';
import { ImageQuality, AspectRatio, MadLibsSelection, CREDIT_COSTS, SUBSCRIPTION_PLANS, GeneratedImage } from '@/lib/types';
import Link from 'next/link';
import TextOverlayEditor from '@/components/TextOverlayEditor';
import ShareButtons from '@/components/ShareButtons';

type PromptMode = 'freeform' | 'madlibs' | 'featured';

// Helper to generate a unique 15-character alphanumeric ID
const generatePromptSetID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 15; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export default function GeneratePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        }>
            <GeneratePageContent />
        </Suspense>
    );
}

function GeneratePageContent() {
    const { user, profile, credits, loading, refreshCredits } = useAuth();
    const router = useRouter();

    // State
    const [promptMode, setPromptMode] = useState<PromptMode>(profile?.audienceMode === 'professional' ? 'freeform' : 'madlibs');
    const [prompt, setPrompt] = useState('');
    const [madLibs, setMadLibs] = useState<MadLibsSelection>({
        subject: PROMPT_CATEGORIES.subjects[0],
        action: PROMPT_CATEGORIES.actions[0],
        style: PROMPT_CATEGORIES.styles[0],
        mood: '',
        setting: '',
    });
    const [quality, setQuality] = useState<ImageQuality>('standard');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');
    const [batchSize, setBatchSize] = useState<number>(1);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showTextEditor, setShowTextEditor] = useState(false);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [negativePrompt, setNegativePrompt] = useState('');
    const [seed, setSeed] = useState<number | undefined>(undefined);
    const [guidanceScale, setGuidanceScale] = useState(7.0);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [enhancing, setEnhancing] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; message: string } | null>(null);
    const [promptSetID, setPromptSetID] = useState<string>('');

    // History & Remix state
    const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Initialize promptSetID on mount
    // Initialize promptSetID on mount and hydrate state
    // Initialize promptSetID on mount and hydrate state
    useEffect(() => {
        const initSession = async () => {
            setPromptSetID(generatePromptSetID());

            // 1. Load Local State (Fastest)
            let localTimestamp = 0;
            let localState: any = null;
            try {
                const savedState = localStorage.getItem('generation_session_v1');
                if (savedState) {
                    localState = JSON.parse(savedState);
                    localTimestamp = localState.updatedAt || 0;

                    // Hydrate from local immediately
                    if (localState.prompt) setPrompt(localState.prompt);
                    if (localState.quality) setQuality(localState.quality as ImageQuality);
                    if (localState.aspectRatio) setAspectRatio(localState.aspectRatio as AspectRatio);
                    if (localState.batchSize) setBatchSize(localState.batchSize);
                    if (localState.negativePrompt) setNegativePrompt(localState.negativePrompt);
                    if (localState.seed !== undefined) setSeed(localState.seed);
                    if (localState.guidanceScale) setGuidanceScale(localState.guidanceScale);
                    if (localState.promptMode) setPromptMode(localState.promptMode as PromptMode);
                    if (localState.madLibs) setMadLibs(localState.madLibs);
                }
            } catch (e) {
                console.warn('Failed to hydrate local session state', e);
            }

            // 2. Check Cloud State (Async)
            if (user) {
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const { db } = await import('@/lib/firebase');
                    const draftRef = doc(db, 'users', user.uid, 'settings', 'draft');
                    const draftSnap = await getDoc(draftRef);

                    if (draftSnap.exists()) {
                        const cloudData = draftSnap.data();
                        const cloudTimestamp = cloudData.updatedAt?.toMillis?.() || 0;

                        // Conflict Resolution: If Cloud is newer than Local
                        if (cloudTimestamp > localTimestamp) {
                            console.log('Cloud draft is newer, syncing...');
                            if (cloudData.prompt) setPrompt(cloudData.prompt);
                            if (cloudData.quality) setQuality(cloudData.quality as ImageQuality);
                            if (cloudData.aspectRatio) setAspectRatio(cloudData.aspectRatio as AspectRatio);
                            if (cloudData.batchSize) setBatchSize(cloudData.batchSize);
                            if (cloudData.negativePrompt) setNegativePrompt(cloudData.negativePrompt);
                            if (cloudData.seed !== undefined) setSeed(cloudData.seed);
                            if (cloudData.guidanceScale) setGuidanceScale(cloudData.guidanceScale);
                            if (cloudData.promptMode) setPromptMode(cloudData.promptMode as PromptMode);
                            if (cloudData.madLibs) setMadLibs(cloudData.madLibs);

                            // Update local storage to match cloud
                            localStorage.setItem('generation_session_v1', JSON.stringify({
                                ...cloudData,
                                updatedAt: cloudTimestamp // Keep consistent timeframe
                            }));
                        }
                    }
                } catch (e) {
                    console.warn('Failed to sync with cloud draft', e);
                }
            }
        };

        initSession();
    }, [user]); // Re-run when user logs in to sync their draft

    // Persist state changes (Local + Cloud)
    useEffect(() => {
        const timestamp = Date.now();
        const stateToSave = {
            prompt,
            quality,
            aspectRatio,
            batchSize,
            negativePrompt,
            seed,
            guidanceScale,
            promptMode,
            madLibs,
            updatedAt: timestamp,
        };

        // 1. Save Local (Immediate)
        localStorage.setItem('generation_session_v1', JSON.stringify(stateToSave));

        // 2. Save Cloud (Debounced 2s)
        if (user) {
            const saveToCloud = setTimeout(async () => {
                try {
                    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                    const { db } = await import('@/lib/firebase');
                    const draftRef = doc(db, 'users', user.uid, 'settings', 'draft');

                    await setDoc(draftRef, {
                        ...stateToSave,
                        updatedAt: serverTimestamp(), // Use server time for truth
                    }, { merge: true });
                } catch (e) {
                    console.warn('Failed to save draft to cloud', e);
                }
            }, 2000);

            return () => clearTimeout(saveToCloud);
        }
    }, [
        prompt,
        quality,
        aspectRatio,
        batchSize,
        negativePrompt,
        seed,
        guidanceScale,
        promptMode,
        madLibs,
        user, // Added user dependency
    ]);

    // Reference image for Img2Img variations
    const searchParams = useSearchParams();
    const refImageId = searchParams.get('ref');
    const [referenceImage, setReferenceImage] = useState<{ id: string; url: string; base64?: string; prompt?: string; promptSetID?: string; collectionIds?: string[] } | null>(null);
    const [loadingReference, setLoadingReference] = useState(false);

    // Load reference image if provided in URL
    useEffect(() => {
        const loadReference = async () => {
            if (!refImageId || !user) return;

            setLoadingReference(true);
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');

                const imgRef = doc(db, 'users', user.uid, 'images', refImageId);
                const imgSnap = await getDoc(imgRef);

                if (imgSnap.exists()) {
                    const data = imgSnap.data() as GeneratedImage;

                    // Pre-fill prompt if it's currently empty
                    if (!prompt && data.prompt) {
                        setPrompt(data.prompt);
                    }

                    // Use existing promptSetID if available to group variations with original
                    if (data.promptSetID) {
                        setPromptSetID(data.promptSetID);
                    }

                    // Convert to base64 for the API
                    // We use the proxy to bypass CORS
                    const response = await fetch(`/api/download?url=${encodeURIComponent(data.imageUrl)}`);
                    const blob = await response.blob();

                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        // Strip metadata prefix (data:image/png;base64,)
                        const base64 = base64data.split(',')[1];
                        setReferenceImage({
                            id: refImageId,
                            url: data.imageUrl,
                            base64,
                            prompt: data.prompt,
                            promptSetID: data.promptSetID,
                            collectionIds: data.collectionIds || (data.collectionId ? [data.collectionId] : [])
                        });
                        setLoadingReference(false);
                    };
                    reader.readAsDataURL(blob);
                } else {
                    console.error('Reference image not found');
                    setLoadingReference(false);
                }
            } catch (err) {
                console.error('Error loading reference image:', err);
                setLoadingReference(false);
            }
        };

        loadReference();
    }, [refImageId, user]);

    // Sync prompt mode when profile loads
    useEffect(() => {
        if (profile) {
            setPromptMode(profile.audienceMode === 'professional' ? 'freeform' : 'madlibs');
        }
    }, [profile?.audienceMode]);

    // Fetch personal history
    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setLoadingHistory(true);
        try {
            const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const imagesRef = collection(db, 'users', user.uid, 'images');
            const q = query(imagesRef, orderBy('createdAt', 'desc'), limit(20));
            const snapshot = await getDocs(q);

            const images = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GeneratedImage));

            setHistoryImages(images);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoadingHistory(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user, fetchHistory]);

    // Remix handler
    const handleRemix = (image: GeneratedImage) => {
        if (!image.settings) return;

        setPrompt(image.prompt);
        setQuality(image.settings.quality || 'standard');
        setAspectRatio(image.settings.aspectRatio || '1:1');

        if (image.settings.negativePrompt) {
            setNegativePrompt(image.settings.negativePrompt);
        }
        if (image.settings.seed !== undefined) {
            setSeed(image.settings.seed);
        }
        if (image.settings.guidanceScale !== undefined) {
            setGuidanceScale(image.settings.guidanceScale);
        }

        // Open advanced if needed
        if (image.settings.negativePrompt || image.settings.seed !== undefined || (image.settings.guidanceScale !== undefined && image.settings.guidanceScale !== 7.0)) {
            setIsAdvancedOpen(true);
        }

        // Generate new set ID for this variation
        setPromptSetID(generatePromptSetID());

        setIsHistoryOpen(false);
        setError('');
        setWarning('Remixed settings from previous generation.');
    };

    // Calculate available credits
    const availableCredits = credits
        ? credits.balance + Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    // Check if quality is allowed for subscription
    const allowedQualities = profile
        ? SUBSCRIPTION_PLANS[profile.subscription].allowedQualities
        : ['standard'];

    // Get final prompt based on mode
    const getFinalPrompt = useCallback((): string => {
        if (promptMode === 'freeform') {
            return prompt;
        } else if (promptMode === 'madlibs') {
            return buildPromptFromMadLibs(madLibs);
        } else {
            return prompt; // Featured prompt already set
        }
    }, [prompt, promptMode, madLibs]);

    // Handle prompt enhancement
    const handleEnhancePrompt = async () => {
        if (!prompt.trim() || enhancing) return;

        setEnhancing(true);
        setError('');

        try {
            const token = await user?.getIdToken();
            const response = await fetch('/api/generate/enhance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();

            if (data.success && data.enhanced) {
                setPrompt(data.enhanced);
            } else {
                setError(data.error || 'Enhancement failed');
            }
        } catch (err: any) {
            setError('Failed to enhance prompt');
        } finally {
            setEnhancing(false);
        }
    };

    // Handle image generation
    const handleGenerate = useCallback(async () => {
        const finalPrompt = getFinalPrompt();

        if (!finalPrompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        const cost = CREDIT_COSTS[quality] * batchSize;
        if (availableCredits < cost) {
            setError(`Insufficient credits. Need ${cost}, have ${availableCredits}`);
            return;
        }

        setError('');
        setWarning('');
        setGenerating(true);
        setGeneratedImages([]);
        setEditedImage(null);
        setSelectedImageIndex(0);

        try {
            if (!user) {
                setError('Please sign in to generate images');
                return;
            }
            const token = await user.getIdToken();

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    prompt: finalPrompt,
                    quality,
                    aspectRatio,
                    promptType: promptMode === 'madlibs' ? 'madlibs' : 'freeform',
                    madlibsData: promptMode === 'madlibs' ? madLibs : undefined,
                    count: batchSize,
                    ...(profile?.subscription === 'pro' && {
                        seed,
                        negativePrompt: negativePrompt.trim() || undefined,
                        guidanceScale,
                    }),
                    referenceImage: referenceImage?.base64,
                    sourceImageId: referenceImage?.id,
                    promptSetID: promptSetID.trim() || undefined,
                    collectionIds: referenceImage?.collectionIds,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Generation failed');
            }

            // Read the stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('Failed to start stream reader');
            }

            let done = false;
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    // Split chunk by data: prefix in case multiple messages are in one chunk
                    const messages = chunk.split('data: ').filter(m => m.trim());

                    for (const message of messages) {
                        try {
                            const data = JSON.parse(message.trim());

                            if (data.type === 'progress') {
                                setGenerationProgress({
                                    current: data.current,
                                    total: data.total,
                                    message: data.message
                                });
                            } else if (data.type === 'image_ready') {
                                setGeneratedImages(prev => [...prev, data.image]);
                            } else if (data.type === 'complete') {
                                setGeneratedImages(data.images || []);
                                if (data.warning) {
                                    setWarning(data.warning);
                                }
                                await refreshCredits();
                                await fetchHistory(); // REFRESH HISTORY
                            } else if (data.type === 'error') {
                                setError(data.error);
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE message:', message, e);
                        }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGenerating(false);
            setGenerationProgress(null);
        }
    }, [
        user,
        profile,
        prompt,
        madLibs,
        quality,
        aspectRatio,
        batchSize,
        seed,
        negativePrompt,
        guidanceScale,
        promptMode,
        promptSetID,
        referenceImage,
        availableCredits,
        refreshCredits,
        fetchHistory,
        getFinalPrompt
    ]);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Keyboard shortcuts - Use Ref for handleGenerate to avoid listener churn on every keystroke
    const handleNavigateHistory = useCallback((direction: 'up' | 'down') => {
        if (historyImages.length === 0) return;

        let newIndex = historyIndex;
        if (direction === 'up') {
            newIndex = Math.min(historyIndex + 1, historyImages.length - 1);
        } else {
            newIndex = Math.max(historyIndex - 1, -1);
        }

        if (newIndex !== historyIndex) {
            setHistoryIndex(newIndex);
            if (newIndex === -1) {
                setPrompt('');
            } else {
                handleRemix(historyImages[newIndex]);
            }
        }
    }, [historyIndex, historyImages, handleRemix]);

    // Maintain refs for stable listeners
    const latestGenerateRef = useRef(handleGenerate);
    const latestNavigateRef = useRef(handleNavigateHistory);

    useEffect(() => {
        latestGenerateRef.current = handleGenerate;
        latestNavigateRef.current = handleNavigateHistory;
    }, [handleGenerate, handleNavigateHistory]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // CTRL/CMD + ENTER = Generate
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                if (!generating && !enhancing) {
                    e.preventDefault();
                    e.stopPropagation();
                    latestGenerateRef.current();
                }
                return;
            }

            // ALT + UP/DOWN = Navigate History
            if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();
                e.stopPropagation();
                latestNavigateRef.current(e.key === 'ArrowUp' ? 'up' : 'down');
            }
        };

        // Use capture mode to ensure we catch events even if children try to stop propagation
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [generating, enhancing]);
    // Still depend on generating/enhancing to ensure logs are accurate, or move them inside

    // Download image
    const handleDownload = async (format: 'png' | 'jpeg' = 'png') => {
        const selectedImage = generatedImages[selectedImageIndex]?.imageUrl;
        const imageToDownload = editedImage || selectedImage;
        const filename = `studio-image-${Date.now()}.${format}`;

        if (!imageToDownload) {
            return;
        }

        try {
            if (imageToDownload.startsWith('data:')) {
                const response = await fetch(imageToDownload);
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
            } else {
                const proxyUrl = `/api/download?url=${encodeURIComponent(imageToDownload)}&filename=${encodeURIComponent(filename)}`;
                const link = document.createElement('a');
                link.href = proxyUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err: any) {
            console.error('[Download] Failed:', err);
            setError('Download failed. Try right-clicking and "Save Image As".');
        }
    };

    const handleSaveOverlay = (dataUrl: string) => {
        setEditedImage(dataUrl);
        setShowTextEditor(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    const isCasual = profile.audienceMode === 'casual';

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 5" />
                                <path d="M3 10V5h5" />
                            </svg>
                            <span className="hidden sm:inline">History</span>
                        </button>

                        {profile?.role === 'admin' || profile?.role === 'su' ? (
                            <Link href="/admin" className="btn-secondary text-xs px-3 py-2 flex items-center gap-2 border-primary/20 hover:border-primary/50 transition-all">
                                <span>🛡️</span>
                                <span className="hidden sm:inline">Admin</span>
                            </Link>
                        ) : null}
                        <div className="credit-badge">
                            <span>{availableCredits} credits</span>
                        </div>
                        <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">
                            ← Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${isCasual ? 'max-w-5xl mx-auto' : ''}`}>
                    {/* Left: Controls */}
                    <div className="space-y-6">
                        <div>
                            <h1 className={`${isCasual ? 'text-4xl' : 'text-3xl'} font-bold mb-2`}>
                                {isCasual ? 'Create Something Amazing' : 'Image Generation'}
                            </h1>
                            <p className="text-foreground-muted">
                                {isCasual ? 'Use our builder to create a prompt in seconds.' : 'Professional-grade control over your AI generations.'}
                            </p>
                        </div>

                        {/* Prompt Mode Tabs */}
                        <div className={`flex gap-2 p-1 bg-background-secondary rounded-xl ${isCasual ? 'hidden' : ''}`}>
                            {(['freeform', 'madlibs', 'featured'] as PromptMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setPromptMode(mode)}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${promptMode === mode
                                        ? 'bg-primary text-white'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    {mode === 'freeform' ? 'Free Text' : mode === 'madlibs' ? 'Builder' : 'Featured'}
                                </button>
                            ))}
                        </div>

                        {/* Prompt Input based on mode */}
                        <div className="card">
                            {promptMode === 'freeform' && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium">Your Prompt</label>
                                        <button
                                            onClick={handleEnhancePrompt}
                                            disabled={enhancing || !prompt.trim()}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 transition-all"
                                            title="AI-enhance your prompt"
                                        >
                                            {enhancing ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Enhancing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                                    </svg>
                                                    Magic Enhance
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Reference Image Preview */}
                                    {(loadingReference || referenceImage) && (
                                        <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-4 relative overflow-hidden">
                                            {loadingReference ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center">
                                                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                    <div className="text-xs text-foreground-muted animate-pulse">Loading reference...</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                                                        <img src={referenceImage!.url} alt="Reference" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                                                                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            <span className="text-xs font-bold text-accent uppercase tracking-wider">Variation mode active</span>
                                                        </div>
                                                        <p className="text-[10px] text-foreground-muted truncate">Using previous generation as visual reference</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setReferenceImage(null);
                                                            setPromptSetID(generatePromptSetID()); // Reset to new ID
                                                            router.replace('/generate', { scroll: false });
                                                        }}
                                                        className="p-1.5 hover:bg-background rounded-lg text-foreground-muted hover:text-error transition-colors"
                                                        title="Remove reference"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="A majestic dragon flying over snow-capped mountains at sunset, photorealistic..."
                                        className={`input-field h-32 resize-none ${prompt.length > 2000 ? 'border-error ring-1 ring-error/20' : ''}`}
                                    />
                                    <div className="flex justify-between items-center mt-2 px-1">
                                        <p className="text-xs text-foreground-muted">
                                            {prompt.length} / 2000 characters • Be descriptive for best results
                                        </p>
                                        {prompt.length > 2000 && (
                                            <p className="text-[10px] text-error font-bold uppercase">Too long!</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {promptMode === 'madlibs' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Subject</label>
                                        <select
                                            value={madLibs.subject}
                                            onChange={(e) => setMadLibs({ ...madLibs, subject: e.target.value })}
                                            className="select-field"
                                        >
                                            {PROMPT_CATEGORIES.subjects.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Action</label>
                                        <select
                                            value={madLibs.action}
                                            onChange={(e) => setMadLibs({ ...madLibs, action: e.target.value })}
                                            className="select-field"
                                        >
                                            {PROMPT_CATEGORIES.actions.map((a) => (
                                                <option key={a} value={a}>{a}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Art Style</label>
                                        <select
                                            value={madLibs.style}
                                            onChange={(e) => setMadLibs({ ...madLibs, style: e.target.value })}
                                            className="select-field"
                                        >
                                            {PROMPT_CATEGORIES.styles.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                {isCasual ? 'What is the mood?' : 'Mood (Optional)'}
                                            </label>
                                            <select
                                                value={madLibs.mood}
                                                onChange={(e) => setMadLibs({ ...madLibs, mood: e.target.value })}
                                                className="select-field"
                                            >
                                                <option value="">{isCasual ? 'Choose a vibe...' : 'Select mood...'}</option>
                                                {PROMPT_CATEGORIES.moods.map((m) => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                {isCasual ? 'Where is it set?' : 'Setting (Optional)'}
                                            </label>
                                            <select
                                                value={madLibs.setting}
                                                onChange={(e) => setMadLibs({ ...madLibs, setting: e.target.value })}
                                                className="select-field"
                                            >
                                                <option value="">{isCasual ? 'Choose a place...' : 'Select setting...'}</option>
                                                {PROMPT_CATEGORIES.settings.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="p-4 bg-background-secondary rounded-lg">
                                        <p className="text-sm text-foreground-muted mb-1">Preview:</p>
                                        <p className="text-sm">{buildPromptFromMadLibs(madLibs)}</p>
                                    </div>
                                </div>
                            )}

                            {promptMode === 'featured' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {FEATURED_PROMPTS.map((fp) => (
                                        <button
                                            key={fp.id}
                                            onClick={() => setPrompt(fp.prompt)}
                                            className={`p-4 rounded-xl text-left transition-all ${prompt === fp.prompt
                                                ? 'bg-primary/20 border-primary'
                                                : 'bg-background-secondary hover:bg-background-secondary/80'
                                                } border border-transparent`}
                                        >
                                            <span className="text-xs font-medium text-accent">{fp.category}</span>
                                            <p className="font-medium mt-1">{fp.title}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quality & Aspect Ratio */}
                        <div className="card">
                            <h3 className="font-semibold mb-4">{isCasual ? 'Style & Size' : 'Settings'}</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">{isCasual ? 'Image Quality' : 'Quality'}</label>
                                    <select
                                        value={quality}
                                        onChange={(e) => setQuality(e.target.value as ImageQuality)}
                                        className="select-field"
                                    >
                                        <option value="standard" disabled={!allowedQualities.includes('standard')}>
                                            {isCasual ? 'Standard' : 'Standard (1024px)'} - {CREDIT_COSTS.standard} credit
                                        </option>
                                        <option value="high" disabled={!allowedQualities.includes('high')}>
                                            {isCasual ? 'High Definition' : 'High (2K)'} - {CREDIT_COSTS.high} credits
                                        </option>
                                        <option value="ultra" disabled={!allowedQualities.includes('ultra')}>
                                            {isCasual ? 'Ultra 4K' : 'Ultra (4K)'} - {CREDIT_COSTS.ultra} credits {!allowedQualities.includes('ultra') ? '(Pro only)' : ''}
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">{isCasual ? 'Image Shape' : 'Aspect Ratio'}</label>
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                        className="select-field"
                                    >
                                        <option value="1:1">{isCasual ? 'Square' : '1:1 (Square)'}</option>
                                        <option value="4:3">{isCasual ? 'Landscape' : '4:3 (Classic)'}</option>
                                        <option value="3:4">{isCasual ? 'Portrait' : '3:4 (Portrait)'}</option>
                                        <option value="16:9">{isCasual ? 'Wide' : '16:9 (Widescreen)'}</option>
                                        <option value="9:16">{isCasual ? 'Story' : '9:16 (Mobile)'}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Prompt Set ID</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={promptSetID}
                                            onChange={(e) => setPromptSetID(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                            placeholder="Enter set ID..."
                                            maxLength={30}
                                            className="input-field text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setPromptSetID(generatePromptSetID())}
                                            className="p-2 border border-border rounded-lg bg-background-secondary hover:border-primary/50 transition-all"
                                            title="Regenerate ID"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>


                            {profile?.subscription === 'pro' && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <label className="block text-sm font-medium mb-2">Batch Size (Pro Feature)</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 4, 8, 12].map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => setBatchSize(size)}
                                                className={`py-2 rounded-lg text-sm font-bold transition-all border ${batchSize === size
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-background-secondary text-foreground-muted border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                {size} {size === 1 ? 'Image' : 'Images'}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-foreground-muted mt-2 uppercase tracking-widest font-bold flex items-center justify-between">
                                        <span>Estimated Cost:</span>
                                        <span className="text-primary">{CREDIT_COSTS[quality] * batchSize} Credits</span>
                                    </p>
                                </div>
                            )}

                            {profile?.subscription !== 'pro' && (
                                <p className="text-[10px] text-foreground-muted mt-2 uppercase tracking-widest font-bold flex items-center justify-between">
                                    <span>Cost:</span>
                                    <span className="text-primary">{CREDIT_COSTS[quality]} Credit</span>
                                </p>
                            )}
                        </div>

                        {/* Advanced Precision Controls (PRO Only) */}
                        {profile?.subscription === 'pro' && !isCasual && (
                            <div className="card overflow-hidden">
                                <button
                                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                                    className="w-full flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg bg-primary/10 text-primary transition-colors ${isAdvancedOpen ? 'bg-primary text-white' : ''}`}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                                            </svg>
                                        </div>
                                        <h3 className="font-semibold">Advanced Precision Controls</h3>
                                    </div>
                                    <div className={`transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                <div className={`transition-all duration-300 overflow-hidden ${isAdvancedOpen ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="space-y-6">
                                        {/* Negative Prompt */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                                                <span>Negative Prompt</span>
                                                <span className="text-[10px] text-foreground-muted uppercase">What to exclude</span>
                                            </label>
                                            <textarea
                                                value={negativePrompt}
                                                onChange={(e) => setNegativePrompt(e.target.value)}
                                                placeholder="blurry, distorted, low quality, text, watermarks..."
                                                className="input-field h-20 text-sm resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Seed Control */}
                                            <div>
                                                <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                                                    <span>Seed</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSeed(undefined)}
                                                        className={`text-[10px] uppercase font-bold transition-all ${seed === undefined ? 'text-primary' : 'text-foreground-muted hover:text-foreground'}`}
                                                    >
                                                        {seed === undefined ? '✓ Random' : 'Randomize'}
                                                    </button>
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={seed ?? ''}
                                                        onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="Random"
                                                        className="input-field text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                                                        className="p-2 border border-border rounded-lg bg-background-secondary hover:border-primary/50 transition-all"
                                                        title="Generate new seed"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Guidance Scale */}
                                            <div>
                                                <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                                                    <span>Guidance Scale</span>
                                                    <span className="text-primary font-bold">{guidanceScale.toFixed(1)}</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="15"
                                                    step="0.5"
                                                    value={guidanceScale}
                                                    onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                                <div className="flex justify-between text-[10px] text-foreground-muted mt-2 uppercase">
                                                    <span>Creative</span>
                                                    <span>Strict Adherence</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-error text-sm">
                                {error}
                            </div>
                        )}

                        {/* Warning Message */}
                        {warning && (
                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm">
                                ⚠️ {warning}
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={generating || availableCredits < (CREDIT_COSTS[quality] * batchSize)}
                            className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="spinner w-5 h-5 border-2" />
                                    Generating Batch...
                                </span>
                            ) : (
                                <span>Generate {batchSize > 1 ? `Batch of ${batchSize}` : 'Image'} ({CREDIT_COSTS[quality] * batchSize} credits)</span>
                            )}
                        </button>
                    </div>

                    {/* Right: Preview */}
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <div className="card">
                            <h3 className="font-semibold mb-4">Preview</h3>

                            <div
                                className="relative bg-background-secondary rounded-xl overflow-hidden flex items-center justify-center mb-4"
                                style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                            >
                                {generating ? (
                                    <div className="text-center w-full px-8">
                                        <div className="spinner mx-auto mb-6" />
                                        <p className="font-bold text-lg mb-2">
                                            {generationProgress ? `Generating Image ${generationProgress.current} of ${generationProgress.total}` : 'Initializing...'}
                                        </p>
                                        <div className="w-full bg-background-secondary border border-border h-3 rounded-full overflow-hidden mb-4">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                                                style={{ width: `${generationProgress ? (generationProgress.current / generationProgress.total) * 100 : 5}%` }}
                                            />
                                        </div>
                                        <p className="text-sm text-foreground-muted animate-pulse">
                                            {generationProgress?.message || 'Connecting to brain...'}
                                        </p>
                                    </div>
                                ) : generatedImages.length > 0 ? (
                                    <img
                                        src={editedImage || generatedImages[selectedImageIndex]?.imageUrl}
                                        alt="Generated"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-center p-8">
                                        <div className="text-6xl mb-4 opacity-30">🎨</div>
                                        <p className="text-foreground-muted">
                                            Your generated images will appear here
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Batch Thumbnail Grid */}
                            {generatedImages.length > 1 && (
                                <div className="grid grid-cols-4 gap-2 mb-6">
                                    {generatedImages.map((img, idx) => (
                                        <button
                                            key={img.id}
                                            onClick={() => {
                                                setSelectedImageIndex(idx);
                                                setEditedImage(null);
                                            }}
                                            className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === idx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                        >
                                            <img src={img.imageUrl} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Download & Edit Options */}
                            {generatedImages.length > 0 && (
                                <div className="space-y-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowTextEditor(true)}
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                        </svg>
                                        {editedImage ? 'Edit Text Overlay' : 'Add Text Overlay'}
                                    </button>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleDownload('png')}
                                            className="btn-secondary flex-1"
                                        >
                                            Download PNG
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDownload('jpeg')}
                                            className="btn-secondary flex-1"
                                        >
                                            Download JPEG
                                        </button>
                                    </div>

                                    {editedImage && (
                                        <button
                                            onClick={() => setEditedImage(null)}
                                            className="text-xs text-foreground-muted hover:text-foreground underline w-full text-center"
                                        >
                                            Reset to original image
                                        </button>
                                    )}

                                    <div className="pt-4 border-t border-border">
                                        <p className="text-xs font-semibold text-foreground-muted mb-2 uppercase tracking-wider text-center">Share your creation</p>
                                        <div className="flex justify-center">
                                            <ShareButtons
                                                imageUrl={editedImage || generatedImages[selectedImageIndex].imageUrl}
                                                prompt={prompt}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showTextEditor && generatedImages.length > 0 && (
                    <TextOverlayEditor
                        imageUrl={generatedImages[selectedImageIndex].imageUrl}
                        onClose={() => setShowTextEditor(false)}
                        onSave={handleSaveOverlay}
                    />
                )}
            </main>

            {/* History Sidebar */}
            <div className={`fixed inset-0 z-[60] transition-opacity duration-300 ${isHistoryOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div
                    className="absolute inset-0 bg-background/60 backdrop-blur-sm"
                    onClick={() => setIsHistoryOpen(false)}
                />
                <div className={`absolute right-0 top-0 bottom-0 w-80 max-w-[90vw] glass-card border-l border-border transition-transform duration-300 transform ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'} overflow-hidden flex flex-col`}>
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h2 className="text-xl font-bold font-sans">Recent History</h2>
                        <button
                            onClick={() => setIsHistoryOpen(false)}
                            className="p-2 hover:bg-background rounded-lg"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {loadingHistory && historyImages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-foreground-muted">
                                <div className="spinner mb-4" />
                                <p className="text-sm">Loading history...</p>
                            </div>
                        ) : historyImages.length === 0 ? (
                            <div className="text-center py-12 text-foreground-muted">
                                <p className="text-sm">No generations found.</p>
                                <p className="text-xs mt-2">Create something to see it here!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {historyImages.map((img) => (
                                    <div key={img.id} className="group relative rounded-xl overflow-hidden glass-card border border-border/50 hover:border-primary/50 transition-all p-2">
                                        <div className="aspect-square rounded-lg overflow-hidden bg-background-secondary mb-2 relative">
                                            <img
                                                src={img.imageUrl}
                                                alt={img.prompt}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={() => handleRemix(img)}
                                                    className="btn-primary text-xs px-3 py-1.5"
                                                >
                                                    Remix
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-1 overflow-hidden">
                                            <p className="text-[10px] text-foreground-muted line-clamp-2 italic mb-1">
                                                "{img.prompt}"
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 bg-primary/10 text-primary rounded">
                                                    {img.settings?.quality || 'standard'}
                                                </span>
                                                <span className="text-[8px] text-foreground-muted">
                                                    {img.createdAt?.toDate?.() ? new Date(img.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
