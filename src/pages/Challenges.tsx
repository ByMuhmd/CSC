import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Swords, Trophy, Clock, CheckCircle, XCircle, ArrowLeft, Zap,
    Link2, Copy, Check, Globe, Loader2, X, Search, User, ChevronLeft, Trash2, AlertTriangle, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { challengeService, Challenge } from '../services/challengeService';
import { Avatar } from '../components/UIComponents';
import { supabase } from '../lib/supabase';
import { SEMESTERS } from '../data/semesters';

interface ProfileResult {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    xp: number;
}

function SubjectPicker({
    value, onChange
}: {
    value: { category: string; label: string };
    onChange: (v: { category: string; label: string }) => void;
}) {
    const [semesterIdx, setSemesterIdx] = useState<number | null>(null);

    const selectedSemester = semesterIdx !== null ? SEMESTERS[semesterIdx] : null;

    return (
        <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                {selectedSemester ? `Semester ${selectedSemester.id} — Pick Subject` : 'Pick Semester'}
            </label>

            {selectedSemester && (
                <button
                    onClick={() => setSemesterIdx(null)}
                    className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-white transition-colors"
                >
                    <ChevronLeft size={11} /> Back to semesters
                </button>
            )}

            {!selectedSemester ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SEMESTERS.map((sem, idx) => (
                        <button
                            key={sem.id}
                            type="button"
                            onClick={() => setSemesterIdx(idx)}
                            className="py-3 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-purple-600/20 hover:border-purple-500/30 text-left transition-all group"
                        >
                            <div className="text-xs font-bold text-white group-hover:text-purple-300">
                                Semester {sem.id}
                            </div>
                            <div className="text-[9px] text-gray-600 mt-0.5 line-clamp-1">{sem.description}</div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedSemester.subjects.map(sub => {
                        const isSelected = value.category === sub.id;
                        return (
                            <button
                                key={sub.id}
                                type="button"
                                onClick={() => onChange({
                                    category: sub.id,
                                    label: `${sub.name} (Sem ${selectedSemester.id})`
                                })}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2
                                    ${isSelected
                                        ? 'bg-purple-600/20 border-purple-500/30 text-purple-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {sub.icon && <sub.icon size={12} className="shrink-0" />}
                                <span className="truncate">{sub.name}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {value.category && (
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <Check size={12} className="text-purple-400 shrink-0" />
                    <span className="text-xs text-purple-300 font-bold truncate">{value.label}</span>
                </div>
            )}
        </div>
    );
}

function UserSearch({ onSelect }: { onSelect: (p: ProfileResult) => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ProfileResult[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); return; }
        const t = setTimeout(doSearch, 350);
        return () => clearTimeout(t);
    }, [query]);

    const doSearch = async () => {
        setSearching(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, xp')
                .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
                .eq('p2p_hidden', false)
                .limit(8);
            setResults((data || []) as ProfileResult[]);
        } catch {
        }
        finally { setSearching(false); }
    };

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                Search Player
            </label>
            <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="Name or username…"
                    autoFocus
                />
                {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 animate-spin" />}
            </div>

            {results.length > 0 && (
                <div className="bg-[#0A0C10] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                    {results.map(p => (
                        <button
                            key={p.id}
                            onClick={() => onSelect(p)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-500/10 transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 shrink-0">
                                <Avatar url={p.avatar_url} name={p.full_name} size="100%" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{p.full_name}</p>
                                <p className="text-[10px] text-gray-500">@{p.username} · {(p.xp || 0).toLocaleString()} XP</p>
                            </div>
                            <Swords size={14} className="text-purple-400 shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-center text-xs text-gray-600 py-3">No users found</p>
            )}
        </div>
    );
}

export default function Challenges() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id: challengeIdParam } = useParams<{ id?: string }>();

    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [linkedChallenge, setLinkedChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'incoming' | 'sent' | 'open' | 'completed'>('incoming');

    const [p2pHidden, setP2pHidden] = useState(false);
    const [updatingVisibility, setUpdatingVisibility] = useState(false);

    useEffect(() => { if (user) fetchP2PVisibility(); }, [user]);

    const fetchP2PVisibility = async () => {
        const { data } = await supabase.from('profiles').select('p2p_hidden').eq('id', user?.id).single();
        if (data) setP2pHidden(data.p2p_hidden);
    };

    const toggleVisibility = async () => {
        if (!user || updatingVisibility) return;
        setUpdatingVisibility(true);
        try {
            const { moderationService } = await import('../services/moderationService');
            await moderationService.updateP2PVisibility(user.id, !p2pHidden);
            setP2pHidden(!p2pHidden);
        } catch { alert('Failed to update visibility'); }
        finally { setUpdatingVisibility(false); }
    };

    const [modal, setModal] = useState<'none' | 'direct' | 'open'>('none');

    const [category, setCategory] = useState<{ category: string; label: string }>({ category: '', label: '' });

    const [selectedOpponent, setSelectedOpponent] = useState<ProfileResult | null>(null);
    const [sendingDirect, setSendingDirect] = useState(false);

    const [creating, setCreating] = useState(false);
    const [createdChallenge, setCreatedChallenge] = useState<Challenge | null>(null);
    const [copied, setCopied] = useState(false);
    const [openChallengeAccess, setOpenChallengeAccess] = useState<'public' | 'private'>('public');

    const [showJoinById, setShowJoinById] = useState(false);
    const [joinId, setJoinId] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/signin'); return; }
        loadChallenges();
        if (challengeIdParam) loadLinkedChallenge(challengeIdParam);
    }, [user]);

    const loadChallenges = async () => {
        if (!user) return;
        setLoading(true);
        try { setChallenges(await challengeService.getMyChallenges(user.id)); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const getQuizLink = (category: string, challengeId: string, challengerId: string) => {
        const semesterAllMatch = category.match(/^semester-(\d+)-all$/);
        if (semesterAllMatch) {
            const semesterId = semesterAllMatch[1];
            return `/quizzes/${semesterId}/all?challengeId=${challengeId}&challengerId=${challengerId}`;
        }

        let foundSemesterId: number | null = null;
        for (const sem of SEMESTERS) {
            if (sem.subjects.some(s => s.id === category)) {
                foundSemesterId = sem.id;
                break;
            }
        }

        const baseUrl = foundSemesterId 
            ? `/quizzes/${foundSemesterId}/${category}`
            : `/quiz/${category}`;
            
        return `${baseUrl}?challengeId=${challengeId}&challengerId=${challengerId}`;
    };

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('challenges-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'challenges',
                filter: `challenger_id=eq.${user.id}`,
            }, () => {
                challengeService.getMyChallenges(user.id).then(setChallenges);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'challenges',
                filter: `opponent_id=eq.${user.id}`,
            }, () => {
                challengeService.getMyChallenges(user.id).then(setChallenges);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'challenges',
            }, () => {
                challengeService.getMyChallenges(user.id).then(setChallenges);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const loadLinkedChallenge = async (id: string) => {
        const c = await challengeService.getChallengeById(id);
        if (c) setLinkedChallenge(c);
    };

    const resetModal = () => {
        setModal('none');
        setCategory({ category: '', label: '' });
        setSelectedOpponent(null);
        setCreatedChallenge(null);
        setCopied(false);
        setOpenChallengeAccess('public');
    };

    const handleSendDirect = async () => {
        if (!user || !selectedOpponent || !category.category) return;
        setSendingDirect(true);
        try {
            const existing = challenges.find(c => 
                c.challenger_id === user.id && 
                c.opponent_id === selectedOpponent.id && 
                c.quiz_category === category.category &&
                (c.status === 'pending' || c.status === 'accepted')
            );

            if (existing) {
                alert('You already have an active challenge with this player for this subject!');
                setSendingDirect(false);
                return;
            }

            const c = await challengeService.sendChallenge(user.id, selectedOpponent.id, category.category, category.label);
            setChallenges(prev => [c, ...prev]);
            resetModal();
            setTab('sent');
        } catch (e: any) { alert(e.message || 'Failed to send challenge'); }
        finally { setSendingDirect(false); }
    };

    const handleCreateOpen = async () => {
        if (!user || !category.category) return;
        setCreating(true);
        try {
            const c = await challengeService.createOpenChallenge(
                user.id,
                category.category,
                category.label,
                openChallengeAccess === 'public'
            );
            setCreatedChallenge(c);
            setChallenges(prev => [c, ...prev]);
        } catch (e) { alert('Failed to create challenge'); }
        finally { setCreating(false); }
    };

    const handleJoinById = async () => {
        if (!user || !joinId.trim()) return;
        setJoining(true);
        try {
            const c = await challengeService.acceptOpenChallenge(joinId.trim(), user.id);
            setChallenges(prev => [c, ...prev]);
            setShowJoinById(false);
            setJoinId('');
        } catch (e: any) { alert(e.message || 'Failed to join challenge'); }
        finally { setJoining(false); }
    };

    const handleRespond = async (id: string, accept: boolean) => {
        try {
            await challengeService.respondToChallenge(id, accept);
            setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: accept ? 'accepted' : 'declined' } : c));
            if (accept) {
                const c = challenges.find(ch => ch.id === id);
                if (c) navigate(getQuizLink(c.quiz_category, c.id, c.challenger_id));
            }
        } catch { alert('Failed to respond to challenge'); }
    };

    const handleCancel = async (id: string) => {
        try {
            await challengeService.deleteChallenge(id);
            setChallenges(prev => prev.filter(c => c.id !== id));
        } catch { alert('Failed to cancel challenge'); }
    };

    const handleWithdraw = async (challenge: Challenge) => {
        if (!user) return;
        if (!confirm('Withdraw from this challenge? You will lose 50 XP and the other player will win by default.')) return;

        try {
            const updated = await challengeService.withdrawChallenge(challenge.id, user.id);
            setChallenges(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
            if (linkedChallenge?.id === updated.id) {
                setLinkedChallenge(prev => prev ? { ...prev, ...updated } : prev);
            }
        } catch (e: any) {
            alert(e.message || 'Failed to withdraw from challenge');
        }
    };

    const handleAcceptLinked = async (target?: Challenge) => {
        const challengeToAccept = target || linkedChallenge;
        if (!user || !challengeToAccept) return;
        try {
            if (challengeToAccept.is_open_link) {
                const c = await challengeService.acceptOpenChallenge(challengeToAccept.id, user.id);
                if (target) {
                    setChallenges(prev => prev.map(ch => ch.id === c.id ? c : ch));
                } else {
                    setLinkedChallenge(c);
                    setChallenges(prev => [c, ...prev]);
                }
                navigate(getQuizLink(c.quiz_category, c.id, c.challenger_id));
            } else {
                await challengeService.respondToChallenge(challengeToAccept.id, true);
                if (target) {
                    setChallenges(prev => prev.map(ch => ch.id === target.id ? { ...ch, status: 'accepted' } : ch));
                } else {
                    setLinkedChallenge(prev => prev ? { ...prev, status: 'accepted' } : null);
                }
                navigate(getQuizLink(challengeToAccept.quiz_category, challengeToAccept.id, challengeToAccept.challenger_id));
            }
        } catch (e: any) { alert(e.message || 'Failed to accept'); }
    };

    const copyShareLink = (c: Challenge) => {
        navigator.clipboard.writeText(challengeService.getShareUrl(c.id));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const incoming = challenges.filter(c => c.opponent_id === user?.id && (c.status === 'pending' || c.status === 'accepted'));
    const sent = challenges.filter(c => c.challenger_id === user?.id && (c.status === 'pending' || c.status === 'accepted'));
    const open = challenges.filter(c => c.status === 'open');
    const completed = challenges.filter(c => c.status === 'completed' || c.status === 'declined');
    const displayList = tab === 'incoming' ? incoming : tab === 'sent' ? sent : tab === 'open' ? open : completed;
    const activeCount = challenges.filter(c => c.status === 'accepted').length;
    const winCount = completed.filter(c => c.winner_id === user?.id).length;
    const pendingCount = incoming.length + sent.length + open.length;

    const statusColor = (c: Challenge) => {
        if (c.status === 'completed') return c.winner_id ? (c.winner_id === user?.id ? 'text-green-400' : 'text-red-400') : 'text-yellow-400';
        if (c.status === 'declined') return 'text-red-400';
        if (c.status === 'accepted') return 'text-blue-400';
        if (c.status === 'open') return c.is_open_link ? 'text-green-400' : 'text-gray-300';
        return 'text-yellow-400';
    };

    const statusLabel = (c: Challenge) => {
        if (c.status === 'completed') return c.winner_id ? (c.winner_id === user?.id ? '🏆 You Won!' : 'You Lost') : 'Draw';
        if (c.status === 'declined') return 'Declined';
        if (c.status === 'accepted') return 'In Progress';
        if (c.status === 'open') return c.is_open_link ? '🌐 Public' : '🔒 Private';
        return 'Pending';
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-3 sm:p-4 md:p-8">
            <div className="max-w-3xl mx-auto">

                <div className="flex flex-col gap-4 mb-6 sm:mb-8 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                                <Swords size={24} className="text-purple-400" /> Challenges
                            </h1>
                            <p className="text-gray-500 text-xs mt-0.5">Compete with peers in quiz duels</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-2">
                        <button
                            onClick={toggleVisibility}
                            disabled={updatingVisibility}
                            className={`col-span-2 sm:col-span-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                p2pHidden ? 'bg-red-600/10 border-red-500/20 text-red-400' : 'bg-green-600/10 border-green-500/20 text-green-400'
                            }`}
                            title={p2pHidden ? 'You are hidden from searches' : 'You are visible to others'}
                        >
                            {updatingVisibility ? <Loader2 size={14} className="animate-spin" /> : (p2pHidden ? <XCircle size={14} /> : <CheckCircle size={14} />)}
                            {p2pHidden ? 'Hidden' : 'Visible'}
                        </button>
                        <button
                            onClick={() => setShowJoinById(v => !v)}
                            className="p-2 bg-white/5 hover:bg-blue-500/10 text-blue-400 rounded-xl border border-transparent hover:border-blue-500/20 transition-all flex items-center justify-center"
                            title="Join open challenge by ID"
                        >
                            <Link2 size={16} />
                        </button>
                        <button
                            onClick={() => { setModal('direct'); setCategory({ category: '', label: '' }); setSelectedOpponent(null); }}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                        >
                            <User size={14} /> Challenge Player
                        </button>
                        <button
                            onClick={() => { setModal('open'); setCategory({ category: '', label: '' }); setCreatedChallenge(null); }}
                            className="col-span-2 sm:col-span-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-purple-500/20"
                        >
                            <Globe size={14} /> Open Challenge
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-2">Active Duels</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-white">{activeCount}</span>
                            <Zap size={18} className="text-blue-400" />
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-2">Pending</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-white">{pendingCount}</span>
                            <Clock size={18} className="text-yellow-400" />
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-2">Wins</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-white">{winCount}</span>
                            <Trophy size={18} className="text-green-400" />
                        </div>
                    </div>
                </div>

                {linkedChallenge && linkedChallenge.status === 'open' && linkedChallenge.is_open_link && linkedChallenge.challenger_id !== user?.id && (
                    <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-2xl animate-in slide-in-from-top-4">
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800">
                                <Avatar url={linkedChallenge.challenger?.avatar_url} name={linkedChallenge.challenger?.full_name} size="100%" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-0.5">You've been challenged!</p>
                                <p className="text-white font-bold text-sm">{linkedChallenge.challenger?.full_name} · <span className="text-purple-400">{linkedChallenge.quiz_label}</span></p>
                            </div>
                            <button onClick={() => handleAcceptLinked()} className="w-full sm:w-auto px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0">
                                <CheckCircle size={14} /> Accept
                            </button>
                        </div>
                    </div>
                )}

                {showJoinById && (
                    <div className="mb-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl animate-in slide-in-from-top-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70 mb-2">Join Open Challenge by ID</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                value={joinId}
                                onChange={e => setJoinId(e.target.value)}
                                placeholder="Paste challenge ID…"
                                className="flex-1 bg-white/5 border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 placeholder-gray-600"
                            />
                            <button onClick={handleJoinById} disabled={joining || !joinId.trim()} className="w-full sm:w-auto px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                {joining ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />} Join
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-6 overflow-x-auto custom-scrollbar">
                    <div className="flex min-w-max bg-white/5 rounded-2xl p-1.5 border border-white/5 gap-1.5">
                    {[
                        { key: 'incoming', label: 'Incoming', count: incoming.length },
                        { key: 'sent', label: 'Sent', count: sent.length },
                        { key: 'open', label: 'Open', count: open.length },
                        { key: 'completed', label: 'History', count: completed.length },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as any)}
                            className={`min-w-[110px] sm:flex-1 py-2.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${tab === t.key ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            {t.label}
                            {t.count > 0 && <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[9px] flex items-center justify-center">{t.count}</span>}
                        </button>
                    ))}
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}</div>
                ) : displayList.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <Swords size={36} className="mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 font-medium text-sm">No challenges here yet.</p>
                        {tab === 'incoming' && <p className="text-gray-600 text-xs mt-1">When someone challenges you, it'll appear here.</p>}
                        {(tab === 'sent' || tab === 'open') && (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                                <button onClick={() => { setModal('direct'); setCategory({ category: '', label: '' }); setSelectedOpponent(null); }}
                                    className="px-4 py-2 bg-white/5 text-gray-400 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5">
                                    <User size={12} /> Challenge Player
                                </button>
                                <button onClick={() => { setModal('open'); setCategory({ category: '', label: '' }); setCreatedChallenge(null); }}
                                    className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-600/30 transition-colors flex items-center justify-center gap-1.5">
                                    <Globe size={12} /> Open Challenge
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayList.map(challenge => {
                            const isChallenger = challenge.challenger_id === user?.id;
                            const them = isChallenger ? challenge.opponent : challenge.challenger;
                            const myScore = isChallenger ? challenge.challenger_score : challenge.opponent_score;
                            const theirScore = isChallenger ? challenge.opponent_score : challenge.challenger_score;
                            const isOpen = challenge.status === 'open';
                            const isPublicOpen = isOpen && challenge.is_open_link;

                            return (
                                <div key={challenge.id} className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 hover:border-white/20 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative">
                                                <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-800">
                                                    {isOpen
                                                        ? <div className="w-full h-full flex items-center justify-center bg-purple-900/30 text-purple-400"><Globe size={18} /></div>
                                                        : <Avatar url={them?.avatar_url} name={them?.full_name} size="100%" />
                                                    }
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-600/80 flex items-center justify-center">
                                                    <Swords size={8} />
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">
                                                    {isOpen ? (isPublicOpen ? 'Public challenge' : 'Private challenge') : isChallenger ? 'You challenged' : 'Challenged by'}
                                                </p>
                                                <p className="font-bold text-white text-sm">{isOpen ? 'Waiting for opponent…' : (them?.full_name || 'Unknown')}</p>
                                                <p className="text-[10px] text-purple-400 font-mono mt-0.5">{challenge.quiz_label}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 md:items-end shrink-0">
                                            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between md:justify-end">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor(challenge)}`}>{statusLabel(challenge)}</span>
                                                {challenge.status === 'accepted' && (
                                                    <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                        Withdraw = -50 XP
                                                    </span>
                                                )}
                                            </div>

                                            {challenge.status === 'completed' && (
                                                <div className="flex items-center gap-2 text-sm font-black">
                                                    <span className={myScore !== null && theirScore !== null ? (myScore > theirScore ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}>{myScore ?? '-'}</span>
                                                    <span className="text-gray-600 text-xs">vs</span>
                                                    <span className="text-gray-400">{theirScore ?? '-'}</span>
                                                </div>
                                            )}

                                            {!isChallenger && (challenge.status === 'pending' || isPublicOpen) && (
                                                <div className="flex flex-col sm:flex-row gap-1.5 w-full">
                                                    <button 
                                                        onClick={() => isPublicOpen ? handleAcceptLinked(challenge) : handleRespond(challenge.id, true)} 
                                                        className="w-full px-2.5 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <CheckCircle size={10} /> Accept
                                                    </button>
                                                    {challenge.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleRespond(challenge.id, false)} 
                                                            className="w-full px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <XCircle size={10} /> Decline
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {challenge.status === 'accepted' && (
                                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 md:justify-end">
                                                    <button onClick={() => navigate(getQuizLink(challenge.quiz_category, challenge.id, challenge.challenger_id))} className="w-full sm:w-auto px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
                                                        <Zap size={10} /> {isChallenger ? 'Start Your Turn' : 'Take Quiz'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleWithdraw(challenge)}
                                                        className="w-full sm:w-auto px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <LogOut size={10} /> Withdraw
                                                    </button>
                                                </div>
                                            )}

                                            {isChallenger && (challenge.status === 'pending' || challenge.status === 'open') && (
                                                <div className="flex flex-col sm:flex-row gap-1.5 w-full">
                                                    {isPublicOpen && (
                                                        <button onClick={() => copyShareLink(challenge)} className="w-full px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
                                                            {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />} Share
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleCancel(challenge.id)} className="w-full px-2.5 py-1.5 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 border border-white/10 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
                                                        <Trash2 size={10} /> Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                        <Clock size={9} className="text-gray-600" />
                                        <span className="text-[9px] text-gray-600 font-mono">
                                            {new Date(challenge.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-[9px] text-gray-700 sm:ml-auto font-mono">ID: {challenge.id.split('-')[0]}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {modal === 'direct' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) resetModal(); }}>
                    <div className="w-full max-w-md bg-[#0A0C10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <User size={15} className="text-white" /> Challenge a Player
                            </h3>
                            <button onClick={resetModal} className="text-gray-500 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

                            <UserSearch onSelect={p => setSelectedOpponent(p)} />

                            {selectedOpponent && (
                                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 shrink-0">
                                        <Avatar url={selectedOpponent.avatar_url} name={selectedOpponent.full_name} size="100%" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{selectedOpponent.full_name}</p>
                                        <p className="text-[10px] text-gray-500">@{selectedOpponent.username}</p>
                                    </div>
                                    <button onClick={() => setSelectedOpponent(null)} className="text-gray-600 hover:text-white transition-colors"><X size={14} /></button>
                                </div>
                            )}

                            <div className="border-t border-white/5 pt-4">
                                <SubjectPicker value={category} onChange={setCategory} />
                            </div>

                            <button
                                onClick={handleSendDirect}
                                disabled={sendingDirect || !selectedOpponent || !category.category}
                                className="w-full py-3 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {sendingDirect ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
                                Send Challenge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modal === 'open' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) resetModal(); }}>
                    <div className="w-full max-w-md bg-[#0A0C10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-purple-500/5">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Globe size={15} className="text-purple-400" /> Create Open Challenge
                            </h3>
                            <button onClick={resetModal} className="text-gray-500 hover:text-white"><X size={16} /></button>
                        </div>

                        {createdChallenge ? (
                            <div className="p-6 text-center space-y-4">
                                <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                                    <CheckCircle size={24} className="text-green-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-lg">Challenge created!</p>
                                    <p className="text-gray-500 text-sm mt-1">Share the link — anyone can accept it.</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-gray-400 break-all text-left">
                                    {challengeService.getShareUrl(createdChallenge.id)}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => copyShareLink(createdChallenge)} className="flex-1 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                    <button onClick={resetModal} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold text-sm transition-colors">
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                <SubjectPicker value={category} onChange={setCategory} />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">Access Type</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setOpenChallengeAccess('public')}
                                            className={`rounded-xl border px-4 py-3 text-left transition-all ${openChallengeAccess === 'public' ? 'bg-purple-600/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <div className="font-bold text-sm">Public</div>
                                            <div className="text-[10px] mt-1">Anyone with the link can join.</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOpenChallengeAccess('private')}
                                            className={`rounded-xl border px-4 py-3 text-left transition-all ${openChallengeAccess === 'private' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <div className="font-bold text-sm">Private</div>
                                            <div className="text-[10px] mt-1">Saved for you only and hidden from other players.</div>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-600">
                                    {openChallengeAccess === 'public'
                                        ? 'Anyone with the link can accept. Expires in 7 days.'
                                        : 'Private challenges stay in your open tab and cannot be joined by other players.'}
                                </p>
                                <div className="flex items-start gap-2 rounded-xl border border-amber-500/10 bg-amber-500/5 p-3 text-[11px] text-amber-200/80">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                                    <span>Withdrawing from an active challenge ends it immediately and deducts 50 XP from the player who withdraws.</span>
                                </div>
                                <button
                                    onClick={handleCreateOpen}
                                    disabled={creating || !category.category}
                                    className="w-full py-3 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/20 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />} {openChallengeAccess === 'public' ? 'Create & Get Link' : 'Create Private Challenge'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
