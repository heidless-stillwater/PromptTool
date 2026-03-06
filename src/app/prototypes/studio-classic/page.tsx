'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { PROMPT_CATEGORIES, buildPromptFromMadLibs, FEATURED_PROMPTS } from '@/lib/prompt-templates';
import { ImageQuality, AspectRatio, MadLibsSelection, CREDIT_COSTS, getGenerationCost, SUBSCRIPTION_PLANS, GeneratedImage, MediaModality } from '@/lib/types';
import { normalizeImageData } from '@/lib/image-utils';
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

export default function StudioClassicPage() {
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
    const [modelType, setModelType] = useState<'standard' | 'pro'>('standard');

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
            const isNewSet = searchParams.get('newset') === '1';
            if (isNewSet) {
                const freshId = generatePromptSetID();
                setPromptSetID(freshId);
                setSelectedCollectionIds([]);
                try {
                    const savedState = localStorage.getItem('generation_session_v1');
                    if (savedState) {
                        const parsed = JSON.parse(savedState);
                        parsed.promptSetID = freshId;
                        parsed.selectedCollectionIds = [];
                        localStorage.setItem('generation_session_v1', JSON.stringify(parsed));
                    }
                } catch (_) { }
                router.replace('/prototypes/studio-classic', { scroll: false });
                return;
            }

            let localTimestamp = 0;
            let localState: any = null;
            try {
                const savedState = localStorage.getItem('generation_session_v1');
                if (savedState) {
                    localState = JSON.parse(savedState);
                    localTimestamp = localState.updatedAt || 0;
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

            if (user) {
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const { db } = await import('@/lib/firebase');
                    const draftRef = doc(db, 'users', user.uid, 'settings', 'draft');
                    const draftSnap = await getDoc(draftRef);
                    if (draftSnap.exists()) {
                        const cloudData = draftSnap.data();
                        const cloudTimestamp = cloudData.updatedAt?.toMillis?.() || 0;
                        if (cloudTimestamp > localTimestamp) {
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
                            localStorage.setItem('generation_session_v1', JSON.stringify({ ...cloudData, updatedAt: cloudTimestamp }));
                        }
                    }
                } catch (e) {
                    console.warn('Failed to sync with cloud draft', e);
                }
            }
        };
        initSession();
    }, [user, searchParams, router]);

    useEffect(() => {
        const timestamp = Date.now();
        const stateToSave = { prompt, quality, aspectRatio, batchSize, negativePrompt, seed, guidanceScale, promptMode, madLibs, modality, promptSetID, selectedCollectionIds, updatedAt: timestamp };
        localStorage.setItem('generation_session_v1', JSON.stringify(stateToSave));
        if (user) {
            const saveToCloud = setTimeout(async () => {
                try {
                    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                    const { db } = await import('@/lib/firebase');
                    const draftRef = doc(db, 'users', user.uid, 'settings', 'draft');
                    const cleanedState = Object.fromEntries(Object.entries(stateToSave).map(([k, v]) => [k, v === undefined ? null : v]));
                    await setDoc(draftRef, { ...cleanedState, updatedAt: serverTimestamp() }, { merge: true });
                } catch (e) {
                    console.warn('Failed to save draft to cloud', e);
                }
            }, 2000);
            return () => clearTimeout(saveToCloud);
        }
    }, [prompt, quality, aspectRatio, batchSize, negativePrompt, seed, guidanceScale, promptMode, madLibs, modality, promptSetID, selectedCollectionIds, user]);

    const refImageId = searchParams.get('ref');
    const sidParam = searchParams.get('sid');
    const [referenceImage, setReferenceImage] = useState<any>(null);
    const [loadingReference, setLoadingReference] = useState(false);

    useEffect(() => {
        const loadReference = async () => {
            if (!refImageId || !user) return;
            setLoadingReference(true);
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                let imgRef = doc(db, 'users', user.uid, 'images', refImageId);
                let imgSnap = await getDoc(imgRef);
                let data: GeneratedImage | null = null;
                if (imgSnap.exists()) data = imgSnap.data() as GeneratedImage;
                else {
                    const communityRef = doc(db, 'leagueEntries', refImageId);
                    const communitySnap = await getDoc(communityRef);
                    if (communitySnap.exists()) data = communitySnap.data() as any;
                }
                if (data) {
                    if (data.prompt) setPrompt(data.prompt);
                    setPromptMode('freeform');
                    if (data.settings) {
                        if (data.settings.modality === 'video') { setModality('video'); setQuality('video'); }
                        else { setModality('image'); setQuality(data.settings.quality || 'standard'); }
                        if (data.settings.aspectRatio) setAspectRatio(data.settings.aspectRatio);
                        if (data.settings.negativePrompt) setNegativePrompt(data.settings.negativePrompt);
                        if (data.settings.seed !== undefined) setSeed(data.settings.seed);
                        if (data.settings.guidanceScale !== undefined) setGuidanceScale(data.settings.guidanceScale);
                        if (data.settings.negativePrompt || data.settings.seed !== undefined) setIsAdvancedOpen(true);
                    }
                    if (sidParam) setPromptSetID(sidParam); else setPromptSetID(generatePromptSetID());
                    try {
                        const response = await fetch(`/api/download?url=${encodeURIComponent(data.imageUrl)}`);
                        if (response.ok) {
                            const blob = await response.blob();
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64data = reader.result as string;
                                const base64 = base64data.split(',')[1];
                                setReferenceImage({ id: refImageId, url: data!.imageUrl, base64, mimeType: blob.type, prompt: data!.prompt, promptSetID: data!.promptSetID, collectionIds: data!.collectionIds || [], isVideo: !!(data!.videoUrl || data!.settings?.modality === 'video'), videoUrl: data!.videoUrl });
                                setLoadingReference(false);
                            };
                            reader.readAsDataURL(blob);
                        }
                    } catch (e) { setLoadingReference(false); }
                }
            } catch (e) { setLoadingReference(false); }
        };
        loadReference();
    }, [refImageId, user]);

    const handleRemix = (image: GeneratedImage) => {
        if (!image.settings) return;
        setPrompt(image.prompt);
        if (image.settings.modality === 'video') { setModality('video'); setQuality('video'); } else { setModality('image'); setQuality(image.settings.quality || 'standard'); }
        setAspectRatio(image.settings.aspectRatio || '1:1');
        if (image.settings.negativePrompt) setNegativePrompt(image.settings.negativePrompt);
        if (image.settings.seed !== undefined) setSeed(image.settings.seed ?? undefined);
        if (image.settings.guidanceScale !== undefined) setGuidanceScale(image.settings.guidanceScale);
        if (image.settings.negativePrompt || image.settings.seed !== undefined) setIsAdvancedOpen(true);
        if (image.promptSetID) setPromptSetID(image.promptSetID); else setPromptSetID(generatePromptSetID());
        setSelectedCollectionIds(image.collectionIds || []);
        setIsHistoryOpen(false);
        setError('');
        setWarning('Remixed settings from previous generation.');
    };

    const handleGenerate = async () => {
        if (!user) return;
        setGenerating(true);
        setError('');
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ prompt: promptMode === 'madlibs' ? buildPromptFromMadLibs(madLibs) : prompt, quality, aspectRatio, modality, batchSize, negativePrompt, seed, guidanceScale, promptSetID, collectionIds: selectedCollectionIds, referenceImage: referenceImage?.base64, modelType })
            });
            if (!response.ok) throw new Error(await response.text());
            const reader = response.body?.getReader();
            if (!reader) return;
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'complete') { setGeneratedImages(data.images); refreshCredits(); }
                    }
                }
            }
        } catch (err: any) { setError(err.message || 'Generation failed'); } finally { setGenerating(false); }
    };

    const isAdmin = profile?.role === 'admin';
    const availableCredits = credits?.balance || 0;
    const currentCost = getGenerationCost(modality, quality, modelType) * batchSize;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <GenerateHeader
                availableCredits={availableCredits}
                onHistoryOpen={() => setIsHistoryOpen(true)}
                isAdmin={isAdmin}
            />

            <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-8 animate-in slide-in-from-left-4 duration-700">
                        <PromptSection
                            prompt={prompt}
                            setPrompt={setPrompt}
                            madLibs={madLibs}
                            setMadLibs={setMadLibs}
                            promptMode={promptMode}
                            setPromptMode={setPromptMode}
                            handleEnhancePrompt={() => { }}
                            enhancing={false}
                            isCasual={false}
                            referenceImage={referenceImage}
                            loadingReference={loadingReference}
                            onRemoveReference={() => setReferenceImage(null)}
                            onUploadReference={(e) => { }}
                            onOpenGalleryPicker={() => { setGalleryPickerMode('reference'); setIsGalleryPickerOpen(true); }}
                            onOpenPromptPicker={() => { setGalleryPickerMode('prompt'); setIsGalleryPickerOpen(true); }}
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
                            allowedQualities={['standard', 'premium']}
                            isPro={true}
                            isCasual={false}
                            modelType={modelType}
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
                            modelType={modelType}
                            setModelType={setModelType}
                            isCasual={false}
                        />

                        {error && <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-xs font-bold uppercase">{error}</div>}

                        <Button
                            onClick={handleGenerate}
                            disabled={generating || availableCredits < currentCost}
                            variant="primary"
                            className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl"
                        >
                            {generating ? <Icons.spinner className="animate-spin" /> : `Manifest (${currentCost} Credits)`}
                        </Button>
                    </div>

                    <div className="animate-in slide-in-from-right-4 duration-700">
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
                            onDownload={() => { }}
                            promptSetID={promptSetID}
                        />
                    </div>
                </div>
            </main>

            <HistorySidebar
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                images={historyImages}
                loading={loadingHistory}
                onRemix={handleRemix}
            />

            <GalleryPickerModal
                isOpen={isGalleryPickerOpen}
                onClose={() => setIsGalleryPickerOpen(false)}
                onSelect={(img) => { }}
                mode={galleryPickerMode}
            />
        </div>
    );
}
