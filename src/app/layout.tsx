import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/Toast';
import { TourProvider } from '@/context/TourContext';
import GuidedTour from '@/components/GuidedTour';
import QueryProvider from '@/providers/QueryProvider';
import { validateEnv } from '@/lib/schemas';

const inter = Inter({ 
    subsets: ['latin'],
    variable: '--font-inter',
});

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
});

// Validate environment variables on startup
validateEnv();

export const metadata: Metadata = {
    title: {
        default: 'Stillwater Studio | Neural Generation',
        template: '%s | Stillwater Studio',
    },
    description: 'Bespoke AI image generation and prompt architecting. Part of the Stillwater Ecosystem.',
    icons: {
        icon: '/favicon.svg',
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
            <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
                <QueryProvider>
                    <AuthProvider>
                        <ToastProvider>
                            <TourProvider>
                                <GuidedTour />
                                {children}
                            </TourProvider>
                        </ToastProvider>
                    </AuthProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
