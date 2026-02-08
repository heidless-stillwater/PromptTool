'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FEATURED_PROMPTS } from '@/lib/prompt-templates';

export default function HomePage() {
    const { user, profile, loading, signInWithGoogle } = useAuth();
    const router = useRouter();

    // Redirect to dashboard if logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <main className="min-h-screen">
            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 pointer-events-none" />

                {/* Floating orbs */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

                <div className="relative z-10 text-center max-w-4xl mx-auto">
                    {/* Logo/Title */}
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">
                        <span className="gradient-text">AI Image</span>
                        <br />
                        <span className="text-foreground">Studio</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-foreground-muted mb-8 max-w-2xl mx-auto">
                        Transform your imagination into stunning visuals.
                        Create professional AI-generated images in seconds.
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap justify-center gap-6 mb-12">
                        <div className="flex items-center gap-2 text-sm md:text-base">
                            <span className="text-success">✓</span>
                            <span>5 Free Credits Daily</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm md:text-base">
                            <span className="text-success">✓</span>
                            <span>Multiple Art Styles</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm md:text-base">
                            <span className="text-success">✓</span>
                            <span>Up to 4K Resolution</span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={signInWithGoogle}
                        className="btn-primary text-lg px-8 py-4 animate-pulse-glow"
                    >
                        <span className="flex items-center gap-3">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Get Started with Google
                        </span>
                    </button>
                </div>

                {/* Sample Images Showcase */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </section>

            {/* Featured Prompts Preview */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                        Featured <span className="gradient-text">Inspiration</span>
                    </h2>
                    <p className="text-foreground-muted text-center mb-12 max-w-2xl mx-auto">
                        Start with our curated prompts or create your own masterpiece
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURED_PROMPTS.slice(0, 6).map((prompt) => (
                            <div key={prompt.id} className="card group cursor-pointer hover:scale-[1.02] transition-transform">
                                <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl mb-4 flex items-center justify-center">
                                    <span className="text-4xl opacity-50">🎨</span>
                                </div>
                                <span className="text-xs font-medium text-accent uppercase tracking-wider">
                                    {prompt.category}
                                </span>
                                <h3 className="text-lg font-semibold mt-1 mb-2">{prompt.title}</h3>
                                <p className="text-sm text-foreground-muted line-clamp-2">
                                    {prompt.prompt}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Preview */}
            <section className="py-20 px-4 bg-background-secondary">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Simple, <span className="gradient-text">Transparent</span> Pricing
                    </h2>
                    <p className="text-foreground-muted mb-12">Start free, upgrade when you need more</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Free */}
                        <div className="card">
                            <h3 className="text-xl font-semibold mb-2">Free</h3>
                            <p className="text-3xl font-bold mb-4">$0<span className="text-sm text-foreground-muted">/mo</span></p>
                            <ul className="text-sm text-left space-y-2 mb-6">
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> 5 credits daily
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> Standard quality
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> Casual mode
                                </li>
                            </ul>
                        </div>

                        {/* Standard */}
                        <div className="card border-primary relative">
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-3 py-1 rounded-full">
                                Popular
                            </span>
                            <h3 className="text-xl font-semibold mb-2">Standard</h3>
                            <p className="text-3xl font-bold mb-4">$9.99<span className="text-sm text-foreground-muted">/mo</span></p>
                            <ul className="text-sm text-left space-y-2 mb-6">
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> 15 credits daily
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> 100 bonus credits
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> High quality (2K)
                                </li>
                            </ul>
                        </div>

                        {/* Pro */}
                        <div className="card">
                            <h3 className="text-xl font-semibold mb-2">Professional</h3>
                            <p className="text-3xl font-bold mb-4">$29.99<span className="text-sm text-foreground-muted">/mo</span></p>
                            <ul className="text-sm text-left space-y-2 mb-6">
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> 50 credits daily
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> 500 bonus credits
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> Ultra quality (4K)
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-success">✓</span> Batch generation
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 border-t border-border">
                <div className="max-w-6xl mx-auto text-center text-sm text-foreground-muted">
                    <p>© 2024 AI Image Studio. Powered by NanoBanana.</p>
                </div>
            </footer>
        </main>
    );
}
