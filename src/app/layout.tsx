import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/Toast';
import { TourProvider } from '@/context/TourContext';
import GuidedTour from '@/components/GuidedTour';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: {
        default: 'AI Image Studio - Transform Your Ideas Into Art',
        template: '%s | AI Image Studio',
    },
    description: 'Create stunning AI-generated images from text prompts. Professional-quality results with multiple styles and resolutions.',
    keywords: 'AI, image generation, art, prompts, creative, digital art',
    openGraph: {
        title: 'AI Image Studio - Transform Your Ideas Into Art',
        description: 'Create stunning AI-generated images from text prompts. Professional-quality results with multiple styles and resolutions.',
        siteName: 'AI Image Studio',
        type: 'website',
        locale: 'en_US',
    },
    twitter: {
        card: 'summary',
        title: 'AI Image Studio - Transform Your Ideas Into Art',
        description: 'Create stunning AI-generated images from text prompts.',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    <ToastProvider>
                        <TourProvider>
                            <GuidedTour />
                            {children}
                        </TourProvider>
                    </ToastProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
