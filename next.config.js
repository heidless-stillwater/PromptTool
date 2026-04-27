/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
        // domains is legacy but sometimes more reliable in detection
        domains: [
            'firebasestorage.googleapis.com',
            'i.ytimg.com',
            'lh3.googleusercontent.com',
            'api.dicebear.com'
        ],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i.ytimg.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
    experimental: {
        optimizePackageImports: [
            'lucide-react',
            'framer-motion',
            'recharts',
            '@tanstack/react-query'
        ],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
