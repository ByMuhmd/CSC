
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Trophy, Star, Medal, User as UserIcon, Filter, ArrowLeft, Crown, Lock, EyeOff } from 'lucide-react';
import { Loading as LoadingLogo } from '../components/UIComponents';
import { calculateLevel, getRankBadge } from '../utils/gamification';
import { Avatar as UserAvatar } from '../components/UIComponents';
import { useGamification } from '../hooks/useGamification';
import { useMaintenance } from '../hooks/useMaintenance';

interface Profile {
    id: string;
    username?: string;
    full_name: string;
    avatar_url: string;
    xp: number;
    total_score: number;
    level: number;
    academic_level?: string;
    rank?: number;
}

const getMedalColor = (rank: number) => {
    switch (rank) {
        case 1: return 'from-yellow-300 to-yellow-600 text-yellow-900 border-yellow-400';
        case 2: return 'from-gray-300 to-gray-500 text-gray-900 border-gray-400';
        case 3: return 'from-orange-300 to-orange-600 text-orange-900 border-orange-400';
        default: return 'from-gray-700 to-gray-800 text-white border-gray-700';
    }
};

const getDisplayName = (profile: Profile) => {
    const fullName = profile.full_name?.trim();
    const username = profile.username?.trim();
    return fullName || username || 'Anonymous';
};

const getAvatarRingClass = (rank: number, isXpView: boolean) => {
    if (!isXpView) return 'border-gray-700';
    if (rank === 1) return 'border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.35)]';
    if (rank === 2) return 'border-slate-300 shadow-[0_0_14px_rgba(226,232,240,0.25)]';
    if (rank === 3) return 'border-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.25)]';
    return 'border-purple-500/70 shadow-[0_0_12px_rgba(168,85,247,0.2)]';
};

