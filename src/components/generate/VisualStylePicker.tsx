'use client';

import React from 'react';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { ImageQuality, AspectRatio } from '@/lib/types';

export interface VisualStyle {
    id: string;
    name: string;
    description: string;
    thumbnailUrl: string;
    // Data to load
    modifiers: { category: string, value: string }[];
    settings?: {
        quality?: ImageQuality;
        aspectRatio?: AspectRatio;
        guidanceScale?: number;
    };
}

const VISUAL_STYLES: VisualStyle[] = [
    {
        id: 'cinematic-photo',
        name: 'Cinematic Photo',
        description: 'Ultra-realistic photography with dramatic lighting.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1493246507139-91e8bef99c02?w=300&q=80',
        modifiers: [
            { category: 'lighting', value: 'Cinematic' },
            { category: 'lighting', value: 'Dramatic Lighting' },
            { category: 'composition', value: '35mm Lens' },
            { category: 'magic', value: 'Photorealistic' },
        ],
        settings: { quality: 'high', guidanceScale: 7.5 }
    },
    {
        id: 'anime-vibrant',
        name: 'Vibrant Anime',
        description: 'Modern high-quality anime style with vivid colors.',
        thumbnailUrl: '/assets/presets/anime-vibrant.png',
        modifiers: [
            { category: 'medium', value: 'Anime' },
            { category: 'color', value: 'Vibrant' },
            { category: 'magic', value: 'Trending on ArtStation' },
        ],
        settings: { guidanceScale: 9.0 }
    },
    {
        id: 'oil-painting',
        name: 'Classic Oil',
        description: 'Rich textures and traditional oil painting strokes.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&q=80',
        modifiers: [
            { category: 'medium', value: 'Oil Painting' },
            { category: 'render', value: 'Subsurface Scattering' },
        ],
        settings: { guidanceScale: 6.5 }
    },
    {
        id: 'cyberpunk-neon',
        name: 'Cyberpunk',
        description: 'Futuristic neon-lit cityscapes and aesthetics.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=300&q=80',
        modifiers: [
            { category: 'style', value: 'Cyberpunk' },
            { category: 'color', value: 'Neon Colors' },
            { category: 'atmosphere', value: 'Heavy Fog' },
        ],
        settings: { guidanceScale: 8.5 }
    },
    {
        id: 'minimalist-vector',
        name: 'Minimalist Vector',
        description: 'Clean, flat vector art with simple shapes.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=300&q=80',
        modifiers: [
            { category: 'style', value: 'Minimalist' },
            { category: 'medium', value: 'Digital Illustration' },
        ],
        settings: { guidanceScale: 7.0 }
    },
    {
        id: 'unreal-render',
        name: '3D Render',
        description: 'High-end 3D character and environment rendering.',
        thumbnailUrl: '/assets/presets/unreal-render.png',
        modifiers: [
            { category: 'render', value: 'Octane Render' },
            { category: 'render', value: 'Ray Tracing' },
            { category: 'magic', value: 'Unreal Engine 5' },
        ],
        settings: { quality: 'ultra' }
    },
    {
        id: 'vaporwave-dream',
        name: 'Vaporwave',
        description: 'Retro-futuristic aesthetics with pink and teal hues.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=300&q=80',
        modifiers: [
            { category: 'style', value: 'Vaporwave' },
            { category: 'color', value: 'Pastel' },
            { category: 'lighting', value: 'Neon' },
        ],
        settings: { guidanceScale: 8.0 }
    },
    {
        id: 'steampunk-gear',
        name: 'Steampunk',
        description: 'Victorian industrial fantasy with clockwork details.',
        thumbnailUrl: '/assets/presets/steampunk.png',
        modifiers: [
            { category: 'style', value: 'Steampunk' },
            { category: 'era', value: 'Victorian' },
            { category: 'material', value: 'Chrome' },
        ],
        settings: { guidanceScale: 7.5 }
    },
    {
        id: 'ghibli-magic',
        name: 'Studio Ghibli',
        description: 'Whimsical and hand-painted animation aesthetic.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80',
        modifiers: [
            { category: 'style', value: 'Studio Ghibli' },
            { category: 'atmosphere', value: 'Peaceful Dawn' },
            { category: 'lighting', value: 'Soft Glow' },
        ],
        settings: { guidanceScale: 6.0 }
    },
    {
        id: 'noir-film',
        name: 'Film Noir',
        description: 'Classic black and white with high contrast shadows.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=300&q=80',
        modifiers: [
            { category: 'style', value: 'Noir' },
            { category: 'lighting', value: 'Harsh Shadows' },
            { category: 'color', value: 'Monochromatic' },
        ],
        settings: { guidanceScale: 7.0 }
    },
    {
        id: 'pop-art-retro',
        name: 'Pop Art',
        description: 'Bold colors and comic-book style graphics.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=300&q=80',
        modifiers: [
            { category: 'style', value: 'Pop Art' },
            { category: 'color', value: 'Vibrant' },
            { category: 'magic', value: 'Masterpiece' },
        ],
        settings: { guidanceScale: 9.0 }
    },
    {
        id: 'surreal-world',
        name: 'Surrealism',
        description: 'Dream-like environments and impossible realities.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&q=80',
        modifiers: [
            { category: 'style', value: 'Surrealism' },
            { category: 'atmosphere', value: 'Abstract Dimension' },
        ],
        settings: { guidanceScale: 8.5 }
    },
    {
        id: 'fantasy-realm',
        name: 'Epic Fantasy',
        description: 'High-fantasy aesthetics with magic and sprawling landscapes.',
        thumbnailUrl: '/assets/presets/epic-fantasy.png',
        modifiers: [
            { category: 'style', value: 'Fantasy' },
            { category: 'lighting', value: 'Golden Hour' },
            { category: 'atmosphere', value: 'Aurora Borealis' },
        ],
        settings: { guidanceScale: 8.0 }
    },
    {
        id: 'bauhaus-modern',
        name: 'Bauhaus',
        description: 'Primary colors and geometric modernist design.',
        thumbnailUrl: '/assets/presets/bauhaus.png',
        modifiers: [
            { category: 'style', value: 'Bauhaus' },
            { category: 'color', value: 'High Contrast' },
            { category: 'composition', value: 'Symmetrical' },
        ],
        settings: { guidanceScale: 7.5 }
    },
    {
        id: 'ukiyo-e-canvas',
        name: 'Ukiyo-e',
        description: 'Traditional Japanese woodblock print aesthetic.',
        thumbnailUrl: '/assets/presets/ukiyo-e.png',
        modifiers: [
            { category: 'style', value: 'Ukiyo-e' },
            { category: 'medium', value: 'Paper' },
        ],
        settings: { guidanceScale: 7.0 }
    },
    {
        id: 'watercolor-soft',
        name: 'Watercolor',
        description: 'Fluid, bleeding colors and soft traditional textures.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&q=80',
        modifiers: [
            { category: 'medium', value: 'Watercolor' },
            { category: 'lighting', value: 'Soft Glow' },
        ],
        settings: { guidanceScale: 6.5 }
    },
    {
        id: 'sketch-charcoal',
        name: 'Hand Sketch',
        description: 'Rough charcoal and pencil drawing expressions.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579762795188-aa929d78628b?w=300&q=80',
        modifiers: [
            { category: 'medium', value: 'Sketch' },
            { category: 'color', value: 'Monochromatic' },
        ],
        settings: { guidanceScale: 8.0 }
    },
    {
        id: 'claymation-fun',
        name: 'Claymation',
        description: 'Tactile stop-motion style with clay-like textures.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1558444479-c8a417670534?w=300&q=80',
        modifiers: [
            { category: 'medium', value: 'Claymation' },
            { category: 'lighting', value: 'Studio Lighting' },
        ],
        settings: { guidanceScale: 9.0 }
    }
];

interface VisualStylePickerProps {
    onSelect: (style: VisualStyle) => void;
    activeStyleId?: string;
}

export default function VisualStylePicker({ onSelect, activeStyleId }: VisualStylePickerProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-1">
            {VISUAL_STYLES.map((style) => (
                <button
                    key={style.id}
                    onClick={() => onSelect(style)}
                    className={cn(
                        "group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-black/20",
                        activeStyleId === style.id
                            ? "border-primary shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                            : "border-border/50 hover:border-white/20"
                    )}
                >
                    {style.thumbnailUrl ? (
                        <img
                            src={style.thumbnailUrl}
                            alt={style.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                                // Fallback for broken images
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80';
                            }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                            <Icons.image size={20} className="text-white/10" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white truncate">
                                {style.name}
                            </h3>
                            {activeStyleId === style.id && (
                                <Icons.check size={12} className="text-primary" />
                            )}
                        </div>
                        <p className="text-[8px] text-white/50 leading-tight line-clamp-2">
                            {style.description}
                        </p>
                    </div>

                    <div className={cn(
                        "absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-300",
                        activeStyleId === style.id && "opacity-100"
                    )} />
                </button>
            ))}
        </div>
    );
}
