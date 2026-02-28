'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import HistorySidebar from '@/components/generate/HistorySidebar';
import Tooltip from '@/components/Tooltip';
import { normalizeImageData } from '@/lib/image-utils';
import { formatDate } from '@/lib/date-utils';
import { useToast } from '@/components/Toast';
import { GeneratedImage } from '@/lib/types';
import { DNAStrip } from '@/components/generate/DNAViews';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import ImageGroupModal from '@/components/gallery/ImageGroupModal';
import { useSettings, type UserLevel } from '@/lib/context/SettingsContext';

// --- TYPES ---
export type PresentationMode = 'grid-sm' | 'grid-md' | 'grid-lg' | 'list';
export type MediaType = 'image' | 'video';

export interface Modifier {
    id: string;
    category: string;
    value: string;
}

export interface Exemplar {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl?: string;
    subjectBase: string;
    modifiers: Modifier[];
}

export interface GeneratorState {
    mediaType: MediaType;
    quality: 'standard' | 'high' | 'ultra';
    aspectRatio: string;
    batchSize: number;
    promptSetId: string;
    seed?: number;
    guidanceScale?: number;
    negativePrompt?: string;
}

// --- CONSTANTS ---
const MODIFIER_CATEGORIES = [
    {
        id: 'medium',
        label: 'Medium',
        options: ['Photography', 'Oil Painting', '3D Render', 'Watercolor', 'Sketch', 'Digital Illustration', 'Polaroid', 'Anime'],
    },
    {
        id: 'style',
        label: 'Art Style / Vibe',
        options: ['Cyberpunk', 'Fantasy', 'Minimalist', 'Vaporwave', 'Steampunk', 'Surrealism', 'Studio Ghibli', 'Noir'],
    },
    {
        id: 'lighting',
        label: 'Lighting',
        options: ['Cinematic', 'Golden Hour', 'Volumetric Fog', 'Studio Lighting', 'Neon', 'Bioluminescent', 'Harsh Shadows'],
    },
    {
        id: 'camera',
        label: 'Camera & Lens',
        options: ['35mm Lens', 'Macro', 'Drone Shot', 'Fisheye', 'Wide Angle', 'Close-up Portrait', 'Tilt-Shift'],
    },
    {
        id: 'color',
        label: 'Color Palette',
        options: ['High Contrast', 'Muted Tones', 'Pastel', 'Neon Colors', 'Monochromatic', 'Earthy', 'Vibrant'],
    },
    {
        id: 'environment',
        label: 'Environment',
        options: ['Busy Street', 'Underwater', 'Deep Space', 'Overgrown Ruins', 'Cozy Room', 'Abstract Dimension'],
    },
    {
        id: 'magic',
        label: 'Magic Words',
        options: ['Masterpiece', 'Trending on ArtStation', '8k Resolution', 'Unreal Engine 5', 'Award Winning', 'Extremely Detailed'],
    }
];
const CHARACTER_LIMIT = 100;

const MOCK_EXEMPLARS: Exemplar[] = [
    {
        id: 'ex-001',
        title: 'Cyberpunk Portrait',
        description: 'Neon-lit futuristic character.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=500&q=80',
        subjectBase: 'A close-up portrait of a cyborg in a neon-lit futuristic city',
        modifiers: [
            { id: 'm1', category: 'style', value: 'Cyberpunk' },
            { id: 'm2', category: 'lighting', value: 'Neon' },
        ],
    },
    {
        id: 'ex-002',
        title: 'Fantasy Landscape',
        description: 'Epic mountains and castles.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?w=500&q=80',
        subjectBase: 'An epic fantasy landscape with towering ancient castles and floating mountains',
        modifiers: [
            { id: 'm3', category: 'style', value: 'Fantasy' },
            { id: 'm4', category: 'lighting', value: 'Golden Hour' },
        ],
    },
    {
        id: 'ex-003',
        title: 'Minimalist Vector',
        description: 'Clean, flat vector art.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
        subjectBase: 'A serene mountain lake at dawn',
        modifiers: [
            { id: 'm5', category: 'style', value: 'Minimalist' },
            { id: 'm6', category: 'medium', value: 'Digital Illustration' },
        ],
    }
];

