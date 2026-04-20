import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trophy, Loader2, Hash, ArrowRight, Sparkles, Lock, PlusCircle, Settings2, X, Clock3, ListChecks } from 'lucide-react';
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
    const [showSoloBuilder, setShowSoloBuilder] = useState(false);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [questionLimit, setQuestionLimit] = useState<string>('10');
    const [timeLimit, setTimeLimit] = useState<string>('15');
    const [loading, setLoading] = useState(true);
    const [quizInput, setQuizInput] = useState('');

    const normalizedQuizInput = useMemo(() => normalizeQuizLookupValue(quizInput), [quizInput]);

    useEffect(() => {
        const fetchSemesters = async () => {
            const { data, error } = await supabase
                .from('semesters')
                .select('*, subjects(id, name, icon_name, is_coming_soon)')
                .order('id');

            if (error) {
                console.error('Error fetching semesters:', error);
            }

            setSemesters(data || []);
            setLoading(false);
        };

        fetchSemesters();
    }, []);

    const selectedSemester = useMemo(() => {
        return semesters.find((semester) => String(semester.id) === selectedSemesterId) || null;
    }, [semesters, selectedSemesterId]);

    const availableSubjects = useMemo(() => {
        return selectedSemester?.subjects || [];
    }, [selectedSemester]);

    const selectedSoloSubject = useMemo(() => {
        return availableSubjects.find((subject) => String(subject.id) === selectedSubjectId) || null;
    }, [availableSubjects, selectedSubjectId]);

    useEffect(() => {
        if (!availableSubjects.length) {
            setSelectedSubjectId('');
            return;
        }

        setSelectedSubjectId((currentSubjectId) => {
            const exists = availableSubjects.some((subject) => String(subject.id) === currentSubjectId);
            return exists ? currentSubjectId : String(availableSubjects[0].id);
        });
    }, [availableSubjects]);

    useEffect(() => {
        if (!showSoloBuilder && semesters.length > 0 && !selectedSemesterId) {
            setSelectedSemesterId(String(semesters[0].id));
        }
    }, [semesters, selectedSemesterId, showSoloBuilder]);

    const startSoloQuiz = () => {
        if (!selectedSoloSubject || !selectedSemesterId) {
            showToast('Select a Subject', 'Pick a subject from the list first.', 'warning');
            return;
        }

        const parsedLimit = Math.max(1, Math.min(99, Number(questionLimit) || 0));
        const parsedTime = Math.max(1, Math.min(480, Number(timeLimit) || 0));

        navigate(`/quizzes/${selectedSemesterId}/${selectedSoloSubject.id}?quizId=general&limit=${parsedLimit}&time=${parsedTime}`);
        setShowSoloBuilder(false);
    };

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
                        Generate a Quiz From a Subject
                    </h1>
                    <p className="text-gray-400 text-lg font-medium max-w-lg mx-auto leading-relaxed">
                        Choose a semester, pick a subject, and generate a quiz from that subject's question bank.
                    </p>

                    <div className="mx-auto mt-10 max-w-5xl rounded-[32px] border border-white/10 bg-white/5 p-4 md:p-6 shadow-[0_0_80px_rgba(59,130,246,0.1)] backdrop-blur-2xl">
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="md:col-span-2 rounded-[28px] border border-white/10 bg-[#080a0f] p-6 flex flex-col justify-between group/code hover:bg-[#080a0f]/80 transition-colors">
                                <div>
                                    <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
                                        <Hash size={14} className="group-hover/code:rotate-12 transition-transform" />
                                        Quick Access
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-4">Open Quiz by Code</h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 group-focus-within/code:border-blue-500/50 transition-all">
                                        <input
                                            type="text"
                                            value={quizInput}
                                            onChange={(e) => setQuizInput(e.target.value)}
                                            placeholder="Enter #CODE or Quiz ID..."
                                            className="w-full bg-transparent text-white placeholder-gray-500 outline-none font-bold"
                                            onKeyDown={(e) => e.key === 'Enter' && submitQuizLookup()}
                                        />
                                        <button
                                            onClick={submitQuizLookup}
                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95"
                                        >
                                            Go <ArrowRight size={14} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                        <span className="px-2 py-1 bg-white/5 rounded-lg">#mid24</span>
                                        <span className="px-2 py-1 bg-white/5 rounded-lg">final_cs</span>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-1 rounded-[28px] border border-white/10 bg-gradient-to-br from-emerald-600/20 to-blue-600/10 p-6 flex flex-col justify-between group/private hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => {
                                        if (!user) {
                                            showToast('Sign In Required', 'Create an account first.', 'warning');
                                            return;
                                        }
                                        navigate('/quizzes/create');
                                    }}>
                                <div>
                                    <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                                        <Lock size={14} />
                                        Creator
                                    </div>
                                    <h3 className="text-xl font-black text-white leading-tight">Private<br/>Builder</h3>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover/private:scale-110 transition-transform">
                                        <PlusCircle size={20} />
                                    </div>
                                    <ArrowRight size={16} className="text-emerald-500/50 group-hover/private:translate-x-1 transition-transform" />
                                </div>
                            </div>

                            <div className="md:col-span-1 rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan-600/20 to-indigo-600/10 p-6 flex flex-col justify-between group/solo hover:border-cyan-500/30 transition-all cursor-pointer" onClick={() => {
                                        setShowSoloBuilder(true);
                                        if (!selectedSemesterId && semesters[0]?.id) setSelectedSemesterId(String(semesters[0].id));
                                    }}>
                                <div>
                                    <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
                                        <Settings2 size={14} />
                                        Mode
                                    </div>
                                    <h3 className="text-xl font-black text-white leading-tight">Solo<br/>Quiz</h3>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover/solo:scale-110 transition-transform">
                                        <ListChecks size={20} />
                                    </div>
                                    <ArrowRight size={16} className="text-cyan-500/50 group-hover/solo:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4 md:px-0">
                        {semesters.map((semester, index) => (
                            <Link
                                key={semester.id}
                                to={`/quizzes/${semester.id}`}
                                className={`group relative overflow-hidden rounded-[32px] border bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-purple-500/30 hover:shadow-[0_0_40px_rgba(168,85,247,0.1)] transition-all duration-500 flex flex-col justify-between p-8 ${
                                    index === 0 ? 'md:col-span-4 h-56' : 'md:col-span-2 h-72'
                                }`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute right-0 bottom-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full group-hover:bg-purple-500/20 transition-colors pointer-events-none" />

                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                                        <Trophy className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                                    </div>
                                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-purple-300 group-hover:border-purple-500/20 transition-all">
                                        Semester {semester.id}
                                    </div>
                                </div>

                                <div className="relative z-10 flex flex-col gap-2">
                                    <h3 className={`font-black text-white tracking-tight group-hover:text-purple-300 transition-colors ${index === 0 ? 'text-4xl' : 'text-3xl'}`}>
                                        {semester.title}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-300 transition-colors uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles size={14} className="text-purple-400/50" />
                                            {semester.subjects?.length || 0} Subjects
                                        </span>
                                        <div className="h-4 w-px bg-white/10" />
                                        <span className="text-xs font-black text-purple-400 group-hover:text-purple-300 transition-colors uppercase tracking-[0.2em] flex items-center gap-1">
                                            Enter <ArrowRight size={14} />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {showSoloBuilder && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-[#0A0C10] p-6 shadow-2xl md:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                                    <Clock3 size={12} />
                                    Solo Quiz Builder
                                </div>
                                <h2 className="text-3xl font-black tracking-tight text-white">Choose a subject and set your limits</h2>
                                <p className="mt-2 text-sm text-gray-400">Pick a semester, choose a subject, then generate a quiz from that subject's question bank.</p>
                            </div>

                            <button
                                onClick={() => setShowSoloBuilder(false)}
                                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Semester</span>
                                <select
                                    value={selectedSemesterId}
                                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/40"
                                >
                                    {semesters.map((semester) => (
                                        <option key={semester.id} value={String(semester.id)} className="bg-[#05070a]">
                                            SEM {semester.id} - {semester.title}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="space-y-2">
                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Subject</span>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/40"
                                    disabled={availableSubjects.length === 0}
                                >
                                    <option value="" className="bg-[#05070a]">Select a subject</option>
                                    {availableSubjects.map((subject) => (
                                        <option key={subject.id} value={String(subject.id)} className="bg-[#05070a]">
                                            {subject.name}
                                        </option>
                                    ))}
                                </select>
                                {availableSubjects.length === 0 ? <p className="text-xs text-amber-300">No subjects found for this semester.</p> : null}
                            </label>

                            <label className="space-y-2">
                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Number of Questions</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={questionLimit}
                                    onChange={(e) => setQuestionLimit(e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/40"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Time Limit (minutes)</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="480"
                                    value={timeLimit}
                                    onChange={(e) => setTimeLimit(e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/40"
                                />
                            </label>
                        </div>

                        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Preview</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-300">
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{selectedSemesterId ? `SEM ${selectedSemesterId}` : 'No semester selected'}</span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{selectedSoloSubject?.name || 'No subject selected'}</span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{questionLimit || '0'} questions</span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{timeLimit || '0'} min</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setShowSoloBuilder(false)}
                                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={startSoloQuiz}
                                disabled={!selectedSoloSubject}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-5 py-3 text-sm font-black text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ArrowRight size={16} />
                                Generate Quiz
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
