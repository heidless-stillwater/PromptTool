'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icons';

export default function LoginPage() {
    const { user, loading, signInWithGoogle, signInWithEmail, error: authError } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showEmailLogin, setShowEmailLogin] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');

    // Redirect to dashboard if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
        try {
            await signInWithGoogle();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setLocalError('');
        try {
            await signInWithEmail(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setLocalError(err.message || 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-6 relative overflow-hidden">
            {/* Background Aesthetic */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-stillwater-teal/10 blur-[120px] rounded-full" />
            </div>

            <Card className="relative z-10 w-full max-w-md p-8 sm:p-12 bg-white/[0.02] border-white/5 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl">
                <div className="space-y-8">
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-stillwater-teal shadow-lg shadow-primary/20 mb-4 scale-110">
                            <Icons.sparkles className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">
                            The Collective <br />
                            <span className="text-primary">Gateway</span>
                        </h1>
                        <p className="text-sm text-foreground-muted font-medium">Join the next generation of Master Artists.</p>
                    </div>

                    {(authError || localError) && (
                        <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-bold leading-relaxed flex items-center gap-3">
                            <Icons.alertCircle className="w-4 h-4 flex-shrink-0" />
                            {localError || authError}
                        </div>
                    )}

                    <div className="space-y-6">
                        <Button
                            onClick={handleGoogleLogin}
                            disabled={isSubmitting}
                            className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all"
                        >
                            <Icons.google className="w-5 h-5" />
                            Join with Google
                        </Button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-foreground-muted/20 bg-transparent px-2">OR</div>
                        </div>

                        <form onSubmit={handleEmailLogin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Email Blueprint</label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email..."
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 px-5 rounded-2xl bg-white/5 border border-white/10 text-sm font-medium focus:outline-none focus:border-primary/50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Secure Weight (Password)</label>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 px-5 rounded-2xl bg-white/5 border border-white/10 text-sm font-medium focus:outline-none focus:border-primary/50"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 bg-primary hover:bg-primary-hover rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                            >
                                {isSubmitting ? <Icons.spinner className="w-5 h-5 animate-spin" /> : 'Authenticate'}
                            </Button>
                        </form>
                    </div>
                </div>
            </Card>

            <footer className="absolute bottom-12 text-center w-full z-10 px-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted/20">
                    Proprietary Interface • Stillwater Studio • NanoBanana 2026
                </p>
            </footer>
        </main>
    );
}