function GeneratePageContent() {
    const {
        profile, user, credits, effectiveRole,
        switchRole, setAudienceMode, signOut,
        isAdmin, isSu
    } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showToast } = useToast();
    const lastAppliedExemplarId = useRef<string | null>(null);

    // Top Level State
    const { userLevel, setUserLevel } = useSettings();
    const [showOnboarding, setShowOnboarding] = useState(true);

    // Left panel tab
    const [leftTab, setLeftTab] = useState<'exemplars' | 'current' | 'vault'>('current');



    // Active State
    const [activeExemplarId, setActiveExemplarId] = useState<string | null>(null);
    const [remixImage, setRemixImage] = useState<GeneratedImage | null>(null);
    const [presentationMode, setPresentationMode] = useState<PresentationMode>('grid-md');

    // Customization State
    const [coreSubject, setCoreSubject] = useState<string>('');
    const [promptEditMode, setPromptEditMode] = useState<'subject' | 'full'>('subject');
    const [dnaViewMode, setDnaViewMode] = useState<'subject' | 'full'>('subject');
    const [preflightViewMode, setPreflightViewMode] = useState<'subject' | 'full'>('subject');
    const [activeModifiers, setActiveModifiers] = useState<Modifier[]>([]);
    const [isModifiersOpen, setIsModifiersOpen] = useState(false);
    const [isEngineeringCoreOpen, setIsEngineeringCoreOpen] = useState(false);

    // Generator State
    const [genState, setGenState] = useState<GeneratorState>({
        mediaType: 'image',
        quality: 'standard',
        aspectRatio: '1:1',
        batchSize: 1,
        promptSetId: Date.now().toString(36),
    });

    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[] | null>(null);
    const [generationProgress, setGenerationProgress] = useState<number>(0);
    const [generationMessage, setGenerationMessage] = useState<string>('');
    const [publishingId, setPublishingId] = useState<string | null>(null);

    // AI Weaver State
    const [compiledPrompt, setCompiledPrompt] = useState<string>('');
    const [isCompiling, setIsCompiling] = useState<boolean>(false);
    const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
    const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

    // History Sidebar State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Exemplars State
    const [exemplars, setExemplars] = useState<Exemplar[]>([]);
    const [personalExemplars, setPersonalExemplars] = useState<Exemplar[]>([]);
    const [loadingExemplars, setLoadingExemplars] = useState(true);

    const [focusedImage, setFocusedImage] = useState<GeneratedImage | null>(null);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [viewingVariationsGroup, setViewingVariationsGroup] = useState<GeneratedImage[] | null>(null);

    // Generation abort signals
    const abortControllerRef = useRef<AbortController | null>(null);

    // Read prompt from URL (e.g. coming from onboarding)
    useEffect(() => {
        const promptParam = searchParams.get('prompt');
        if (promptParam) {
            setCoreSubject(promptParam);
        }

        const tabParam = searchParams.get('tab');
        if (tabParam === 'current') {
            setLeftTab('current');
        } else if (tabParam === 'exemplars') {
            setLeftTab('exemplars');
        } else if (tabParam === 'vault') {
            setLeftTab('vault');
        } else if (!tabParam && userLevel) {
            // Adaptive defaults based on User Level
            setLeftTab(userLevel === 'novice' ? 'exemplars' : 'current');
        }

        const exemplarIdParam = searchParams.get('exemplarId');
        if (exemplarIdParam && exemplarIdParam !== lastAppliedExemplarId.current && exemplars.length > 0) {
            const exemplar = exemplars.find(ex => ex.id === exemplarIdParam) ||
                personalExemplars.find(ex => ex.id === exemplarIdParam);
            if (exemplar) {
                handleSelectExemplar(exemplar);
                lastAppliedExemplarId.current = exemplarIdParam;
                setLeftTab('current');
                showToast(`Applying masterpiece settings: ${exemplar.title}`, "success");
            }
        }

        const sidParam = searchParams.get('sid');
        if (sidParam) {
            setGenState(prev => prev.promptSetId !== sidParam ? { ...prev, promptSetId: sidParam } : prev);
        }
    }, [searchParams, exemplars, personalExemplars, showToast, userLevel]);

    const [isResolvingRef, setIsResolvingRef] = useState(false);

    // Resolve ref param for remixing
    useEffect(() => {
        const refParam = searchParams.get('ref');
        if (!refParam || !user || isResolvingRef || remixImage?.id === refParam) return;

        const resolveRef = async () => {
            setIsResolvingRef(true);
            try {
                // First check if it's already in history
                const existing = historyImages.find(img => img.id === refParam);
                if (existing) {
                    // Slight delay to avoid state transition issues if handleRemix isn't ready
                    setTimeout(() => handleRemix(existing), 100);
                    return;
                }

                // If not, fetch it from Firestore
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                const imgRef = doc(db, 'users', user.uid, 'images', refParam);
                const snapshot = await getDoc(imgRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const img = normalizeImageData(data, snapshot.id);
                    handleRemix(img);
                } else {
                    showToast('Image not found.', 'error');
                }
            } catch (err) {
                console.error('Failed to resolve image ref:', err);
            } finally {
                setIsResolvingRef(false);
            }
        };

        resolveRef();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, user, historyImages, remixImage?.id, showToast]);

    // Clear compiled prompt if core inputs change, BUT ONLY if we aren't in manual full edit mode
    useEffect(() => {
        if (promptEditMode === 'subject') {
            setCompiledPrompt('');
        }
    }, [coreSubject, activeModifiers, promptEditMode]);

    // Ensure aspect ratio is not 1:1 if modality is video
    useEffect(() => {
        if (genState.mediaType === 'video' && genState.aspectRatio === '1:1') {
            setGenState(prev => ({ ...prev, aspectRatio: '16:9' }));
        }
    }, [genState.mediaType, genState.aspectRatio]);

    // Live API Call - Image Generation via SSE
    const handleGenerate = async () => {
        if (!displayPrompt || !user) return;

        setIsGenerating(true);
        setGeneratedImages(null);
        setGenerationProgress(0);
        setGenerationMessage('Initializing generation pipeline...');

        try {
            abortControllerRef.current = new AbortController();
            const token = await user.getIdToken();
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    prompt: displayPrompt,
                    quality: genState.quality,
                    aspectRatio: genState.aspectRatio,
                    modality: genState.mediaType,
                    promptType: 'freeform', // bypassing UI-based madlibs logic
                    count: genState.batchSize,
                    promptSetID: genState.promptSetId,
                    seed: userLevel === 'master' ? genState.seed : undefined,
                    guidanceScale: userLevel === 'master' ? genState.guidanceScale : undefined,
                    negativePrompt: userLevel === 'master' ? genState.negativePrompt : undefined,
                    modifiers: activeModifiers.map(m => ({ category: m.category, value: m.value })),
                    coreSubject: coreSubject,
                }),
            });

            if (!res.ok) throw new Error('Live generation failed');

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('Failed to read response stream');

            let done = false;
            let outputs: GeneratedImage[] = [];

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6);
                            if (dataStr.trim() === '[DONE]') continue;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.type === 'error') {
                                    console.error('API Error:', data.error);
                                    setGenerationMessage(`Error: ${data.error}`);
                                    setIsGenerating(false);
                                    // You might want to add a toast here
                                    return;
                                }
                                if (data.type === 'progress') {
                                    setGenerationMessage(data.message || 'Processing batch...');
                                    if (data.total > 0) {
                                        setGenerationProgress((data.current / data.total) * 100);
                                    }
                                }
                                if (data.type === 'image_ready') {
                                    setGenerationMessage(`Batch item ${data.index + 1} finalized.`);
                                }
                                if (data.type === 'complete' && data.images) {
                                    outputs = data.images;
                                }
                            } catch (e) {
                                // Ignore partial JSON chunk parse failures
                            }
                        }
                    }
                }
            }
            if (outputs.length > 0) {
                setGeneratedImages(outputs);
                fetchHistory(); // Refresh history after generation
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Generation cancelled by user');
            } else {
                console.error('Generation Error:', error);
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };

    const handleCancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsGenerating(false);
    };

    const handleCompilePrompt = async () => {
        if (!coreSubject.trim()) return;
        setIsCompiling(true);
        try {
            const res = await fetch('/api/generate/nanobanana', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: coreSubject,
                    modifiers: activeModifiers.map(m => ({ category: m.category, value: m.value })),
                    aspectRatio: genState.aspectRatio,
                    proSettings: {
                        mediaType: genState.mediaType,
                        quality: genState.quality,
                        guidanceScale: genState.guidanceScale,
                        negativePrompt: genState.negativePrompt
                    }
                })
            });
            const data = await res.json();
            if (data.compiledPrompt) {
                setCompiledPrompt(data.compiledPrompt);
                setPromptEditMode('full'); // Automatically show the result in full mode
            } else if (data.error) {
                setCompiledPrompt(`Error: ${data.error}`);
            } else {
                setCompiledPrompt('Error weaving prompt.');
            }
        } catch (e) {
            console.error(e);
            setCompiledPrompt('Error weaving prompt.');
        } finally {
            setIsCompiling(false);
        }
    };

    const handleEnhancePrompt = async () => {
        const textToEnhance = promptEditMode === 'subject' ? coreSubject : (compiledPrompt || rawPromptPreview);
        if (!textToEnhance.trim()) {
            showToast('Enter a prompt to enhance.', 'error');
            return;
        }

        setIsEnhancing(true);
        try {
            const mood = activeModifiers.find(m => m.category === 'mood')?.value;
            const style = activeModifiers.find(m => m.category === 'style')?.value;
            const token = await user?.getIdToken();

            const res = await fetch('/api/generate/enhance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    prompt: textToEnhance,
                    mood,
                    style
                })
            });
            const data = await res.json();
            if (data.success && data.enhanced) {
                if (promptEditMode === 'subject') {
                    setCoreSubject(data.enhanced);
                } else {
                    setCompiledPrompt(data.enhanced);
                }
                showToast('Prompt enhanced magically!', 'success');
            } else if (data.error) {
                showToast(`Error: ${data.error}`, 'error');
            } else {
                showToast('Error enhancing prompt.', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error enhancing prompt.', 'error');
        } finally {
            setIsEnhancing(false);
        }
    };

    // History Retrieval
    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setLoadingHistory(true);
        try {
            const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const imagesRef = collection(db, 'users', user.uid, 'images');
            const q = query(imagesRef, orderBy('createdAt', 'desc'), limit(30));
            const snapshot = await getDocs(q);

            const images = snapshot.docs.map(doc => normalizeImageData(doc.data(), doc.id));
            setHistoryImages(images);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoadingHistory(false);
        }
    }, [user]);

    // Exemplars Retrieval
    const fetchExemplars = useCallback(async () => {
        setLoadingExemplars(true);
        try {
            const { collection, query, where, limit, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const communityRef = collection(db, 'leagueEntries');
            const q = query(communityRef, where('isExemplar', '==', true), limit(20));
            const snapshot = await getDocs(q);

            const fetched = snapshot.docs.map(doc => {
                const data = doc.data();
                // Map settings to modifiers if possible
                let mods: Modifier[] = [];
                if (data.settings?.modifiers) {
                    mods = data.settings.modifiers.map((m: any) => ({
                        id: Math.random().toString(36).substring(7),
                        category: m.category,
                        value: m.value
                    }));
                } else if (data.settings?.madlibsData) {
                    const m = data.settings.madlibsData;
                    if (m.style) mods.push({ id: `s-${doc.id}`, category: 'style', value: m.style });
                    if (m.action) mods.push({ id: `a-${doc.id}`, category: 'action', value: m.action });
                    if (m.mood) mods.push({ id: `m-${doc.id}`, category: 'mood', value: m.mood });
                }

                return {
                    id: doc.id,
                    title: data.authorName ? `${data.authorName}'s Selection` : 'Featured Creation',
                    description: data.prompt?.substring(0, 80) + '...' || 'High quality prompt exemplar.',
                    thumbnailUrl: data.imageUrl,
                    videoUrl: data.videoUrl,
                    subjectBase: data.settings?.coreSubject || data.prompt || '',
                    modifiers: mods
                };
            });

            setExemplars(fetched.length > 0 ? fetched : MOCK_EXEMPLARS);
        } catch (err) {
            console.error('Failed to fetch exemplars:', err);
            setExemplars(MOCK_EXEMPLARS);
        } finally {
            setLoadingExemplars(false);
        }
    }, []);

    const fetchPersonalExemplars = useCallback(async () => {
        if (!user) return;
        try {
            const { collection, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const personalRef = collection(db, 'users', user.uid, 'personalExemplars');
            const snapshot = await getDocs(personalRef);

            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Exemplar));

            setPersonalExemplars(fetched);
        } catch (err) {
            console.error('Failed to fetch personal exemplars:', err);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchHistory();
            fetchPersonalExemplars();
        }
        fetchExemplars();
    }, [user, fetchHistory, fetchExemplars, fetchPersonalExemplars]);

    const handleRemix = (image: GeneratedImage) => {
        setCoreSubject(image.settings?.coreSubject || image.prompt);
        setRemixImage(image);
        setActiveExemplarId(null);
        setLeftTab('current');

        const sid = image.promptSetID || image.settings?.promptSetID;
        if (sid) {
            setGenState(prev => ({ ...prev, promptSetId: sid }));
        }

        // Restore modifiers from settings.modifiers (new system) or madlibsData (old system)
        if (image.settings?.modifiers) {
            setActiveModifiers(image.settings.modifiers.map(m => ({
                id: Math.random().toString(36).substring(7),
                category: m.category,
                value: m.value
            })));
        } else if (image.settings?.madlibsData) {
            const m = image.settings.madlibsData;
            const newModifiers: Modifier[] = [];
            if (m.style) newModifiers.push({ id: Math.random().toString(), category: 'style', value: m.style });
            if (m.action) newModifiers.push({ id: Math.random().toString(), category: 'action', value: m.action });
            if (m.mood) newModifiers.push({ id: Math.random().toString(), category: 'mood', value: m.mood });
            setActiveModifiers(newModifiers);
        } else {
            setActiveModifiers([]);
        }
        setIsHistoryOpen(false);
    };

    const handleSaveTemplate = async () => {
        if (!user || !coreSubject.trim()) return;
        try {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const firstMedia = generatedImages?.[0];
            const template: Omit<Exemplar, 'id'> = {
                title: `${coreSubject.substring(0, 15)}... Template`,
                description: `Custom template with ${activeModifiers.length} modifiers.`,
                thumbnailUrl: firstMedia?.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
                videoUrl: firstMedia?.videoUrl,
                subjectBase: coreSubject,
                modifiers: activeModifiers,
            };

            await addDoc(collection(db, 'users', user.uid, 'personalExemplars'), {
                ...template,
                createdAt: serverTimestamp()
            });

            // Refresh personal list
            fetchPersonalExemplars();
        } catch (err) {
            console.error('Failed to save template:', err);
        }
    };

    const toggleCommunity = async (image: GeneratedImage) => {
        if (!user) return;
        const action = image.publishedToCommunity ? 'unpublish' : 'publish';
        setPublishingId(image.id);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/community/publish/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ imageId: image.id, action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Update local state
            if (generatedImages) {
                setGeneratedImages(prev => prev ? prev.map(img =>
                    img.id === image.id
                        ? { ...img, publishedToCommunity: action === 'publish', communityEntryId: action === 'publish' ? data.communityEntryId : undefined }
                        : img
                ) : null);
            }

            // Also update history
            setHistoryImages(prev => prev.map(img =>
                img.id === image.id
                    ? { ...img, publishedToCommunity: action === 'publish', communityEntryId: action === 'publish' ? data.communityEntryId : undefined }
                    : img
            ));

        } catch (error: any) {
            console.error('Community toggle error:', error);
        } finally {
            setPublishingId(null);
        }
    };

    const handleDownloadMedia = (image: GeneratedImage) => {
        const url = image.videoUrl || image.imageUrl;
        if (!url) return;
        const filename = `studio-${image.id}.${image.videoUrl ? 'mp4' : 'png'}`;
        const proxyUrl = `/api/download/?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

        const link = document.createElement('a');
        link.href = proxyUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const MediaPreview = ({ image }: { image: GeneratedImage }) => {
        const isVideo = !!(image.videoUrl || image.settings?.modality === 'video' || (image.imageUrl && /\.(mp4|webm|mov)(\?|$)/i.test(image.imageUrl)));
        const imgIsVideo = !!(image.imageUrl && /\.(mp4|webm|mov)(\?|$)/i.test(image.imageUrl));
        const hasThumbnail = isVideo && !imgIsVideo;
        const videoSrc = (image.videoUrl || image.imageUrl || '');
        const videoSrcWithTime = videoSrc.includes('#t=') ? videoSrc : `${videoSrc}#t=0.1`;
        const isPublishing = publishingId === image.id;

        const overlay = (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover/media:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 z-30">
                <div className="flex gap-2">
                    <Tooltip content="Remix this prompt">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRemix(image); }}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary hover:scale-110 transition-all flex items-center justify-center border border-white/20"
                        >
                            <Icons.history size={18} className="text-white" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Download file">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadMedia(image); }}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-blue-500 hover:scale-110 transition-all flex items-center justify-center border border-white/20"
                        >
                            <Icons.download size={18} className="text-white" />
                        </button>
                    </Tooltip>
                    <Tooltip content={image.publishedToCommunity ? "Unpublish from library" : "Publish to Community League"}>
                        <button
                            disabled={isPublishing}
                            onClick={(e) => { e.stopPropagation(); toggleCommunity(image); }}
                            className={`w-10 h-10 rounded-full transition-all flex items-center justify-center border border-white/20 ${isPublishing ? 'opacity-50' : 'hover:scale-110'} ${image.publishedToCommunity ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-green-500'}`}
                        >
                            {isPublishing ? (
                                <Icons.loader size={18} className="animate-spin" />
                            ) : (
                                <Icons.star size={18} className={image.publishedToCommunity ? 'text-black' : 'text-white'} />
                            )}
                        </button>
                    </Tooltip>
                </div>
                {image.publishedToCommunity && (
                    <Badge className="bg-yellow-500 text-black font-black text-[8px] uppercase tracking-widest">Published</Badge>
                )}
            </div>
        );

        if (isVideo) {
            return (
                <div
                    className="relative w-full h-full group/media bg-black"
                    onMouseEnter={(e) => {
                        const video = e.currentTarget.querySelector('video');
                        if (video && video.paused) video.play().catch(() => { });
                    }}
                    onMouseLeave={(e) => {
                        const video = e.currentTarget.querySelector('video');
                        if (video) {
                            video.pause();
                            video.currentTime = 0.1;
                        }
                    }}
                >
                    {overlay}
                    {hasThumbnail ? (
                        <>
                            {!imgIsVideo && (
                                <img
                                    src={image.imageUrl}
                                    alt={image.prompt}
                                    className="w-full h-full object-cover group-hover/media:opacity-0 transition-opacity duration-500"
                                />
                            )}
                            <video
                                src={videoSrcWithTime}
                                className={`absolute inset-0 w-full h-full object-cover ${!imgIsVideo ? 'opacity-0 group-hover/media:opacity-100 transition-opacity duration-300' : ''}`}
                                loop
                                muted
                                playsInline
                                preload="metadata"
                            />
                        </>
                    ) : (
                        <video
                            src={videoSrcWithTime}
                            className="w-full h-full object-cover"
                            loop
                            muted
                            playsInline
                            preload="metadata"
                        />
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg text-white shadow-lg border border-white/10 z-20 pointer-events-none group-hover/media:opacity-0 transition-opacity">
                        <Icons.video size={14} className="text-white" />
                    </div>
                </div>
            );
        }

        return (
            <div className="relative w-full h-full group/media bg-black overflow-hidden">
                {overlay}
                <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="w-full h-full object-cover group-hover/media:scale-110 transition-transform duration-700"
                />
            </div>
        );
    };

    // Correctly initialize onboarding state based on presence of userLevel in storage
    useEffect(() => {
        const stored = localStorage.getItem('pskill_userLevel');
        if (!stored) {
            setShowOnboarding(true);
        } else {
            setShowOnboarding(false);
        }
    }, []);

    const handleSelectLevel = (level: UserLevel) => {
        setUserLevel(level);
        setShowOnboarding(false);

        // Auto-open modifiers if they are Journeyman/Master
        if (level !== 'novice') {
            setIsModifiersOpen(true);
        } else {
            setIsModifiersOpen(false);
        }
    };

    const handleSelectExemplar = (ex: Exemplar) => {
        setRemixImage(null);
        setActiveExemplarId(ex.id);
        setCoreSubject(ex.subjectBase);
        setActiveModifiers([...ex.modifiers]);
        setLeftTab('current');
    };

    const handleClearExemplar = () => {
        setRemixImage(null);
        setActiveExemplarId(null);
        setCoreSubject('');
        setActiveModifiers([]);
    };

    const handleToggleModifier = (category: string, value: string) => {
        setActiveModifiers(prev => {
            const exists = prev.find((m: Modifier) => m.value === value);
            if (exists) return prev.filter((m: Modifier) => m.id !== exists.id);
            return [...prev, { id: Date.now().toString(), category, value }];
        });
    };

    // Live raw preview
    const rawPromptPreview = `${coreSubject ? coreSubject + (activeModifiers.length > 0 ? ', ' : '') : ''}${activeModifiers.map(m => m.value).join(', ')}`;
    const displayPrompt = compiledPrompt || rawPromptPreview;

    // Conditionals
    const canStartFromScratch = userLevel === 'journeyman' || userLevel === 'master';
    const showProSettings = userLevel === 'journeyman' || userLevel === 'master';
    const availableCredits = (credits?.balance || 0) + Math.max(0, (credits?.dailyAllowance || 0) - (credits?.dailyAllowanceUsed || 0));

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-hidden">
            <DashboardHeader
                user={user}
                profile={profile}
                credits={credits}
                availableCredits={availableCredits || 0}
                isAdminOrSu={isAdmin || isSu}
                effectiveRole={effectiveRole}
                switchRole={switchRole}
                setAudienceMode={setAudienceMode}
                signOut={signOut}
                onHistoryOpen={() => setIsHistoryOpen(true)}
            />

            <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">

                {/* --- ONBOARDING MODAL --- */}
                <AnimatePresence>
                    {showOnboarding && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="bg-background-secondary border border-border shadow-2xl rounded-3xl p-8 max-w-4xl w-full"
                            >
                                <div className="text-center mb-10">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4 text-3xl">
                                        🪄
                                    </div>
                                    <h1 className="text-3xl font-black mb-2 tracking-tight">How experienced are you with Prompting?</h1>
                                    <p className="text-foreground-muted">We will tailor the interface to match your workflow.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Novice */}
                                    <Card
                                        className={`p-6 cursor-pointer transition-all duration-300 group overflow-hidden relative ${userLevel === 'novice' ? 'border-primary shadow-xl shadow-primary/20 bg-background hover:-translate-y-1' : 'hover:border-primary/50 bg-background/50 hover:bg-background hover:-translate-y-1'}`}
                                        onClick={() => handleSelectLevel('novice')}
                                    >
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Novice</h3>
                                        <p className="text-sm text-foreground-muted mb-4">I want a simple, guided experience using templates. No complex settings.</p>
                                        <Badge variant="outline" className="text-xs">Guided Experience</Badge>
                                    </Card>

                                    {/* Journeyman */}
                                    <Card
                                        className={`p-6 cursor-pointer transition-all duration-300 group overflow-hidden relative ${userLevel === 'journeyman' ? 'border-blue-500 shadow-xl shadow-blue-500/20 bg-blue-500/5 hover:-translate-y-1' : 'hover:border-blue-500/50 bg-background/50 hover:bg-background hover:-translate-y-1'}`}
                                        onClick={() => handleSelectLevel('journeyman')}
                                    >
                                        {userLevel === 'journeyman' && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50" />}
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Journeyman</h3>
                                        <p className="text-sm text-foreground-muted mb-4">I know the basics, but I like starting from templates before customizing.</p>
                                        <Badge variant={userLevel === 'journeyman' ? "gradient" : "outline"} className={`text-xs ${userLevel === 'journeyman' ? 'text-primary bg-primary/10 border-primary/20' : 'border-blue-500/30 text-blue-400'}`}>Standard Workflow</Badge>
                                    </Card>

                                    {/* Master */}
                                    <Card
                                        className={`p-6 cursor-pointer transition-all duration-300 group overflow-hidden relative ${userLevel === 'master' ? 'border-purple-500 shadow-xl shadow-purple-500/20 bg-purple-500/5 hover:-translate-y-1' : 'hover:border-purple-500/50 bg-background/50 hover:bg-background hover:-translate-y-1'}`}
                                        onClick={() => handleSelectLevel('master')}
                                    >
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">Master</h3>
                                        <p className="text-sm text-foreground-muted mb-4">Give me the absolute full control panel. I know exactly what I am doing.</p>
                                        <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">High Density</Badge>
                                    </Card>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- MAIN APP UI --- */}
                {userLevel && !showOnboarding && (
                    <>
                        {/* LEFT PANE: BUILDER */}
                        <div className="w-full md:w-1/2 lg:w-3/5 border-r border-border h-screen overflow-y-auto relative">
                            {/* Builder Header */}
                            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border/50 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🪄</span>
                                    <h1 className="text-sm font-black tracking-widest uppercase">Studio Generator</h1>
                                    <Badge variant="gradient" className="text-[9px] uppercase tracking-widest">PRO V2</Badge>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 gap-2 border border-transparent hover:border-white/5 transition-all"
                                        onClick={() => setIsHistoryOpen(true)}
                                    >
                                        <Icons.history size={14} />
                                        History
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/5 gap-2 bg-primary/5 border border-primary/20 rounded-xl transition-all"
                                        onClick={() => setShowOnboarding(true)}
                                    >
                                        Mode: {userLevel} <Icons.settings size={12} className="ml-1" />
                                    </Button>
                                </div>
                            </div>

                            {/* Main Tabs */}
                            <div className="border-b border-white/5 sticky top-[65px] bg-black/80 backdrop-blur-xl z-[45] px-6 py-4">
                                <div className="flex bg-black/40 rounded-[14px] p-1 border border-white/5 shadow-inner backdrop-blur-md w-fit mx-auto">
                                    {[
                                        { id: 'current', label: '1. Designer', icon: Icons.wand },
                                        { id: 'exemplars', label: '2. Templates', icon: Icons.image },
                                        { id: 'vault', label: '3. Neural Vault', icon: Icons.history }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setLeftTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${leftTab === tab.id
                                                ? "bg-primary/20 text-primary shadow-sm"
                                                : "text-white/40 hover:text-white"
                                                }`}
                                        >
                                            <tab.icon size={14} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8">
                                {leftTab === 'vault' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                                                    {userLevel === 'novice' ? 'Your Visual Journey' : 'Neural Vault'}
                                                </h3>
                                                <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-1">
                                                    {userLevel === 'novice' ? 'A gallery of your previous creative milestones.' : 'Accessing your personal generation archives.'}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push('/gallery')}
                                                className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:text-white"
                                            >
                                                Full Gallery <Icons.arrowRight size={10} className="ml-2" />
                                            </Button>
                                        </div>

                                        {loadingHistory ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                                <Icons.spinner size={32} className="text-primary animate-spin" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Syncing with Archives...</p>
                                            </div>
                                        ) : historyImages.length === 0 ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-6 border-2 border-dashed border-white/5 rounded-[32px] bg-white/[0.02]">
                                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/10">
                                                    <Icons.history size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-black uppercase tracking-widest text-white mb-2">Vault is Empty</p>
                                                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/20">Your journey begins with the first generation.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                {historyImages.map((img) => {
                                                    const isVideo = !!(img.settings?.modality === 'video' || img.videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(img.imageUrl));
                                                    const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(img.imageUrl);
                                                    const hasThumbnail = isVideo && !imgIsVideo;
                                                    const videoSrc = (img.videoUrl || img.imageUrl);
                                                    const videoSrcWithTime = videoSrc?.includes('#t=') ? videoSrc : `${videoSrc}#t=0.1`;

                                                    return (
                                                        <div
                                                            key={img.id}
                                                            onClick={() => handleRemix(img)}
                                                            className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/40 cursor-pointer hover:border-primary/50 transition-all duration-500 shadow-lg hover:shadow-primary/20 group/media"
                                                        >
                                                            {isVideo ? (
                                                                <>
                                                                    {hasThumbnail ? (
                                                                        <img src={img.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 group-hover/media:opacity-0" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-black/40 flex items-center justify-center">
                                                                            <Icons.video size={24} className="text-white/20" />
                                                                        </div>
                                                                    )}
                                                                    <video
                                                                        src={videoSrcWithTime}
                                                                        className={cn(
                                                                            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                                                                            hasThumbnail ? "opacity-0 group-hover/media:opacity-100" : "opacity-100"
                                                                        )}
                                                                        loop
                                                                        muted
                                                                        playsInline
                                                                        preload="metadata"
                                                                        onMouseEnter={(e) => { e.currentTarget.play().catch(() => { }) }}
                                                                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
                                                                    />
                                                                    <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-lg">
                                                                        <Icons.video size={10} className="text-white" />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <img src={img.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                                <p className="text-[9px] text-white/90 line-clamp-2 font-medium italic">&quot;{img.prompt}&quot;</p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-primary text-white text-[8px] font-black uppercase">Load</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {leftTab === 'exemplars' && (
                                    <section>
                                        <div className="flex items-end justify-between mb-8">
                                            <div>
                                                <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-none">
                                                    {userLevel === 'novice' ? 'STYLE GUIDES (select one)' : '1. Source Reference'}
                                                </h2>
                                                <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-3">
                                                    {userLevel === 'novice' ? 'Pick a visual direction to start your journey.' : 'Select a masterpiece as your creative anchor.'}
                                                </p>
                                            </div>
                                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner backdrop-blur-sm">
                                                {[
                                                    { id: 'grid-sm', label: 'S' },
                                                    { id: 'grid-md', label: 'M' },
                                                    { id: 'grid-lg', label: 'L' },
                                                    { id: 'list', label: 'LIST' }
                                                ].map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setPresentationMode(tab.id as PresentationMode)}
                                                        className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all duration-300 ${presentationMode === tab.id ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"}`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* "Start From Scratch" Button (Journeyman/Master) */}
                                        {canStartFromScratch && (
                                            <div className="mb-4 flex justify-end">
                                                <Button
                                                    variant={activeExemplarId === null ? 'primary' : 'outline'}
                                                    size="sm"
                                                    className="text-xs"
                                                    onClick={handleClearExemplar}
                                                >
                                                    <Icons.plus size={14} className="mr-2" /> Start from Scratch
                                                </Button>
                                            </div>
                                        )}

                                        {/* Merge Personal Exemplars */}
                                        {(() => {
                                            const combinedExemplars = [...personalExemplars, ...exemplars];
                                            if (combinedExemplars.length === 0 && !loadingExemplars) {
                                                return <div className="italic text-[10px] text-foreground-muted opacity-50 p-4">No templates found in this view.</div>;
                                            }

                                            return (
                                                <>
                                                    {/* Grid Modes (SM, MD, LG) */}
                                                    {presentationMode.startsWith('grid-') && (
                                                        <div className={`grid gap-4 ${presentationMode === 'grid-sm'
                                                            ? 'grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
                                                            : presentationMode === 'grid-md'
                                                                ? 'grid-cols-3 md:grid-cols-4'
                                                                : 'grid-cols-2 md:grid-cols-3'
                                                            }`}>
                                                            {loadingExemplars ? (
                                                                Array.from({ length: 6 }).map((_, i) => (
                                                                    <div key={i} className="rounded-xl aspect-square bg-white/5 animate-pulse" />
                                                                ))
                                                            ) : (
                                                                combinedExemplars.map((ex, idx) => {
                                                                    const isVideo = !!(ex.videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(ex.thumbnailUrl));
                                                                    const isPersonal = personalExemplars.some(p => p.id === ex.id);
                                                                    const hasValidImageThumbnail = !!ex.thumbnailUrl && !/\.(mp4|webm|mov)(\?|$)/i.test(ex.thumbnailUrl);
                                                                    const videoSrc = ex.videoUrl || ex.thumbnailUrl;
                                                                    const videoSrcWithTime = videoSrc?.includes('#t=') ? videoSrc : `${videoSrc}#t=0.1`;

                                                                    return (
                                                                        <div
                                                                            key={ex.id}
                                                                            id={idx === 1 ? 'tour-exemplar-2' : undefined}
                                                                            onClick={() => handleSelectExemplar(ex)}
                                                                            className={`relative rounded-xl overflow-hidden cursor-pointer group border-2 transition-all aspect-square ${activeExemplarId === ex.id ? 'border-primary shadow-xl shadow-primary/20 z-10' : 'border-transparent hover:border-white/20'}`}
                                                                        >
                                                                            <div className="w-full h-full relative group/media bg-black">
                                                                                {isVideo ? (
                                                                                    <>
                                                                                        {hasValidImageThumbnail && (
                                                                                            <img
                                                                                                src={ex.thumbnailUrl}
                                                                                                alt={ex.title}
                                                                                                className="w-full h-full object-cover group-hover/media:opacity-0 transition-opacity duration-500"
                                                                                            />
                                                                                        )}
                                                                                        <video
                                                                                            src={videoSrcWithTime}
                                                                                            className={`absolute inset-0 w-full h-full object-cover ${hasValidImageThumbnail ? 'opacity-0 group-hover/media:opacity-100 transition-opacity duration-300' : ''}`}
                                                                                            loop
                                                                                            muted
                                                                                            playsInline
                                                                                            preload="metadata"
                                                                                            onMouseEnter={(e) => { e.currentTarget.play().catch(() => { }) }}
                                                                                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
                                                                                        />
                                                                                        <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm p-1 rounded-lg text-white z-20 pointer-events-none">
                                                                                            <Icons.video size={8} className="text-white" />
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <img src={ex.thumbnailUrl} alt={ex.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                                                )}

                                                                                {presentationMode !== 'grid-sm' && (
                                                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pb-2 z-10">
                                                                                        <p className="font-bold text-[10px] md:text-sm text-white truncate">
                                                                                            {userLevel === 'novice' && ex.title.includes('Selection') ? 'Featured Creation' : ex.title}
                                                                                        </p>
                                                                                        {presentationMode === 'grid-lg' && (
                                                                                            <p className="text-[10px] text-white/50 truncate uppercase tracking-widest">{ex.modifiers.length} modifiers</p>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {activeExemplarId === ex.id && (
                                                                                    <div className="absolute top-2 left-2 bg-primary text-white rounded-full p-1 z-20 shadow-lg scale-75 md:scale-100">
                                                                                        <Icons.check size={14} />
                                                                                    </div>
                                                                                )}

                                                                                {isPersonal && (
                                                                                    <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-0.5 rounded-full z-20 shadow-lg text-[8px] font-black uppercase tracking-tighter">
                                                                                        Personal
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )
                                                            }
                                                        </div>
                                                    )}

                                                    {/* List Mode */}
                                                    {presentationMode === 'list' && (
                                                        <div className="space-y-3">
                                                            {loadingExemplars ? (
                                                                Array.from({ length: 4 }).map((_, i) => (
                                                                    <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                                                                ))
                                                            ) : (
                                                                combinedExemplars.map((ex, idx) => {
                                                                    const isVideo = !!(ex.videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(ex.thumbnailUrl));
                                                                    const isPersonal = personalExemplars.some(p => p.id === ex.id);
                                                                    const hasValidImageThumbnail = !!ex.thumbnailUrl && !/\.(mp4|webm|mov)(\?|$)/i.test(ex.thumbnailUrl);
                                                                    const videoSrc = ex.videoUrl || ex.thumbnailUrl;
                                                                    const videoSrcWithTime = videoSrc?.includes('#t=') ? videoSrc : `${videoSrc}#t=0.1`;

                                                                    return (
                                                                        <div
                                                                            key={ex.id}
                                                                            id={idx === 1 ? 'tour-exemplar-2-list' : undefined}
                                                                            onClick={() => handleSelectExemplar(ex)}
                                                                            className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all cursor-pointer ${activeExemplarId === ex.id ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' : 'border-border bg-background-secondary hover:border-primary/40'}`}
                                                                        >
                                                                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black relative group/media">
                                                                                {isVideo ? (
                                                                                    <>
                                                                                        {hasValidImageThumbnail && (
                                                                                            <img
                                                                                                src={ex.thumbnailUrl}
                                                                                                alt=""
                                                                                                className="w-full h-full object-cover group-hover/media:opacity-0 transition-opacity duration-500"
                                                                                            />
                                                                                        )}
                                                                                        <video
                                                                                            src={videoSrcWithTime}
                                                                                            className={`absolute inset-0 w-full h-full object-cover ${hasValidImageThumbnail ? 'opacity-0 group-hover/media:opacity-100 transition-opacity duration-300' : ''}`}
                                                                                            muted
                                                                                            playsInline
                                                                                            preload="metadata"
                                                                                            onMouseEnter={(e) => { e.currentTarget.play().catch(() => { }) }}
                                                                                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
                                                                                        />
                                                                                        <div className="absolute top-1 right-1 z-10">
                                                                                            <Icons.video size={10} className="text-white" />
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <img src={ex.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center">
                                                                                    <h3 className="font-bold text-sm mb-0.5">
                                                                                        {userLevel === 'novice' && ex.title.includes('Selection') ? 'Featured Creation' : ex.title}
                                                                                    </h3>
                                                                                    {isPersonal && (
                                                                                        <Badge className="ml-2 bg-purple-600/20 text-purple-400 border-purple-500/20 text-[8px]">Personal</Badge>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-xs text-foreground-muted truncate mb-2">{ex.description}</p>
                                                                                <div className="flex gap-1">
                                                                                    {ex.modifiers.slice(0, 3).map(m => (
                                                                                        <span key={m.id} className="text-[8px] uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded-sm border border-white/5">{m.value}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            {activeExemplarId === ex.id && (
                                                                                <div className="bg-primary text-white rounded-full p-1 h-8 w-8 flex items-center justify-center shadow-lg">
                                                                                    <Icons.check size={16} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            )
                                                            }
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </section>
                                )}

                                {leftTab === 'current' && (
                                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center gap-4 mb-10">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                                <Icons.wand size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-none">
                                                    {userLevel === 'novice' ? 'Creation Workspace' : 'Studio Configuration'}
                                                </h2>
                                                <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-3">
                                                    {userLevel === 'novice' ? 'Refine your prompt and add modifiers.' : 'Synthesizing architectural DNA for your masterpiece.'}
                                                </p>
                                            </div>
                                        </div>

                                        {(() => {
                                            const activeExemplar = [...personalExemplars, ...exemplars].find(ex => ex.id === activeExemplarId);
                                            const displayImage = remixImage || activeExemplar;

                                            if (!displayImage) {
                                                return (
                                                    <div className="flex flex-col items-center justify-center py-24 text-center border border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm relative overflow-hidden group">
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none" />
                                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:border-primary/30 transition-all duration-500">
                                                            <Icons.plus size={32} className="text-white/20 group-hover:text-primary transition-colors duration-500" />
                                                        </div>
                                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white mb-2">Workspace Initialized</h3>
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 max-w-xs mb-8 leading-relaxed">
                                                            Awaiting architectural input. Select an anchor reference or begin a manual synthesis.
                                                        </p>
                                                        <Button variant="outline" size="sm" onClick={() => setLeftTab('exemplars')} className="mb-0 rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6 border-white/10 hover:border-primary/30 transition-all">
                                                            Browse Masterpieces
                                                        </Button>

                                                        <div className="w-full max-w-2xl px-6 mt-12">
                                                            <div className={`p-8 rounded-2xl transition-all duration-500 backdrop-blur-md border ${promptEditMode === 'full' ? 'border-purple-500/30 bg-purple-500/10 shadow-[0_0_40px_rgba(168,85,247,0.15)]' : 'border-white/10 bg-white/5 shadow-2xl'}`}>
                                                                <div className="flex items-center justify-between mb-6">
                                                                    <div className="flex items-center gap-2">
                                                                        <label className={`text-[10px] font-black uppercase tracking-widest transition-colors ${promptEditMode === 'full' ? 'text-purple-400' : 'text-primary'}`}>
                                                                            {promptEditMode === 'subject'
                                                                                ? (userLevel === 'novice' ? 'Artistic Subject' : 'Core Synthesis')
                                                                                : (userLevel === 'novice' ? 'Advanced Prompt' : 'Woven DNA')}
                                                                        </label>
                                                                        {promptEditMode === 'full' && (
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 bg-purple-500/10 px-2 py-0.5 rounded">MOD_FULL</span>
                                                                        )}
                                                                    </div>
                                                                    {userLevel !== 'novice' && (
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex bg-black/40 p-1 rounded-[14px] border border-white/5">
                                                                                <button
                                                                                    onClick={() => setPromptEditMode('subject')}
                                                                                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${promptEditMode === 'subject' ? 'bg-primary/20 text-primary shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                                                >
                                                                                    Partial
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (promptEditMode === 'subject' && !compiledPrompt) {
                                                                                            setCompiledPrompt(rawPromptPreview);
                                                                                        }
                                                                                        setPromptEditMode('full');
                                                                                    }}
                                                                                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${promptEditMode === 'full' ? 'bg-purple-600/20 text-purple-400 shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                                                >
                                                                                    Full
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {promptEditMode === 'subject' ? (
                                                                    <input
                                                                        id="prompt-input-empty"
                                                                        type="text"
                                                                        value={coreSubject}
                                                                        onChange={(e) => setCoreSubject(e.target.value)}
                                                                        placeholder="Define your mental image..."
                                                                        className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm font-medium placeholder:text-white/10"
                                                                    />
                                                                ) : (
                                                                    <textarea
                                                                        id="prompt-input-empty"
                                                                        ref={(el) => {
                                                                            if (el) {
                                                                                el.style.height = 'auto';
                                                                                el.style.height = Math.min(el.scrollHeight, 400) + 'px';
                                                                            }
                                                                        }}
                                                                        value={compiledPrompt || rawPromptPreview}
                                                                        onChange={(e) => {
                                                                            setCompiledPrompt(e.target.value);
                                                                            const el = e.target;
                                                                            el.style.height = 'auto';
                                                                            el.style.height = Math.min(el.scrollHeight, 400) + 'px';
                                                                        }}
                                                                        placeholder="Refining the synthesized output..."
                                                                        rows={2}
                                                                        style={{ maxHeight: '400px' }}
                                                                        className="w-full px-5 py-4 rounded-xl bg-black/40 border border-purple-500/30 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all text-sm font-medium italic resize-none custom-scrollbar overflow-y-auto placeholder:text-purple-500/20"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="w-full max-w-2xl px-6">
                                                            <Card id="tour-modifiers-empty" className="border-border bg-background pt-0">
                                                                <DNAStrip
                                                                    activeModifiers={activeModifiers}
                                                                    coreSubject={coreSubject}
                                                                    onRemoveModifier={handleToggleModifier}
                                                                    userLevel={userLevel}
                                                                />

                                                                <div
                                                                    className={`flex items-center justify-between p-4 px-6 cursor-pointer hover:bg-white/5 transition-colors ${isModifiersOpen ? 'border-b border-border/50' : ''}`}
                                                                    onClick={() => setIsModifiersOpen(!isModifiersOpen)}
                                                                >
                                                                    <div className="flex items-center gap-2 text-sm font-bold">
                                                                        {userLevel === 'novice' ? 'Style Modifiers' : 'The Modifiers Core'}
                                                                        <span className="text-foreground-muted font-normal uppercase tracking-widest text-[10px] ml-2">
                                                                            ({activeModifiers.length} Active)
                                                                        </span>
                                                                    </div>
                                                                    {isModifiersOpen ? <Icons.chevronUp className="w-4 h-4 text-foreground-muted" /> : <Icons.chevronDown className="w-4 h-4 text-foreground-muted" />}
                                                                </div>

                                                                {isModifiersOpen && (
                                                                    <div className="p-6 space-y-6 bg-background-secondary/30">
                                                                        {MODIFIER_CATEGORIES.map(cat => (
                                                                            <div key={cat.id}>
                                                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-3 flex justify-between">
                                                                                    <span>{cat.label}</span>
                                                                                    {activeModifiers.some(m => m.category === cat.id) && <Icons.check size={12} className="text-primary" />}
                                                                                </h3>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {cat.options.map(opt => {
                                                                                        const isActive = activeModifiers.some(m => m.value === opt);
                                                                                        return (
                                                                                            <button
                                                                                                key={opt}
                                                                                                onClick={() => handleToggleModifier(cat.id, opt)}
                                                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isActive ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20" : "border-border bg-background text-foreground-muted hover:border-primary/30"}`}
                                                                                            >
                                                                                                {opt}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </Card>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Determine if it's an exemplar or a generated image
                                            const isExemplar = !!activeExemplar;
                                            const title = isExemplar ? (activeExemplar as Exemplar).title : "Remix Target";
                                            const description = isExemplar ? (activeExemplar as Exemplar).description : "You are currently iterating on a previous generation.";

                                            // Handle media
                                            const mediaUrl = isExemplar ? (activeExemplar as Exemplar).thumbnailUrl : (remixImage as GeneratedImage).imageUrl;
                                            const videoUrl = isExemplar ? (activeExemplar as Exemplar).videoUrl : (remixImage as GeneratedImage).videoUrl;
                                            const isVideo = !!(videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl));

                                            return (
                                                <div className="space-y-8">
                                                    {/* Media Insight */}
                                                    <div className="overflow-hidden border border-white/10 bg-white/5 shadow-2xl rounded-3xl backdrop-blur-md">
                                                        <div className="aspect-video relative bg-black group/current">
                                                            {isVideo ? (
                                                                <>
                                                                    {/(\.(mp4|webm|mov)(\?|$))/i.test(mediaUrl || '') ? (
                                                                        <video
                                                                            src={`${mediaUrl}#t=0.1`}
                                                                            className="w-full h-full object-contain"
                                                                            preload="metadata"
                                                                            muted
                                                                            playsInline
                                                                        />
                                                                    ) : (
                                                                        <img
                                                                            src={mediaUrl}
                                                                            alt={title}
                                                                            className="w-full h-full object-contain"
                                                                        />
                                                                    )}
                                                                    <video
                                                                        src={videoUrl || mediaUrl}
                                                                        className="absolute inset-0 w-full h-full object-contain z-20 opacity-0 group-hover/current:opacity-100 transition-opacity duration-300"
                                                                        loop
                                                                        muted
                                                                        playsInline
                                                                        preload="metadata"
                                                                        onMouseEnter={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => { }); }}
                                                                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                                                    />
                                                                </>
                                                            ) : (
                                                                <img
                                                                    src={mediaUrl}
                                                                    alt={title}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            )}
                                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <h3 className="text-2xl font-black uppercase tracking-widest text-white leading-none">
                                                                            {userLevel === 'novice' && title.includes('Selection') ? 'Featured Creation' : title}
                                                                        </h3>
                                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-3 font-mono">
                                                                            {userLevel === 'novice' ? 'REFERENCE PATTERN' : 'DNA_REF'}: {activeExemplarId || (remixImage as GeneratedImage).id}
                                                                        </p>
                                                                    </div>
                                                                    {isExemplar ? (
                                                                        personalExemplars.some(p => p.id === activeExemplarId) && (
                                                                            <Badge className="bg-purple-600/20 text-purple-400 border-purple-400/20 rounded-lg text-[10px] items-center px-3 py-1 uppercase tracking-widest">Personal Masterpiece</Badge>
                                                                        )
                                                                    ) : (
                                                                        <Badge className="bg-primary/20 text-primary border-primary/20 rounded-lg text-[10px] items-center px-3 py-1 uppercase tracking-widest">Remix History</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-10">
                                                            <p className="text-[13px] text-white/50 leading-relaxed font-medium uppercase tracking-widest mb-10">{description}</p>

                                                            <div className="mb-12">
                                                                <div className={`p-8 rounded-3xl transition-all duration-500 backdrop-blur-md border ${promptEditMode === 'full' ? 'border-purple-500/30 bg-purple-500/10 shadow-[0_0_40px_rgba(168,85,247,0.15)]' : 'border-white/10 bg-white/10 shadow-inner'}`}>
                                                                    <div className="flex items-center justify-between mb-6">
                                                                        <div className="flex items-center gap-2">
                                                                            <label className={`text-[10px] font-black uppercase tracking-widest transition-colors ${promptEditMode === 'full' ? 'text-purple-400' : 'text-primary'}`}>
                                                                                {userLevel === 'novice'
                                                                                    ? (promptEditMode === 'subject' ? 'Creative Subject' : 'Advanced Composition')
                                                                                    : (promptEditMode === 'subject' ? 'Core Synthesis' : 'Woven DNA Structure')}
                                                                            </label>
                                                                            {promptEditMode === 'full' && (
                                                                                <span className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 bg-purple-500/10 px-2 py-0.5 rounded">DNA_FULL</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                onClick={handleCompilePrompt}
                                                                                disabled={isCompiling || !coreSubject.trim()}
                                                                                className="h-9 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white hover:bg-primary/20 border border-primary/20 rounded-xl px-4"
                                                                            >
                                                                                {isCompiling ? (
                                                                                    <><Icons.spinner className="w-3 h-3 mr-2 animate-spin" /> Weaving</>
                                                                                ) : (
                                                                                    <><Icons.wand className="w-3 h-3 mr-2" /> Weave</>
                                                                                )}
                                                                            </Button>
                                                                            <div className="flex bg-black/40 p-1 rounded-[14px] border border-white/5 mx-2">
                                                                                <button
                                                                                    onClick={() => setPromptEditMode('subject')}
                                                                                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${promptEditMode === 'subject' ? 'bg-primary/20 text-primary shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                                                >
                                                                                    Partial
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (promptEditMode === 'subject' && !compiledPrompt) {
                                                                                            setCompiledPrompt(rawPromptPreview);
                                                                                        }
                                                                                        setPromptEditMode('full');
                                                                                    }}
                                                                                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${promptEditMode === 'full' ? 'bg-purple-600/20 text-purple-400 shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                                                >
                                                                                    Full
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {promptEditMode === 'subject' ? (
                                                                        <input
                                                                            id="prompt-input"
                                                                            type="text"
                                                                            value={coreSubject}
                                                                            onChange={(e) => setCoreSubject(e.target.value)}
                                                                            placeholder="Define your mental image..."
                                                                            className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm font-medium placeholder:text-white/10"
                                                                        />
                                                                    ) : (
                                                                        <textarea
                                                                            id="prompt-input"
                                                                            ref={(el) => {
                                                                                if (el) {
                                                                                    el.style.height = 'auto';
                                                                                    el.style.height = Math.min(el.scrollHeight, 400) + 'px';
                                                                                }
                                                                            }}
                                                                            value={compiledPrompt || rawPromptPreview}
                                                                            onChange={(e) => {
                                                                                setCompiledPrompt(e.target.value);
                                                                                const el = e.target;
                                                                                el.style.height = 'auto';
                                                                                el.style.height = Math.min(el.scrollHeight, 400) + 'px';
                                                                            }}
                                                                            placeholder="Refining the synthesized output..."
                                                                            rows={2}
                                                                            style={{ maxHeight: '400px' }}
                                                                            className="w-full px-5 py-4 rounded-xl bg-black/40 border border-purple-500/30 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all text-sm font-medium italic resize-none custom-scrollbar overflow-y-auto placeholder:text-purple-500/20"
                                                                        />
                                                                    )}

                                                                    {promptEditMode === 'full' && (
                                                                        <div className="mt-4 flex items-center justify-between text-[10px] text-purple-400/40 font-bold uppercase tracking-widest">
                                                                            <div className="flex items-center gap-2">
                                                                                <Icons.info size={10} />
                                                                                Local Synthesis Cache (Temporary Override)
                                                                            </div>
                                                                            <span className="font-mono not-italic bg-purple-500/10 px-2 py-0.5 rounded">{(compiledPrompt || rawPromptPreview).length} CHARS</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mb-12">
                                                                <div id="tour-modifiers" className="border border-white/10 bg-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
                                                                    <DNAStrip
                                                                        activeModifiers={activeModifiers}
                                                                        coreSubject={coreSubject}
                                                                        onRemoveModifier={handleToggleModifier}
                                                                        userLevel={userLevel}
                                                                    />

                                                                    <div
                                                                        className={`flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors ${isModifiersOpen ? 'border-b border-white/10' : ''}`}
                                                                        onClick={() => setIsModifiersOpen(!isModifiersOpen)}
                                                                    >
                                                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                                                            {userLevel === 'novice' ? 'Visual Modifiers' : 'Structural Modifiers'}
                                                                            <span className="text-white/20 font-mono tracking-normal ml-2">
                                                                                [{activeModifiers.length} ACTIVE]
                                                                            </span>
                                                                        </div>
                                                                        {isModifiersOpen ? <Icons.chevronUp className="w-4 h-4 text-white/40" /> : <Icons.chevronDown className="w-4 h-4 text-white/40" />}
                                                                    </div>

                                                                    {isModifiersOpen && (
                                                                        <div className="p-8 space-y-8 bg-black/20">
                                                                            {MODIFIER_CATEGORIES.map(cat => (
                                                                                <div key={cat.id}>
                                                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 flex justify-between">
                                                                                        <span>{cat.label}</span>
                                                                                        {activeModifiers.some(m => m.category === cat.id) && <Icons.check size={10} className="text-primary" />}
                                                                                    </h3>
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {cat.options.map(opt => {
                                                                                            const isActive = activeModifiers.some(m => m.value === opt);
                                                                                            return (
                                                                                                <button
                                                                                                    key={opt}
                                                                                                    onClick={() => handleToggleModifier(cat.id, opt)}
                                                                                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 ${isActive ? "border-primary/50 bg-primary/20 text-primary shadow-lg shadow-primary/10" : "border-white/5 bg-white/5 text-white/40 hover:border-white/20 hover:text-white"}`}
                                                                                                >
                                                                                                    {opt}
                                                                                                </button>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {userLevel !== 'novice' && (
                                                                <div className="space-y-8">

                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <label className="text-[10px] uppercase font-black tracking-widest text-primary block leading-none">
                                                                                {userLevel === 'master' ? 'DNA Structure (Original Prompt)' : 'Synthesized Prompt'}
                                                                            </label>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-mono text-foreground-muted/40">
                                                                                    {dnaViewMode === 'subject' ? rawPromptPreview.length : displayPrompt.length} chars
                                                                                </span>
                                                                                <div className="flex bg-black/40 p-0.5 rounded-md border border-white/5">
                                                                                    <button
                                                                                        onClick={() => setDnaViewMode('subject')}
                                                                                        className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${dnaViewMode === 'subject' ? 'bg-primary text-white shadow' : 'text-foreground-muted hover:text-white'}`}
                                                                                    >
                                                                                        Subject
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            if (dnaViewMode === 'subject' && !compiledPrompt) {
                                                                                                setCompiledPrompt(rawPromptPreview);
                                                                                            }
                                                                                            setDnaViewMode('full');
                                                                                        }}
                                                                                        className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${dnaViewMode === 'full' ? 'bg-purple-600 text-white shadow' : 'text-foreground-muted hover:text-white'}`}
                                                                                    >
                                                                                        Full
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className={`p-6 rounded-xl text-sm font-medium italic max-h-[400px] overflow-y-auto w-full custom-scrollbar leading-relaxed transition-colors ${dnaViewMode === 'full' ? 'bg-purple-500/5 border border-purple-500/10 text-purple-200/90' : 'bg-primary/5 border border-primary/10'}`}>
                                                                            {dnaViewMode === 'subject' ? (
                                                                                rawPromptPreview ? (
                                                                                    <span className="block truncate">&quot;{rawPromptPreview.split('\n')[0]}&quot;{rawPromptPreview.includes('\n') && <span className="text-foreground-muted/40"> …</span>}</span>
                                                                                ) : (
                                                                                    <span className="text-foreground-muted/50 italic font-normal">Waiting for prompt input...</span>
                                                                                )
                                                                            ) : (
                                                                                displayPrompt ? (
                                                                                    <span className="block whitespace-pre-wrap">{displayPrompt}</span>
                                                                                ) : (
                                                                                    <span className="text-foreground-muted/50 italic font-normal">No woven prompt yet...</span>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!isExemplar && (
                                                                <div className="mt-8 pt-6 border-t border-white/5">
                                                                    <label className="text-[10px] uppercase font-black tracking-widest text-primary block mb-4">Original Generation DNA</label>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                        <div className="space-y-1">
                                                                            <span className="text-[8px] uppercase tracking-widest text-foreground-muted block">Seed</span>
                                                                            <span className="text-xs font-mono text-white">{(remixImage as GeneratedImage).settings?.seed || 'Auto'}</span>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[8px] uppercase tracking-widest text-foreground-muted block">Guidance</span>
                                                                            <span className="text-xs font-mono text-white">{(remixImage as GeneratedImage).settings?.guidanceScale || 7.5}</span>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[8px] uppercase tracking-widest text-foreground-muted block">Quality</span>
                                                                            <span className="text-xs font-mono text-white capitalize">{(remixImage as GeneratedImage).settings?.quality || 'Standard'}</span>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[8px] uppercase tracking-widest text-foreground-muted block">Ratio</span>
                                                                            <span className="text-xs font-mono text-white">{(remixImage as GeneratedImage).settings?.aspectRatio || '1:1'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {userLevel !== 'novice' && (
                                                        <div className="flex justify-between items-center p-6 rounded-2xl bg-background-secondary border border-border">
                                                            <div className="flex items-center gap-3">
                                                                <Icons.circle size={12} className="text-green-500 fill-green-500 animate-pulse" />
                                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Currently Syncing Across Inputs</span>
                                                            </div>
                                                            <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={handleClearExemplar}>
                                                                <Icons.trash size={12} className="mr-2" /> Unload Target
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </section>
                                )}

                            </div>
                        </div>

                        {/* RIGHT PANE: OUTPUT & PRO SETTINGS */}
                        <div className="w-full md:w-1/2 lg:w-2/5 md:h-screen md:overflow-y-auto bg-black border-l border-white/5 flex flex-col relative">
                            <div className="flex-1 w-full p-6 md:p-8 pb-32 flex flex-col">

                                {/* THE PRO SETTINGS SIDEBAR (Journeyman & Master) */}
                                {showProSettings && (
                                    <div id="settings-panel" className="mb-12 p-8 rounded-3xl border border-purple-500/20 bg-purple-500/5 relative overflow-hidden backdrop-blur-md">
                                        <div className="absolute top-0 right-0 p-3 bg-purple-500/20 rounded-bl-3xl text-purple-400">
                                            <Icons.settings size={16} className="animate-[spin_8s_linear_infinite]" />
                                        </div>
                                        <button
                                            onClick={() => setIsEngineeringCoreOpen(!isEngineeringCoreOpen)}
                                            className="w-full flex items-center gap-3 mb-4 group cursor-pointer"
                                        >
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 leading-none group-hover:text-purple-300 transition-colors">Engineering Core</h3>
                                            <div className="h-px flex-1 bg-purple-500/20 group-hover:bg-purple-500/40 transition-colors" />
                                            <Icons.chevronDown
                                                size={14}
                                                className={`text-purple-500/40 group-hover:text-purple-400 transition-all duration-300 ${isEngineeringCoreOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {isEngineeringCoreOpen ? (
                                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="grid grid-cols-2 gap-6">
                                                    {/* Modality Selection */}
                                                    <div id="tour-modality">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Modality</label>
                                                        <div className="flex bg-black/40 border border-white/5 rounded-xl overflow-hidden p-1 shadow-inner">
                                                            {(['image', 'video'] as MediaType[]).map(m => (
                                                                <button
                                                                    key={m}
                                                                    onClick={() => {
                                                                        if (m === 'video' && genState.aspectRatio === '1:1') {
                                                                            setGenState({ ...genState, mediaType: m, aspectRatio: '16:9' });
                                                                        } else {
                                                                            setGenState({ ...genState, mediaType: m });
                                                                        }
                                                                    }}
                                                                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${genState.mediaType === m ? 'bg-primary/20 text-primary shadow-sm' : 'text-white/30 hover:text-white'}`}
                                                                >
                                                                    {m}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Aspect Ratio */}
                                                    <div id="tour-aspect-ratio">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Aspect Ratio</label>
                                                        <div className="relative group">
                                                            <select
                                                                value={genState.aspectRatio}
                                                                onChange={(e) => setGenState({ ...genState, aspectRatio: e.target.value })}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                                                            >
                                                                <option value="1:1" disabled={genState.mediaType === 'video'} className="bg-[#050508]">1:1 Square {genState.mediaType === 'video' ? '(Images only)' : ''}</option>
                                                                <option value="16:9" className="bg-[#050508]">16:9 Landscape</option>
                                                                <option value="9:16" className="bg-[#050508]">9:16 Portrait</option>
                                                            </select>
                                                            <Icons.chevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-white/40 transition-colors" />
                                                        </div>
                                                    </div>

                                                    {/* Quality tier conversion logic is maintained for accuracy */}
                                                    <div id="tour-quality">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Quality</label>
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/60 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                                                                {(() => {
                                                                    const perImage = genState.mediaType === 'video' ? 10 : genState.quality === 'ultra' ? 8 : genState.quality === 'high' ? 4 : 1;
                                                                    const totalCost = perImage * genState.batchSize;
                                                                    return `Cost: ${totalCost}c`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                        <div className="relative group">
                                                            <select
                                                                value={genState.mediaType === 'video' ? 'video' : genState.quality}
                                                                onChange={(e) => setGenState({ ...genState, quality: e.target.value as any })}
                                                                disabled={genState.mediaType === 'video'}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                                                            >
                                                                {genState.mediaType === 'video' ? (
                                                                    <option value="video" className="bg-[#050508]">Cinematic Video</option>
                                                                ) : (
                                                                    <>
                                                                        <option value="standard" className="bg-[#050508]">Standard (1c)</option>
                                                                        <option value="high" className="bg-[#050508]">HD (4c)</option>
                                                                        <option value="ultra" className="bg-[#050508]">Ultra-HD (8c)</option>
                                                                    </>
                                                                )}
                                                            </select>
                                                            <Icons.chevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-white/40 transition-colors" />
                                                        </div>
                                                    </div>

                                                    {/* Batch Size */}
                                                    <div id="tour-batch-size">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Batch Size</label>
                                                        <div className="flex bg-black/40 border border-white/5 rounded-xl overflow-hidden items-center p-1 shadow-inner h-[46px]">
                                                            <button
                                                                onClick={() => setGenState(prev => ({ ...prev, batchSize: Math.max(1, prev.batchSize - 1) }))}
                                                                className="px-3 h-full text-white/20 hover:text-white transition-colors"
                                                            >
                                                                <Icons.minus className="w-3 h-3" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={genState.batchSize || ''}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    setGenState(prev => ({ ...prev, batchSize: isNaN(val) || val < 1 ? 1 : val }));
                                                                }}
                                                                className="w-full bg-transparent text-center text-[10px] font-black tracking-widest outline-none py-1 text-purple-400 font-mono"
                                                            />
                                                            <button
                                                                onClick={() => setGenState(prev => ({ ...prev, batchSize: prev.batchSize + 1 }))}
                                                                className="px-3 h-full text-white/20 hover:text-white transition-colors"
                                                            >
                                                                <Icons.plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Prompt Set ID */}
                                                    <div>
                                                        <label className="text-[10px] uppercase tracking-widest text-foreground-muted block mb-2 flex justify-between">
                                                            Set ID
                                                            <button
                                                                onClick={() => setGenState({ ...genState, promptSetId: Date.now().toString(36) })}
                                                                className="text-purple-400 hover:text-purple-300"
                                                            >
                                                                <Icons.history size={10} />
                                                            </button>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            disabled
                                                            value={genState.promptSetId}
                                                            className="w-full bg-black/50 border border-white/5 rounded-lg p-1.5 text-xs text-foreground-muted font-mono"
                                                        />
                                                    </div>
                                                    {/* Advanced Controls */}
                                                    <div className="col-span-2 space-y-4 pt-4 border-t border-purple-500/10">
                                                        <div>
                                                            <div className="flex justify-between mb-2">
                                                                <label className="text-[10px] uppercase tracking-widest text-foreground-muted">Guidance Scale</label>
                                                                <span className="text-[10px] font-mono text-purple-400">{genState.guidanceScale || 7.5}</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="1"
                                                                max="30"
                                                                step="0.5"
                                                                value={genState.guidanceScale || 7.5}
                                                                onChange={(e) => setGenState({ ...genState, guidanceScale: parseFloat(e.target.value) })}
                                                                className="w-full accent-primary h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                                                            />
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between mb-2">
                                                                <label className="text-[10px] uppercase tracking-widest text-foreground-muted">Custom Seed</label>
                                                                <button
                                                                    onClick={() => setGenState({ ...genState, seed: Math.floor(Math.random() * 1000000) })}
                                                                    className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                                                >
                                                                    <Icons.refresh size={10} /> Random
                                                                </button>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                placeholder="Random Seed (Empty)"
                                                                value={genState.seed || ''}
                                                                onChange={(e) => setGenState({ ...genState, seed: parseInt(e.target.value) || undefined })}
                                                                className="w-full bg-background border border-white/10 rounded-lg p-2 text-[10px] font-mono text-foreground outline-none focus:border-purple-500/50"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] uppercase tracking-widest text-foreground-muted block mb-2">Negative Prompt</label>
                                                            <textarea
                                                                placeholder="What to exclude... (low quality, blurry, etc)"
                                                                value={genState.negativePrompt || ''}
                                                                onChange={(e) => setGenState({ ...genState, negativePrompt: e.target.value })}
                                                                className="w-full bg-background border border-white/10 rounded-lg p-3 text-[10px] text-foreground outline-none focus:border-purple-500/50 h-20 resize-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/50">Modality</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white capitalize">{genState.mediaType}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/50">Ratio</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{genState.aspectRatio}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/50">Quality</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white capitalize">{genState.quality}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/50">Batch</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{genState.batchSize} Units</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                                            {userLevel === 'novice' ? 'Final Composition' : 'Compiled Pre-Flight'}
                                        </h2>
                                        <Tooltip content="Save this setup as your own template">
                                            <button
                                                onClick={handleSaveTemplate}
                                                disabled={!coreSubject.trim()}
                                                className="p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-primary transition-colors disabled:opacity-30"
                                            >
                                                <Icons.save size={14} />
                                            </button>
                                        </Tooltip>
                                        <div className="flex bg-black/40 p-0.5 rounded-md border border-white/5 ml-2">
                                            <button
                                                onClick={() => setPreflightViewMode('subject')}
                                                className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${preflightViewMode === 'subject' ? 'bg-primary text-white shadow' : 'text-foreground-muted hover:text-white'}`}
                                            >
                                                Subject
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (preflightViewMode === 'subject' && !compiledPrompt) {
                                                        setCompiledPrompt(rawPromptPreview);
                                                    }
                                                    setPreflightViewMode('full');
                                                }}
                                                className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${preflightViewMode === 'full' ? 'bg-purple-600 text-white shadow' : 'text-foreground-muted hover:text-white'}`}
                                            >
                                                Full
                                            </button>
                                        </div>
                                        <span className="text-[10px] font-mono text-foreground-muted/40 ml-1">
                                            {preflightViewMode === 'subject' ? rawPromptPreview.length : displayPrompt.length} chars
                                        </span>
                                    </div>
                                    <Button
                                        id="magic-enhance"
                                        size="sm"
                                        variant="outline"
                                        className="text-[10px] h-6 px-2 border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                                        disabled={!coreSubject.trim() || isCompiling}
                                        onClick={handleCompilePrompt}
                                    >
                                        {isCompiling ? (
                                            <><Icons.spinner className="w-3 h-3 animate-spin mr-1" /> {userLevel === 'novice' ? 'Processing...' : 'Weaving...'}</>
                                        ) : (
                                            <><Icons.wand className="w-3 h-3 mr-1" /> {userLevel === 'novice' ? 'Enhance Prompt' : 'Weave Prompt'}</>
                                        )}
                                    </Button>
                                </div>

                                <div className={`border p-4 rounded-xl text-sm leading-relaxed mb-6 relative transition-all ${preflightViewMode === 'full' ? 'bg-purple-500/5 border-purple-500/10 text-purple-200/90 max-h-[400px] overflow-y-auto' : 'bg-background border-border/50 text-primary-light overflow-hidden'}`}>
                                    {isCompiling && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
                                            <div className="text-primary flex items-center gap-2 font-bold uppercase tracking-widest text-xs animate-pulse">
                                                <Icons.wand className="w-4 h-4" /> AI Weaving...
                                            </div>
                                        </div>
                                    )}
                                    {preflightViewMode === 'subject'
                                        ? (rawPromptPreview ? <span className="block truncate">{rawPromptPreview.split('\n')[0]}{rawPromptPreview.includes('\n') && ' …'}</span> : <span className="text-foreground-muted italic opacity-50">Select an exemplar or start typing...</span>)
                                        : (displayPrompt || <span className="text-foreground-muted italic opacity-50">No woven prompt yet...</span>)
                                    }
                                </div>

                                <div className="w-full mb-8">
                                    <Button
                                        id="manifest-button"
                                        className={`w-full h-16 rounded-[20px] font-black uppercase tracking-[0.3em] overflow-hidden relative group transition-all duration-500 shadow-[0_0_40px_rgba(99,102,241,0.1)] hover:shadow-[0_0_60px_rgba(99,102,241,0.25)] border-0 ${isGenerating
                                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                            : 'bg-primary text-white hover:scale-[1.01] active:scale-[0.98]'
                                            }`}
                                        disabled={!isGenerating && !coreSubject.trim()}
                                        onClick={isGenerating ? handleCancelGeneration : () => setShowReviewModal(true)}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                        <span className="relative z-10 flex items-center justify-center gap-3">
                                            {isGenerating ? (
                                                <><Icons.close size={20} /> Cancel Synthesis</>
                                            ) : (
                                                <><Icons.sparkles size={20} /> Generate Units ({genState.batchSize})</>
                                            )}
                                        </span>
                                    </Button>
                                </div>

                                {/* Review Modal */}
                                {showReviewModal && (
                                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6" onClick={() => setShowReviewModal(false)}>
                                        <div className="w-full max-w-2xl bg-[#050508] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                                                <div>
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white leading-none">
                                                        {userLevel === 'novice' ? 'Final Review' : 'Pre-Flight Synthesis'}
                                                    </h3>
                                                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-2">
                                                        {userLevel === 'novice' ? 'Confirm your setup before creating.' : 'Validate architectural DNA before weaving.'}
                                                    </p>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                    <Icons.wand size={18} />
                                                </div>
                                            </div>
                                            <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Woven Template</label>
                                                        <Tooltip content="NEURAL WEAVE: Collapses your Subject and Modifiers into a high-fidelity woven prompt using the NanoBanana AI engine." position="left">
                                                            <button
                                                                onClick={handleEnhancePrompt}
                                                                disabled={isEnhancing || (!coreSubject.trim() && !compiledPrompt)}
                                                                className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                                            >
                                                                {isEnhancing ? <Icons.spinner className="w-2.5 h-2.5 animate-spin" /> : <Icons.sparkles className="w-2.5 h-2.5" />}
                                                                Sync Enhancement
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-[13px] italic leading-relaxed text-white/70 font-medium">
                                                        {displayPrompt || <span className="text-white/20">Awaiting prompt synthesis...</span>}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Active Modifiers</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {activeModifiers.length > 0 ? activeModifiers.map(m => (
                                                            <span key={m.id} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                                                                <span className="opacity-20 mr-1">{m.category}:</span> {m.value}
                                                            </span>
                                                        )) : <span className="text-[10px] text-white/20 italic uppercase tracking-widest">No structural modifiers active</span>}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Quality</label>
                                                        <p className="text-[11px] font-black uppercase tracking-widest text-white">{genState.quality}</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Ratio</label>
                                                        <p className="text-[11px] font-black uppercase tracking-widest text-white">{genState.aspectRatio}</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Tooltip content="VOLUME: The number of unique variations generated in this batch. Standard tier users generate 1-4 per set.">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Batch</label>
                                                            <p className="text-[11px] font-black uppercase tracking-widest text-white">{genState.batchSize} Units</p>
                                                        </Tooltip>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Tooltip content="MEDIUM: Switch between static architectural frames or 5-second neural video loops. Video requires Pro tier.">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Modality</label>
                                                            <p className="text-[11px] font-black uppercase tracking-widest text-white capitalize">{genState.mediaType}</p>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-8 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
                                                <Button variant="ghost" size="sm" className="text-white/20 hover:text-red-400 font-black uppercase tracking-widest text-[10px]" onClick={() => { setShowReviewModal(false); setCoreSubject(''); setCompiledPrompt(''); }}>
                                                    <Icons.trash size={14} className="mr-2" /> Abort
                                                </Button>
                                                <div className="flex gap-4">
                                                    <Button variant="outline" size="sm" className="border-white/10 text-white/40 hover:text-white rounded-xl px-6 font-black uppercase tracking-widest text-[10px]" onClick={() => setShowReviewModal(false)}>
                                                        Return
                                                    </Button>
                                                    <Tooltip content="EXECUTE: Commit all DNA constituents to the cloud for final rendering. Consumes energy units.">
                                                        <Button variant="primary" size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(99,102,241,0.4)]" onClick={() => { setShowReviewModal(false); handleGenerate(); }}>
                                                            <Icons.sparkles size={14} className="mr-2" /> Weave Masterpiece
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="w-full flex-1 min-h-[500px] rounded-[32px] border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center p-12 text-center text-white/20 relative overflow-hidden group backdrop-blur-sm">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.03),transparent_70%)] pointer-events-none" />
                                    {!isGenerating && !generatedImages && (
                                        <>
                                            <div className="w-24 h-24 rounded-[32px] bg-white/5 flex items-center justify-center mb-8 border border-white/5 group-hover:border-primary/20 transition-all duration-700 group-hover:bg-primary/5">
                                                <Icons.image className="w-10 h-10 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all duration-700 group-hover:scale-110" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 group-hover:text-white/30 transition-colors duration-700">Awaiting Neural Synthesis</p>
                                        </>
                                    )}
                                    {isGenerating && (
                                        <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-sm">
                                            <div className="relative">
                                                <Icons.wand className="w-16 h-16 text-primary animate-[spin_4s_linear_infinite]" />
                                                <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse rounded-full" />
                                            </div>

                                            <div className="space-y-2 w-full">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary-light">
                                                    <span>{generationMessage}</span>
                                                    <span>{Math.round(generationProgress)}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary-light"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${generationProgress}%` }}
                                                        transition={{ duration: 0.5 }}
                                                    />
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-foreground-muted uppercase tracking-[0.2em] animate-pulse">
                                                {genState.mediaType === 'video' ? 'Deep learning in progress • Do not refresh' : 'Weaving pixels...'}
                                            </p>
                                        </div>
                                    )}
                                    {!isGenerating && generatedImages && (
                                        <div className="w-full h-full flex flex-col gap-4">
                                            <div className={`w-full flex-1 grid gap-4 ${generatedImages.length === 1 ? 'grid-cols-1' : generatedImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                                                {generatedImages.map((img, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => setFocusedImage(img)}
                                                        className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 animate-in fade-in zoom-in duration-500 min-h-[300px] cursor-zoom-in group/result"
                                                    >
                                                        <MediaPreview image={img} />
                                                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/result:opacity-100 transition-opacity pointer-events-none" />
                                                    </div>
                                                ))}
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    const currentSid = generatedImages[0]?.promptSetID || generatedImages[0]?.settings?.promptSetID || genState.promptSetId;

                                                    const historyMatches = historyImages.filter(img =>
                                                        currentSid && (img.promptSetID === currentSid || img.settings?.promptSetID === currentSid)
                                                    );

                                                    const combined = [...generatedImages];
                                                    const existingIds = new Set(combined.map(img => img.id));

                                                    for (const img of historyMatches) {
                                                        if (!existingIds.has(img.id)) {
                                                            combined.push(img);
                                                        }
                                                    }

                                                    setViewingVariationsGroup(combined.length > 0 ? combined : generatedImages);
                                                }}
                                                className="w-full border-white/10 hover:bg-white/5 font-black tracking-widest uppercase text-[10px] h-12 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300"
                                            >
                                                <Icons.image size={16} className="mr-2" /> View in Gallery (Image Variations)
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <HistorySidebar
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                images={historyImages}
                loading={loadingHistory}
                onRemix={handleRemix}
            />

            {/* --- REVIEW CANVAS OVERLAY --- */}
            <AnimatePresence>
                {focusedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
                    >
                        <button
                            onClick={() => setFocusedImage(null)}
                            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white z-[1010]"
                        >
                            <Icons.close size={24} />
                        </button>

                        <div
                            className="bg-black/50 border border-white/5 rounded-3xl w-full h-full flex flex-col overflow-hidden relative max-w-7xl mx-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col lg:flex-row min-h-0 flex-1">
                                {/* Main Display */}
                                <div className="flex-[2] flex flex-col relative bg-black/20">
                                    <div className="flex-1 flex items-center justify-center overflow-hidden relative group p-8">
                                        {(() => {
                                            const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(focusedImage.imageUrl || '');
                                            const videoSrc = focusedImage.videoUrl || (imgIsVideo ? focusedImage.imageUrl : null);

                                            return (
                                                <>
                                                    {!imgIsVideo && (
                                                        <img
                                                            src={focusedImage.imageUrl}
                                                            alt=""
                                                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-500"
                                                        />
                                                    )}
                                                    {videoSrc && (
                                                        <video
                                                            src={videoSrc}
                                                            autoPlay
                                                            loop
                                                            muted
                                                            playsInline
                                                            className="max-w-full max-h-full object-contain bg-black cursor-pointer shadow-2xl rounded-lg"
                                                            onClick={(e) => {
                                                                const video = e.currentTarget;
                                                                if (video.paused) {
                                                                    video.play().catch(() => { });
                                                                } else {
                                                                    video.pause();
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Action Bar below media */}
                                    <div className="flex flex-wrap items-center justify-center gap-3 p-6 border-t border-white/5 bg-black/20">
                                        <Button
                                            variant="secondary"
                                            onClick={() => { handleRemix(focusedImage); setFocusedImage(null); }}
                                            className="flex-1 text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border-white/5 whitespace-nowrap h-auto"
                                        >
                                            <span className="text-sm">✏️</span> Edit Image
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="flex-[1.5] py-2 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-white/5 hover:bg-white/10 text-white border border-white/5 h-auto"
                                        >
                                            <span className="text-sm">🏆</span> Publish
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => { handleDownloadMedia(focusedImage); }}
                                            className="flex-[1.5] text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border-white/5 whitespace-nowrap h-auto"
                                        >
                                            <Icons.download size={14} /> Download
                                        </Button>
                                        <Button
                                            variant="danger"
                                            className="flex-1 text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 opacity-80 hover:opacity-100 whitespace-nowrap h-auto"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>

                                {/* Info Side */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar border-t lg:border-t-0 lg:border-l border-white/5 bg-transparent min-h-0 min-w-[320px] max-w-sm flex flex-col gap-6 text-white pb-12">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-[10px] uppercase tracking-widest text-primary font-black">Image Details</h2>
                                        </div>

                                        <div className="group/prompt relative bg-white/5 border border-white/10 rounded-2xl p-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[8px] uppercase tracking-widest text-foreground-muted">Prompt</label>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(focusedImage.prompt);
                                                        showToast('Prompt copied to clipboard', 'success');
                                                    }}
                                                    className="text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover/prompt:opacity-100 transition-opacity hover:text-primary/80"
                                                >
                                                    Copy Prompt
                                                </button>
                                            </div>
                                            <div className={cn(
                                                "text-sm leading-relaxed text-white/90 font-medium italic",
                                                isPromptExpanded ? "max-h-[300px] overflow-y-auto custom-scrollbar pr-2" : ""
                                            )}>
                                                &quot;{(isPromptExpanded || focusedImage.prompt.length <= CHARACTER_LIMIT)
                                                    ? focusedImage.prompt
                                                    : `${focusedImage.prompt.slice(0, CHARACTER_LIMIT)}...`}&quot;
                                            </div>
                                            {focusedImage.prompt.length > CHARACTER_LIMIT && (
                                                <button
                                                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                                                    className="text-[10px] text-primary hover:text-primary/80 uppercase tracking-widest font-black mt-2 transition-colors"
                                                >
                                                    {isPromptExpanded ? "Show Less" : "Read More"}
                                                </button>
                                            )}

                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => { handleRemix(focusedImage); setFocusedImage(null); }}
                                                className="w-full mt-4 text-[10px] uppercase font-black tracking-widest h-9"
                                            >
                                                <Icons.wand size={14} className="mr-2" />
                                                New Version
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                            <div className="group/seed relative">
                                                <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase flex justify-between items-center">
                                                    Seed
                                                    {focusedImage.settings?.seed && (
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(String(focusedImage.settings.seed));
                                                                showToast('Seed copied to clipboard', 'success');
                                                            }}
                                                            className="text-[8px] font-black uppercase tracking-widest text-primary opacity-0 group-hover/seed:opacity-100 transition-opacity hover:text-primary/80"
                                                        >
                                                            Copy
                                                        </button>
                                                    )}
                                                </label>
                                                <p className="text-sm mt-1 text-white/90 font-bold pr-2 truncate">{focusedImage.settings?.seed || 'Auto'}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Guidance</label>
                                                <p className="text-sm mt-1 text-white/90 font-bold">{focusedImage.settings?.guidanceScale || 7.5}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Quality</label>
                                                <p className="text-sm mt-1 capitalize text-white/90 font-bold">{focusedImage.settings?.quality || 'standard'}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Aspect</label>
                                                <p className="text-sm mt-1 text-white/90 font-bold">{focusedImage.settings?.aspectRatio || '1:1'}</p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">ID</label>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm mt-1 text-white/90 font-bold font-mono">{focusedImage.id.substring(0, 16)}...</p>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(focusedImage.id);
                                                        showToast('ID copied to clipboard', 'success');
                                                    }}
                                                    className="text-[8px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
                                                >
                                                    Copy Full ID
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Created</label>
                                            <p className="text-sm mt-1 text-white/90 font-bold">{formatDate(focusedImage.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                const currentSid = focusedImage.promptSetID || focusedImage.settings?.promptSetID;
                                                const combined = [];

                                                if (currentSid) {
                                                    const genMatches = generatedImages?.filter(img => img.promptSetID === currentSid || img.settings?.promptSetID === currentSid) || [];
                                                    combined.push(...genMatches);

                                                    const historyMatches = historyImages?.filter(img => img.promptSetID === currentSid || img.settings?.promptSetID === currentSid) || [];
                                                    const existingIds = new Set(combined.map(img => img.id));

                                                    for (const img of historyMatches) {
                                                        if (!existingIds.has(img.id)) {
                                                            combined.push(img);
                                                        }
                                                    }
                                                }

                                                if (combined.length === 0) combined.push(focusedImage);

                                                setViewingVariationsGroup(combined);
                                                setFocusedImage(null);
                                            }}
                                            className="w-full bg-primary/20 hover:bg-primary/30 text-primary border-primary/20 font-black tracking-widest uppercase text-[10px] h-14 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                                        >
                                            <Icons.image size={18} className="mr-3" /> View Sequence Variations
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewingVariationsGroup && (
                    <ImageGroupModal
                        selectedGroup={viewingVariationsGroup}
                        onClose={() => setViewingVariationsGroup(null)}
                        onImageSelect={(img) => {
                            setViewingVariationsGroup(null);
                            setFocusedImage(img);
                        }}
                        collections={[]}
                        onBatchToggleCollection={() => { }}
                        showCreateCollection={false}
                        setShowCreateCollection={() => { }}
                        newCollectionName=""
                        setNewCollectionName={() => { }}
                        onCreateCollection={() => { }}
                        creatingCollection={false}
                        collectionError=""
                        setCollectionError={() => { }}
                    />
                )}
            </AnimatePresence>
        </div >
    );
}

export default function GeneratePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground-muted">Loading Generator...</div>}>
            <GeneratePageContent />
        </Suspense>
    );
}
