/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
    trailingSlash: true,
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
        ],
    },
};

export default nextConfig;
