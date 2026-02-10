'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, doc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, UserCredits } from '@/lib/types';

interface ManagedUser extends UserProfile {
    credits?: UserCredits;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [isAdjustingCredits, setIsAdjustingCredits] = useState(false);
    const [creditAmount, setCreditAmount] = useState(0);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
            const usersData: ManagedUser[] = [];

            for (const userDoc of usersSnap.docs) {
                const profile = userDoc.data() as UserProfile;
                // Fetch credits for each user (experimental/small scale)
                const creditsSnap = await getDocs(collection(db, 'users', userDoc.id, 'data'));
                const credits = creditsSnap.docs.find(d => d.id === 'credits')?.data() as UserCredits;

                usersData.push({ ...profile, credits });
            }

            setUsers(usersData);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAdjustCredits = async () => {
        if (!selectedUser || creditAmount === 0) return;

        try {
            const creditsRef = doc(db, 'users', selectedUser.uid, 'data', 'credits');
            await updateDoc(creditsRef, {
                balance: increment(creditAmount),
                totalPurchased: creditAmount > 0 ? increment(creditAmount) : increment(0)
            });

            // Log transaction (ideally)

            fetchUsers();
            setIsAdjustingCredits(false);
            setCreditAmount(0);
            setSelectedUser(null);
        } catch (error) {
            console.error('Failed to adjust credits:', error);
            alert('Failed to adjust credits');
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Search users by email or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field pl-10"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">🔍</span>
                </div>
                <button onClick={fetchUsers} className="btn-secondary whitespace-nowrap">
                    Refresh List
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="spinner" />
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-background-secondary border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Role/Plan</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Credits</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.map((u) => (
                                    <tr key={u.uid} className="hover:bg-primary/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                                                    {u.displayName?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{u.displayName || 'Unknown'}</p>
                                                    <p className="text-xs text-foreground-muted">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'su' ? 'bg-purple-500 text-white' :
                                                        u.role === 'admin' ? 'bg-amber-500 text-white' : 'bg-background-secondary'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary`}>
                                                    {u.subscription}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="font-bold">{u.credits?.balance || 0}</span>
                                            <span className="text-foreground-muted ml-1 text-xs">bal</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-foreground-muted">
                                            {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setIsAdjustingCredits(true);
                                                }}
                                                className="text-xs font-bold text-primary hover:underline"
                                            >
                                                Edit Credits
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Credit Adjustment Modal */}
            {isAdjustingCredits && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="card max-w-md w-full animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">Adjust Credits</h2>
                        <p className="text-sm text-foreground-muted mb-6">
                            Modifying credits for <span className="font-bold text-foreground">{selectedUser.email}</span>.
                            Current balance: <span className="font-bold">{selectedUser.credits?.balance || 0}</span>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount to Add/Subtract</label>
                                <input
                                    type="number"
                                    value={creditAmount}
                                    onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                                    className="input-field"
                                    placeholder="e.g. 100 or -50"
                                />
                                <p className="text-[10px] text-foreground-muted mt-1 uppercase">Use negative numbers to deduct</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setIsAdjustingCredits(false);
                                        setSelectedUser(null);
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdjustCredits}
                                    disabled={creditAmount === 0}
                                    className="btn-primary flex-1"
                                >
                                    Apply Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
