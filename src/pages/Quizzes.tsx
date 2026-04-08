import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trophy, Loader2, Hash, ArrowRight, Sparkles, Lock, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Notifications as NotificationBell } from '../components/UIComponents';
import { supabase } from '../lib/supabase';
import { normalizeQuizLookupValue } from '../utils/quizAccess';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useMaintenance } from '../hooks/useMaintenance';
import MaintenancePage from './MaintenancePage';

export default function Quizzes() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { isSystemMaintenance, isQuizzesHidden } = useMaintenance();
    const navigate = useNavigate();
    const [semesters, setSemesters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [quizInput, setQuizInput] = useState('');

    const normalizedQuizInput = useMemo(() => normalizeQuizLookupValue(quizInput), [quizInput]);

    useEffect(() => {
        const fetchSemesters = async () => {
            const { data, error } = await supabase
                .from('semesters')
                .select('*, subjects(id)')
                .order('id');

            if (error) {
                console.error('Error fetching semesters:', error);
            }

            setSemesters(data || []);
            setLoading(false);
        };

        fetchSemesters();
    }, []);

    const submitQuizLookup = () => {
        if (!normalizedQuizInput) {
            showToast('Enter a Code', 'Write a quiz code, access code, or direct quiz link first.', 'warning');
            return;
        }

        window.location.href = `/quiz/${normalizedQuizInput}`;
    };

    if (isSystemMaintenance) {
        return <MaintenancePage scope="system" />;
    }

    if (isQuizzesHidden) {
        return <MaintenancePage scope="quizzes" />;
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">

            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-white/5 opacity-20 mix-blend-overlay" />
                <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-900/20 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-900/20 rounded-full blur-[150px] animate-pulse-slow" />
            </div>

            <Link
                to="/"
                className="absolute top-6 left-6 p-3 rounded-xl border bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-md transition-all z-50 group shadow-lg"
            >
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:-translate-x-1 transition-transform" />
            </Link>

            <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
                <NotificationBell />
            </div>

            <div className="max-w-5xl mx-auto pt-32 pb-20 px-6 relative z-10">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-5xl font-black mb-4 tracking-tighter text-white drop-shadow-xl">
                        Select Semester
                    </h1>
                    <p className="text-gray-400 text-lg font-medium max-w-lg mx-auto leading-relaxed">
                        Choose your semester.
                    </p>

                    <div className="mx-auto mt-10 max-w-3xl rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-[0_0_60px_rgba(59,130,246,0.08)] backdrop-blur-2xl">
                        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                            <div className="rounded-[24px] border border-white/10 bg-[#080a0f] p-4">
                                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-blue-300">
                                    <Hash size={14} />
                                    Enter Quiz ID
                                </div>
                                <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                                    <Hash className="h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        value={quizInput}
                                        onChange={(e) => setQuizInput(e.target.value)}
                                        placeholder="Paste code, #CODE, Quiz ID, or full /quiz/ link"
                                        className="w-full bg-transparent text-white placeholder-gray-500 outline-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                submitQuizLookup();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={submitQuizLookup}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-200"
                                    >
                                        Open
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                                    <span className="rounded-full border border-white/10 px-3 py-1">`mid24`</span>
                                    <span className="rounded-full border border-white/10 px-3 py-1">`#mid24`</span>
                                    <span className="rounded-full border border-white/10 px-3 py-1">`MID24`</span>
                                    <span className="rounded-full border border-white/10 px-3 py-1">`/quiz/MID24`</span>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-4 text-left md:w-[290px]">
                                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                                    <Lock size={14} />
                                    User Quizzes
                                </div>
                                <h3 className="text-xl font-black text-white">Create Private Quiz</h3>
                                <button
                                    onClick={() => {
                                        if (!user) {
                                            showToast('Sign In Required', 'Create an account or sign in first to create your private quiz.', 'warning');
                                            return;
                                        }
                                        navigate('/quizzes/create');
                                    }}
                                    className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                                >
                                    <PlusCircle size={18} />
                                    Create Private Quiz
                                </button>
                                {!user && (
                                    <p className="mt-3 text-xs text-gray-500">Sign in to create private quizzes.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-4 md:px-0">
                        {semesters.map((semester, index) => (
                            <Link
                                key={semester.id}
                                to={`/quizzes/${semester.id}`}
                                className="group relative overflow-hidden rounded-2xl border bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-500 h-64 flex flex-col justify-between p-6"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >

                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                        <Trophy className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-white/60 transition-colors border border-white/5 px-2 py-1 rounded-lg">
                                        SEM {semester.id}
                                    </span>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                                        {semester.title}
                                    </h3>
                                    <p className="text-xs font-medium text-gray-500 group-hover:text-gray-400 uppercase tracking-wide">
                                        {semester.subjects?.length || 0} Topics Available
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