const Podium = ({ profile, rank, delay, activeTab, isCurrentUser, onNavigate }: { profile: Profile; rank: number; delay: number; activeTab: 'xp' | 'score'; isCurrentUser: boolean; onNavigate: () => void }) => {
    const scale = rank === 1 ? 'scale-110 z-20' : 'scale-100 z-10 mt-8';

    return (
        <div
            className={`flex flex-col items-center transform transition-all duration-700 ${scale} animate-in fade-in slide-in-from-bottom-8 fill-mode-forwards`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="relative mb-4 group cursor-pointer" onClick={() => isCurrentUser && onNavigate()}>
                <div className={`absolute -inset-1 rounded-full bg-gradient-to-br ${getMedalColor(rank)} blur opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full p-1 bg-gradient-to-br ${getMedalColor(rank)}`}>
                    <UserAvatar
                        url={profile.avatar_url}
                        name={getDisplayName(profile)}
                        className="w-full h-full rounded-full object-cover border-2 border-black/50"
                        size="100%"
                    />
                    {rank === 1 && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <Crown size={32} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] animate-bounce" />
                        </div>
                    )}
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br ${getMedalColor(rank)} flex items-center justify-center font-black text-sm md:text-base border-2 border-black shadow-lg`}>
                        {rank}
                    </div>
                </div>
            </div>

            <div className={`text-center ${isCurrentUser ? 'bg-purple-500/20 px-4 py-2 rounded-xl border border-purple-500/50' : ''}`}>
                <h3 className="font-bold text-white text-sm md:text-lg mb-1 truncate max-w-[120px] md:max-w-[150px]">
                    {getDisplayName(profile)}
                </h3>
                <div className="flex items-center justify-center gap-1.5 ">
                    <span className={`font-mono font-bold ${activeTab === 'xp' ? 'text-purple-400' : 'text-blue-400'}`}>
                        {activeTab === 'xp' ? (profile.xp || 0).toLocaleString() : (profile.total_score || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] uppercase text-gray-500 font-bold">{activeTab === 'xp' ? 'XP' : 'PTS'}</span>
                </div>
            </div>
        </div>
    );
};

const ChampionCard = ({ profile, rank, delay, activeTab }: { profile: Profile; rank: number; delay: number; activeTab: 'xp' | 'score' }) => {
    const isFirst = rank === 1;

    const config = {
        1: {
            height: 'h-96 md:h-[26rem]',
            width: 'w-64 md:w-72',
            z: 'z-20',
            border: 'border-yellow-500',
            bg: 'bg-gradient-to-b from-yellow-900/80 via-black to-black',
            accent: 'text-yellow-500',
            glow: 'shadow-[0_0_50px_rgba(234,179,8,0.3)]',
            crownSize: 48
        },
        2: {
            height: 'h-80 md:h-[22rem]',
            width: 'w-56 md:w-64',
            z: 'z-10',
            border: 'border-gray-400',
            bg: 'bg-gradient-to-b from-gray-800/80 via-black to-black',
            accent: 'text-gray-300',
            glow: 'shadow-[0_0_30px_rgba(156,163,175,0.2)]',
            crownSize: 0
        },
        3: {
            height: 'h-80 md:h-[22rem]',
            width: 'w-56 md:w-64',
            z: 'z-10',
            border: 'border-orange-700',
            bg: 'bg-gradient-to-b from-orange-900/80 via-black to-black',
            accent: 'text-orange-400',
            glow: 'shadow-[0_0_30px_rgba(249,115,22,0.2)]',
            crownSize: 0
        }
    }[rank] || { height: '', width: '', z: '', border: '', bg: '', accent: '', glow: '', crownSize: 0 };

    return (
        <div
            className={`relative group flex flex-col items-center ${config.height} ${config.width} ${config.z} rounded-3xl border flex-shrink-0
            ${config.border} ${config.bg} ${config.glow} transition-all duration-700 hover:-translate-y-2
            animate-in slide-in-from-bottom-32 fade-in fill-mode-forwards`}
            style={{ animationDelay: `${delay}ms` }}
        >

            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none"></div>

            <div className={`absolute top-4 right-4 text-9xl font-black opacity-10 select-none pointer-events-none ${config.accent}`}>
                {rank}
            </div>

            <div className="relative z-10 flex flex-col items-center w-full h-full p-6">

                {isFirst && (
                    <div className="absolute -top-10 animate-bounce">
                        <Crown size={config.crownSize} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                    </div>
                )}

                <div className={`relative mb-6 ${isFirst ? 'mt-8' : 'mt-4'}`}>
                    <div className={`absolute -inset-1 rounded-full blur-md opacity-75 ${config.accent.replace('text', 'bg')}`}></div>
                    <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-black border-2 ${config.border}`}>
                        <UserAvatar
                            url={profile.avatar_url}
                            name={getDisplayName(profile)}
                            className="w-full h-full"
                            size="100%"
                        />
                    </div>

                    <div className={`absolute -bottom-3 inset-x-0 mx-auto w-10 h-10 rounded-full bg-black border ${config.border} flex items-center justify-center text-xl font-bold ${config.accent}`}>
                        {rank}
                    </div>
                </div>

                <div className="text-center mt-auto w-full mb-4">
                    <h3 className={`font-black text-white text-lg md:text-xl uppercase tracking-wider truncate mb-2`}>
                        {getDisplayName(profile)}
                    </h3>

                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm`}>
                        <span className={`font-mono font-bold text-lg ${config.accent}`}>
                            {activeTab === 'xp' ? (profile.xp || 0).toLocaleString() : (profile.total_score || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{activeTab === 'xp' ? 'XP' : 'PTS'}</span>
                    </div>
                </div>

                <div className={`w-12 h-1 rounded-full ${config.accent.replace('text', 'bg')} opacity-50`}></div>
            </div>
        </div>
    );
};

const RankRow = ({ profile, rank, isCurrentUser, activeTab }: { profile: Profile, rank: number, isCurrentUser: boolean, activeTab: 'xp' | 'score' }) => {

    const { config } = useGamification();
    const safeXp = profile.xp || 0;
    const badge = getRankBadge(calculateLevel(safeXp), config.ranks);

    return (
        <div
            className={`grid grid-cols-12 gap-4 p-4 items-center group transition-colors ${isCurrentUser ? 'bg-purple-500/10 hover:bg-purple-500/20 shadow-[inset_4px_0_0_0_rgba(168,85,247,1)]' : 'hover:bg-white/5'
                }`}
        >
            <div className="col-span-2 md:col-span-1 flex justify-center">
                <div className={`font-mono font-bold text-lg ${isCurrentUser ? 'text-purple-400' : 'text-gray-500'}`}>
                    #{rank}
                </div>
            </div>

            <div className="col-span-7 md:col-span-8 flex items-center gap-3 md:gap-4 overflow-hidden">
                <div className={`relative flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 ${isCurrentUser ? 'border-purple-500' : getAvatarRingClass(rank, activeTab === 'xp')}`}>
                    <UserAvatar
                        url={profile.avatar_url}
                        name={getDisplayName(profile)}
                        className="w-full h-full rounded-full object-cover"
                        size="100%"
                    />
                </div>
                <div className="min-w-0">
                    <div className={`font-bold text-sm md:text-base truncate flex items-center gap-2 ${isCurrentUser ? 'text-white' : 'text-gray-300'}`}>
                        {getDisplayName(profile)}
                        {isCurrentUser && (
                            <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">You</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 font-medium">Lvl {calculateLevel(safeXp)}</span>
                        {activeTab === 'xp' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border border-current opacity-70 ${badge.color}`}>
                                {badge.label}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="col-span-3 flex items-center justify-end gap-2">
                <div className={`font-mono font-bold text-base md:text-lg ${activeTab === 'xp' ? 'text-purple-400' : 'text-blue-400'}`}>
                    {activeTab === 'xp' ? safeXp.toLocaleString() : (profile.total_score || 0).toLocaleString()}
                </div>
            </div>
        </div>
    );
};

