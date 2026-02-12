import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';

interface LayoutProps {
    children: React.ReactNode;
    params: {
        userId: string;
    };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
    const { userId } = params;

    try {
        const userDoc = await adminDb.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return {
                title: 'User Not Found - AI Image Studio',
                description: 'This user profile could not be found.',
            };
        }

        const user = userDoc.data()!;
        const name = user.displayName || 'Creator';
        const title = `${name} - AI Image Studio Creator Profile`;
        const description = user.bio
            ? `${user.bio.substring(0, 150)}...`
            : `Check out ${name}'s AI-generated artwork on AI Image Studio.`;
        const imageUrl = user.bannerUrl || user.photoURL || undefined;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
                type: 'profile',
            },
            twitter: {
                card: imageUrl ? 'summary_large_image' : 'summary',
                title,
                description,
                ...(imageUrl ? { images: [imageUrl] } : {}),
            },
        };
    } catch (error) {
        console.error('[Profile Metadata] Error:', error);
        return {
            title: 'Creator Profile - AI Image Studio',
            description: 'View this creator\'s AI-generated artwork.',
        };
    }
}

export default function ProfileLayout({ children }: LayoutProps) {
    return <>{children}</>;
}
