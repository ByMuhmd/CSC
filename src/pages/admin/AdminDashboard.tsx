import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Database, Activity, TrendingUp, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        avgScore: 0,
        activeNow: 0,
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
                    { data: scoreData }
                ] = await Promise.all([
                    supabase.from('guest_scores').select('*', { count: 'exact', head: true }),
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('questions').select('*', { count: 'exact', head: true }),
                    supabase.from('quiz_results').select('*').order('created_at', { ascending: false }).limit(10),
                    supabase.from('quiz_results').select('percentage')
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
                    title="Total Knowledge Base"
                    value={stats.totalQuestions}
                    icon={Database}
                    color="from-purple-600/20 to-indigo-600/10 border-purple-500/20"
                    subtitle="Questions in DB"
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
                    title="Global Performance"
                    value={`${stats.avgScore}%`}
                    icon={TrendingUp}
                    color="from-orange-600/20 to-amber-600/10 border-orange-500/20"
                    subtitle="Average Score"
                />
                <StatCard 
                    title="Live Traffic"
                    value={stats.activeNow}
                    icon={Activity}
                    color="from-rose-500/20 to-pink-500/10 border-rose-500/20"
                    subtitle="Users active now"
                />
                <StatCard
                    title="Live Sync"
                    value={refreshing ? 'SYNCING' : 'READY'}
                    icon={RefreshCw}
                    color="from-cyan-600/20 to-sky-600/10 border-cyan-500/20"
                    subtitle={lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Awaiting first refresh'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                <div className="lg:col-span-2 bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="font-bold text-xl flex items-center gap-3 text-white">
                            <Clock size={20} className="text-purple-400" />
                            Recent Activity
                        </h3>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-xs uppercase text-gray-400 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Quiz</th>
                                    <th className="px-6 py-4">Score</th>
                                    <th className="px-6 py-4 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-6 py-8 bg-white/5"></td>
                                        </tr>
                                    ))
                                ) : recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            No recent activity found.
                                        </td>
                                    </tr>
                                ) : (
                                    recentActivity.map((attempt) => (
                                        <tr key={attempt.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-black text-white shadow-lg shrink-0">
                                                    {attempt.user_name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <span className="truncate max-w-[120px] font-bold group-hover:text-purple-300 transition-colors" title={attempt.user_name}>{attempt.user_name || 'Anonymous'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-gray-300 group-hover:border-purple-500/30 transition-colors">
                                                    {attempt.quiz_category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
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
                                            <td className="px-6 py-4 text-right text-xs text-gray-500 font-mono">
                                                {new Date(attempt.created_at).toLocaleTimeString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-xl">
                        <h3 className="font-bold text-xl mb-6 text-white flex items-center gap-2">
                            <Activity size={20} className="text-blue-400" /> System Health
                        </h3>
                        <div className="space-y-5">
                            <div className="flex justify-between items-center group">
                                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-300">Database Connection</span>
                                <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-white/5 ${stats.dbStatus === 'connected' ? 'text-emerald-400 border border-emerald-500/20' : 'text-rose-400 border border-rose-500/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${stats.dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                    {stats.dbStatus === 'connected' ? 'Operational' : 'Error'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-300">API Latency</span>
                                <span className="text-xs font-mono text-blue-400 bg-white/5 px-2 py-1 rounded border border-white/5">~24ms</span>
                            </div>
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-400">Last Sync</span>
                                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Waiting for sync'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-purple-500/20 transition-colors" />
                        <h3 className="font-bold text-xl text-white mb-2 relative z-10">Admin Tips</h3>
                        <p className="text-sm text-purple-200/70 mb-4 relative z-10 leading-relaxed">
                            You can centrally manage all quizzes from the new <span className="text-white font-bold">Quiz Manager</span> tab. Data migration is available in Settings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
