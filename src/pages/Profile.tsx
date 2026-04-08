import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, Shield, ShieldAlert, Camera, Trophy, Target, Award, BookOpen, X, Check, Edit2, ArrowLeft, Upload, Clock, Brain, Crown, BarChart2, Flame, Zap, Calendar, Bell, RefreshCw, Settings, ChevronRight, Medal } from 'lucide-react';
import { Loading as LoadingLogo, Notifications as NotificationBell } from '../components/UIComponents';
import NotesDrawer from '../components/NotesDrawer';
import { Certificates as CertificateRenderer, Achievements as DynamicAchievements, Heatmap as ActivityHeatmap } from '../components/GamificationComponents';
import { calculateLevel, calculateLevelProgress, xpForNextLevel, getRankBadge } from '../utils/gamification';
import { supabase } from '../lib/supabase';
import { useGamification } from '../hooks/useGamification';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useMaintenance } from '../hooks/useMaintenance';
import { useToast } from '../context/ToastContext';
import { getPasswordPolicyIssues } from '../utils/security';

const AVATAR_OPTIONS = Array.from({ length: 8 }, (_, i) => `/avatars/${i + 1}.svg`);

const BentoCard = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div
        onClick={onClick}
        className={`bg-[#0A0A0A] border border-white/[0.08] rounded-3xl p-6 relative overflow-hidden group hover:border-white/[0.15] transition-all duration-300 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
        {children}
    </div>
);

export default function Profile() {

    const { user, guest, signOut, updateGuest, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { streak, config } = useGamification();
    const sessions = useGamification(state => state.studySessions);
    const quizResults = useGamification(state => state.quizResults);
    const historyLog = useGamification(state => state.historyLog);
    const badges = useGamification(state => state.badges);
    const [quizTitles, setQuizTitles] = useState<Record<string, string>>({});

    const activities = React.useMemo(() => {
        const quizzes = (quizResults || []).map(q => ({ date: q.date, type: 'quiz', count: 1 }));
        const history = (historyLog || []).map(h => ({ date: h.date, type: h.type, count: 1 }));
        return [...quizzes, ...history];
    }, [quizResults, historyLog]);
    const unlockedBadges = React.useMemo(() => {
        const unique = new Map<string, any>();
        (badges || []).forEach((badge: any) => {
            if (badge?.id) unique.set(badge.id, badge);
        });
        return Array.from(unique.values()).sort((a: any, b: any) => {
            const aTime = a?.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
            const bTime = b?.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [badges]);
    const passedQuizzes = React.useMemo(() => (quizResults || []).filter(result => result.passed).length, [quizResults]);
    const averageQuizScore = React.useMemo(() => {
        if (!quizResults?.length) return 0;
        return Math.round(quizResults.reduce((sum, result) => sum + (result.score || 0), 0) / quizResults.length);
    }, [quizResults]);
    const { requestPermission, permission } = usePushNotifications();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingLevel, setIsEditingLevel] = useState(false);
    const [newName, setNewName] = useState('');
    const [rank, setRank] = useState<number | null>(null);
    const [loadingRank, setLoadingRank] = useState(true);
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    const [updatingAvatar, setUpdatingAvatar] = useState(false);
    const [imageError, setImageError] = useState(false);

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const [profileData, setProfileData] = useState<any>(null);
    const [certifications, setCertifications] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [userQuizzes, setUserQuizzes] = useState<any[]>([]);
    const [loadingUserQuizzes, setLoadingUserQuizzes] = useState(false);
    const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
    const [quizDraft, setQuizDraft] = useState({
        title: '',
        description: '',
        access_code: '',
        time_limit: 0,
        is_private: true,
        is_published: true,
    });
    const [savingQuizId, setSavingQuizId] = useState<string | null>(null);
    const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
    const [securityAnomaly, setSecurityAnomaly] = useState<{ suspicious: boolean; reason: string | null } | null>(null);
    const [showAllActivity, setShowAllActivity] = useState(false);
    const [showAllTrophies, setShowAllTrophies] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfileData();
            fetchCertifications();
            fetchUserQuizzes();
        }
        else if (guest) {
            setProfileData({ ...guest, title: 'Beginner', total_score: 0, quizzes_completed: 0 });
            setRank(0);
            setLoadingRank(false);
        }
    }, [user, guest]);

    useEffect(() => {
        if (profileData || guest) fetchRank();
    }, [profileData, guest]);

    useEffect(() => {
        const stored = sessionStorage.getItem('security_anomaly');
        if (!stored) return;

        try {
            setSecurityAnomaly(JSON.parse(stored));
        } catch {
            setSecurityAnomaly({ suspicious: true, reason: 'We detected a security anomaly.' });
        }
    }, []);

    useEffect(() => {
        const loadQuizTitles = async () => {
            const quizIds = Array.from(new Set((quizResults || []).map(result => result.quizId).filter(Boolean)));
            if (quizIds.length === 0) {
                setQuizTitles({});
                return;
            }

            const { data, error } = await supabase
                .from('quizzes')
                .select('id,title')
                .in('id', quizIds);

            if (error) {
                console.error('Error fetching quiz titles', error);
                return;
            }

            const nextTitles = (data || []).reduce((acc: Record<string, string>, quiz: any) => {
                acc[quiz.id] = quiz.title;
                return acc;
            }, {});

            setQuizTitles(nextTitles);
        };

        loadQuizTitles();
    }, [quizResults]);

    const fetchProfileData = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (data) setProfileData(data);
            else {

                const newProfile = {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || 'User',
                    avatar_url: user.user_metadata?.avatar_url,
                    xp: 0, level: 1, total_score: 0, quizzes_completed: 0, updated_at: new Date().toISOString()
                };
                await supabase.from('profiles').insert(newProfile);
                setProfileData(newProfile);
            }
        } catch (error) { console.error("Error fetching profile", error); }
    };

    const fetchCertifications = async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('user_certifications').select('*').eq('user_id', user.id).order('issue_date', { ascending: false });
            setCertifications(data || []);
        } catch (err) {
            console.error("Error fetching certifications", err);
        }
    };

    const fetchUserQuizzes = async () => {
        if (!user) return;

        setLoadingUserQuizzes(true);
        try {
            const { data, error } = await supabase
                .from('quizzes')
                .select('id,title,description,access_code,time_limit,is_private,is_published,created_at,subjects(name),semesters(title)')
                .eq('submitted_by', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUserQuizzes(data || []);
        } catch (err: any) {
            console.error('Error fetching user quizzes', err);
            showToast('Load Failed', 'Could not load your quizzes right now.', 'error');
        } finally {
            setLoadingUserQuizzes(false);
        }
    };

    const startEditingQuiz = (quiz: any) => {
        setEditingQuizId(quiz.id);
        setQuizDraft({
            title: quiz.title || '',
            description: quiz.description || '',
            access_code: quiz.access_code || '',
            time_limit: Number(quiz.time_limit || 0),
            is_private: quiz.is_private !== false,
            is_published: quiz.is_published !== false,
        });
    };

    const cancelEditingQuiz = () => {
        setEditingQuizId(null);
        setQuizDraft({
            title: '',
            description: '',
            access_code: '',
            time_limit: 0,
            is_private: true,
            is_published: true,
        });
    };

    const handleUpdateQuiz = async (quizId: string) => {
        if (!user) return;
        if (!quizDraft.title.trim()) {
            showToast('Validation Error', 'Quiz title cannot be empty.', 'warning');
            return;
        }

        setSavingQuizId(quizId);
        try {
            const payload = {
                title: quizDraft.title.trim(),
                description: quizDraft.description.trim() || null,
                access_code: quizDraft.access_code.trim().toUpperCase() || null,
                time_limit: Math.max(0, Number(quizDraft.time_limit) || 0),
                is_private: quizDraft.is_private,
                is_published: quizDraft.is_published,
            };

            const { data, error } = await supabase
                .from('quizzes')
                .update(payload)
                .eq('id', quizId)
                .eq('submitted_by', user.id)
                .select('id,title,description,access_code,time_limit,is_private,is_published,created_at,subjects(name),semesters(title)')
                .single();

            if (error) throw error;

            setUserQuizzes(prev => prev.map(quiz => quiz.id === quizId ? data : quiz));
            showToast('Quiz Updated', 'Your quiz settings were saved.', 'success');
            cancelEditingQuiz();
        } catch (err: any) {
            const message = err?.message?.includes('row-level security')
                ? 'Database policy is blocking quiz updates. Please apply the latest migration.'
                : err?.message || 'Failed to update quiz.';
            showToast('Update Failed', message, 'error');
        } finally {
            setSavingQuizId(null);
        }
    };

    const handleDeleteQuiz = async (quizId: string) => {
        if (!user) return;
        if (!window.confirm('Delete this quiz permanently? This action cannot be undone.')) return;

        setDeletingQuizId(quizId);
        try {
            const { error } = await supabase
                .from('quizzes')
                .delete()
                .eq('id', quizId)
                .eq('submitted_by', user.id);

            if (error) throw error;

            setUserQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
            if (editingQuizId === quizId) {
                cancelEditingQuiz();
            }
            showToast('Quiz Deleted', 'Your quiz has been removed.', 'success');
        } catch (err: any) {
            const message = err?.message?.includes('row-level security')
                ? 'Database policy is blocking quiz deletion. Please apply the latest migration.'
                : err?.message || 'Failed to delete quiz.';
            showToast('Delete Failed', message, 'error');
        } finally {
            setDeletingQuizId(null);
        }
    };

    const fetchRank = async () => {
        try {
            const currentXp = profileData?.xp || user?.user_metadata?.xp || guest?.xp || 0;
            const userLevel = profileData?.academic_level || guest?.academic_level;

            let profilesRankQuery = supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gt('xp', currentXp);

            let guestRankQuery = supabase
                .from('guest_scores')
                .select('*', { count: 'exact', head: true })
                .gt('xp', currentXp);

            if (userLevel) {
                profilesRankQuery = profilesRankQuery.eq('academic_level', userLevel);
                guestRankQuery = guestRankQuery.eq('academic_level', userLevel);
            }

            const { count } = await profilesRankQuery;
            const { count: guestCount } = await guestRankQuery;

            setRank((count || 0) + (guestCount || 0) + 1);
        } catch (err) { console.error("Rank fetch error", err); }
        finally { setLoadingRank(false); }
    };

    const handleManualSync = async () => {
        if (!user) return;
        setIsSyncing(true);
        try {
            await useGamification.getState().syncToDb();
            await useGamification.getState().setUserId(user.id);
            await fetchProfileData();
        } finally { setIsSyncing(false); }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) return;
        try {
            if (user) {
                await supabase.auth.updateUser({ data: { full_name: newName } });
                await supabase.from('profiles').update({ full_name: newName, updated_at: new Date().toISOString() }).eq('id', user.id);
            } else if (guest) updateGuest({ full_name: newName });

            setProfileData((prev: any) => ({ ...prev, full_name: newName }));
            setIsEditingName(false);
        } catch (err) { alert("Failed to update name"); }
    };

    const handleUpdateAvatar = async (url: string) => {
        setUpdatingAvatar(true);
        try {
            if (user) {
                await supabase.auth.updateUser({ data: { avatar_url: url } });
                await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', user.id);
            } else if (guest) updateGuest({ avatar_url: url });

            setProfileData((prev: any) => ({ ...prev, avatar_url: url }));
            setIsEditingAvatar(false);
        } finally { setUpdatingAvatar(false); }
    };

    const handleUpdateLevel = async (newLevel: number) => {
        const levelStr = String(newLevel);
        try {
            if (user) {
                const [{ error: profileError }, { error: metadataError }] = await Promise.all([
                    supabase.from('profiles').update({ academic_level: levelStr, updated_at: new Date().toISOString() }).eq('id', user.id),
                    supabase.auth.updateUser({
                        data: {
                            ...user.user_metadata,
                            academic_level: levelStr
                        }
                    })
                ]);
                if (profileError) throw profileError;
                if (metadataError) throw metadataError;
            } else if (guest) {
                updateGuest({ academic_level: levelStr });
            }

            setProfileData((prev: any) => ({ ...prev, academic_level: levelStr }));
            setIsEditingLevel(false);
        } catch (err) {
            alert("Failed to update academic level");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !user) return;
        setUpdatingAvatar(true);
        try {
            const file = e.target.files[0];
            const filePath = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('avatars').upload(filePath, file);
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            await handleUpdateAvatar(publicUrl);
        } catch (err: any) { alert(err.message); }
        finally { setUpdatingAvatar(false); }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return; }
        const policyIssues = getPasswordPolicyIssues(newPassword, profileData?.email || user?.email || undefined, profileData?.full_name || user?.user_metadata?.full_name || undefined);
        if (policyIssues.length > 0) { setPasswordError(policyIssues[0]); return; }
        setUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordSuccess("Password updated!");
            setTimeout(() => { setIsChangingPassword(false); setPasswordSuccess(null); setNewPassword(''); setConfirmPassword(''); }, 2000);
        } catch (err: any) { setPasswordError(err.message); }
        finally { setUpdatingPassword(false); }
    };

    const handleSignOutAllDevices = async () => {
        try {
            await supabase.auth.signOut({ scope: 'global' });
            navigate('/signin');
        } catch {
            await signOut();
            navigate('/signin');
        }
    };

    const { isXpFrozen, isBlindHourActive } = useMaintenance();
    const { isAdmin } = useAuth();

    const fullName = profileData?.full_name || user?.user_metadata?.full_name || guest?.full_name || 'User';
    const email = user?.email || 'Guest Session';
    const avatarUrl = profileData?.avatar_url || user?.user_metadata?.avatar_url || guest?.avatar_url;

    const rawXp = profileData?.xp || user?.user_metadata?.xp || guest?.xp || 0;

    const showFrozen = isXpFrozen && !isBlindHourActive;
    const isBlind = isBlindHourActive && !isAdmin;

    const currentXp = isBlind ? '???' : (showFrozen ? 'Frozen' : rawXp);

    const level = calculateLevel(rawXp);
    const progress = calculateLevelProgress(rawXp);
    const badge = getRankBadge(level, config.ranks);
    const coursesCompleted = profileData?.courses_completed || 0;
    const recentTimeline = React.useMemo(() => {
        const quizEvents = (quizResults || []).map((result) => ({
            id: `quiz-${result.quizId}-${result.date}`,
            eventType: 'quiz' as const,
            date: new Date(result.date),
            title: quizTitles[result.quizId] || `Quiz ${result.quizId?.slice(0, 8) || ''}`.trim(),
            subtitle: result.passed ? 'Passed quiz attempt' : 'Attempted quiz',
            meta: `Score ${result.score}%`,
            tone: result.passed ? 'success' as const : 'warning' as const,
        }));

        const progressEvents = (historyLog || []).map((item) => ({
            id: `${item.type}-${item.id}-${item.date}`,
            eventType: item.type,
            date: new Date(item.date),
            title: item.title,
            subtitle: item.type === 'course' ? 'Completed course' : item.type === 'module' ? 'Completed module' : 'Completed material',
            meta: item.type === 'course' ? 'Course milestone' : item.type === 'module' ? 'Module milestone' : 'Study progress',
            tone: 'neutral' as const,
        }));

        const badgeEvents = unlockedBadges.map((badge: any) => ({
            id: `badge-${badge.id}-${badge.unlockedAt || badge.id}`,
            eventType: 'badge' as const,
            date: new Date(badge.unlockedAt || Date.now()),
            title: badge.name,
            subtitle: 'Unlocked trophy',
            meta: `+${badge.xp_req || 0} XP`,
            tone: 'trophy' as const,
        }));

        return [...quizEvents, ...progressEvents, ...badgeEvents]
            .filter(item => !Number.isNaN(item.date.getTime()))
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 12);
    }, [historyLog, quizResults, quizTitles, unlockedBadges]);

    const visibleRecentTimeline = showAllActivity ? recentTimeline : recentTimeline.slice(0, 1);
    const visibleCertifications = showAllTrophies ? certifications : certifications.slice(0, 3);

    if (authLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><LoadingLogo className="w-12 h-12 text-white" /></div>;
    if (!user && !guest) { navigate('/signin'); return null; }

    return (
        <div className="min-h-screen bg-[#030303] text-white p-3 sm:p-4 md:p-8 font-sans selection:bg-white/20">

            <div className="fixed inset-0 bg-white/5 opacity-20 pointer-events-none z-0 mix-blend-overlay"></div>

            <div className="max-w-7xl mx-auto relative z-10">

                <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium tracking-wide text-sm">HOME</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 sm:justify-end">
                        <button onClick={handleManualSync} disabled={isSyncing} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                            <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
                        </button>
                        <NotificationBell />
                        <button onClick={() => setIsChangingPassword(true)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-16 md:mb-20">

                    <BentoCard className="md:col-span-2 md:row-span-2 flex flex-col justify-between min-h-[400px] p-4 sm:p-6">
                        <div className="relative z-10">
                            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="relative group self-start">
                                    <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-br from-white/20 to-transparent">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-black relative">
                                            {avatarUrl && !imageError ? (
                                                <img src={avatarUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" onError={() => setImageError(true)} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-3xl font-bold text-gray-700">{fullName[0]}</div>
                                            )}
                                            <button onClick={() => setIsEditingAvatar(true)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                                <Camera className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                    <div className={`px-3 py-1 rounded-full border bg-white/5 border-white/10 text-xs font-bold tracking-wider ${badge.color}`}>
                                        {badge.label}
                                    </div>
                                    <div
                                        onClick={() => setIsEditingLevel(!isEditingLevel)}
                                        className="px-3 py-1 rounded-full border bg-white/5 border-white/10 text-xs font-bold tracking-wider text-blue-400 hover:bg-white/10 cursor-pointer transition-colors flex items-center gap-1"
                                    >
                                        Year {profileData?.academic_level || 1}
                                        <Edit2 size={10} />
                                    </div>
                                </div>
                            </div>

                            {isEditingLevel && (
                                <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Select Academic Year</div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4].map((lvl) => (
                                            <button
                                                key={lvl}
                                                onClick={() => handleUpdateLevel(lvl)}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${(profileData?.academic_level || 1) === lvl
                                                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                Year {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-8">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 mb-2">
                                        <input value={newName} onChange={e => setNewName(e.target.value)} className="bg-transparent border-b border-white/20 text-3xl font-bold focus:outline-none w-full" autoFocus />
                                        <button onClick={handleUpdateName}><Check size={20} className="text-green-500" /></button>
                                    </div>
                                ) : (
                                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 flex items-center gap-3 group cursor-pointer break-words" onClick={() => { setNewName(fullName); setIsEditingName(true); }}>
                                        {fullName}
                                        <Edit2 size={16} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h1>
                                )}
                                <p className="text-gray-500 font-medium break-all text-sm sm:text-base">{email}</p>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm font-medium text-gray-400 mb-2">
                                <span>Lvl {level}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs text-gray-600 mt-2 font-mono uppercase">
                                {isBlind ? 'BLIND HOUR ACTIVE' : (showFrozen ? 'HIDDEN' : `${xpForNextLevel(level) - (typeof currentXp === 'number' ? currentXp : 0)} XP`)} {isBlind ? '' : `to Level ${level + 1}`}
                            </p>
                        </div>

                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
                    </BentoCard>

                    <BentoCard className="flex flex-col items-center justify-center text-center group cursor-default p-4 sm:p-6">
                        <Flame size={40} className={`mb-4 ${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-gray-700'}`} />
                        <div className="text-5xl font-black text-white mb-2">{streak}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Day Streak</div>
                        <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </BentoCard>

                    <BentoCard className="flex flex-col items-center justify-center text-center group cursor-default p-4 sm:p-6">
                        <Trophy size={40} className="mb-4 text-yellow-500" />
                        <div className="text-5xl font-black text-white mb-2">
                            {useMaintenance().isLeaderboardLocked ?
                                <span className="text-2xl md:text-3xl text-yellow-500 tracking-wider">FINISHED</span>
                                : (isBlind ? <span className="text-4xl animate-pulse">???</span> : (loadingRank ? '-' : `#${rank || '-'}`))}
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Global Rank</div>
                        <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </BentoCard>

                    <BentoCard className="md:col-span-2 relative min-h-[200px] flex flex-col p-4 sm:p-6">
                        <ActivityHeatmap activities={activities} />
                    </BentoCard>

                    <div className="md:col-span-2 grid grid-cols-2 gap-3 md:gap-4">
                        {[
                            { label: "Total XP", value: currentXp.toLocaleString(), icon: Zap, color: "text-purple-500" },
                            { label: "Courses", value: coursesCompleted, icon: BookOpen, color: "text-blue-500" },
                            { label: "Quizzes Passed", value: passedQuizzes, icon: Brain, color: "text-green-500" },
                            { label: "Trophies", value: unlockedBadges.length, icon: Trophy, color: "text-yellow-500" },
                        ].map((stat, i) => (
                            <BentoCard key={i} className="flex flex-col justify-between">
                                <stat.icon size={20} className={stat.color} />
                                <div>
                                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                                    <div className="text-[10px] uppercase font-bold text-gray-600">{stat.label}</div>
                                </div>
                            </BentoCard>
                        ))}
                    </div>

                    <BentoCard className="md:col-span-2 row-span-2 flex flex-col p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider">Recent Activity</h3>
                            <Clock size={16} className="text-gray-600" />
                        </div>
                        <div className="flex-1 space-y-4">
                            {visibleRecentTimeline.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                    <Clock size={32} className="opacity-20" />
                                    <span className="text-sm">No recent activity</span>
                                </div>
                            )}
                            {visibleRecentTimeline.map((item) => {
                                const icon = item.eventType === 'quiz'
                                    ? <Brain size={20} />
                                    : item.eventType === 'badge'
                                        ? <Trophy size={20} />
                                        : item.eventType === 'course'
                                            ? <BookOpen size={20} />
                                            : <Check size={20} />;
                                const colorClasses = item.tone === 'success'
                                    ? 'bg-green-500/10 text-green-400'
                                    : item.tone === 'warning'
                                        ? 'bg-yellow-500/10 text-yellow-400'
                                        : item.tone === 'trophy'
                                            ? 'bg-yellow-500/10 text-yellow-400'
                                            : 'bg-purple-500/10 text-purple-400';

                                return (
                                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors group/item">
                                        <div className={`p-2.5 rounded-xl transition-all ${colorClasses}`}>{icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold text-sm truncate">{item.title}</h4>
                                            <p className="text-gray-500 text-xs truncate">{item.subtitle}</p>
                                            <p className={`text-xs font-bold mt-1 ${item.tone === 'success' ? 'text-green-400' : item.tone === 'warning' ? 'text-yellow-400' : item.tone === 'trophy' ? 'text-yellow-400' : 'text-purple-400'}`}>
                                                {item.meta}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-gray-500 text-[10px] font-mono">{item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                            <p className="text-gray-600 text-[10px] font-mono">{item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setShowAllActivity(prev => !prev)}
                            className="mt-6 w-full rounded-xl bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 group"
                        >
                            {showAllActivity ? 'Show Less' : 'Show Full'}
                            <ChevronRight size={14} className={`transition-transform ${showAllActivity ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                        </button>
                    </BentoCard>

                    {certifications.length > 0 && (
                        <div className="md:col-span-full">
                            <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Medal size={16} className="text-yellow-500" /> Certifications & Awards
                            </h3>
                            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
                                {visibleCertifications.map(cert => (
                                    <BentoCard key={cert.id} className="w-full flex gap-4 items-start relative overflow-hidden group">
                                        {cert.image_url === 'generated:default' ? (
                                            <CertificateRenderer
                                                title={cert.title}
                                                description={cert.description}
                                                issueDate={cert.issue_date}
                                                recipientName={profileData?.full_name || 'User'}
                                                metadata={cert.metadata}
                                                className="w-full"
                                            />
                                        ) : (
                                            <>
                                                <img src={cert.image_url} alt={cert.title} className="w-24 h-16 object-cover rounded-lg bg-white/5" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white font-bold text-lg leading-tight mb-1">{cert.title}</h4>
                                                    <p className="text-gray-400 text-xs line-clamp-2 mb-2">{cert.description}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase">
                                                        <Calendar size={12} />
                                                        Issued: {new Date(cert.issue_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </BentoCard>
                                ))}
                            </div>
                            {certifications.length > 1 && (
                                <button
                                    onClick={() => setShowAllTrophies(prev => !prev)}
                                    className="mt-4 w-full rounded-xl bg-white/5 px-5 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 group sm:px-4 sm:py-3 sm:text-xs"
                                >
                                    {showAllTrophies ? 'Show Less' : 'Show Full'}
                                    <ChevronRight size={14} className={`transition-transform ${showAllTrophies ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="md:col-span-full">

                        <BentoCard className="bg-[#0A0A0A] border-none p-4 sm:p-6">
                            <DynamicAchievements sessions={sessions} streak={streak} profileData={profileData} coursesCompleted={coursesCompleted} />
                        </BentoCard>
                    </div>

                    <div className="md:col-span-full">
                        <BentoCard className="bg-[#0A0A0A] border-yellow-500/10 p-4 sm:p-6">
                            <NotesDrawer contextType="general" contextLabel="General Notes" inline />
                        </BentoCard>
                    </div>

                    {user && (
                        <div className="md:col-span-full">
                            <BentoCard className="bg-[#0A0A0A] border-cyan-500/10 p-4 sm:p-6">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">My Added Quizzes</h3>
                                        <p className="text-xs text-gray-500">Edit, delete, and manage quizzes you submitted.</p>
                                    </div>
                                    <button
                                        onClick={fetchUserQuizzes}
                                        disabled={loadingUserQuizzes}
                                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-300 hover:bg-white/10 disabled:opacity-60"
                                    >
                                        Refresh
                                    </button>
                                </div>

                                {loadingUserQuizzes ? (
                                    <div className="py-10 text-center text-sm text-gray-500">Loading your quizzes...</div>
                                ) : userQuizzes.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-gray-500">
                                        You have not added any quizzes yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {userQuizzes.map((quiz) => {
                                            const isEditing = editingQuizId === quiz.id;
                                            const subjectName = quiz.subjects?.name || 'Unknown subject';
                                            const semesterTitle = quiz.semesters?.title || 'Unknown semester';

                                            return (
                                                <div key={quiz.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                                    {isEditing ? (
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                                <div className="space-y-2 md:col-span-2">
                                                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Title</label>
                                                                    <input
                                                                        value={quizDraft.title}
                                                                        onChange={(e) => setQuizDraft(prev => ({ ...prev, title: e.target.value }))}
                                                                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-cyan-500"
                                                                    />
                                                                </div>

                                                                <div className="space-y-2 md:col-span-2">
                                                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Description</label>
                                                                    <textarea
                                                                        rows={3}
                                                                        value={quizDraft.description}
                                                                        onChange={(e) => setQuizDraft(prev => ({ ...prev, description: e.target.value }))}
                                                                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-cyan-500"
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Access Code</label>
                                                                    <input
                                                                        value={quizDraft.access_code}
                                                                        onChange={(e) => setQuizDraft(prev => ({ ...prev, access_code: e.target.value.replace(/[^a-zA-Z0-9# -]/g, '') }))}
                                                                        placeholder="Optional"
                                                                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-cyan-500"
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Time Limit (minutes)</label>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={quizDraft.time_limit}
                                                                        onChange={(e) => setQuizDraft(prev => ({ ...prev, time_limit: Number(e.target.value) || 0 }))}
                                                                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-cyan-500"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-5 text-sm text-gray-300">
                                                                <label className="inline-flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={quizDraft.is_private}
                                                                        onChange={(e) => setQuizDraft(prev => ({ ...prev, is_private: e.target.checked }))}
                                                                        className="h-4 w-4 rounded border-white/20 bg-black"
                                                                    />
                                                                    Private
                                                                </label>

                                                                <label className="inline-flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={quizDraft.is_published}
                                                                        onChange={(e) => setQuizDraft(prev => ({ ...prev, is_published: e.target.checked }))}
                                                                        className="h-4 w-4 rounded border-white/20 bg-black"
                                                                    />
                                                                    Published
                                                                </label>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <button
                                                                    onClick={() => handleUpdateQuiz(quiz.id)}
                                                                    disabled={savingQuizId === quiz.id}
                                                                    className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                                                                >
                                                                    {savingQuizId === quiz.id ? 'Saving...' : 'Save Changes'}
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditingQuiz}
                                                                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-300 hover:bg-white/10"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div>
                                                                    <h4 className="text-lg font-bold text-white">{quiz.title}</h4>
                                                                    <p className="text-xs text-gray-500">{subjectName} • {semesterTitle}</p>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${quiz.is_private ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                                                                        {quiz.is_private ? 'Private' : 'Public'}
                                                                    </span>
                                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${quiz.is_published ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-gray-500/30 bg-gray-500/10 text-gray-300'}`}>
                                                                        {quiz.is_published ? 'Published' : 'Draft'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {quiz.description && (
                                                                <p className="text-sm text-gray-400 whitespace-pre-line">{quiz.description}</p>
                                                            )}

                                                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                                                <span>Time: {quiz.time_limit || 0} min</span>
                                                                <span>Code: {quiz.access_code || 'None'}</span>
                                                                <span>Created: {new Date(quiz.created_at).toLocaleDateString()}</span>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                                                <button
                                                                    onClick={() => startEditingQuiz(quiz)}
                                                                    className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteQuiz(quiz.id)}
                                                                    disabled={deletingQuizId === quiz.id}
                                                                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                                                                >
                                                                    {deletingQuizId === quiz.id ? 'Deleting...' : 'Delete'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </BentoCard>
                        </div>
                    )}

                    <div className="md:col-span-full flex justify-center py-8">
                        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    onClick={() => { signOut(); navigate('/signin'); }}
                                    className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm font-bold text-white/75 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.98]"
                                >
                                    <LogOut size={16} className="text-white/50 group-hover:text-white transition-colors" />
                                    Sign Out
                                </button>

                                <button
                                    onClick={handleSignOutAllDevices}
                                    className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/15 to-red-500/15 px-5 py-4 text-sm font-black text-orange-200 shadow-[0_0_0_1px_rgba(249,115,22,0.05)] transition-all hover:border-orange-400/30 hover:from-orange-500/25 hover:to-red-500/25 hover:text-white active:scale-[0.98]"
                                >
                                    <LogOut size={16} className="text-orange-300 group-hover:text-white transition-colors" />
                                    Sign Out All Devices
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isEditingAvatar && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl max-w-2xl w-full p-6 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Update Avatar</h3>
                                <button onClick={() => setIsEditingAvatar(false)}><X className="text-gray-500 hover:text-white" /></button>
                            </div>
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {AVATAR_OPTIONS.map((url, i) => (
                                    <img key={i} src={url} onClick={() => handleUpdateAvatar(url)} className="w-full h-auto rounded-xl cursor-pointer hover:ring-2 hover:ring-white transition-all bg-white/5" />
                                ))}
                            </div>
                            <div className="border-t border-white/10 pt-6">
                                <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-dashed border-white/20 rounded-xl text-gray-500 hover:text-white hover:border-white transition-colors flex items-center justify-center gap-2">
                                    <Upload size={20} /> Upload Custom Image
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                            </div>
                        </div>
                    </div>
                )}

                {isChangingPassword && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl max-w-md w-full p-8 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Security</h3>
                                <button onClick={() => setIsChangingPassword(false)}><X className="text-gray-500 hover:text-white" /></button>
                            </div>

                            {securityAnomaly?.suspicious && (
                                <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                                    {securityAnomaly.reason || 'We detected a security anomaly on this account. Please review your security settings.'}
                                </div>
                            )}

                            {passwordSuccess ? (
                                <div className="text-center text-green-500 font-bold py-8">{passwordSuccess}</div>
                            ) : (
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    {passwordError && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">{passwordError}</div>}
                                    <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500" required />
                                    <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500" required />
                                    <button type="submit" disabled={updatingPassword} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors">
                                        {updatingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
