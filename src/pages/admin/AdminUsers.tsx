import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Trash2, Shield, RefreshCw, X, Save, Clock, Trophy, Award, BookOpen, Users, User, BarChart3, Activity, TrendingUp, Eye, EyeOff, Layers, AlertTriangle, CheckCircle, Plus, ShieldAlert } from 'lucide-react';
import { GuestProfile, useAuth } from '../../context/AuthContext';
import { Avatar as UserAvatar } from '../../components/UIComponents';
import { calculateLevel, getRankBadge } from '../../utils/gamification';
import { moderationService } from '../../services/moderationService';
import { useGamification } from '../../hooks/useGamification';

type ExtendedUser = GuestProfile & {
    type: 'user' | 'guest';
    username?: string;
    created_at?: string;
    updated_at?: string;
    last_sign_in_at?: string;
    last_login_date?: string;
    streak?: number;
    badges?: any[];
    study_sessions?: any[];
    materials_completed?: string[];
    quiz_results?: any[];
    is_hidden?: boolean;
    role?: string;
    detailsLoaded?: boolean;
    banned_until?: string | null;
};

const AVATAR_OPTIONS = [
    '/avatars/1.svg',
    '/avatars/2.svg',
    '/avatars/3.svg',
    '/avatars/4.svg',
    '/avatars/5.svg',
    '/avatars/6.svg',
    '/avatars/7.svg',
    '/avatars/8.svg',
];

