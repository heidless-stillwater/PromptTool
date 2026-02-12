// Client-side content
import ProfileClient from './ProfileClient';

export function generateStaticParams() {
    return [{ userId: '1' }];
}

export const dynamic = 'force-static';
export const dynamicParams = false;

export default function ProfilePage({ params }: { params: { userId: string } }) {
    return <ProfileClient />;
}
