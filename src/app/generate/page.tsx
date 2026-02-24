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
import ConfirmationModal from '@/components/ConfirmationModal';
import GalleryPickerModal from '@/components/generate/GalleryPickerModal';

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

    // State
    const [promptMode, setPromptMode] = useState<PromptMode>(profile?.audienceMode === 'professional' ? 'freeform' : 'madlibs');
    const [prompt, setPrompt] = useState('');
    const [madLibs, setMadLibs] = useState<MadLibsSelection>({
        subject: '',
        action: '',
        style: '',
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
    const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

    // History & Remix state
    const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
    const [galleryPickerMode, setGalleryPickerMode] = useState<'reference' | 'prompt'>('reference');

    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize promptSetID on mount and hydrate state
    useEffect(() => {
        const initSession = async () => {
            // If ?newset=1 is present, start a fresh set and clean the URL
            const isNewSet = searchParams.get('newset') === '1';
            if (isNewSet) {
                const freshId = generatePromptSetID();
                setPromptSetID(freshId);
                setSelectedCollectionIds([]);
                // Wipe any cached promptSetID from local draft so it doesn't re-load
                try {
                    const savedState = localStorage.getItem('generation_session_v1');
                    if (savedState) {
                        const parsed = JSON.parse(savedState);
                        parsed.promptSetID = freshId;
                        parsed.selectedCollectionIds = [];
                        localStorage.setItem('generation_session_v1', JSON.stringify(parsed));
                    }
                } catch (_) { }
                router.replace('/generate', { scroll: false });
                return;
            }

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
                    if (localState.promptSetID) setPromptSetID(localState.promptSetID);
                    else setPromptSetID(generatePromptSetID());
                    if (localState.selectedCollectionIds) setSelectedCollectionIds(localState.selectedCollectionIds);
                } else {
                    setPromptSetID(generatePromptSetID());
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
                            if (cloudData.promptSetID) setPromptSetID(cloudData.promptSetID);
                            if (cloudData.selectedCollectionIds) setSelectedCollectionIds(cloudData.selectedCollectionIds);

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
    }, [user, searchParams, router]); // Re-run when user logs in to sync their draft

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
            promptSetID,
            selectedCollectionIds,
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

                    // Filter out undefined values as Firestore doesn't support them
                    const cleanedState = Object.fromEntries(
                        Object.entries(stateToSave).map(([k, v]) => [k, v === undefined ? null : v])
                    );

                    await setDoc(draftRef, {
                        ...cleanedState,
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
        promptSetID,
        selectedCollectionIds,
        user,
    ]);

    // Reference image for Img2Img variations
    const refImageId = searchParams.get('ref');
    const sidParam = searchParams.get('sid');
    const [referenceImage, setReferenceImage] = useState<{
        id: string;
        url: string;           // Display URL (thumbnail/still frame or image)
        base64?: string;
        mimeType?: string;
        prompt?: string;
        promptSetID?: string;
        collectionIds?: string[];
        isVideo?: boolean;     // True when the source is a video entry
        videoUrl?: string;     // Original video URL for display preview
    } | null>(null);
    const [loadingReference, setLoadingReference] = useState(false);

    // Helper to extract first frame from video and upload as thumbnail
    const createVideoThumbnail = async (imageId: string, videoUrl: string) => {
        try {
            // Proxy GCS videos through our API to bypass browser CORS canvas taint restrictions
            const isGcsUrl = videoUrl.includes('storage.googleapis.com') || videoUrl.includes('storage.cloud.google.com');
            const proxiedUrl = isGcsUrl
                ? `/api/proxy/video?url=${encodeURIComponent(videoUrl)}`
                : videoUrl;

            const video = document.createElement('video');
            video.src = proxiedUrl;
            // No crossOrigin needed — proxy serves from same origin
            video.muted = true;
            video.playsInline = true;

            // Wait for video metadata with timeout
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Video load timed out')), 15000);
                video.onloadeddata = () => { clearTimeout(timeout); resolve(undefined); };
                video.onerror = () => { clearTimeout(timeout); reject(new Error('Video load error')); };
                video.load();
            });

            // Seek to 0.1s to ensure we have a frame (0.0 can sometimes be black)
            video.currentTime = 0.1;
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => resolve(), 3000); // fallback if onseeked never fires
                video.onseeked = () => { clearTimeout(timeout); resolve(); };
            });

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            let thumbnailBase64: string;
            try {
                thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.8);
            } catch (corsErr) {
                // Canvas may be tainted if the video URL has CORS restrictions
                console.warn('Canvas tainted by CORS, cannot extract thumbnail frame:', corsErr);
                return;
            }

            const duration = video.duration;

            // Get auth token for API call
            const token = await user?.getIdToken();
            if (!token) {
                console.warn('No auth token available for thumbnail upload');
                return;
            }

            // Upload to API
            const response = await fetch('/api/generate/thumbnail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ imageId, thumbnailBase64, duration })
            });

            if (!response.ok) {
                console.warn('Failed to upload thumbnail:', await response.text());
            } else {
                const data = await response.json();
                console.log('Thumbnail uploaded successfully for', imageId);

                // Update local state so UI reflects new thumbnail
                if (data.thumbnailUrl) {
                    setGeneratedImages(prev => prev.map(img =>
                        img.id === imageId ? { ...img, imageUrl: data.thumbnailUrl, duration } : img
                    ));
                    setHistoryImages(prev => prev.map(img =>
                        img.id === imageId ? { ...img, imageUrl: data.thumbnailUrl, duration } : img
                    ));
                }
            }
        } catch (err) {
            console.error('Error creating video thumbnail:', err);
        }
    };

    // URL Parameter handling (Prompt/Style pre-fill)
    useEffect(() => {
        const promptParam = searchParams.get('prompt');
        const styleParam = searchParams.get('style');

        if (promptParam) {
            setPrompt(decodeURIComponent(promptParam));
            setPromptMode('freeform');
            // Clear parameter after consumption to avoid re-triggering on remix/history etc
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('prompt');
            router.replace(`/generate?${newParams.toString()}`, { scroll: false });
        } else if (styleParam) {
            // Future logic for style lookup if needed
            setPromptMode('featured');
        }
    }, [searchParams, router]);

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
                    setPromptMode('freeform'); // Variations should default to freeform for precision

                    if (data.settings) {
                        const incomingQuality = data.settings.quality;
                        const incomingModality = data.settings.modality;

                        if (incomingModality === 'video') {
                            setModality('video');
                            setQuality('video');
                        } else {
                            setModality('image');
                            setQuality((incomingQuality === 'video' ? 'standard' : incomingQuality) || 'standard');
                        }

                        if (data.settings.aspectRatio) setAspectRatio(data.settings.aspectRatio);
                        if (data.settings.negativePrompt) setNegativePrompt(data.settings.negativePrompt);
                        if (data.settings.seed !== undefined) setSeed(data.settings.seed);
                        if (data.settings.guidanceScale !== undefined) setGuidanceScale(data.settings.guidanceScale);

                        // Open advanced settings if we have complex settings
                        if (data.settings.negativePrompt || data.settings.seed !== undefined) {
                            setIsAdvancedOpen(true);
                        }
                    }

                    // Use provided 'sid' if available (e.g. from "Your Gallery" variations)
                    // otherwise generate a new promptSetID (e.g. from "Community Hub" variations)
                    if (sidParam) {
                        setPromptSetID(sidParam);
                    } else {
                        setPromptSetID(generatePromptSetID());
                    }
                    setSelectedCollectionIds([]);

                    // Convert to base64 for the API
                    // For videos: if imageUrl is a video file, extract a still frame via canvas proxy
                    try {
                        const isVideoEntry = !!(data.videoUrl || data.settings?.modality === 'video');
                        const imageUrlIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(data.imageUrl || '');

                        if (isVideoEntry && imageUrlIsVideo) {
                            // imageUrl is a raw video URL — extract a still frame via canvas
                            const sourceVideoUrl = data.videoUrl || data.imageUrl;
                            const proxiedUrl = `/api/proxy/video?url=${encodeURIComponent(sourceVideoUrl)}`;

                            const video = document.createElement('video');
                            video.src = proxiedUrl;
                            video.muted = true;
                            video.playsInline = true;

                            await new Promise((resolve, reject) => {
                                const timeout = setTimeout(() => reject(new Error('Video load timeout')), 15000);
                                video.onloadeddata = () => { clearTimeout(timeout); resolve(undefined); };
                                video.onerror = () => { clearTimeout(timeout); reject(new Error('Video load error')); };
                                video.load();
                            });

                            video.currentTime = 0.1;
                            await new Promise<void>((resolve) => {
                                const timeout = setTimeout(() => resolve(), 3000);
                                video.onseeked = () => { clearTimeout(timeout); resolve(); };
                            });

                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth || 640;
                            canvas.height = video.videoHeight || 360;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                const frameDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                                const base64 = frameDataUrl.split(',')[1];

                                setReferenceImage({
                                    id: refImageId,
                                    url: frameDataUrl,       // Use the extracted frame as preview
                                    base64,
                                    mimeType: 'image/jpeg',
                                    prompt: data!.prompt,
                                    promptSetID: data!.promptSetID,
                                    collectionIds: data!.collectionIds || (data!.collectionId ? [data!.collectionId] : []),
                                    isVideo: true,
                                    videoUrl: data!.videoUrl || data!.imageUrl,
                                });
                            }
                            setLoadingReference(false);
                        } else {
                            // Standard image or video with thumbnail — download as usual
                            const downloadUrl = isVideoEntry && !imageUrlIsVideo
                                ? data.imageUrl  // imageUrl is already a thumbnail
                                : data.imageUrl;

                            const response = await fetch(`/api/download?url=${encodeURIComponent(downloadUrl)}`);
                            if (response.ok) {
                                const blob = await response.blob();
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    const base64data = reader.result as string;
                                    const base64 = base64data.split(',')[1];
                                    const mimeType = blob.type;
                                    setReferenceImage({
                                        id: refImageId,
                                        url: data!.imageUrl,
                                        base64,
                                        mimeType,
                                        prompt: data!.prompt,
                                        promptSetID: data!.promptSetID,
                                        collectionIds: data!.collectionIds || (data!.collectionId ? [data!.collectionId] : []),
                                        isVideo: isVideoEntry,
                                        videoUrl: data!.videoUrl,
                                    });
                                    setLoadingReference(false);
                                };
                                reader.readAsDataURL(blob);
                            } else {
                                throw new Error('Failed to fetch image for reference');
                            }
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
        if (profile && !refImageId) {
            setPromptMode(profile.audienceMode === 'professional' ? 'freeform' : 'madlibs');
        }
    }, [profile?.audienceMode, refImageId]);

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

        const incomingQuality = image.settings.quality;
        const incomingModality = image.settings.modality;

        if (incomingModality === 'video') {
            setModality('video');
            setQuality('video');
        } else {
            setModality('image');
            setQuality((incomingQuality === 'video' ? 'standard' : incomingQuality) || 'standard');
        }

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

        // Maintain the same Prompt Set Identifier to ensure it is saved as a new variation within the current promptset
        if (image.promptSetID) {
            setPromptSetID(image.promptSetID);
        } else {
            setPromptSetID(generatePromptSetID());
        }

        const colIds = image.collectionIds || (image.collectionId ? [image.collectionId] : []);
        setSelectedCollectionIds(colIds);

        setIsHistoryOpen(false);
        setError('');
        setWarning('Remixed settings from previous generation.');
    };

    // Reference Image Upload Handler
    const handleUploadReference = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1];
            setReferenceImage({
                id: `upload-${Date.now()}`,
                url: base64data,
                base64,
                mimeType: file.type
            });
        };
        reader.readAsDataURL(file);
    };

    // Reference Image Gallery Selection Handler
    const handleSelectGalleryImage = async (image: GeneratedImage) => {
        setIsGalleryPickerOpen(false);

        if (galleryPickerMode === 'reference') {
            setLoadingReference(true);
            try {
                const isVideoEntry = !!(image.videoUrl || image.settings?.modality === 'video');
                const imageUrlIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(image.imageUrl || '');

                if (isVideoEntry && imageUrlIsVideo) {
                    // Extract a still frame from the video via proxy
                    const sourceVideoUrl = image.videoUrl || image.imageUrl;
                    const proxiedUrl = `/api/proxy/video?url=${encodeURIComponent(sourceVideoUrl)}`;

                    const video = document.createElement('video');
                    video.src = proxiedUrl;
                    video.muted = true;
                    video.playsInline = true;

                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Video load timeout')), 15000);
                        video.onloadeddata = () => { clearTimeout(timeout); resolve(undefined); };
                        video.onerror = () => { clearTimeout(timeout); reject(new Error('Video load error')); };
                        video.load();
                    });

                    video.currentTime = 0.1;
                    await new Promise<void>((resolve) => {
                        const timeout = setTimeout(() => resolve(), 3000);
                        video.onseeked = () => { clearTimeout(timeout); resolve(); };
                    });

                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 360;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        const base64 = frameDataUrl.split(',')[1];

                        setReferenceImage({
                            id: image.id,
                            url: frameDataUrl,
                            base64,
                            mimeType: 'image/jpeg',
                            prompt: image.prompt,
                            promptSetID: image.promptSetID,
                            collectionIds: image.collectionIds || (image.collectionId ? [image.collectionId] : []),
                            isVideo: true,
                            videoUrl: image.videoUrl || image.imageUrl,
                        });

                        if (image.prompt) setPrompt(image.prompt);
                        if (image.settings) {
                            const incomingQuality = image.settings.quality;
                            const incomingModality = image.settings.modality;

                            if (incomingModality === 'video') {
                                setModality('video');
                                setQuality('video');
                            } else {
                                setModality('image');
                                setQuality((incomingQuality === 'video' ? 'standard' : incomingQuality) || 'standard');
                            }

                            if (image.settings.aspectRatio) setAspectRatio(image.settings.aspectRatio);
                            if (image.settings.negativePrompt) setNegativePrompt(image.settings.negativePrompt);
                            if (image.settings.seed !== undefined) setSeed(image.settings.seed);
                            if (image.settings.guidanceScale !== undefined) setGuidanceScale(image.settings.guidanceScale);

                            // Open advanced settings if we have complex settings
                            if (image.settings.negativePrompt || image.settings.seed !== undefined) {
                                setIsAdvancedOpen(true);
                            }
                        }
                    }
                    setLoadingReference(false);
                } else {
                    const response = await fetch(`/api/download?url=${encodeURIComponent(image.imageUrl)}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            const base64 = base64data.split(',')[1];
                            const mimeType = blob.type;
                            setReferenceImage({
                                id: image.id,
                                url: image.imageUrl,
                                base64,
                                mimeType,
                                prompt: image.prompt,
                                promptSetID: image.promptSetID,
                                collectionIds: image.collectionIds || (image.collectionId ? [image.collectionId] : []),
                                isVideo: isVideoEntry,
                                videoUrl: image.videoUrl,
                            });

                            if (image.prompt) setPrompt(image.prompt);
                            if (image.settings) {
                                const incomingQuality = image.settings.quality;
                                const incomingModality = image.settings.modality;

                                if (incomingModality === 'video') {
                                    setModality('video');
                                    setQuality('video');
                                } else {
                                    setModality('image');
                                    setQuality((incomingQuality === 'video' ? 'standard' : incomingQuality) || 'standard');
                                }

                                if (image.settings.aspectRatio) setAspectRatio(image.settings.aspectRatio);
                                if (image.settings.negativePrompt) setNegativePrompt(image.settings.negativePrompt);
                                if (image.settings.seed !== undefined) setSeed(image.settings.seed);
                                if (image.settings.guidanceScale !== undefined) setGuidanceScale(image.settings.guidanceScale);

                                // Open advanced settings if we have complex settings
                                if (image.settings.negativePrompt || image.settings.seed !== undefined) {
                                    setIsAdvancedOpen(true);
                                }
                            }
                            setLoadingReference(false);
                        };
                        reader.readAsDataURL(blob);
                    } else {
                        throw new Error('Failed to fetch image for reference');
                    }
                }
            } catch (err) {
                console.error('Error loading gallery image as reference:', err);
                setError('Failed to load gallery image');
                setLoadingReference(false);
            }
        } else {
            // Just import prompt and settings
            if (image.prompt) setPrompt(image.prompt);
            if (image.settings) {
                if (image.settings.quality) setQuality(image.settings.quality);
                if (image.settings.aspectRatio) setAspectRatio(image.settings.aspectRatio);
                if (image.settings.modality) setModality(image.settings.modality);
                if (image.settings.negativePrompt) setNegativePrompt(image.settings.negativePrompt);
                if (image.settings.seed !== undefined) setSeed(image.settings.seed);
                if (image.settings.guidanceScale !== undefined) setGuidanceScale(image.settings.guidanceScale);
            }
            setWarning('Imported prompt and settings from gallery.');
        }
    };

    // Calculate available credits
    const availableCredits = credits
        ? credits.balance + Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    const currentCost = modality === 'video' ? CREDIT_COSTS.video : (CREDIT_COSTS[quality] * batchSize);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'su';
    const isPro = profile?.subscription === 'pro' || isAdmin;

    // Check if quality is allowed for subscription
    const allowedQualities = profile
        ? (isAdmin ? ['standard', 'high', 'ultra'] : SUBSCRIPTION_PLANS[profile.subscription].allowedQualities)
        : ['standard'];

    // Get final prompt based on mode
    const getFinalPrompt = useCallback((): string => {
        let finalPrompt = '';

        if (promptMode === 'freeform') {
            finalPrompt = prompt;
        } else if (promptMode === 'madlibs') {
            finalPrompt = buildPromptFromMadLibs(madLibs);
            return finalPrompt; // buildPromptFromMadLibs already includes style/mood
        } else {
            finalPrompt = prompt; // Featured prompt
        }

        // Append Style and Mood for Freeform and Featured modes
        if (madLibs.style) {
            finalPrompt += `, ${madLibs.style} style`;
        }
        if (madLibs.mood) {
            finalPrompt += `, ${madLibs.mood.toLowerCase()} mood`;
        }
        return finalPrompt;
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
                body: JSON.stringify({
                    prompt,
                    style: madLibs.style,
                    mood: madLibs.mood
                }),
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

    // Actual generation logic
    const executeGeneration = useCallback(async () => {
        setShowConfirmModal(false);
        const finalPrompt = getFinalPrompt();

        setError('');
        setWarning('');
        setGenerating(true);
        setGeneratedImages([]);
        setEditedImage(null);
        setSelectedImageIndex(0);

        try {
            if (!user) {
                setError('Please sign in to generate images');
                setGenerating(false);
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
                    quality: (modality === 'image' && quality === 'video') ? 'standard' : quality,
                    aspectRatio,
                    promptType: promptMode === 'madlibs' ? 'madlibs' : 'freeform',
                    madlibsData: madLibs, // Always send current madLibs for metadata/style/vibe
                    count: batchSize,
                    ...(isPro && {
                        seed,
                        negativePrompt: negativePrompt.trim() || undefined,
                        guidanceScale,
                    }),
                    referenceImage: referenceImage?.base64,
                    referenceMimeType: referenceImage?.mimeType,
                    sourceImageId: referenceImage?.id,
                    promptSetID: promptSetID.trim() || undefined,
                    collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
                    modality,
                    referenceImageUrl: referenceImage?.url,
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
                                if (data.image.settings?.modality === 'video' || data.image.videoUrl) {
                                    createVideoThumbnail(data.image.id, data.image.videoUrl || data.image.imageUrl);
                                }
                            } else if (data.type === 'complete') {
                                setGeneratedImages(data.images || []);
                                if (data.warning) {
                                    setWarning(data.warning);
                                }
                                await refreshCredits();
                                await fetchHistory();
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
        getFinalPrompt,
        modality,
        selectedCollectionIds
    ]);

    // Handle Generation Trigger (Shows modal first)
    const handleGenerate = useCallback(() => {
        const finalPrompt = getFinalPrompt();

        if (!finalPrompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        const cost = modality === 'video'
            ? CREDIT_COSTS.video
            : ((CREDIT_COSTS[quality as ImageQuality] || CREDIT_COSTS.standard) * batchSize);
        if (availableCredits < cost) {
            setError(`Insufficient credits. Need ${cost}, have ${availableCredits}`);
            return;
        }

        setShowConfirmModal(true);
    }, [getFinalPrompt, quality, batchSize, modality, availableCredits]);

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
    const isProInUI = profile.subscription === 'pro' || profile.role === 'admin' || profile.role === 'su';

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
                                // If there's a ref in the URL, clear it
                                if (searchParams.get('ref')) {
                                    const newParams = new URLSearchParams(searchParams.toString());
                                    newParams.delete('ref');
                                    router.replace(`/generate?${newParams.toString()}`, { scroll: false });
                                }
                            }}
                            onUploadReference={handleUploadReference}
                            onOpenGalleryPicker={() => {
                                setGalleryPickerMode('reference');
                                setIsGalleryPickerOpen(true);
                            }}
                            onOpenPromptPicker={() => {
                                setGalleryPickerMode('prompt');
                                setIsGalleryPickerOpen(true);
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
                            isPro={isProInUI}
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
                            id="manifest-button"
                            onClick={handleGenerate}
                            disabled={generating || loadingReference || availableCredits < currentCost}
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
                            promptSetID={promptSetID}
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

            <ConfirmationModal
                isOpen={showConfirmModal}
                title="Confirm Resource Spend"
                onConfirm={executeGeneration}
                onCancel={() => setShowConfirmModal(false)}
                confirmLabel="Let's Manifest"
                cancelLabel="Not Yet"
            >
                <div className="space-y-4">
                    <p>You are about to spend <span className="text-primary font-black">{currentCost} credits</span> to manifest this creation.</p>
                    <div className="p-4 bg-background-secondary rounded-xl border border-border flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground-muted">Remaining Balance</span>
                        <div className="flex items-center gap-1">
                            <span className="font-black text-primary">{availableCredits - currentCost}</span>
                            <Icons.zap size={12} className="text-primary" />
                        </div>
                    </div>
                </div>
            </ConfirmationModal>

            <GalleryPickerModal
                isOpen={isGalleryPickerOpen}
                onClose={() => setIsGalleryPickerOpen(false)}
                onSelect={handleSelectGalleryImage}
                mode={galleryPickerMode}
            />
        </div>
    );
}
