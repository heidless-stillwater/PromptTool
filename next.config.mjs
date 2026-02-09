/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export', // Uncomment for Firebase Hosting deployment
    // trailingSlash: true,
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
