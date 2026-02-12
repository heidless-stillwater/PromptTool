'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EntryRedirectClient({ entryId }: { entryId: string }) {
    const router = useRouter();

    useEffect(() => {
        router.replace(`/league?entryId=${entryId}`);
    }, [entryId, router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="spinner" />
        </div>
    );
}