export default function AdminUsers() {
    const [users, setUsers] = useState<ExtendedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
    const [userHistory, setUserHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const { role: currentUserRole } = useAuth();
    const [editForm, setEditForm] = useState({ full_name: '', username: '', xp: 0, level: 1, avatar_url: '', academic_level: '1', streak: 0, role: 'user' });

    const [availableBadges, setAvailableBadges] = useState<any[]>([]);
    const [badgeModalOpen, setBadgeModalOpen] = useState(false);

    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkField, setBulkField] = useState<'academic_level' | 'xp'>('academic_level');
    const [bulkValue, setBulkValue] = useState('');
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkResult, setBulkResult] = useState<{ success: number; fail: number } | null>(null);

    const { config } = useGamification();
    const [activeTab, setActiveTab] = useState<'profile' | 'performance'>('profile');

    const [stats, setStats] = useState({
        total: 0,
        activeToday: 0,
        avgLevel: 0,
        totalXp: 0
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {

            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, xp, level, role, created_at, updated_at, last_login_date, streak, is_hidden, academic_level, banned_until')
                .order('created_at', { ascending: false });

            if (profileError) throw profileError;

            const { data: guests, error: guestError } = await supabase
                .from('guest_scores')
                .select('*')
                .order('updated_at', { ascending: false });

            if (guestError) throw guestError;

            const combinedUsers: ExtendedUser[] = [
                ...(profiles || []).map((p: any) => ({ ...p, type: 'user' as const })),
                ...(guests || []).map((g: any) => ({ ...g, type: 'guest' as const }))
            ];

            combinedUsers.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());

            setUsers(combinedUsers);

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            const active = combinedUsers.filter(u => {
                const date = new Date(u.last_login_date || u.updated_at || u.created_at || 0).getTime();
                return date >= todayStart;
            }).length;

            const totalLevels = combinedUsers.reduce((acc, u) => acc + (u.level || 1), 0);
            const totalXp = combinedUsers.reduce((acc, u) => acc + (u.xp || 0), 0);

            setStats({
                total: combinedUsers.length,
                activeToday: active,
                avgLevel: combinedUsers.length ? Math.round(totalLevels / combinedUsers.length) : 0,
                totalXp: totalXp
            });

        } catch (err) {
            console.error("Error fetching users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchBadges();
    }, []);

    const fetchBadges = async () => {
        const { data } = await supabase.from('badges').select('*');
        setAvailableBadges(data || []);
    };

    useEffect(() => {
        if (!selectedUser) return;

        async function loadUserDetails() {
            setHistoryLoading(true);
            try {
                const table = selectedUser?.type === 'user' ? 'profiles' : 'guest_scores';
                
                const { data: userData, error: userError } = await supabase
                    .from(table)
                    .select('quiz_results, study_sessions, materials_completed, badges')
                    .eq('id', selectedUser?.id)
                    .single();

                const { data: realResults, error: historyError } = await supabase
                    .from('quiz_results')
                    .select('*')
                    .eq('user_id', selectedUser?.id)
                    .order('created_at', { ascending: false });

                if (userError) throw userError;

                const tableResults = (realResults || []).map(r => ({
                    ...r,
                    type: 'quiz',
                    sortTime: r.created_at
                }));

                const sessions = (userData?.study_sessions || []).map((s: any) => ({
                    ...s,
                    type: 'session',
                    sortTime: s.date
                }));

                const merged = [...tableResults, ...sessions];
                merged.sort((a, b) => new Date(b.sortTime || 0).getTime() - new Date(a.sortTime || 0).getTime());

                setUserHistory(merged);
                
                const updatedUser = { ...selectedUser, ...userData, detailsLoaded: true };
                setSelectedUser(updatedUser as ExtendedUser);
                setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...userData, detailsLoaded: true } : u));

            } catch (err) {
                console.error("Error fetching user details:", err);
            } finally {
                setHistoryLoading(false);
            }
        }

        loadUserDetails();
    }, [selectedUser?.id]);

    const processUserHistory = (user: any) => {
        setHistoryLoading(true);

        const quizResults = user.quiz_results || [];
        const sessions = (user.study_sessions || []) as any[];
        const materials = (user.materials_completed || []).map((id: string) => ({
            type: 'material',
            id,
            title: id,
            created_at: user.updated_at
        }));

        const merged = [
            ...quizResults.map((q: any) => ({ ...q, type: 'quiz', sortTime: q.date || q.created_at })),
            ...sessions.map((s: any) => ({ ...s, type: 'session', sortTime: s.date })),

        ];

        merged.sort((a, b) => new Date(b.sortTime || 0).getTime() - new Date(a.sortTime || 0).getTime());

        setUserHistory(merged);
        setHistoryLoading(false);

        setEditForm({
            full_name: user.full_name || '',
            username: user.username || '',
            xp: user.xp,
            level: user.level || 1,
            avatar_url: user.avatar_url || '',
            academic_level: user.academic_level || '1',
            streak: user.streak || 0,
            role: user.role || 'user'
        });
    };

    const handleDelete = async (user: ExtendedUser, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete this ${user.type}? This cannot be undone.`)) return;

        setDeleting(user.id);
        try {
            const table = user.type === 'user' ? 'profiles' : 'guest_scores';
            const { deleted } = await moderationService.cleanupOldMedia();
            const { error } = await supabase.from(table).delete().eq('id', user.id);

            if (error) throw error;
            setUsers(prev => prev.filter(u => u.id !== user.id));
            if (selectedUser?.id === user.id) setSelectedUser(null);
        } catch (err) {
            console.error("Error deleting user:", err);
            alert("Failed to delete user. Check permissions.");
        } finally {
            setDeleting(null);
        }
    };

    const handleSaveUser = async () => {
        if (!selectedUser) return;
        try {
            const table = selectedUser.type === 'user' ? 'profiles' : 'guest_scores';

            const cleanFullName = editForm.full_name?.trim();
            const updates: any = {
                full_name: cleanFullName,
                xp: Number(editForm.xp),
                streak: Number(editForm.streak),
                avatar_url: editForm.avatar_url,
                updated_at: new Date().toISOString()
            };

            if (currentUserRole === 'super_admin' && selectedUser.type === 'user') {
                updates.role = editForm.role;
            }

            if (selectedUser.type === 'user') {

                const newLevel = calculateLevel(Number(editForm.xp));
                updates.level = newLevel;

                const cleanUsername = editForm.username?.trim();
                updates.username = cleanUsername && cleanUsername.length >= 3 ? cleanUsername : null;
                updates.academic_level = editForm.academic_level;
            }

            const { data, error } = await supabase
                .from(table)
                .update(updates)
                .eq('id', selectedUser.id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("No rows were updated. This usually means you don't have permission (Row Level Security) to edit this user.");
            }

            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u));
            setSelectedUser({ ...selectedUser, ...editForm });
            setEditMode(false);
            alert("User updated successfully!");
        } catch (err: any) {
            console.error("Update failed:", err);
            alert(`Failed to update user: ${err.message || JSON.stringify(err)}\n\nTechnical details: ${JSON.stringify(err.details || err.hint || 'No details')}`);
        }
    };

    const handleAddBadge = async (badgeId: string) => {
        if (!selectedUser) return;
        const badge = availableBadges.find(b => b.id === badgeId);
        if (!badge) return;
        
        try {
            const table = selectedUser.type === 'user' ? 'profiles' : 'guest_scores';
            const newBadges = [...(selectedUser.badges || []), badge];
            
            const { error } = await supabase
                .from(table)
                .update({ badges: newBadges })
                .eq('id', selectedUser.id);
                
            if (error) throw error;
            
            setSelectedUser({ ...selectedUser, badges: newBadges });
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, badges: newBadges } : u));
            setBadgeModalOpen(false);
            alert("Badge assigned!");
        } catch (err) {
            alert("Failed to assign badge.");
        }
    };

    const handleBanUser = async (duration: number | 'perm' | null) => {
        if (!selectedUser) return;
        const label = duration === 'perm' ? 'Permanently' : duration === null ? 'UNBAN' : `for ${duration} hours`;
        if (!confirm(`Confirm ${label} for this user?`)) return;

        try {
            const bannedUntil = await moderationService.toggleUserBan(selectedUser.id, selectedUser.type === 'user' ? 'profiles' : 'guest_scores', duration);
            
            setSelectedUser({ ...selectedUser, banned_until: bannedUntil });
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, banned_until: bannedUntil } : u));
            alert(duration === null ? "User unbanned." : "User restricted.");
        } catch (err) {
            alert("Failed to update user restriction.");
        }
    };

    const handleRemoveBadge = async (badgeIndex: number) => {
        if (!selectedUser) return;
        if (!confirm("Remove this badge?")) return;
        try {
            const newBadges = [...(selectedUser.badges || [])];
            newBadges.splice(badgeIndex, 1);

            const { error } = await supabase.from('profiles').update({ badges: newBadges }).eq('id', selectedUser.id);
            if (error) throw error;

            setSelectedUser({ ...selectedUser, badges: newBadges });
            setUsers(users.map(u => u.id === selectedUser.id ? { ...u, badges: newBadges } : u));
        } catch (err) {
            alert("Failed to remove badge");
        }
    };

    const handleToggleVisibility = async (user: ExtendedUser, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const table = user.type === 'user' ? 'profiles' : 'guest_scores';
            const newStatus = !user.is_hidden;

            const { error } = await supabase
                .from(table)
                .update({ is_hidden: newStatus })
                .eq('id', user.id);

            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_hidden: newStatus } : u));

            if (selectedUser?.id === user.id) {
                setSelectedUser(prev => prev ? { ...prev, is_hidden: newStatus } : null);
            }

        } catch (err) {
            console.error("Error toggling visibility:", err);
            alert("Failed to update visibility status.");
        }
    };

    const handleBulkUpdate = async () => {
        if (!bulkValue) return;
        if (!window.confirm(`You are about to update ${bulkField} for ALL users. This cannot be undone. Are you sure?`)) return;

        setBulkProcessing(true);
        setBulkResult(null);
        let successCount = 0;
        let failCount = 0;

        try {

            if (bulkField === 'academic_level') {
                const { error, count } = await supabase
                    .from('profiles')
                    .update({ academic_level: bulkValue })
                    .neq('id', '00000000-0000-0000-0000-000000000000');

                if (error) throw error;

                successCount = users.filter(u => u.type === 'user').length;
            }
            else if (bulkField === 'xp') {
                const newXp = parseInt(bulkValue);
                if (isNaN(newXp)) throw new Error("XP must be a number");

                const { error: pError } = await supabase
                    .from('profiles')
                    .update({ xp: newXp, level: calculateLevel(newXp) })
                    .neq('id', '00000000-0000-0000-0000-000000000000');

                if (pError) throw pError;

                const { error: gError } = await supabase
                    .from('guest_scores')
                    .update({ xp: newXp })
                    .neq('id', '00000000-0000-0000-0000-000000000000');

                if (gError) throw gError;

                successCount = users.length;
            }

            setBulkResult({ success: successCount, fail: 0 });

            await fetchUsers();

            setTimeout(() => {
                setBulkModalOpen(false);
                setBulkResult(null);
                setBulkValue('');
            }, 2000);

        } catch (err: any) {
            console.error("Bulk Update Error:", err);

            console.log("Batch update failed or partial. Attempts individual...");

            setBulkResult({ success: 0, fail: users.length });
            alert(`Bulk update failed: ${err.message}. You might not have permission to update all users at once.`);
        } finally {
            setBulkProcessing(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.username?.toLowerCase().includes(search.toLowerCase()) ||
        user.id.includes(search)
    );

    return (
        <div className="space-y-8 pb-10">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">Manage users, monitor progress, and oversee the community.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setBulkModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-all hover:scale-105 active:scale-95 text-purple-400 hover:text-purple-300"
                    >
                        <Layers size={20} />
                        <span className="font-bold">Bulk Actions</span>
                    </button>
                    <button
                        onClick={fetchUsers}
                        className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:scale-105 active:scale-95"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin text-purple-400" : "text-gray-400"} />
                        <span className="font-bold text-gray-300">Refresh Data</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                            <Users size={24} />
                        </div>
                        <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">Total Users</span>
                    </div>
                    <div className="text-3xl font-black text-white">{stats.total}</div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-xl bg-green-500/20 text-green-400">
                            <Activity size={24} />
                        </div>
                        <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">Active Today</span>
                    </div>
                    <div className="text-3xl font-black text-white">{stats.activeToday}</div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">Avg. Level</span>
                    </div>
                    <div className="text-3xl font-black text-white">{stats.avgLevel}</div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400">
                            <Trophy size={24} />
                        </div>
                        <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">Total XP</span>
                    </div>
                    <div className="text-3xl font-black text-white">{(stats.totalXp / 1000).toFixed(1)}k</div>
                </div>
            </div>

            <div className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">

                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search users by name, username or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                        Showing {filteredUsers.length} of {users.length} users
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-xs uppercase font-bold tracking-wider">
                                <th className="px-6 py-4">Identity</th>
                                <th className="px-6 py-4">Type</th>
                                {currentUserRole === 'super_admin' && <th className="px-6 py-4">Role</th>}
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4">Last Active</th>
                                <th className="px-6 py-4">Progress</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Settings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={currentUserRole === 'super_admin' ? 8 : 7} className="px-6 py-12 text-center">
                                        <div className="flex justify-center flex-col items-center gap-3">
                                            <div className="animate-spin text-purple-500"><RefreshCw size={24} /></div>
                                            <span className="text-gray-500 font-medium">Syncying user database...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={currentUserRole === 'super_admin' ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
                                        No users found matching "{search}"
                                        <br />
                                        <button onClick={() => setSearch('')} className="mt-2 text-purple-400 hover:text-purple-300 font-bold text-sm">Clear Search</button>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr
                                        key={user.id}
                                        className="group hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-800 overflow-hidden border border-white/10 group-hover:border-purple-500/50 transition-colors shadow-lg">
                                                    <UserAvatar
                                                        url={user.avatar_url}
                                                        name={user.full_name || user.username}
                                                        size="100%"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-purple-400 transition-colors">
                                                        {user.full_name || user.username || 'Anonymous'}
                                                    </div>

                                                    {user.username ? (
                                                        <div className="text-xs text-purple-400 font-mono mt-0.5">@{user.username}</div>
                                                    ) : (
                                                        <div className="text-10px text-gray-600 font-mono mt-0.5 uppercase tracking-wide">
                                                            ID: {user.id.slice(0, 8)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${user.type === 'user'
                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                }`}>
                                                {user.type}
                                            </span>
                                        </td>
                                        {currentUserRole === 'super_admin' && (
                                            <td className="px-6 py-4">
                                                {user.type === 'user' ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${user.role === 'super_admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                            user.role === 'moderator' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                        }`}>
                                                        {user.role || 'user'}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600 text-[10px] uppercase">-</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-300 font-medium text-sm">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                                                </span>
                                                {user.created_at && (
                                                    <span className="text-[10px] text-gray-600 font-mono">
                                                        {new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-300 font-medium text-sm">
                                                    {user.last_login_date ? new Date(user.last_login_date).toLocaleDateString() : (user.last_sign_in_at
                                                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                                                        : (user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'))}
                                                </span>
                                                <span className="text-[10px] text-gray-600 font-mono">
                                                    {user.last_login_date ? new Date(user.last_login_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (user.last_sign_in_at
                                                        ? new Date(user.last_sign_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : (user.updated_at ? new Date(user.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'))}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col min-w-[60px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold">{user.level || 1}</span>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRankBadge(user.level || 1, config.ranks).color.replace('text-', 'border-').replace('400', '500/30')} ${getRankBadge(user.level || 1, config.ranks).color} bg-white/5`}>
                                                            {getRankBadge(user.level || 1, config.ranks).label}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Rank & Level</span>
                                                </div>
                                                <div className="h-8 w-[1px] bg-white/10" />
                                                <div className="flex flex-col">
                                                    <span className="text-purple-400 font-bold">{user.xp || 0}</span>
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase">XP Earned</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                                <span className="text-sm font-medium text-gray-300">Active</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => handleToggleVisibility(user, e)}
                                                    className={`p-2 rounded-lg transition-all ${user.is_hidden
                                                        ? 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20'
                                                        : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                                                    title={user.is_hidden ? "User is hidden from Leaderboard" : "Visible on Leaderboard"}
                                                >
                                                    {user.is_hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(user, e)}
                                                    disabled={deleting === user.id}
                                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                    title="Delete User"
                                                >
                                                    {deleting === user.id ? (
                                                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                    ) : <Trash2 size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedUser && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedUser(null)}
                    />
                    <div className="relative w-full max-w-lg bg-[#0F1115] border-l border-white/10 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

                        <div className="sticky top-0 z-10 bg-[#0F1115]/80 backdrop-blur-md p-6 border-b border-white/10 flex justify-between items-start">
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 rounded-2xl bg-gray-800 overflow-hidden border-2 border-purple-500/50 shadow-xl">
                                    <UserAvatar url={selectedUser.avatar_url} name={selectedUser.full_name || selectedUser.username} size="100%" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">{selectedUser.full_name || 'Anonymous'}</h2>
                                    <p className="text-sm text-purple-400 font-mono">@{selectedUser.username || 'unknown'}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded border border-white/5 font-mono">
                                            {selectedUser.id}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="px-8 pt-6 border-b border-white/5 flex items-center gap-8 bg-white/[0.02] shrink-0">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'profile' ? 'text-purple-400' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                <div className="flex items-center gap-2 tracking-[0.2em]">
                                    <User size={14} /> System Profile
                                </div>
                                {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 rounded-t-full shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-in slide-in-from-bottom-1" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('performance')}
                                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'performance' ? 'text-purple-400' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                <div className="flex items-center gap-2 tracking-[0.2em]">
                                    <BarChart3 size={14} /> Performance Analytics
                                </div>
                                {activeTab === 'performance' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 rounded-t-full shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-in slide-in-from-bottom-1" />}
                            </button>
                        </div>

                        <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                            {activeTab === 'profile' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                                            <Shield size={14} /> Profile Controls
                                        </h3>
                                        <button
                                            onClick={() => editMode ? handleSaveUser() : setEditMode(true)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${editMode
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {editMode ? <><Save size={16} /> Save Changes</> : <><BookOpen size={16} /> Edit Profile</>}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-2 font-bold uppercase"><Trophy size={14} /> XP Points</div>
                                            {editMode ? (
                                                <input
                                                    type="number"
                                                    value={editForm.xp}
                                                    onChange={e => {
                                                        const newXp = parseInt(e.target.value) || 0;
                                                        setEditForm({
                                                            ...editForm,
                                                            xp: newXp,
                                                            level: calculateLevel(newXp)
                                                        });
                                                    }}
                                                    className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-lg focus:border-purple-500 outline-none"
                                                />
                                            ) : (
                                                <div className="text-3xl font-black text-purple-400">{selectedUser.xp?.toLocaleString()}</div>
                                            )}
                                        </div>
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-2 font-bold uppercase"><Award size={14} /> Level</div>
                                            {editMode ? (
                                                <input
                                                    type="number"
                                                    value={editForm.level}
                                                    disabled
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-gray-500 font-mono text-lg cursor-not-allowed opacity-50"
                                                    title="Level is calculated automatically based on XP"
                                                />
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-3xl font-black text-blue-400">{selectedUser.level || 1}</div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${getRankBadge(selectedUser.level || 1, config.ranks).color}`}>
                                                        {getRankBadge(selectedUser.level || 1, config.ranks).label}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-2 font-bold uppercase"><Activity size={14} /> Streak</div>
                                            {editMode ? (
                                                <input
                                                    type="number"
                                                    value={editForm.streak}
                                                    onChange={e => setEditForm({ ...editForm, streak: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-lg focus:border-purple-500 outline-none"
                                                />
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-3xl font-black text-orange-400">{selectedUser.streak} <span className="text-sm text-gray-500">days</span></div>
                                                </div>
                                            )}
                                        </div>

                                        {editMode && selectedUser.type === 'user' && (
                                            <div className="col-span-2 p-5 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="text-xs text-gray-500 mb-3 flex items-center gap-2 font-bold uppercase"><BookOpen size={14} /> Academic Level</div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {['1', '2', '3', '4'].map(lvl => (
                                                        <button
                                                            key={lvl}
                                                            onClick={() => setEditForm({ ...editForm, academic_level: lvl })}
                                                            className={`py-2 rounded-lg text-sm font-bold transition-all border ${editForm.academic_level === lvl
                                                                ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                                                                : 'bg-black/40 text-gray-400 border-transparent hover:bg-black/60 hover:text-gray-200'
                                                                }`}
                                                        >
                                                            {lvl}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {editMode && (
                                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                            <div className="p-1 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent h-[1px] w-full" />

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Full Display Name</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.full_name}
                                                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all"
                                                        placeholder="e.g. John Doe"
                                                    />
                                                </div>
                                                <div>
                                                    {currentUserRole === 'super_admin' && selectedUser.type === 'user' && (
                                                        <div className="mb-4 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                                            <label className="block text-xs font-bold uppercase text-purple-400 mb-2 flex items-center gap-2">
                                                                <Shield size={12} /> System Role
                                                            </label>
                                                            <select
                                                                value={editForm.role}
                                                                onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                                                className="w-full bg-black/40 border border-purple-500/20 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 transition-colors uppercase text-sm font-bold"
                                                            >
                                                                <option value="user">USER</option>
                                                                <option value="moderator">MODERATOR</option>
                                                                <option value="admin">ADMIN</option>
                                                                <option value="super_admin">SUPER ADMIN</option>
                                                            </select>
                                                            <p className="text-[10px] text-gray-500 mt-2">
                                                                Warning: Granting 'Admin' or 'Super Admin' gives verified access to dashboard.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {selectedUser.type === 'user' && (
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Username (@handle)</label>
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-3 text-gray-500 font-mono">@</span>
                                                                <input
                                                                    type="text"
                                                                    value={editForm.username}
                                                                    onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all"
                                                                    placeholder="unique_handle"
                                                                />
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 mt-1 ml-1">Must be unique and at least 3 characters.</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Avatar Appearance</label>
                                                    <div className="grid grid-cols-4 gap-3">
                                                        {AVATAR_OPTIONS.map((url, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setEditForm({ ...editForm, avatar_url: url })}
                                                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${editForm.avatar_url === url
                                                                    ? 'border-purple-500 ring-4 ring-purple-500/20 scale-105 z-10'
                                                                    : 'border-white/5 hover:border-white/20 hover:scale-105'
                                                                    }`}
                                                            >
                                                                <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                                                {editForm.avatar_url === url && (
                                                                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                                                        <div className="w-3 h-3 bg-white rounded-full shadow-lg shadow-purple-500/50" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-white/5">
                                        <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider mb-4 flex items-center gap-2">
                                            <ShieldAlert size={14} /> Security Matrix & Moderation
                                        </h3>
                                        
                                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <div className="text-sm font-bold text-white">Account Restriction</div>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1 tracking-wider">
                                                        {selectedUser.banned_until && new Date(selectedUser.banned_until) > new Date() 
                                                            ? `SUSPENDED UNTIL ${new Date(selectedUser.banned_until).toLocaleString()}` 
                                                            : 'ACCOUNT ACTIVE // NO RESTRICTIONS'}
                                                    </p>
                                                </div>
                                                {selectedUser.banned_until && new Date(selectedUser.banned_until) > new Date() ? (
                                                    <button 
                                                        onClick={() => handleBanUser(null)}
                                                        className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-400 transition-all shadow-lg shadow-green-500/20"
                                                    >
                                                        Lift Ban
                                                    </button>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                                        <CheckCircle size={20} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-4 gap-3">
                                                <button 
                                                    onClick={() => handleBanUser(1)}
                                                    className="py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-tighter text-gray-400 hover:text-red-400 transition-all"
                                                >
                                                    1 Hour
                                                </button>
                                                <button 
                                                    onClick={() => handleBanUser(24)}
                                                    className="py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-tighter text-gray-400 hover:text-red-400 transition-all"
                                                >
                                                    24 Hours
                                                </button>
                                                <button 
                                                    onClick={() => handleBanUser(168)}
                                                    className="py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-tighter text-gray-400 hover:text-red-400 transition-all"
                                                >
                                                    7 Days
                                                </button>
                                                <button 
                                                    onClick={() => handleBanUser('perm')}
                                                    className="py-3 bg-red-600/20 hover:bg-red-600 border border-red-600/30 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all"
                                                >
                                                    PERMANENT
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-gray-600 mt-4 italic font-medium">
                                                Restricting a user prevents them from messaging in study groups and participating in global challenges.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-1 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent h-[1px] w-full" />
                                    
                                    <div className="pt-4">
                                        <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4 flex items-center gap-2">
                                            <Clock size={14} /> Activity History
                                        </h3>
                                        <div className="space-y-3">
                                            {historyLoading ? (
                                                <div className="text-center py-12 text-gray-600 animate-pulse">Loading activity...</div>
                                            ) : userHistory.length === 0 ? (
                                                <div className="text-center py-12 text-gray-600 border border-dashed border-white/10 rounded-2xl bg-white/5">
                                                    No quiz history recorded yet.
                                                </div>
                                            ) : (
                                                userHistory.map((item, idx) => (
                                                    <div key={`${item.id || item.quizId || item.sortTime || item.created_at || 'history'}-${idx}`} className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-white/10 hover:border-white/20 transition-all">
                                                        <div>
                                                            <div className="font-bold text-gray-200">{item.quiz_category || item.title || 'Untitled Activity'}</div>
                                                            <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-1 font-mono uppercase">
                                                                {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-lg font-black ${item.percentage >= 70 ? 'text-green-400' : 'text-orange-400'}`}>
                                                                {item.score} / {item.total_questions}
                                                            </div>
                                                            <div className="text-xs text-gray-500 font-medium">{item.percentage}%</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="mt-8 pt-8 border-t border-white/5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">Badges & Achievements</h3>
                                                <button
                                                    onClick={() => setBadgeModalOpen(true)}
                                                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded"
                                                >
                                                    <Plus size={12} /> Assign Badge
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                {selectedUser.badges && selectedUser.badges.length > 0 ? (
                                                    selectedUser.badges.map((badge: any, idx: number) => (
                                                        <div key={`${badge.id || badge.name || 'badge'}-${idx}`} className="relative group bg-white/5 p-2 rounded-xl border border-white/5 flex flex-col items-center gap-1">
                                                            <button
                                                                onClick={() => handleRemoveBadge(idx)}
                                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                            <div className="text-2xl">{badge.image_url && !badge.image_url.startsWith('http') ? badge.image_url : (badge.image_url ? <img src={badge.image_url} className="w-8 h-8 object-contain" /> : '🏅')}</div>
                                                            <div className="text-[9px] text-center text-gray-400 truncate w-full">{badge.name}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-4 text-center text-gray-600 text-xs py-4 italic">No badges earned yet.</div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 font-mono">Pass Rate</div>
                                            <div className="text-3xl font-black text-emerald-400">
                                                {userHistory.filter(h => h.type === 'quiz' && h.percentage >= 70).length > 0
                                                    ? Math.round((userHistory.filter(h => h.type === 'quiz' && h.percentage >= 70).length / userHistory.filter(h => h.type === 'quiz').length) * 100)
                                                    : 0}%
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">{(userHistory.filter(h => h.type === 'quiz').length)} Total Quizzes</div>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 font-mono">Avg Score</div>
                                            <div className="text-3xl font-black text-purple-400">
                                                {userHistory.filter(h => h.type === 'quiz').length > 0
                                                    ? Math.round(userHistory.filter(h => h.type === 'quiz').reduce((acc, curr) => acc + (curr.percentage || 0), 0) / userHistory.filter(h => h.type === 'quiz').length)
                                                    : 0}%
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">Performance Mean</div>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 font-mono">Top Subject</div>
                                            <div className="text-xl font-black text-orange-400 truncate px-2">
                                                {Object.entries(userHistory.filter(h => h.type === 'quiz').reduce((acc: any, curr: any) => {
                                                    acc[curr.quiz_category] = (acc[curr.quiz_category] || 0) + 1;
                                                    return acc;
                                                }, {})).sort((a: any, b: any) => b[1] - a[1])[0]?.[0]?.toUpperCase() || 'N/A'}
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">Most Mastered</div>
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-3xl bg-[#0A0C10] border border-white/10 shadow-2xl">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Global Score Progression</h3>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                                                <TrendingUp size={12} className="text-purple-400" />
                                                <span className="text-[10px] font-black text-purple-400 uppercase">Growth Trend</span>
                                            </div>
                                        </div>
                                        <div className="h-56 w-full flex items-end gap-3 px-4">
                                            {userHistory.filter(h => h.type === 'quiz').slice(0, 12).reverse().map((q, idx) => (
                                                <div key={`${q.id || q.quizId || q.created_at || q.date || 'quiz'}-${idx}`} className="flex-1 flex flex-col items-center gap-3 group relative">
                                                    <div 
                                                        className={`w-full rounded-t-xl bg-gradient-to-t transition-all duration-700 relative ${q.percentage >= 70 ? 'from-emerald-500/20 to-emerald-500 group-hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'from-orange-500/20 to-orange-500 group-hover:to-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]'}`}
                                                        style={{ height: `${q.percentage}%` }}
                                                    >
                                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-300 z-10">
                                                            <div className="bg-white text-black text-[10px] font-black px-2 py-1 rounded-lg shadow-xl whitespace-nowrap mb-2 relative">
                                                                {q.percentage}% Accuracy
                                                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[8px] text-gray-500 font-black uppercase tracking-tighter truncate w-full text-center group-hover:text-gray-300 transition-colors">
                                                        {(q.quiz_category || q.title || 'N/A').slice(0, 5)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-4">Performance Breakdown</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            {Object.entries(userHistory.filter(h => h.type === 'quiz').reduce((acc: any, curr: any) => {
                                                if (!acc[curr.quiz_category]) acc[curr.quiz_category] = { total: 0, sum: 0 };
                                                acc[curr.quiz_category].total += 1;
                                                acc[curr.quiz_category].sum += curr.percentage;
                                                return acc;
                                            }, {})).map(([cat, data]: [string, any]) => (
                                                <div key={cat} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.05] transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-2 h-2 rounded-full ${Math.round(data.sum / data.total) >= 70 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`} />
                                                        <div>
                                                            <div className="font-bold text-gray-200 text-sm">{cat}</div>
                                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{data.total} Attempts</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-8">
                                                        <div className="text-right">
                                                            <div className="text-[10px] text-gray-500 font-black uppercase mb-1">Mean</div>
                                                            <div className="text-xl font-black text-white">{Math.round(data.sum / data.total)}%</div>
                                                        </div>
                                                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-1000 ${Math.round(data.sum / data.total) >= 70 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                                                style={{ width: `${Math.round(data.sum / data.total)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {badgeModalOpen && (
                                <div className="absolute inset-0 z-30 bg-[#0A0C10]/95 backdrop-blur-xl p-8 animate-in slide-in-from-bottom duration-500">
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <h3 className="text-xl font-black text-white tracking-tight">Assign Achievement</h3>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Select badge to award {selectedUser.full_name}</p>
                                        </div>
                                        <button 
                                            onClick={() => setBadgeModalOpen(false)}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-xl"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100%-120px)] pr-2 custom-scrollbar">
                                        {availableBadges.map(b => (
                                            <button
                                                key={b.id}
                                                onClick={() => handleAddBadge(b.id)}
                                                className="flex items-center gap-4 p-4 text-left bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 rounded-2xl transition-all group"
                                            >
                                                <div className="w-14 h-14 bg-[#0A0C10] rounded-xl flex items-center justify-center text-3xl shadow-2xl group-hover:scale-110 transition-transform">
                                                    {b.image_url && !b.image_url.startsWith('http') ? b.image_url : <img src={b.image_url} className="w-10 h-10 object-contain" alt="" />}
                                                </div>
                                                <div>
                                                    <div className="font-black text-white group-hover:text-purple-400 transition-colors uppercase tracking-tight">{b.name}</div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">{b.xp_req} XP REQUIRED</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {bulkModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => !bulkProcessing && setBulkModalOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-[#0F1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0A0C10]">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Layers size={18} className="text-purple-400" /> Bulk Update Users
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Update properties for ALL {users.length} users.
                                </p>
                            </div>
                            {!bulkProcessing && (
                                <button
                                    onClick={() => setBulkModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <div className="p-6 space-y-6">
                            {bulkResult ? (
                                <div className="text-center py-6">
                                    {bulkResult.success > 0 ? (
                                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-[bounce_1s]">
                                            <CheckCircle size={32} />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertTriangle size={32} />
                                        </div>
                                    )}
                                    <h4 className="text-xl font-bold text-white mb-2">Update Complete</h4>
                                    <p className="text-gray-400">
                                        Successfully updated {bulkResult.success} users.
                                        {bulkResult.fail > 0 && <span className="block text-red-400 mt-1">{bulkResult.fail} failed.</span>}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Target Field</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => { setBulkField('academic_level'); setBulkValue(''); }}
                                                    className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all ${bulkField === 'academic_level'
                                                        ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                                                        }`}
                                                >
                                                    Academic Level
                                                </button>
                                                <button
                                                    onClick={() => { setBulkField('xp'); setBulkValue(''); }}
                                                    className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all ${bulkField === 'xp'
                                                        ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                                                        }`}
                                                >
                                                    XP Points
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                                                New Value {bulkField === 'xp' && '(Set To)'}
                                            </label>
                                            {bulkField === 'academic_level' ? (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {['1', '2', '3', '4'].map(lvl => (
                                                        <button
                                                            key={lvl}
                                                            onClick={() => setBulkValue(lvl)}
                                                            className={`py-3 rounded-lg text-sm font-bold transition-all border ${bulkValue === lvl
                                                                ? 'bg-white text-black border-white'
                                                                : 'bg-black/40 text-gray-400 border-white/10 hover:bg-white/5 hover:border-white/30'
                                                                }`}
                                                        >
                                                            {lvl}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={bulkValue}
                                                        onChange={(e) => setBulkValue(e.target.value)}
                                                        placeholder="Enter total XP amount..."
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3">
                                        <AlertTriangle className="text-orange-400 shrink-0" size={20} />
                                        <p className="text-xs text-orange-200/80 leading-relaxed">
                                            <strong>Warning:</strong> This action will overwrite the {bulkField === 'academic_level' ? 'Academic Level' : 'XP and Level'} for ALL registered users immediately. This cannot be undone.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleBulkUpdate}
                                        disabled={!bulkValue || bulkProcessing}
                                        className="w-full py-4 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                    >
                                        {bulkProcessing ? (
                                            <>
                                                <RefreshCw size={20} className="animate-spin" />
                                                Updating Database...
                                            </>
                                        ) : (
                                            "Confirm Bulk Update"
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
