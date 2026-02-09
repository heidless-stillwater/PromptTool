import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    const filename = req.nextUrl.searchParams.get('filename') || `image-${Date.now()}.png`;

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const blob = await response.blob();
        const headers = new Headers();

        // Force download with Content-Disposition
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');

        return new NextResponse(blob, {
            status: 200,
            headers,
        });
    } catch (err: any) {
        console.error('[Download API] Error:', err);
        return NextResponse.json({ error: 'Failed to proxy download' }, { status: 500 });
    }
}
