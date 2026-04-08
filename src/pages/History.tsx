import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Brain, Clock, Award, Search, Trophy, Timer, CheckSquare, GraduationCap, LayoutList } from 'lucide-react';
import { useGamification } from '../hooks/useGamification';

type FilterType = 'all' | 'study' | 'quiz' | 'badge' | 'material';

export default function History() {
    const navigate = useNavigate();
    const { studySessions, quizResults, badges, historyLog } = useGamification();
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const unlockedBadges = useMemo(() => {
        const unique = new Map<string, any>();
        (badges || []).forEach((badge: any) => {
            if (badge?.id) unique.set(badge.id, badge);
        });
        return Array.from(unique.values()).filter((badge: any) => badge?.unlockedAt);
    }, [badges]);

    const timeline = useMemo(() => {
        const events = [
            ...studySessions.map((session: any) => ({
                type: 'study' as const,
                date: new Date(session.date),
                data: session
            })),
            ...quizResults.map((result: any) => ({
                type: 'quiz' as const,
                date: new Date(result.date),
                data: result
            })),
            ...unlockedBadges.map((badge: any) => ({
                type: 'badge' as const,
                date: new Date(badge.unlockedAt),
                data: badge
            })),
            ...(historyLog || []).map((item: any) => ({
                type: item.type as 'material' | 'module' | 'course',
                date: new Date(item.date),
                data: item
            }))
        ];

        return events
            .filter(item => !Number.isNaN(item.date.getTime()))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [historyLog, quizResults, studySessions, unlockedBadges]);

    const filteredTimeline = useMemo(() => {
        return timeline.filter(item => {
            if (filter !== 'all' && filter !== 'material' && item.type !== filter) return false;
            if (filter === 'material' && !['material', 'module', 'course'].includes(item.type)) return false;

            if (!searchQuery.trim()) return true;

            const query = searchQuery.toLowerCase();
            if (item.type === 'study') return `study ${item.data.duration || ''}`.toLowerCase().includes(query);
            if (item.type === 'quiz') {
                return `${item.data.title || ''} ${item.data.quiz_category || ''} ${item.data.quizId || ''}`.toLowerCase().includes(query);
            }
            if (item.type === 'badge') return `${item.data.name || ''} ${item.data.description || ''}`.toLowerCase().includes(query);
            return `${item.data.title || ''}`.toLowerCase().includes(query);
        });
    }, [filter, searchQuery, timeline]);

    const groupedTimeline = useMemo(() => {
        const groups: Record<string, typeof filteredTimeline> = {};
        filteredTimeline.forEach(item => {
            const key = item.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    }, [filteredTimeline]);

    const stats = useMemo(() => ({
        totalSessions: studySessions.length,
        totalQuizzes: quizResults.length,
        passedQuizzes: quizResults.filter(result => result.passed).length,
        totalBadges: unlockedBadges.length,
        totalTime: studySessions.reduce((acc: number, session: any) => acc + (Number(session.duration) || 0), 0),
        totalMaterials: (historyLog || []).length
    }), [historyLog, quizResults, studySessions, unlockedBadges]);

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-purple-500/30">
            <div className="fixed inset-0 bg-white/5 opacity-20 pointer-events-none z-0 mix-blend-overlay" />

            <div className="bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl bg-opacity-80">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white">Activity History</h1>
                            <p className="text-xs text-gray-500 font-mono">TRACKING SINCE JOINING</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                        <div className="flex flex-wrap items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/5">
                            {(['all', 'study', 'quiz', 'badge', 'material'] as FilterType[]).map(option => (
                                <button
                                    key={option}
                                    onClick={() => setFilter(option)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${filter === option ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:max-w-xs">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search activity..."
                                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><BookOpen size={16} /></div>
                            <div>
                                <div className="text-lg font-bold">{stats.totalSessions}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Sessions</div>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Brain size={16} /></div>
                            <div>
                                <div className="text-lg font-bold">{stats.passedQuizzes}/{stats.totalQuizzes}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Passed Quizzes</div>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Trophy size={16} /></div>
                            <div>
                                <div className="text-lg font-bold">{stats.totalBadges}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Trophies</div>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><Timer size={16} /></div>
                            <div>
                                <div className="text-lg font-bold">{Math.round(stats.totalTime / 60)}h</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Focus Time</div>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><CheckSquare size={16} /></div>
                            <div>
                                <div className="text-lg font-bold">{stats.totalMaterials}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Completed</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
                {Object.keys(groupedTimeline).length === 0 ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">No activity found</p>
                        <p className="text-sm opacity-50">Try a different filter or keep learning to build your timeline.</p>
                    </div>
                ) : (
                    Object.entries(groupedTimeline).map(([month, items]) => (
                        <div key={month} className="mb-8 relative">
                            <div className="sticky top-40 z-0 mb-4 ml-12">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-[#030303] px-2 border border-white/10 rounded-full py-1">{month}</span>
                            </div>

                            <div className="space-y-4 relative">
                                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-white/10 z-[-1]" />

                                {items.map((item, idx) => (
                                    <div key={`${item.type}-${item.date.toISOString()}-${item.data?.id || item.data?.quizId || idx}`} className="flex gap-6 group relative z-0">
                                        <div className="flex-shrink-0 relative">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#030303] shadow-xl z-10 relative
                                                ${item.type === 'study' ? 'bg-purple-900 text-purple-300 ring-2 ring-purple-500/20' : ''}
                                                ${item.type === 'quiz' ? 'bg-blue-900 text-blue-300 ring-2 ring-blue-500/20' : ''}
                                                ${item.type === 'badge' ? 'bg-yellow-900 text-yellow-300 ring-2 ring-yellow-500/20' : ''}
                                                ${item.type === 'material' ? 'bg-pink-900 text-pink-300 ring-2 ring-pink-500/20' : ''}
                                                ${item.type === 'module' ? 'bg-indigo-900 text-indigo-300 ring-2 ring-indigo-500/20' : ''}
                                                ${item.type === 'course' ? 'bg-emerald-900 text-emerald-300 ring-2 ring-emerald-500/20' : ''}
                                            `}>
                                                {item.type === 'study' && <Clock size={16} />}
                                                {item.type === 'quiz' && <Brain size={16} />}
                                                {item.type === 'badge' && <Award size={16} />}
                                                {item.type === 'material' && <CheckSquare size={16} />}
                                                {item.type === 'module' && <LayoutList size={16} />}
                                                {item.type === 'course' && <GraduationCap size={16} />}
                                            </div>
                                        </div>

                                        <div className="flex-1 bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-white/10 hover:bg-white/[0.02] transition-all group-hover:translate-x-1">
                                            <div className="flex justify-between items-start gap-3 mb-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                        {item.date.toLocaleDateString(undefined, { weekday: 'long' })} • {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <h3 className="font-bold text-white text-base">
                                                        {item.type === 'study' && 'Focused Study Session'}
                                                        {item.type === 'quiz' && (item.data.title || item.data.quiz_category || item.data.quizId || 'Quiz Completed')}
                                                        {item.type === 'badge' && `Unlocked: ${item.data.name}`}
                                                        {item.type === 'material' && `Completed: ${item.data.title}`}
                                                        {item.type === 'module' && `Module Finished: ${item.data.title}`}
                                                        {item.type === 'course' && `Course Completed: ${item.data.title}`}
                                                    </h3>
                                                </div>

                                                {item.type === 'quiz' && (
                                                    <div className={`px-2 py-1 rounded text-xs font-bold ${item.data.score >= 80 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                        {item.data.score}%
                                                    </div>
                                                )}
                                                {item.type === 'badge' && (
                                                    <div className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/10 text-yellow-400">
                                                        +{item.data.xp_req || 0} XP
                                                    </div>
                                                )}
                                            </div>

                                            {item.type === 'study' && (
                                                <div className="grid grid-cols-2 gap-4 mt-3">
                                                    <div className="bg-white/5 rounded-lg p-2 px-3">
                                                        <span className="text-gray-500 text-xs block">Duration</span>
                                                        <span className="text-white font-mono text-sm">{item.data.duration}m</span>
                                                    </div>
                                                </div>
                                            )}

                                            {item.type === 'quiz' && (
                                                <div className="mt-2 space-y-2 text-sm text-gray-400">
                                                    <p>{item.data.passed ? 'Passed successfully.' : 'Quiz attempt recorded.'}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${item.data.passed ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                            {item.data.passed ? 'Passed' : 'Needs Review'}
                                                        </span>
                                                        <span className="px-2 py-1 rounded text-xs font-bold bg-white/5 text-white border border-white/10">
                                                            Score: {item.data.score}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {item.type === 'badge' && (
                                                <div className="mt-2 text-sm text-gray-400 italic">
                                                    "{item.data.description}"
                                                </div>
                                            )}

                                            {item.type === 'material' && (
                                                <div className="mt-2 text-sm text-gray-400">
                                                    Material progress saved to your study history.
                                                </div>
                                            )}

                                            {item.type === 'module' && (
                                                <div className="mt-2 text-sm text-gray-400">
                                                    Module completion counted toward your overall progress.
                                                </div>
                                            )}

                                            {item.type === 'course' && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">Course Certificate Eligible</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
