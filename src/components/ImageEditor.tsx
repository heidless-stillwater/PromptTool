'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ImageEditorProps {
    imageUrl: string;
    imageId: string;
    onClose: () => void;
    onSave: (dataUrl: string, saveAsNew: boolean) => void;
}

type EditorTool = 'none' | 'crop' | 'adjust' | 'filter';

interface Adjustments {
    brightness: number;   // -100 to 100
    contrast: number;     // -100 to 100
    saturation: number;   // -100 to 100
}

interface CropRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

const PRESET_FILTERS: { name: string; icon: string; adjustments: Adjustments; overlayColor?: string }[] = [
    { name: 'Original', icon: '🔄', adjustments: { brightness: 0, contrast: 0, saturation: 0 } },
    { name: 'Vivid', icon: '🌈', adjustments: { brightness: 5, contrast: 20, saturation: 40 } },
    { name: 'Warm', icon: '🌅', adjustments: { brightness: 10, contrast: 10, saturation: 15 }, overlayColor: 'rgba(255, 140, 50, 0.08)' },
    { name: 'Cool', icon: '❄️', adjustments: { brightness: 0, contrast: 10, saturation: -10 }, overlayColor: 'rgba(50, 100, 255, 0.08)' },
    { name: 'B&W', icon: '⚫', adjustments: { brightness: 5, contrast: 15, saturation: -100 } },
    { name: 'Vintage', icon: '📷', adjustments: { brightness: -5, contrast: -10, saturation: -30 }, overlayColor: 'rgba(180, 140, 80, 0.12)' },
    { name: 'Dramatic', icon: '🎭', adjustments: { brightness: -10, contrast: 40, saturation: 10 } },
    { name: 'Fade', icon: '🌫️', adjustments: { brightness: 15, contrast: -20, saturation: -15 } },
];

