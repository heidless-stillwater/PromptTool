import CollectionDetailClient from './CollectionDetailClient';

export function generateStaticParams() {
    return [{ id: '1' }];
}

export const dynamic = 'force-static';
export const dynamicParams = false;

export default function CollectionDetailPage({ params }: { params: { id: string } }) {
    return <CollectionDetailClient id={params.id} />;
}
