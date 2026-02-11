'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

const ADMIN_NAV_ITEMS = [
    { name: 'Overview', href: '/admin', icon: '📊' },
    { name: 'Users', href: '/admin/users', icon: '👥' },
    { name: 'Moderation', href: '/admin/moderation', icon: '🛡️' },
    { name: 'Monitoring', href: '/admin/monitoring', icon: '🛠️' },
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isAdminOrSu = profile?.role === 'admin' || profile?.role === 'su';

    useEffect(() => {
        if (!loading && (!user || !isAdminOrSu)) {
            router.push('/dashboard');
        }
    }, [user, profile, loading, isAdminOrSu, router]);

    if (loading || !user || !isAdminOrSu) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-background">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-border bg-background-secondary sticky top-0 h-screen flex flex-col">
                <div className="p-6 border-b border-border">
                    <Link href="/dashboard" className="text-lg font-bold gradient-text block">
                        AI Image Studio
                    </Link>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-foreground-muted">Admin Panel</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {ADMIN_NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-foreground-muted hover:text-foreground hover:bg-background'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <Link href="/dashboard" className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground p-2">
                        <span>← Back to App</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
                    <h1 className="text-xl font-bold">
                        {ADMIN_NAV_ITEMS.find(i => i.href === pathname)?.name || 'Admin'}
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold">{profile.displayName}</p>
                            <p className="text-[10px] uppercase text-accent font-bold tracking-tighter">{profile.role} ACCESS</p>
                        </div>
                        {profile.photoURL && (
                            <img src={profile.photoURL} alt="Admin" className="w-8 h-8 rounded-full border border-primary/50" />
                        )}
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