export default function Leaderboard() {
    const navigate = useNavigate();
    const { user, guest, profile, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'xp' | 'score'>('xp');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const { isLeaderboardLocked } = useMaintenance();
    const topProfile = profiles[0];
    const runnerUpProfile = profiles[1];
    const bronzeProfile = profiles[2];

    useEffect(() => {
        fetchLeaderboard();

        const channel = supabase
            .channel('leaderboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchLeaderboard(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_scores' }, () => fetchLeaderboard(true))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeTab, user, guest]);

    const fetchLeaderboard = async (silent = false) => {
        if (!silent) setLoading(true);
        const orderBy = activeTab === 'xp' ? 'xp' : 'total_score';
        const userLevel = profile?.academic_level;

        let profilesQuery = supabase
            .from('profiles')
            .select('*')
            .eq('is_hidden', false)
            .order(orderBy, { ascending: false })
            .limit(10);

        const guestLevel = guest?.academic_level;
        const effectiveLevel = userLevel || guestLevel;

        if (effectiveLevel) {
            profilesQuery = profilesQuery.eq('academic_level', effectiveLevel);
        }

        let guestsQuery = supabase
            .from('guest_scores')
            .select('*')
            .eq('is_hidden', false)
            .order(orderBy, { ascending: false })
            .limit(10);

        if (effectiveLevel) {
            guestsQuery = guestsQuery.eq('academic_level', effectiveLevel);
        }

        const [profilesRes, guestsRes] = await Promise.all([profilesQuery, guestsQuery]);

        let combined: Profile[] = [];

        if (profilesRes.data) combined = [...combined, ...profilesRes.data];

        if (guestsRes.data) {
            const mappedGuests: Profile[] = guestsRes.data.map((g: any) => ({
                id: g.id,
                full_name: g.full_name,
                avatar_url: g.avatar_url,
                xp: g.xp || 0,
                total_score: g.total_score || 0,
                level: calculateLevel(g.xp || 0),
                academic_level: g.academic_level
            }));
            combined = [...combined, ...mappedGuests];
        }

        combined.sort((a, b) => {
            const valA = activeTab === 'xp' ? (a.xp || 0) : (a.total_score || 0);
            const valB = activeTab === 'xp' ? (b.xp || 0) : (b.total_score || 0);
            return valB - valA;
        });

        const top10 = combined.slice(0, 10).map((p, i) => ({ ...p, rank: i + 1 }));
        setProfiles(top10);

        const currentId = user?.id || guest?.id;
        if (!currentId) {
            setCurrentUserProfile(null);
            setLoading(false);
            return;
        }

        const isInTop10 = top10.find(p => p.id === currentId);

        if (isInTop10) {
            setCurrentUserProfile(null);
        } else {
            let userProfileObj: Profile | null = null;

            if (user) {
                const { data: myData } = await supabase.from('profiles').select('*').eq('id', user.id).single();

                if (myData) userProfileObj = { ...myData, xp: myData.xp || 0, level: calculateLevel(myData.xp || 0) };
            } else if (guest) {
                userProfileObj = {
                    id: guest.id,
                    full_name: guest.full_name,
                    avatar_url: guest.avatar_url,
                    xp: guest.xp || 0,
                    total_score: 0,
                    level: guest.level || 1
                };
            }

            if (userProfileObj) {
                const myVal = activeTab === 'xp' ? userProfileObj.xp : userProfileObj.total_score;

                let pCountQ = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_hidden', false).gt(orderBy, myVal);
                if (effectiveLevel) pCountQ = pCountQ.eq('academic_level', effectiveLevel);

                let gCountQ = supabase.from('guest_scores').select('*', { count: 'exact', head: true }).eq('is_hidden', false).gt(orderBy, myVal);
                if (effectiveLevel) gCountQ = gCountQ.eq('academic_level', effectiveLevel);

                const [pC, gC] = await Promise.all([pCountQ, gCountQ]);
                const rank = (pC.count || 0) + (gC.count || 0) + 1;

                setCurrentUserProfile({ ...userProfileObj, rank });
            }
        }

        setLoading(false);
    };

    const { isBlindHourActive } = useMaintenance();

    if (isBlindHourActive && !isAdmin) {
        return (
            <div className="min-h-screen bg-black text-white pt-24 px-4 pb-12 relative overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-black to-black"></div>
                <div className="relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-1000">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-sm tracking-widest uppercase animate-pulse">
                        <EyeOff size={16} />
                        Blind Hour Active
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-500 to-gray-900 tracking-tighter">MYSTERY</h1>
                    <button
                        onClick={() => navigate('/profile')}
                        className="mt-8 px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all font-bold text-sm flex items-center justify-center gap-2 mx-auto"
                    >
                        <UserIcon size={18} />
                        Return to Profile
                    </button>
                </div>
            </div>
        );
    }

    if (isLeaderboardLocked && !loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-white pt-24 px-4 pb-12 relative overflow-hidden flex flex-col items-center">
                <div className="max-w-6xl w-full mx-auto relative z-10 flex flex-col items-center">
                    <div className="mb-16 text-center">
                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-yellow-600 mb-4 tracking-tighter">
                            HALL OF FAME
                        </h1>
                        <p className="text-yellow-100/60">Season Closed</p>
                    </div>
                    {profiles.length > 0 && (
                        <div className="relative w-full flex flex-col md:flex-row justify-center items-center md:items-end gap-6 md:gap-8 mb-20">
                            {profiles[1] && <ChampionCard profile={profiles[1]} rank={2} delay={400} activeTab={activeTab} />}
                            {profiles[0] && <ChampionCard profile={profiles[0]} rank={1} delay={200} activeTab={activeTab} />}
                            {profiles[2] && <ChampionCard profile={profiles[2]} rank={3} delay={600} activeTab={activeTab} />}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05060a] text-white pt-20 px-4 pb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),transparent_35%),radial-gradient(circle_at_right,_rgba(59,130,246,0.12),transparent_28%),linear-gradient(to_bottom,_rgba(255,255,255,0.03),transparent_20%)] pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-300 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    {profile?.academic_level && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs md:text-sm font-medium text-gray-200">
                            <Filter size={14} className="text-purple-400" />
                            Batch {profile.academic_level}
                        </div>
                    )}
                </div>

                <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0C10]/80 p-6 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.08),transparent_35%),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.08),transparent_30%)] pointer-events-none" />
                    <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300 mb-4">
                                <Crown size={12} className="fill-yellow-300" />
                                Hall Of Fame
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-yellow-200 to-yellow-500">
                                Leaderboard
                            </h1>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 p-2 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                            <button
                                onClick={() => setActiveTab('xp')}
                                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition-all duration-300 ${activeTab === 'xp' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Crown size={15} />
                                XP Rank
                            </button>
                            <button
                                onClick={() => setActiveTab('score')}
                                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition-all duration-300 ${activeTab === 'score' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Star size={15} />
                                Quiz Scores
                            </button>
                        </div>
                    </div>
                </div>

                {profiles.length > 0 && (
                    <div className="relative mb-14 rounded-[2rem] border border-white/5 bg-white/[0.02] p-4 md:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.2)] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                        {topProfile && (
                            <div className="absolute top-4 right-4 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
                                Top {activeTab === 'xp' ? `${(topProfile.xp || 0).toLocaleString()} XP` : `${(topProfile.total_score || 0).toLocaleString()} PTS`}
                            </div>
                        )}
                        <div className="relative flex justify-center items-end gap-4 md:gap-12 min-h-[320px]">
                            {runnerUpProfile && <Podium profile={runnerUpProfile} rank={2} delay={200} activeTab={activeTab} isCurrentUser={(user?.id === runnerUpProfile.id || guest?.id === runnerUpProfile.id) ?? false} onNavigate={() => navigate('/profile')} />}
                            {topProfile && <Podium profile={topProfile} rank={1} delay={0} activeTab={activeTab} isCurrentUser={(user?.id === topProfile.id || guest?.id === topProfile.id) ?? false} onNavigate={() => navigate('/profile')} />}
                            {bronzeProfile && <Podium profile={bronzeProfile} rank={3} delay={400} activeTab={activeTab} isCurrentUser={(user?.id === bronzeProfile.id || guest?.id === bronzeProfile.id) ?? false} onNavigate={() => navigate('/profile')} />}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <LoadingLogo className="w-16 h-16 text-purple-500 mb-4" />
                        <p className="text-gray-500 font-medium animate-pulse">Calculating Ranks...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-3 max-w-4xl mx-auto w-full">
                            <div className="flex items-center justify-between px-4 pb-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.22em] border-b border-white/5 mb-2">
                                <span>Rank & Student</span>
                                <span>Performance</span>
                            </div>

                            {profiles.slice(3).map((profile) => {
                                const isCurrentUser = (user && profile.id === user.id) || (guest && profile.id === guest.id);
                                return (
                                    <div key={profile.id} className={`rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl ${isCurrentUser ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/40' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}>
                                        <RankRow profile={profile} rank={profile.rank || 0} isCurrentUser={!!isCurrentUser} activeTab={activeTab} />
                                    </div>
                                );
                            })}
                        </div>

                        {currentUserProfile && (
                            <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in max-w-4xl mx-auto w-full">
                                <div className="flex items-center gap-4 mb-2 px-4">
                                    <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent flex-1"></div>
                                    <span className="text-xs font-bold text-gray-500 uppercase">Your Position</span>
                                    <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent flex-1"></div>
                                </div>
                                <div className="bg-gradient-to-r from-purple-900/20 via-black/50 to-blue-900/20 backdrop-blur-md border border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.18)] relative transform hover:scale-[1.01] transition-transform duration-300">
                                    <RankRow profile={currentUserProfile} rank={currentUserProfile.rank || 999} isCurrentUser={true} activeTab={activeTab} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
