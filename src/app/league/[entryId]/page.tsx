import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';

interface PageProps {
    params: {
        entryId: string;
    };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { entryId } = params;

    try {
        const entryDoc = await adminDb.collection('leagueEntries').doc(entryId).get();

        if (!entryDoc.exists) {
            return {
                title: 'League Entry Not Found',
                description: 'This community league entry could not be found.'
            };
        }

        const entry = entryDoc.data()!;
        const title = `AI Art by ${entry.authorName} - Community League`;
        const description = entry.prompt || 'Check out this amazing AI-generated art in the Community League!';
        const imageUrl = entry.imageUrl;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: [{ url: imageUrl }],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [imageUrl],
            },
        };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Community League',
            description: 'Vote for your favorite AI-generated images.'
        };
    }
}

export default function EntryRedirectPage({ params }: PageProps) {
    // Client-side redirect to the main league page with the entry modal open
    const { entryId } = params;
    redirect(`/league?entryId=${entryId}`);
}
