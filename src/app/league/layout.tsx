import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Community League',
    description: 'Vote for your favorite AI-generated art. Discover, upvote, and comment on stunning creations from the community.',
    openGraph: {
        title: 'Community League - AI Image Studio',
        description: 'Vote for your favorite AI-generated art. Discover, upvote, and comment on stunning creations from the community.',
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: 'Community League - AI Image Studio',
        description: 'Vote for your favorite AI-generated art.',
    },
};

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
