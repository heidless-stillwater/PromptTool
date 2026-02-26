'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import GenerateHeader from '@/components/generate/GenerateHeader';
import HistorySidebar from '@/components/generate/HistorySidebar';
import Tooltip from '@/components/Tooltip';
import { normalizeImageData } from '@/lib/image-utils';
import { GeneratedImage } from '@/lib/types';

// --- TYPES ---
export type UserLevel = 'novice' | 'journeyman' | 'master';
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

export default function GeneratePage() {
    const { profile, user, credits } = useAuth();

    // Top Level State
    const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(true);

    // Active State
    const [activeExemplarId, setActiveExemplarId] = useState<string | null>(null);
    const [presentationMode, setPresentationMode] = useState<PresentationMode>('grid-md');

    // Customization State
    const [coreSubject, setCoreSubject] = useState<string>('');
    const [activeModifiers, setActiveModifiers] = useState<Modifier[]>([]);
    const [isModifiersOpen, setIsModifiersOpen] = useState(false);

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

    // History Sidebar State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Exemplars State
    const [exemplars, setExemplars] = useState<Exemplar[]>([]);
    const [personalExemplars, setPersonalExemplars] = useState<Exemplar[]>([]);
    const [loadingExemplars, setLoadingExemplars] = useState(true);

    const [focusedImage, setFocusedImage] = useState<GeneratedImage | null>(null);

    // Generation abort signals
    const abortControllerRef = useRef<AbortController | null>(null);

    // Clear compiled prompt if inputs change
    useEffect(() => {
        setCompiledPrompt('');
    }, [coreSubject, activeModifiers]);

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
                    modifiers: activeModifiers.map(m => ({ category: m.category, value: m.value }))
                })
            });
            const data = await res.json();
            if (data.compiledPrompt) {
                setCompiledPrompt(data.compiledPrompt);
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
                const mods: Modifier[] = [];
                if (data.settings?.madlibsData) {
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
                    subjectBase: data.prompt || '',
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
        setCoreSubject(image.prompt);
        // Best effort to map modifiers if they exist in settings
        if (image.settings?.madlibsData) {
            const m = image.settings.madlibsData;
            const newModifiers: Modifier[] = [];
            if (m.style) newModifiers.push({ id: Math.random().toString(), category: 'style', value: m.style });
            if (m.action) newModifiers.push({ id: Math.random().toString(), category: 'action', value: m.action });
            if (m.mood) newModifiers.push({ id: Math.random().toString(), category: 'mood', value: m.mood });
            setActiveModifiers(newModifiers);
        }
        setIsHistoryOpen(false);
    };

    const handleSaveTemplate = async () => {
        if (!user || !coreSubject.trim()) return;
        try {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const template: Omit<Exemplar, 'id'> = {
                title: `${coreSubject.substring(0, 15)}... Template`,
                description: `Custom template with ${activeModifiers.length} modifiers.`,
                thumbnailUrl: generatedImages?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
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
                <div className="relative w-full h-full group/media bg-black">
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
                                onMouseEnter={(e) => { e.currentTarget.play().catch(() => { }) }}
                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
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
                            onMouseEnter={(e) => { e.currentTarget.play().catch(() => { }) }}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
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

    // Check local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem('pskill_userLevel');
        if (stored && ['novice', 'journeyman', 'master'].includes(stored)) {
            setUserLevel(stored as UserLevel);
        } else {
            setUserLevel('novice');
            localStorage.setItem('pskill_userLevel', 'novice');
        }
        setShowOnboarding(false);
    }, []);

    const handleSelectLevel = (level: UserLevel) => {
        setUserLevel(level);
        localStorage.setItem('pskill_userLevel', level);
        setShowOnboarding(false);

        // Auto-open modifiers if they are Journeyman/Master
        if (level !== 'novice') {
            setIsModifiersOpen(true);
        } else {
            setIsModifiersOpen(false);
        }
    };

    const handleSelectExemplar = (ex: Exemplar) => {
        setActiveExemplarId(ex.id);
        setCoreSubject(ex.subjectBase);
        setActiveModifiers([...ex.modifiers]);
    };

    const handleClearExemplar = () => {
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
    const showProSettings = userLevel === 'master';
    const isAdmin = profile?.role === 'admin';
    const availableCredits = (credits?.balance || 0) + Math.max(0, (credits?.dailyAllowance || 0) - (credits?.dailyAllowanceUsed || 0));

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-hidden">
            <GenerateHeader
                availableCredits={availableCredits}
                onHistoryOpen={() => setIsHistoryOpen(true)}
                isAdmin={isAdmin}
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

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-foreground-muted hover:text-foreground capitalize"
                                    onClick={() => setShowOnboarding(true)}
                                >
                                    Mode: {userLevel} <Icons.settings size={12} className="ml-2" />
                                </Button>
                            </div>

                            <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-12 pb-32">

                                {/* --- 1. EXEMPLAR SELECTION --- */}
                                <section>
                                    <div className="flex items-end justify-between mb-4">
                                        <div>
                                            <h2 className="text-xl font-bold">1. Start with an Exemplar</h2>
                                            <p className="text-sm text-foreground-muted">Select a template to build upon, or start entirely from scratch.</p>
                                        </div>
                                        <div className="flex bg-background-secondary p-1 rounded-xl w-fit border border-border/50">
                                            {[
                                                { id: 'grid-sm', label: 'Grid S' },
                                                { id: 'grid-md', label: 'Grid M' },
                                                { id: 'grid-lg', label: 'Grid L' },
                                                { id: 'list', label: 'List' }
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setPresentationMode(tab.id as PresentationMode)}
                                                    className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-tighter font-black transition-all ${presentationMode === tab.id ? "bg-accent shadow-sm text-foreground" : "text-foreground-muted hover:text-foreground"}`}
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
                                                            combinedExemplars.map(ex => {
                                                                const isVideo = !!(ex.videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(ex.thumbnailUrl));
                                                                const isPersonal = personalExemplars.some(p => p.id === ex.id);
                                                                const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(ex.thumbnailUrl);
                                                                const videoSrc = ex.videoUrl || ex.thumbnailUrl;
                                                                const videoSrcWithTime = videoSrc?.includes('#t=') ? videoSrc : `${videoSrc}#t=0.1`;

                                                                return (
                                                                    <div
                                                                        key={ex.id}
                                                                        onClick={() => handleSelectExemplar(ex)}
                                                                        className={`relative rounded-xl overflow-hidden cursor-pointer group border-2 transition-all aspect-square ${activeExemplarId === ex.id ? 'border-primary shadow-xl shadow-primary/20 z-10' : 'border-transparent hover:border-white/20'}`}
                                                                    >
                                                                        <div className="w-full h-full relative group/media bg-black">
                                                                            {isVideo ? (
                                                                                <>
                                                                                    {!imgIsVideo && (
                                                                                        <img
                                                                                            src={ex.thumbnailUrl}
                                                                                            alt={ex.title}
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
                                                                                    <p className="font-bold text-[10px] md:text-sm text-white truncate">{ex.title}</p>
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
                                                        )}
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
                                                            combinedExemplars.map(ex => {
                                                                const isVideo = !!(ex.videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(ex.thumbnailUrl));
                                                                const isPersonal = personalExemplars.some(p => p.id === ex.id);
                                                                const videoSrc = ex.videoUrl || ex.thumbnailUrl;
                                                                const videoSrcWithTime = videoSrc?.includes('#t=') ? videoSrc : `${videoSrc}#t=0.1`;

                                                                return (
                                                                    <div
                                                                        key={ex.id}
                                                                        onClick={() => handleSelectExemplar(ex)}
                                                                        className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all cursor-pointer ${activeExemplarId === ex.id ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' : 'border-border bg-background-secondary hover:border-primary/40'}`}
                                                                    >
                                                                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black relative group/media">
                                                                            {isVideo ? (
                                                                                <>
                                                                                    <video
                                                                                        src={videoSrcWithTime}
                                                                                        className="w-full h-full object-cover"
                                                                                        muted
                                                                                        playsInline
                                                                                        preload="metadata"
                                                                                        onMouseEnter={(e) => { e.currentTarget.play().catch(() => { }) }}
                                                                                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
                                                                                    />
                                                                                    <div className="absolute top-1 right-1">
                                                                                        <Icons.video size={10} className="text-white" />
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <img src={ex.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center">
                                                                                <h3 className="font-bold text-sm mb-0.5">{ex.title}</h3>
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
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </section>

                                {/* --- 2. CUSTOMIZATION --- */}
                                <section className={`transition-opacity duration-500 ${!activeExemplarId && userLevel === 'novice' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                                    <h2 className="text-xl font-bold mb-4">2. Customization {userLevel === 'novice' && <span className="text-xs font-normal text-foreground-muted ml-2">(Optional)</span>}</h2>

                                    <Card className="p-6 mb-4 border-primary/20 bg-primary/5 shadow-inner">
                                        <label className="block text-sm font-bold mb-2 text-primary">Core Subject</label>
                                        <input
                                            type="text"
                                            value={coreSubject}
                                            onChange={(e) => setCoreSubject(e.target.value)}
                                            placeholder="e.g. A solitary astronaut standing on..."
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                                        />
                                    </Card>

                                    {/* Progressive Disclosure Modifiers Stack */}
                                    <Card className="border-border bg-background">
                                        <div
                                            className={`flex items-center justify-between p-4 px-6 cursor-pointer hover:bg-white/5 transition-colors ${isModifiersOpen ? 'border-b border-border/50' : ''}`}
                                            onClick={() => setIsModifiersOpen(!isModifiersOpen)}
                                        >
                                            <div className="flex items-center gap-2 text-sm font-bold">
                                                The Modifiers Core
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
                                </section>

                            </div>
                        </div>

                        {/* RIGHT PANE: OUTPUT & PRO SETTINGS */}
                        <div className="w-full md:w-1/2 lg:w-2/5 md:h-screen md:overflow-y-auto bg-[#050508] border-l border-white/5 flex flex-col relative">
                            <div className="flex-1 w-full p-6 md:p-8 pb-32 flex flex-col">

                                {/* THE PRO SETTINGS SIDEBAR (Master Only) */}
                                {showProSettings && (
                                    <div className="mb-8 p-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 bg-purple-500/20 rounded-bl-xl text-purple-400">
                                            <Icons.settings size={14} className="animate-[spin_4s_linear_infinite]" />
                                        </div>
                                        <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-6">Pro Core Settings</h2>

                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Modality Selection */}
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-foreground-muted block mb-2">Modality</label>
                                                <div className="flex bg-background border border-white/10 rounded-lg overflow-hidden p-1">
                                                    {(['image', 'video'] as MediaType[]).map(m => (
                                                        <button
                                                            key={m}
                                                            onClick={() => setGenState({ ...genState, mediaType: m })}
                                                            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${genState.mediaType === m ? 'bg-primary text-white shadow-lg' : 'text-foreground-muted hover:text-white'}`}
                                                        >
                                                            {m}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Aspect Ratio */}
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-foreground-muted block mb-2">Aspect Ratio</label>
                                                <select
                                                    value={genState.aspectRatio}
                                                    onChange={(e) => setGenState({ ...genState, aspectRatio: e.target.value })}
                                                    className="w-full bg-background border border-white/10 rounded-lg p-2 text-xs text-foreground outline-none focus:border-purple-500/50"
                                                >
                                                    <option value="1:1">1:1 Square</option>
                                                    <option value="16:9">16:9 Landscape</option>
                                                    <option value="9:16">9:16 Portrait</option>
                                                </select>
                                            </div>

                                            {/* Quality tier conversion logic is maintained for accuracy */}
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-foreground-muted mb-2 flex justify-between">
                                                    Quality
                                                    <span className="text-yellow-500/90 font-bold">
                                                        {(() => {
                                                            const perImage = genState.mediaType === 'video' ? 10 : genState.quality === 'ultra' ? 8 : genState.quality === 'high' ? 4 : 1;
                                                            const totalCost = perImage * genState.batchSize;
                                                            const current = (credits?.balance || 0) + Math.max(0, (credits?.dailyAllowance || 0) - (credits?.dailyAllowanceUsed || 0));
                                                            return `Cost: ${totalCost}c (Bal: ${current} → ${Math.max(0, current - totalCost)})`;
                                                        })()}
                                                    </span>
                                                </label>
                                                <select
                                                    value={genState.quality}
                                                    onChange={(e) => setGenState({ ...genState, quality: e.target.value as any })}
                                                    className="w-full bg-background border border-white/10 rounded-lg p-2 text-xs text-foreground outline-none focus:border-purple-500/50"
                                                >
                                                    <option value="standard">Standard (1 credit)</option>
                                                    <option value="high">HD (4 credits)</option>
                                                    <option value="ultra">Ultra-HD (8 credits)</option>
                                                </select>
                                            </div>

                                            {/* Batch Size */}
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-foreground-muted block mb-2">Batch Size</label>
                                                <div className="flex bg-background border border-white/10 rounded-lg overflow-hidden items-center">
                                                    <button
                                                        onClick={() => setGenState(prev => ({ ...prev, batchSize: Math.max(1, prev.batchSize - 1) }))}
                                                        className="px-3 py-1.5 text-xs text-foreground-muted hover:bg-white/5 hover:text-white transition-colors"
                                                    >
                                                        <Icons.chevronDown className="w-4 h-4" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={genState.batchSize || ''}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            setGenState(prev => ({ ...prev, batchSize: isNaN(val) || val < 1 ? 1 : val }));
                                                        }}
                                                        className="w-full bg-transparent text-center text-xs font-bold font-mono outline-none py-1 text-purple-400"
                                                    />
                                                    <button
                                                        onClick={() => setGenState(prev => ({ ...prev, batchSize: prev.batchSize + 1 }))}
                                                        className="px-3 py-1.5 text-xs text-foreground-muted hover:bg-white/5 hover:text-white transition-colors"
                                                    >
                                                        <Icons.chevronUp className="w-4 h-4" />
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
                                )}

                                {/* Pre-flight block */}
                                <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xs font-black uppercase tracking-widest text-foreground-muted">Compiled Pre-Flight</h2>
                                        <Tooltip content="Save this setup as your own template">
                                            <button
                                                onClick={handleSaveTemplate}
                                                disabled={!coreSubject.trim()}
                                                className="p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-primary transition-colors disabled:opacity-30"
                                            >
                                                <Icons.save size={14} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-[10px] h-6 px-2 border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                                        disabled={!coreSubject.trim() || isCompiling}
                                        onClick={handleCompilePrompt}
                                    >
                                        {isCompiling ? (
                                            <><Icons.spinner className="w-3 h-3 animate-spin mr-1" /> Weaving...</>
                                        ) : (
                                            <><Icons.wand className="w-3 h-3 mr-1" /> Weave Prompt</>
                                        )}
                                    </Button>
                                </div>

                                <div className="bg-background border border-border/50 p-4 rounded-xl text-sm leading-relaxed text-primary-light h-32 overflow-y-auto mb-6 relative">
                                    {isCompiling && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
                                            <div className="text-primary flex items-center gap-2 font-bold uppercase tracking-widest text-xs animate-pulse">
                                                <Icons.wand className="w-4 h-4" /> AI Weaving...
                                            </div>
                                        </div>
                                    )}
                                    {displayPrompt || <span className="text-foreground-muted italic opacity-50">Select an exemplar or start typing...</span>}
                                </div>

                                <Button
                                    variant="primary"
                                    size="lg"
                                    className={`w-full shadow-lg mb-8 transition-colors ${isGenerating
                                        ? "shadow-red-500/20 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
                                        : "shadow-primary/20 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-light hover:to-purple-500"
                                        }`}
                                    disabled={!isGenerating && !coreSubject.trim()}
                                    onClick={isGenerating ? handleCancelGeneration : handleGenerate}
                                >
                                    {isGenerating ? (
                                        <><Icons.close className="w-5 h-5 mr-2" /> Cancel Generation</>
                                    ) : (
                                        `Generate Studio Batch (${genState.batchSize})`
                                    )}
                                </Button>

                                <div className="w-full flex-1 min-h-[400px] rounded-2xl border border-white/10 bg-background/50 flex flex-col items-center justify-center p-6 text-center text-foreground-muted relative overflow-hidden group">
                                    {!isGenerating && !generatedImages && (
                                        <>
                                            <Icons.image className="w-12 h-12 mb-4 opacity-50 group-hover:scale-110 group-hover:text-primary transition-all duration-500" />
                                            <p className="text-sm font-bold uppercase tracking-widest">Awaiting Generation...</p>
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
                                        <div className={`w-full h-full grid gap-4 ${generatedImages.length === 1 ? 'grid-cols-1' : generatedImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
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
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
                    >
                        <button
                            onClick={() => setFocusedImage(null)}
                            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white z-[110]"
                        >
                            <Icons.close size={24} />
                        </button>

                        <div className="w-full h-full flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto overflow-hidden">
                            {/* Main Display */}
                            <div className="flex-[2] h-full flex items-center justify-center bg-black/50 rounded-3xl overflow-hidden border border-white/5 relative group">
                                <img
                                    src={focusedImage.imageUrl}
                                    alt=""
                                    className="max-w-full max-h-full object-contain"
                                />
                                {focusedImage.videoUrl && (
                                    <video
                                        src={focusedImage.videoUrl}
                                        autoPlay
                                        loop
                                        muted
                                        className="absolute inset-0 w-full h-full object-contain bg-black"
                                    />
                                )}
                            </div>

                            {/* Info Side */}
                            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-4 custom-scrollbar">
                                <div>
                                    <h2 className="text-[10px] uppercase tracking-widest text-primary font-black mb-4">Focus Study</h2>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                        <p className="text-sm leading-relaxed text-white/90 font-medium italic">"{focusedImage.prompt}"</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <span className="text-[8px] uppercase tracking-widest text-foreground-muted block mb-1">Seed</span>
                                        <span className="text-xs font-mono text-white">{focusedImage.settings?.seed || 'Auto'}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <span className="text-[8px] uppercase tracking-widest text-foreground-muted block mb-1">Guidance</span>
                                        <span className="text-xs font-mono text-white">{focusedImage.settings?.guidanceScale || 7.5}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <span className="text-[8px] uppercase tracking-widest text-foreground-muted block mb-1">Ratio</span>
                                        <span className="text-xs font-mono text-white">{focusedImage.settings?.aspectRatio || '1:1'}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <span className="text-[8px] uppercase tracking-widest text-foreground-muted block mb-1">ID</span>
                                        <span className="text-[10px] font-mono text-primary-light truncate">{focusedImage.id.substring(0, 12)}...</span>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-3">
                                    <Button
                                        onClick={() => { handleDownloadMedia(focusedImage); }}
                                        className="w-full bg-white text-black hover:bg-white/90 font-black tracking-widest uppercase text-xs h-12"
                                    >
                                        <Icons.download size={16} className="mr-2" /> Download High Res
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => { handleRemix(focusedImage); setFocusedImage(null); }}
                                        className="w-full border-white/10 hover:bg-white/5 font-black tracking-widest uppercase text-[10px] h-12"
                                    >
                                        <Icons.history size={16} className="mr-2" /> Remix Configuration
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
