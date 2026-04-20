import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Database, Activity, TrendingUp, Clock, AlertCircle, RefreshCw, BookOpen, FileText, FolderOpen, Calendar } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        avgScore: 0,
        activeNow: 0,
        totalSubjects: 0,
        totalQuizzes: 0,
        totalMaterials: 0,
        totalEvents: 0,
        dbStatus: 'checking',
        lastSync: new Date().toISOString()
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats(silent = false) {
            try {
                if (silent) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                const [
                    { count: guestCount },
                    { count: profileCount },
                    { count: questionCount },
                    { data: attempts },
                    { data: scoreData },
                    { count: subjectCount },
                    { count: quizCount },
                    { count: materialCount },
                    { count: eventCount }
                ] = await Promise.all([
                    supabase.from('guest_scores').select('*', { count: 'exact', head: true }),
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('questions').select('*', { count: 'exact', head: true }),
                    supabase.from('quiz_results').select('*').order('created_at', { ascending: false }).limit(20),
                    supabase.from('quiz_results').select('percentage'),
                    supabase.from('subjects').select('*', { count: 'exact', head: true }),
                    supabase.from('quizzes').select('*', { count: 'exact', head: true }),
                    supabase.from('materials').select('*', { count: 'exact', head: true }),
                    supabase.from('events').select('*', { count: 'exact', head: true })
                ]);

                let avg = 0;
                if (scoreData && scoreData.length > 0) {
                    const totalScore = scoreData.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
                    avg = Math.round(totalScore / scoreData.length);
                }

                const { count: realAttemptCount } = await supabase.from('quiz_results').select('*', { count: 'exact', head: true });

                const totalUsers = (guestCount || 0) + (profileCount || 0);

                const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
                
                const [
                    { count: activeProfiles },
                    { count: activeGuests }
                ] = await Promise.all([
                    supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('updated_at', fifteenMinsAgo),
                    supabase.from('guest_scores').select('*', { count: 'exact', head: true }).gt('updated_at', fifteenMinsAgo)
                ]);

                setStats(prev => ({
                    ...prev,
                    totalUsers: totalUsers,
                    totalQuestions: questionCount || 0,
                    totalAttempts: realAttemptCount || 0,
                    avgScore: avg,
                    activeNow: (activeProfiles || 0) + (activeGuests || 0),
                    totalSubjects: subjectCount || 0,
                    totalQuizzes: quizCount || 0,
                    totalMaterials: materialCount || 0,
                    totalEvents: eventCount || 0,
                    dbStatus: 'connected'
                }));

                setLastUpdated(new Date().toISOString());

                if (attempts) setRecentActivity(attempts);

            } catch (e) {
                console.error("Dashboard Load Error:", e);
                setStats(prev => ({ ...prev, dbStatus: 'error' }));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        }

        fetchStats();

        const refreshTimer = window.setInterval(() => {
            fetchStats(true);
        }, 30000);

        return () => window.clearInterval(refreshTimer);
    }, []);

    const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
        <div className={`p-6 rounded-2xl bg-gradient-to-br ${color} border border-white/5 shadow-lg backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300`}>
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-xl bg-white/10 text-white shadow-inner">
                    <Icon size={24} />
                </div>
                <span className="text-gray-300 font-bold uppercase text-xs tracking-wider">{title}</span>
            </div>
            <div className="text-4xl font-black text-white mt-4">{loading ? '-' : value}</div>
            {subtitle && <p className="text-xs text-white/50 mt-1 font-medium">{subtitle}</p>}
        </div>
    );

    return (
        <div className="space-y-10 pb-10">

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-tight">Platform Overview</h1>
                    <p className="text-gray-400 mt-2 text-lg">Real-time statistics and system metrics.</p>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-amber-400 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
                            <span>{refreshing ? 'Refreshing live data' : 'Auto-refreshing every 30s'}</span>
                        </div>
                        <div className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            Last sync: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Waiting for first sync'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Live Updates</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Knowledge Base"
                    value={stats.totalQuestions}
                    icon={Database}
                    color="from-purple-600/20 to-indigo-600/10 border-purple-500/20"
                    subtitle="Total Questions"
                />
                <StatCard
                    title="Active Learners"
                    value={stats.totalUsers}
                    icon={Users}
                    color="from-blue-600/20 to-cyan-600/10 border-blue-500/20"
                    subtitle="Registered Profiles"
                />
                <StatCard
                    title="Learning Activity"
                    value={stats.totalAttempts}
                    icon={Activity}
                    color="from-emerald-600/20 to-teal-600/10 border-emerald-500/20"
                    subtitle="Quizzes Completed"
                />
                <StatCard
                    title="Global Score"
                    value={`${stats.avgScore}%`}
                    icon={TrendingUp}
                    color="from-orange-600/20 to-amber-600/10 border-orange-500/20"
                    subtitle="Average Performance"
                />
                <StatCard
                    title="Course Library"
                    value={stats.totalSubjects}
                    icon={BookOpen}
                    color="from-indigo-600/20 to-blue-600/10 border-indigo-500/20"
                    subtitle="Academic Subjects"
                />
                <StatCard
                    title="Quiz Bank"
                    value={stats.totalQuizzes}
                    icon={FileText}
                    color="from-rose-600/20 to-red-600/10 border-rose-500/20"
                    subtitle="Published Quizzes"
                />
                <StatCard
                    title="Study Materials"
                    value={stats.totalMaterials}
                    icon={FolderOpen}
                    color="from-amber-600/20 to-yellow-600/10 border-amber-500/20"
                    subtitle="Resources & PDFs"
                />
                <StatCard
                    title="Platform Events"
                    value={stats.totalEvents}
                    icon={Calendar}
                    color="from-emerald-600/20 to-green-600/10 border-emerald-500/20"
                    subtitle="Scheduled Events"
                />
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="font-bold text-xl flex items-center gap-3 text-white">
                            <Clock size={20} className="text-purple-400" />
                            Recent Activity
                        </h3>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Showing latest 20 attempts</span>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] uppercase text-gray-400 font-bold tracking-widest">
                                <tr>
                                    <th className="px-6 py-5">User</th>
                                    <th className="px-6 py-5">Subject / Quiz</th>
                                    <th className="px-6 py-5">Questions</th>
                                    <th className="px-6 py-5">Score</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-8 bg-white/5"></td>
                                        </tr>
                                    ))
                                ) : recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            No recent activity found.
                                        </td>
                                    </tr>
                                ) : (
                                    recentActivity.map((attempt) => (
                                        <tr key={attempt.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-sm font-black text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                                                    {attempt.user_name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[150px] font-bold group-hover:text-purple-300 transition-colors" title={attempt.user_name}>{attempt.user_name || 'Anonymous'}</span>
                                                    <span className="text-[10px] text-gray-500 font-medium">Verified User</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold w-fit border border-purple-500/20">
                                                        {attempt.quiz_category}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-medium truncate max-w-[200px]">Quiz Attempt</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-300 font-bold">
                                                    <span className="text-white">{attempt.score || 0}</span>
                                                    <span className="text-gray-600">/</span>
                                                    <span>{attempt.total_questions || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full shadow-lg ${attempt.percentage >= 70 ? 'bg-emerald-500 shadow-emerald-500/50' : attempt.percentage >= 40 ? 'bg-amber-500 shadow-amber-500/50' : 'bg-rose-500 shadow-rose-500/50'}`}
                                                            style={{ width: `${attempt.percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-black ${attempt.percentage >= 70 ? 'text-emerald-400' : attempt.percentage >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                        {attempt.percentage}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {attempt.percentage >= 50 ? (
                                                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20">Passed</span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase border border-rose-500/20">Failed</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-gray-400 font-mono">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold">{new Date(attempt.created_at).toLocaleTimeString()}</span>
                                                    <span className="text-[10px] text-gray-600">{new Date(attempt.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
