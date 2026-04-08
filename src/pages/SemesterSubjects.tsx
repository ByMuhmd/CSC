import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, GraduationCap, ChevronRight, Sparkles, Layers, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as LucideIcons from 'lucide-react';

interface SemesterSubjectsProps {
    mode: 'materials' | 'quizzes';
}

export default function SemesterSubjects({ mode }: SemesterSubjectsProps) {
    const { semesterId } = useParams();
    const navigate = useNavigate();
    const [semester, setSemester] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSemester = async () => {

            const { data, error } = await supabase
                .from('semesters')
                .select(`
                    *,
                    subjects (
                        id,
                        name,
                        icon_name,
                        is_coming_soon
                    )
                `)
                .eq('id', semesterId)
                .single();

            if (data) setSemester(data);
            setLoading(false);
        };

        fetchSemester();
    }, [semesterId]);

    const isQuizzes = mode === 'quizzes';

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-500 w-10 h-10" />
            </div>
        );
    }

    if (!semester) {
        return (
            <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center font-sans">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-600">Semester Not Found</h1>
                    <button onClick={() => navigate('/')} className="text-purple-400 hover:text-purple-300 font-mono text-sm tracking-wider uppercase border-b border-transparent hover:border-purple-400 transition-all">Return Home</button>
                </div>
            </div>
        );
    }

    const getSubjectLink = (subjectId: string) => {
        if (isQuizzes) {
            switch (subjectId) {
                default: return `/quizzes/${semester.id}/${subjectId}`;
            }
        }

        return `/course/${subjectId}`;
    };

    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        const IconComponent = (LucideIcons as any)[name];
        const DefaultIcon = isQuizzes ? GraduationCap : BookOpen;
        return IconComponent ? <IconComponent className={className} /> : <DefaultIcon className={className} />;
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">

            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-white/5 opacity-20 mix-blend-overlay" />
                <div className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] ${isQuizzes ? 'bg-purple-900/10' : 'bg-blue-900/10'} rounded-full blur-[150px] animate-pulse-slow`} />
                <div className={`absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] ${isQuizzes ? 'bg-blue-900/10' : 'bg-purple-900/10'} rounded-full blur-[150px] animate-pulse-slow delay-1000`} />
            </div>

            <button
                onClick={() => navigate(-1)}
                className="absolute top-6 left-6 p-3 rounded-xl border bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-md transition-all z-50 group shadow-lg"
            >
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:-translate-x-1 transition-transform" />
            </button>

            <div className="absolute top-6 right-6 z-50 flex items-center gap-4">

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md ${isQuizzes ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                    <Sparkles size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">{isQuizzes ? 'Quiz Mode' : 'Materials'}</span>
                </div>
            </div>

            <div className="max-w-6xl mx-auto pt-32 pb-20 px-6 relative z-10">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-5xl font-black mb-4 tracking-tighter text-white drop-shadow-xl">
                        {isQuizzes ? 'Select Quiz Topic' : 'Select Material Topic'}
                    </h1>
                    <p className="text-gray-400 text-lg font-medium max-w-lg mx-auto leading-relaxed">
                        {isQuizzes ? 'Choose a subject to begin.' : 'Choose a subject to begin.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-4 md:px-0">
                    {semester.subjects?.map((subject: any, index: number) => (
                        <Link
                            key={subject.id}
                            to={getSubjectLink(subject.id)}
                            className="group relative overflow-hidden rounded-2xl border bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-500 h-56 flex flex-col justify-between p-6"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >

                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10 flex justify-between items-start">
                                <div className={`p-3 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300 ${isQuizzes ? 'text-purple-400' : 'text-blue-400'}`}>
                                    <RenderIcon name={subject.icon_name} className="w-6 h-6" />
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                                    <ChevronRight size={16} className="text-white" />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors flex items-center gap-2">
                                    {subject.name}
                                    {subject.is_coming_soon && (
                                        <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 uppercase tracking-wide h-fit">
                                            Soon
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs font-medium text-gray-500 group-hover:text-gray-400 uppercase tracking-wide">
                                    {subject.is_coming_soon ? 'Under Development' : (isQuizzes ? 'Start Quiz' : 'View Content')}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
