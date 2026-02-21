'use client';

import Tooltip from '@/components/Tooltip';
import { useRouter } from 'next/navigation';
import { GeneratedImage } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

interface ActionsBarProps {
    image: GeneratedImage;
    publishingId: string | null;
    deletingId: string | null;
    onCopyPrompt: () => void;
    onCopySeed: () => void;
    onGenerateVariation: () => void;
    onLeagueToggle: () => void;
    onDownload: () => void;
    onDelete: () => void;
}

export default function ActionsBar({
    image,
    publishingId,
    deletingId,
    onCopyPrompt,
    onCopySeed,
    onGenerateVariation,
    onLeagueToggle,
    onDownload,
    onDelete
}: ActionsBarProps) {
    const router = useRouter();

    return (
        <div className="pt-4 border-t border-border mt-auto grid grid-cols-2 gap-2">
            <Tooltip content="Copy the original prompt text" className="flex-1">
                <Button
                    variant="secondary"
                    onClick={onCopyPrompt}
                    className="w-full text-xs py-2 flex items-center justify-center gap-2"
                >
                    Copy Prompt
                </Button>
            </Tooltip>
            <Tooltip content="Copy seed for exact reproduction" className="flex-1">
                <Button
                    variant="secondary"
                    onClick={onCopySeed}
                    disabled={!image.settings?.seed}
                    className="w-full text-xs py-2 flex items-center justify-center gap-2"
                >
                    Copy Seed
                </Button>
            </Tooltip>
            <Tooltip content="Create a new image based on these settings" className="col-span-2">
                <Button
                    variant="secondary"
                    onClick={onGenerateVariation}
                    className="w-full text-xs py-2 flex items-center justify-center gap-2"
                >
                    <Icons.history size={16} className="rotate-90" />
                    Generate Variation
                </Button>
            </Tooltip>
            <Tooltip content="Edit this image" className="col-span-2">
                <Button
                    variant="secondary"
                    onClick={() => router.push(`/edit?imageId=${image.id}`)}
                    className="w-full text-xs py-2 flex items-center justify-center gap-2"
                >
                    <span className="text-lg">✏️</span>
                    Edit Image
                </Button>
            </Tooltip>
            <Tooltip content={image.publishedToLeague ? 'Remove from league' : 'Share your work with the community league!'} className="col-span-2">
                <Button
                    onClick={onLeagueToggle}
                    disabled={publishingId === image.id}
                    isLoading={publishingId === image.id}
                    className={cn(
                        "w-full py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                        image.publishedToLeague
                            ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20'
                            : 'bg-background-secondary hover:bg-background-tertiary text-foreground border border-border'
                    )}
                >
                    {!publishingId && (
                        <span className="text-lg">🏆</span>
                    )}
                    {image.publishedToLeague ? 'Published to League' : 'Publish to Team League'}
                </Button>
            </Tooltip>
            <Tooltip content="Get the file at full resolution" className="col-span-2">
                <Button
                    onClick={onDownload}
                    className="w-full text-xs py-2 flex items-center justify-center gap-2"
                >
                    <Icons.download size={16} />
                    Download {(image.videoUrl || image.settings?.modality === 'video') ? 'Video' : 'Image'}
                </Button>
            </Tooltip>
            <Button
                variant="danger"
                onClick={onDelete}
                disabled={deletingId === image.id}
                isLoading={deletingId === image.id}
                className="col-span-2 text-xs py-2 flex items-center justify-center gap-2 opacity-80 hover:opacity-100"
            >
                {deletingId === image.id ? 'Deleting...' : 'Delete Image'}
            </Button>
        </div>
    );
}