export default function ImageEditor({ imageUrl, imageId, onClose, onSave }: ImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const originalImageRef = useRef<HTMLImageElement | null>(null);
    const firstLoadImageRef = useRef<HTMLImageElement | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTool, setActiveTool] = useState<EditorTool>('none');
    const [saving, setSaving] = useState(false);

    // Adjustments
    const [adjustments, setAdjustments] = useState<Adjustments>({ brightness: 0, contrast: 0, saturation: 0 });
    const [activeFilter, setActiveFilter] = useState('Original');

    // Rotation & Flip
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);

    // Crop
    const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
    const [appliedCrops, setAppliedCrops] = useState<ImageData[]>([]); // History for undo

    // History for undo
    const [history, setHistory] = useState<{ adjustments: Adjustments; rotation: number; flipH: boolean; flipV: boolean; filter: string }[]>([]);

    // Load image via proxy to avoid CORS
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}`;
        img.src = proxyUrl;

        img.onload = () => {
            originalImageRef.current = img;
            if (!firstLoadImageRef.current) {
                firstLoadImageRef.current = img;
            }
            setLoading(false);
        };

        img.onerror = () => {
            setError('Failed to load image for editing');
            setLoading(false);
        };
    }, [imageUrl]);

    // Offscreen buffer for processed image
    const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [lastProcessedState, setLastProcessedState] = useState<string>('');

    // Re-render whenever state changes
    useEffect(() => {
        if (!loading && originalImageRef.current) {
            updateBaseImage();
        }
    }, [loading, adjustments, rotation, flipH, flipV, activeFilter]);

    // Redraw the main canvas whenever the base image or overlay state changes
    useEffect(() => {
        if (!loading) {
            renderCanvas();
        }
    }, [activeTool, cropRegion, lastProcessedState]);

    // Get the display scaling factor (canvas size vs displayed size)
    const getDisplayScale = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return 1;
        const displayWidth = canvas.getBoundingClientRect().width;
        if (displayWidth === 0) return 1;
        return canvas.width / displayWidth;
    }, []);

    const updateBaseImage = useCallback(() => {
        const img = originalImageRef.current;
        if (!img) return;

        // Create or get buffer canvas
        if (!bufferCanvasRef.current) {
            bufferCanvasRef.current = document.createElement('canvas');
        }
        const buffer = bufferCanvasRef.current;
        const bctx = buffer.getContext('2d', { willReadFrequently: true });
        if (!bctx) return;

        // Calculate dimensions based on rotation
        const isRotated = rotation === 90 || rotation === 270;
        const srcW = img.width;
        const srcH = img.height;
        buffer.width = isRotated ? srcH : srcW;
        buffer.height = isRotated ? srcW : srcH;

        // Apply transforms
        bctx.save();
        bctx.translate(buffer.width / 2, buffer.height / 2);
        bctx.rotate((rotation * Math.PI) / 180);
        bctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        bctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
        bctx.restore();

        // Apply pixel adjustments (brightness, contrast, saturation)
        if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) {
            const imageData = bctx.getImageData(0, 0, buffer.width, buffer.height);
            const data = imageData.data;

            const brightnessOffset = adjustments.brightness * 2.55;
            const contrastFactor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
            const saturationFactor = 1 + adjustments.saturation / 100;

            for (let i = 0; i < data.length; i += 4) {
                // Brightness
                data[i] += brightnessOffset;
                data[i + 1] += brightnessOffset;
                data[i + 2] += brightnessOffset;

                // Contrast
                data[i] = contrastFactor * (data[i] - 128) + 128;
                data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128;
                data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128;

                // Saturation
                const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                data[i] = gray + saturationFactor * (data[i] - gray);
                data[i + 1] = gray + saturationFactor * (data[i + 1] - gray);
                data[i + 2] = gray + saturationFactor * (data[i + 2] - gray);

                // Clamp
                data[i] = Math.max(0, Math.min(255, data[i]));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
            }
            bctx.putImageData(imageData, 0, 0);
        }

        // Apply overlay color
        const currentFilter = PRESET_FILTERS.find(f => f.name === activeFilter);
        if (currentFilter?.overlayColor) {
            bctx.fillStyle = currentFilter.overlayColor;
            bctx.fillRect(0, 0, buffer.width, buffer.height);
        }

        setLastProcessedState(Date.now().toString());
    }, [adjustments, rotation, flipH, flipV, activeFilter]);
    // Apply adjustments and render to canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const buffer = bufferCanvasRef.current;
        if (!canvas || !buffer) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = buffer.width;
        canvas.height = buffer.height;

        // Clear and draw base processed image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buffer, 0, 0);

        // Draw crop overlay if active
        if (activeTool === 'crop' && cropRegion) {
            const displayScale = getDisplayScale();
            const scaledCrop = {
                x: cropRegion.x * displayScale,
                y: cropRegion.y * displayScale,
                width: cropRegion.width * displayScale,
                height: cropRegion.height * displayScale,
            };

            // Darken outside crop area
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            // Top
            ctx.fillRect(0, 0, canvas.width, scaledCrop.y);
            // Bottom
            ctx.fillRect(0, scaledCrop.y + scaledCrop.height, canvas.width, canvas.height - scaledCrop.y - scaledCrop.height);
            // Left
            ctx.fillRect(0, scaledCrop.y, scaledCrop.x, scaledCrop.height);
            // Right
            ctx.fillRect(scaledCrop.x + scaledCrop.width, scaledCrop.y, canvas.width - scaledCrop.x - scaledCrop.width, scaledCrop.height);

            // Crop border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height);

            // Rule of thirds lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            for (let i = 1; i < 3; i++) {
                // Vertical
                ctx.beginPath();
                ctx.moveTo(scaledCrop.x + (scaledCrop.width / 3) * i, scaledCrop.y);
                ctx.lineTo(scaledCrop.x + (scaledCrop.width / 3) * i, scaledCrop.y + scaledCrop.height);
                ctx.stroke();
                // Horizontal
                ctx.beginPath();
                ctx.moveTo(scaledCrop.x, scaledCrop.y + (scaledCrop.height / 3) * i);
                ctx.lineTo(scaledCrop.x + scaledCrop.width, scaledCrop.y + (scaledCrop.height / 3) * i);
                ctx.stroke();
            }
        }
    }, [activeTool, cropRegion, getDisplayScale]);

    // Crop handlers
    const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'crop') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCropStart({ x, y });
        setIsCropping(true);
        setCropRegion({ x, y, width: 0, height: 0 });
    };

    const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isCropping || !cropStart) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRegion: CropRegion = {
            x: Math.min(cropStart.x, x),
            y: Math.min(cropStart.y, y),
            width: Math.abs(x - cropStart.x),
            height: Math.abs(y - cropStart.y),
        };
        setCropRegion(newRegion);
    };

    const handleCropMouseUp = () => {
        setIsCropping(false);
        setCropStart(null);
    };

    const applyCrop = () => {
        const canvas = canvasRef.current;
        const img = originalImageRef.current;
        if (!canvas || !img || !cropRegion) return;

        const displayScale = getDisplayScale();
        const scaledCrop = {
            x: Math.round(cropRegion.x * displayScale),
            y: Math.round(cropRegion.y * displayScale),
            width: Math.round(cropRegion.width * displayScale),
            height: Math.round(cropRegion.height * displayScale),
        };

        if (scaledCrop.width < 10 || scaledCrop.height < 10) return;

        // Get the cropped region from the current canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Save current state for undo
        setAppliedCrops(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);

        const croppedData = ctx.getImageData(scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height);

        // Create a temp canvas with the cropped image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = scaledCrop.width;
        tempCanvas.height = scaledCrop.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        tempCtx.putImageData(croppedData, 0, 0);

        // Replace original image ref with the cropped version
        const newImg = new Image();
        newImg.src = tempCanvas.toDataURL('image/png');
        newImg.onload = () => {
            originalImageRef.current = newImg;
            setCropRegion(null);
            setActiveTool('none');
            // Re-process the new cropped image into the buffer
            updateBaseImage();
        };
    };

    // Rotation
    const rotateRight = () => {
        pushHistory();
        setRotation(prev => (prev + 90) % 360);
    };

    const rotateLeft = () => {
        pushHistory();
        setRotation(prev => (prev + 270) % 360);
    };

    // Flip
    const toggleFlipH = () => {
        pushHistory();
        setFlipH(prev => !prev);
    };

    const toggleFlipV = () => {
        pushHistory();
        setFlipV(prev => !prev);
    };

    // History
    const pushHistory = () => {
        setHistory(prev => [...prev, { adjustments: { ...adjustments }, rotation, flipH, flipV, filter: activeFilter }]);
    };

    const undo = () => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setHistory(h => h.slice(0, -1));
        setAdjustments(prev.adjustments);
        setRotation(prev.rotation);
        setFlipH(prev.flipH);
        setFlipV(prev.flipV);
        setActiveFilter(prev.filter);
    };

    const resetAll = () => {
        if (firstLoadImageRef.current) {
            originalImageRef.current = firstLoadImageRef.current;
        }
        setAdjustments({ brightness: 0, contrast: 0, saturation: 0 });
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setActiveFilter('Original');
        setCropRegion(null);
        setActiveTool('none');
        setHistory([]);
        setAppliedCrops([]);
        updateBaseImage();
    };

    // Apply filter preset
    const applyFilter = (filter: typeof PRESET_FILTERS[0]) => {
        pushHistory();
        setAdjustments(filter.adjustments);
        setActiveFilter(filter.name);
    };

    // Adjustment slider change
    const handleAdjustmentChange = (key: keyof Adjustments, value: number) => {
        if (activeFilter !== 'Original') {
            setActiveFilter('Original');
        }
        setAdjustments(prev => ({ ...prev, [key]: value }));
    };

    // Export final image
    const handleSave = async (saveAsNew: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setSaving(true);
        try {
            // Re-render without crop overlay
            const tempActiveTool = activeTool;
            setActiveTool('none');

            // Wait for re-render
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = canvas.toDataURL('image/png', 1.0);
            onSave(dataUrl, saveAsNew);
        } catch (err) {
            console.error('Failed to export image:', err);
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0 || rotation !== 0 || flipH || flipV || appliedCrops.length > 0;

    if (loading) {
        return (
            <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-white/60 font-medium animate-pulse">Loading editor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="text-6xl">❌</div>
                    <p className="text-white/80">{error}</p>
                    <button onClick={onClose} className="btn-primary px-6 py-2">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col">
            {/* Header Toolbar */}
            <header className="h-14 bg-[#1a1a2e] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                        title="Close Editor"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="h-6 w-px bg-white/20" />
                    <h2 className="text-white font-bold text-sm tracking-wide">✏️ Image Editor</h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* Undo */}
                    <button
                        onClick={undo}
                        disabled={history.length === 0}
                        className="text-white/70 hover:text-white disabled:text-white/20 transition-colors p-2 rounded-lg hover:bg-white/10 disabled:hover:bg-transparent"
                        title="Undo"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    {/* Reset */}
                    <button
                        onClick={resetAll}
                        disabled={!hasChanges}
                        className="text-white/70 hover:text-white disabled:text-white/20 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10 disabled:hover:bg-transparent text-xs font-bold"
                    >
                        Reset
                    </button>

                    <div className="h-6 w-px bg-white/20" />

                    {/* Save buttons */}
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving || !hasChanges}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                    >
                        {saving ? 'Saving...' : 'Save as Copy'}
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving || !hasChanges}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-primary/30 disabled:opacity-30"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </header>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Tool Panel */}
                <aside className="w-16 bg-[#1a1a2e] border-r border-white/10 flex flex-col items-center py-4 gap-1 flex-shrink-0">
                    {[
                        { tool: 'crop' as EditorTool, icon: '✂️', label: 'Crop' },
                        { tool: 'adjust' as EditorTool, icon: '🎨', label: 'Adjust' },
                        { tool: 'filter' as EditorTool, icon: '✨', label: 'Filters' },
                    ].map(({ tool, icon, label }) => (
                        <button
                            key={tool}
                            onClick={() => setActiveTool(activeTool === tool ? 'none' : tool)}
                            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${activeTool === tool
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            title={label}
                        >
                            <span className="text-lg">{icon}</span>
                            <span className="text-[9px] font-bold uppercase tracking-tight">{label}</span>
                        </button>
                    ))}

                    <div className="w-8 h-px bg-white/10 my-2" />

                    {/* Transform Tools */}
                    <button onClick={rotateLeft} className="w-10 h-10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center" title="Rotate Left">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={rotateRight} className="w-10 h-10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center" title="Rotate Right">
                        <svg className="w-5 h-5 scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={toggleFlipH} className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center ${flipH ? 'bg-primary/30 text-primary' : 'text-white/60 hover:text-white hover:bg-white/10'}`} title="Flip Horizontal">
                        <span className="text-sm font-bold">↔</span>
                    </button>
                    <button onClick={toggleFlipV} className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center ${flipV ? 'bg-primary/30 text-primary' : 'text-white/60 hover:text-white hover:bg-white/10'}`} title="Flip Vertical">
                        <span className="text-sm font-bold">↕</span>
                    </button>
                </aside>

                {/* Canvas Area */}
                <div className="flex-1 flex items-center justify-center bg-[#0d0d1a] p-8 overflow-hidden relative">
                    <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        style={{ cursor: activeTool === 'crop' ? 'crosshair' : 'default' }}
                        onMouseDown={handleCropMouseDown}
                        onMouseMove={handleCropMouseMove}
                        onMouseUp={handleCropMouseUp}
                        onMouseLeave={handleCropMouseUp}
                    />

                    {/* Crop Apply Button */}
                    {activeTool === 'crop' && cropRegion && cropRegion.width > 5 && cropRegion.height > 5 && !isCropping && (
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <button
                                onClick={() => { setCropRegion(null); }}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyCrop}
                                className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/30 transition-all"
                            >
                                Apply Crop ✓
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Contextual Panel */}
                {activeTool !== 'none' && (
                    <aside className="w-72 bg-[#1a1a2e] border-l border-white/10 overflow-y-auto flex-shrink-0">
                        {/* Crop Panel */}
                        {activeTool === 'crop' && (
                            <div className="p-4 space-y-4">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                    <span>✂️</span> Crop
                                </h3>
                                <p className="text-white/50 text-xs">
                                    Click and drag on the image to select the area you want to keep.
                                </p>
                                {cropRegion && cropRegion.width > 5 && (
                                    <div className="bg-white/5 rounded-xl p-3 space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-white/50">Size</span>
                                            <span className="text-white font-mono">{Math.round(cropRegion.width)} × {Math.round(cropRegion.height)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Adjustments Panel */}
                        {activeTool === 'adjust' && (
                            <div className="p-4 space-y-5">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                    <span>🎨</span> Adjustments
                                </h3>

                                {([
                                    { key: 'brightness' as keyof Adjustments, label: 'Brightness', icon: '☀️' },
                                    { key: 'contrast' as keyof Adjustments, label: 'Contrast', icon: '◐' },
                                    { key: 'saturation' as keyof Adjustments, label: 'Saturation', icon: '🎨' },
                                ]).map(({ key, label, icon }) => (
                                    <div key={key} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-white/70 text-xs font-medium flex items-center gap-1.5">
                                                <span>{icon}</span> {label}
                                            </label>
                                            <span className="text-white/50 text-xs font-mono w-10 text-right">
                                                {adjustments[key] > 0 ? '+' : ''}{adjustments[key]}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-100"
                                            max="100"
                                            value={adjustments[key]}
                                            onChange={(e) => handleAdjustmentChange(key, parseInt(e.target.value))}
                                            className="w-full accent-primary h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer"
                                        />
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        pushHistory();
                                        setAdjustments({ brightness: 0, contrast: 0, saturation: 0 });
                                    }}
                                    className="w-full text-xs text-white/50 hover:text-white py-2 transition-colors"
                                >
                                    Reset Adjustments
                                </button>
                            </div>
                        )}

                        {/* Filters Panel */}
                        {activeTool === 'filter' && (
                            <div className="p-4 space-y-4">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                    <span>✨</span> Filters
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRESET_FILTERS.map((filter) => (
                                        <button
                                            key={filter.name}
                                            onClick={() => applyFilter(filter)}
                                            className={`p-3 rounded-xl transition-all text-center ${activeFilter === filter.name
                                                ? 'bg-primary/20 border-2 border-primary text-white ring-2 ring-primary/30'
                                                : 'bg-white/5 border-2 border-transparent text-white/70 hover:text-white hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="text-xl block mb-1">{filter.icon}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wide">{filter.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                )}
            </div>

            {/* Status Bar */}
            <footer className="h-8 bg-[#1a1a2e] border-t border-white/10 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-4 text-[10px] text-white/40 font-mono">
                    {originalImageRef.current && (
                        <>
                            <span>{originalImageRef.current.width} × {originalImageRef.current.height}px</span>
                            {rotation !== 0 && <span>Rotated {rotation}°</span>}
                            {flipH && <span>Flipped H</span>}
                            {flipV && <span>Flipped V</span>}
                        </>
                    )}
                </div>
                <div className="text-[10px] text-white/30">
                    {hasChanges ? '● Unsaved changes' : 'No changes'}
                </div>
            </footer>
        </div>
    );
}
