'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { PROMPT_CATEGORIES, buildPromptFromMadLibs, FEATURED_PROMPTS } from '@/lib/prompt-templates';
import { ImageQuality, AspectRatio, MadLibsSelection, CREDIT_COSTS, SUBSCRIPTION_PLANS, GeneratedImage, MediaModality } from '@/lib/types';
import Link from 'next/link';
import TextOverlayEditor from '@/components/TextOverlayEditor';
import ReactionPicker from '@/components/ReactionPicker';
import ShareButtons from '@/components/ShareButtons';
import Tooltip from '@/components/Tooltip';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

// Sub-components
import GenerateHeader from '@/components/generate/GenerateHeader';
import HistorySidebar from '@/components/generate/HistorySidebar';
import PromptSection from '@/components/generate/PromptSection';
import SettingsSection from '@/components/generate/SettingsSection';
import AdvancedControls from '@/components/generate/AdvancedControls';
import PreviewSection from '@/components/generate/PreviewSection';

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
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
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
    const [quality, setQuality] = useState<ImageQuality | 'video'>('standard');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');
    const [modality, setModality] = useState<MediaModality>('image');
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
                    if (localState.modality) setModality(localState.modality as MediaModality);
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
                            if (cloudData.modality) setModality(cloudData.modality as MediaModality);

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
            modality,
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
        modality,
        user, // Added user dependency
    ]);

    // Reference image for Img2Img variations
    const searchParams = useSearchParams();
    const refImageId = searchParams.get('ref');
    const [referenceImage, setReferenceImage] = useState<{ id: string; url: string; base64?: string; prompt?: string; promptSetID?: string; collectionIds?: string[] } | null>(null);
    const [loadingReference, setLoadingReference] = useState(false);

    // Helper to extract first frame from video and upload as thumbnail
    const createVideoThumbnail = async (imageId: string, videoUrl: string) => {
        try {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.playsInline = true;

            await new Promise((resolve, reject) => {
                video.onloadeddata = resolve;
                video.onerror = reject;
                video.load();
            });

            // Seek to 0.1s to ensure we have a frame (0.0 can sometimes be black)
            video.currentTime = 0.1;
            await new Promise((resolve) => {
                video.onseeked = resolve;
            });

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.8);
            const duration = video.duration;

            // Upload to API
            const response = await fetch('/api/generate/thumbnail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageId, thumbnailBase64, duration })
            });

            if (!response.ok) {
                console.warn('Failed to upload thumbnail:', await response.text());
            } else {
                console.log('Thumbnail uploaded successfully for', imageId);
            }
        } catch (err) {
            console.error('Error creating video thumbnail:', err);
        }
    };

    // Load reference image if provided in URL
    useEffect(() => {
        const loadReference = async () => {
            if (!refImageId || !user) return;

            setLoadingReference(true);
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');

                // Try to find the image in the user's collection first
                // If not found, it might be from the public league (published by another user)
                let imgRef = doc(db, 'users', user.uid, 'images', refImageId);
                let imgSnap = await getDoc(imgRef);

                // Fallback: Check league entries if not in personal collection
                let data: GeneratedImage | null = null;
                if (imgSnap.exists()) {
                    data = imgSnap.data() as GeneratedImage;
                } else {
                    const leagueRef = doc(db, 'leagueEntries', refImageId);
                    const leagueSnap = await getDoc(leagueRef);
                    if (leagueSnap.exists()) {
                        data = leagueSnap.data() as any;
                    }
                }

                if (data) {
                    // Pre-fill all settings from the reference image
                    if (data.prompt) setPrompt(data.prompt);

                    if (data.settings) {
                        if (data.settings.quality) setQuality(data.settings.quality);
                        if (data.settings.aspectRatio) setAspectRatio(data.settings.aspectRatio);
                        if (data.settings.modality) setModality(data.settings.modality);
                        if (data.settings.negativePrompt) setNegativePrompt(data.settings.negativePrompt);
                        if (data.settings.seed !== undefined) setSeed(data.settings.seed);
                        if (data.settings.guidanceScale !== undefined) setGuidanceScale(data.settings.guidanceScale);

                        // Open advanced settings if we have complex settings
                        if (data.settings.negativePrompt || data.settings.seed !== undefined) {
                            setIsAdvancedOpen(true);
                        }
                    }

                    if (data.promptSetID) {
                        setPromptSetID(data.promptSetID);
                    }

                    // Convert to base64 for the API
                    try {
                        const response = await fetch(`/api/download?url=${encodeURIComponent(data.imageUrl)}`);
                        if (response.ok) {
                            const blob = await response.blob();
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64data = reader.result as string;
                                const base64 = base64data.split(',')[1];
                                setReferenceImage({
                                    id: refImageId,
                                    url: data!.imageUrl,
                                    base64,
                                    prompt: data!.prompt,
                                    promptSetID: data!.promptSetID,
                                    collectionIds: data!.collectionIds || (data!.collectionId ? [data!.collectionId] : [])
                                });
                                setLoadingReference(false);
                            };
                            reader.readAsDataURL(blob);
                        } else {
                            throw new Error('Failed to fetch image for reference');
                        }
                    } catch (fetchErr) {
                        console.error('Error fetching reference image blob:', fetchErr);
                        setLoadingReference(false);
                    }
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
        setModality(image.settings.modality || 'image');

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

    const currentCost = modality === 'video' ? CREDIT_COSTS.video : (CREDIT_COSTS[quality] * batchSize);

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

        const cost = modality === 'video' ? CREDIT_COSTS.video : (CREDIT_COSTS[quality] * batchSize);
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

            const response = await fetch('/api/generate/', {
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
                    modality,
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
                                // If it's a video, trigger thumbnail generation
                                if (data.image.settings?.modality === 'video' || data.image.videoUrl) {
                                    createVideoThumbnail(data.image.id, data.image.videoUrl || data.image.imageUrl);
                                }
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

    // Download media
    const handleDownload = async (format: 'png' | 'jpeg' | 'mp4' = 'png') => {
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
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    const isCasual = profile.audienceMode === 'casual';

    return (
        <div className="min-h-screen bg-background">
            <GenerateHeader
                availableCredits={availableCredits}
                onHistoryOpen={() => setIsHistoryOpen(true)}
                isAdmin={profile.role === 'admin' || profile.role === 'su'}
            />

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className={cn(
                    "grid grid-cols-1 lg:grid-cols-2 gap-10",
                    isCasual && "max-w-5xl mx-auto"
                )}>
                    {/* Left: Controls */}
                    <div className="space-y-8 animate-in slide-in-from-left-4 duration-700">
                        <section>
                            <h1 className={cn(
                                "font-black tracking-tighter mb-2 text-foreground",
                                isCasual ? "text-5xl" : "text-4xl"
                            )}>
                                {isCasual ? 'CREATE MAGIC' : 'STUDIO GENERATOR'}
                            </h1>
                            <p className="text-foreground-muted text-sm font-medium uppercase tracking-widest opacity-60">
                                {isCasual ? 'Turn your wildest ideas into reality in seconds.' : 'Professional precision for high-end AI production.'}
                            </p>
                        </section>

                        <PromptSection
                            promptMode={promptMode}
                            setPromptMode={setPromptMode}
                            prompt={prompt}
                            setPrompt={setPrompt}
                            madLibs={madLibs}
                            setMadLibs={setMadLibs}
                            handleEnhancePrompt={handleEnhancePrompt}
                            enhancing={enhancing}
                            isCasual={isCasual}
                            referenceImage={referenceImage}
                            loadingReference={loadingReference}
                            onRemoveReference={() => {
                                setReferenceImage(null);
                                setPromptSetID(generatePromptSetID());
                                router.replace('/generate', { scroll: false });
                            }}
                        />

                        <SettingsSection
                            modality={modality}
                            setModality={setModality}
                            quality={quality}
                            setQuality={setQuality}
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            batchSize={batchSize}
                            setBatchSize={setBatchSize}
                            promptSetID={promptSetID}
                            setPromptSetID={setPromptSetID}
                            onGenerateSetID={() => setPromptSetID(generatePromptSetID())}
                            allowedQualities={allowedQualities}
                            isPro={profile.subscription === 'pro'}
                            isCasual={isCasual}
                        />

                        <AdvancedControls
                            isOpen={isAdvancedOpen}
                            setIsOpen={setIsAdvancedOpen}
                            negativePrompt={negativePrompt}
                            setNegativePrompt={setNegativePrompt}
                            seed={seed}
                            setSeed={setSeed}
                            guidanceScale={guidanceScale}
                            setGuidanceScale={setGuidanceScale}
                            isCasual={isCasual}
                        />

                        {/* Messages */}
                        {(error || warning) && (
                            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                                {error && (
                                    <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-start gap-3">
                                        <Icons.arrowRight className="text-error mt-0.5 rotate-180" size={16} />
                                        <p className="text-xs font-bold text-error leading-relaxed uppercase tracking-tight">{error}</p>
                                    </div>
                                )}
                                {warning && (
                                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                                        <Icons.zap className="text-primary mt-0.5" size={16} />
                                        <p className="text-xs font-bold text-primary leading-relaxed uppercase tracking-tight">{warning}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Generation Action */}
                        <Button
                            onClick={handleGenerate}
                            disabled={generating || availableCredits < currentCost}
                            variant="primary"
                            className="w-full h-16 text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            {generating ? (
                                <div className="flex items-center justify-center gap-3">
                                    <Icons.spinner className="w-6 h-6 animate-spin" />
                                    <span>{modality === 'video' ? 'Synthesizing...' : 'Generating...'}</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-3">
                                    <span>Manifest {modality === 'video' ? 'Video' : (batchSize > 1 ? `Batch of ${batchSize}` : 'Creation')}</span>
                                    <Badge variant="glass" size="sm" className="bg-white/20 ml-2">
                                        {currentCost} <Icons.zap size={8} className="ml-1 inline" />
                                    </Badge>
                                </div>
                            )}
                        </Button>
                    </div>

                    {/* Right: Preview */}
                    <div className="animate-in slide-in-from-right-4 duration-700 delay-200">
                        <PreviewSection
                            generating={generating}
                            generatedImages={generatedImages}
                            selectedImageIndex={selectedImageIndex}
                            setSelectedImageIndex={setSelectedImageIndex}
                            editedImage={editedImage}
                            setEditedImage={setEditedImage}
                            modality={modality}
                            aspectRatio={aspectRatio}
                            generationProgress={generationProgress}
                            onShowTextEditor={() => setShowTextEditor(true)}
                            onDownload={handleDownload}
                        />
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

            <HistorySidebar
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                images={historyImages}
                loading={loadingHistory}
                onRemix={handleRemix}
            />
        </div>
    );
}
