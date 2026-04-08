import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Menu, Clock, CheckCircle, Play, FileText, ChevronRight, Trophy, Sparkles, XCircle, HelpCircle, ArrowRight,
    Lock, X, PanelLeft, Globe, Video, BookOpen, User, Circle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../hooks/useGamification';
import { courseService, CourseModule } from '../services/courseService';
import { useCourseData } from '../hooks/useCourseData';
import { useLessonContent } from '../hooks/useLessonContent';
import { Loading } from '../components/UIComponents';
import { evaluateEssay } from '../services/gemini';
import { supabase } from '../lib/supabase';
import ModuleQuiz from '../components/ModuleQuiz';
import ComingSoon from './ComingSoon';
import NotesDrawer from '../components/NotesDrawer';
import { useMaintenance } from '../hooks/useMaintenance';
import MaintenancePage from './MaintenancePage';

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] group relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
            {children}
        </div>
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <Icon className="w-5 h-5 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
    </div>
);

export default function DynamicCoursePage() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const { user, guest, isAdmin } = useAuth();
    const { markModuleComplete, markMaterialComplete, modulesCompleted, materialsCompleted } = useGamification();
    const { isSystemMaintenance, isMaterialsHidden } = useMaintenance();

    const { modules, resources, loading, isOffline, subject } = useCourseData(subjectId!, false);

    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

    const { content: lessonContent, loading: contentLoading } = useLessonContent(activeLessonId);

    const [sidebarTab, setSidebarTab] = useState<'modules' | 'resources'>('modules');
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('isSidebarOpen');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [openModules, setOpenModules] = useState<string[]>([]);
    const [showQuiz, setShowQuiz] = useState(false);
    const [linkedQuizQuestions, setLinkedQuizQuestions] = useState<any[]>([]);

    useEffect(() => {
        const fetchLinkedQuiz = async () => {
            setLinkedQuizQuestions([]);

            const mod = (modules || []).find(m => m.id === activeModuleId);
            const lesson = mod?.lessons?.find(l => l.id === activeLessonId);

            console.log("DEBUG: fetchLinkedQuiz triggered", {
                lessonId: activeLessonId,
                lessonType: lesson?.type,
                contentPreview: lessonContent?.substring(0, 50)
            });

            if (!lesson || lesson.type !== 'quiz') {
                console.log("DEBUG: Not a quiz lesson, skipping.");
                return;
            }

            try {

                if (lessonContent && lessonContent.trim().startsWith('http')) {
                    console.log("DEBUG: Content is URL, skipping.");
                    return;
                }

                const parsed = JSON.parse(lessonContent || '{}');
                console.log("DEBUG: Parsed content:", parsed);

                if (parsed.quiz_id) {
                    console.log("DEBUG: Fetching questions for quiz_id:", parsed.quiz_id);
                    const { data, error } = await supabase.from('questions').select('*').eq('quiz_id', parsed.quiz_id);

                    if (error) {
                        console.error("DEBUG: Supabase error:", error);
                    } else {
                        console.log("DEBUG: Questions fetched:", data);
                        if (data) setLinkedQuizQuestions(data);
                    }
                } else {
                    console.log("DEBUG: No quiz_id in content.");
                }
            } catch (e) {
                console.error("DEBUG: Parse error:", e);
            }
        };
        fetchLinkedQuiz();
    }, [activeLessonId, activeModuleId, modules, lessonContent]);

    useEffect(() => {
        localStorage.setItem('isSidebarOpen', JSON.stringify(isSidebarOpen));
    }, [isSidebarOpen]);

    useEffect(() => {
        if (modules && modules.length > 0 && !activeModuleId) {
            setActiveModuleId(modules[0].id);
            setOpenModules([modules[0].id]);
            if (modules[0].lessons && modules[0].lessons.length > 0) {
                setActiveLessonId(modules[0].lessons[0].id);
            }
        }
    }, [modules]);

    if (loading) return <Loading />;

    if (isSystemMaintenance) {
        return <MaintenancePage scope="system" />;
    }

    if (isMaterialsHidden) {
        return <MaintenancePage scope="materials" />;
    }

    if (subject?.is_coming_soon && !isAdmin) {
        return <ComingSoon title={subject.name} />;
    }

    const activeModule = modules.find(m => m.id === activeModuleId);
    const activeLesson = activeModule?.lessons?.find(l => l.id === activeLessonId);
    const isCompleted = activeLesson ? materialsCompleted.includes(activeLesson.id) : false;

    const activeModuleIndex = modules.findIndex(m => m.id === activeModuleId);
    const activeLessonIndex = activeModule?.lessons?.findIndex(l => l.id === activeLessonId) ?? -1;

    const handleNext = () => {
        if (!activeModule || !activeLesson) return;
        if (activeLessonIndex < (activeModule.lessons?.length || 0) - 1) {
            setActiveLessonId(activeModule.lessons![activeLessonIndex + 1].id);
        } else if (activeModuleIndex < modules.length - 1) {
            const nextMod = modules[activeModuleIndex + 1];
            setActiveModuleId(nextMod.id);
            setOpenModules(prev => [...prev, nextMod.id]);
            if (nextMod.lessons?.[0]) setActiveLessonId(nextMod.lessons[0].id);
        }
    };

    const handlePrev = () => {
        if (activeLessonIndex > 0) {
            setActiveLessonId(activeModule?.lessons![activeLessonIndex - 1].id!);
        } else if (activeModuleIndex > 0) {
            const prevMod = modules[activeModuleIndex - 1];
            setActiveModuleId(prevMod.id);
            if (prevMod.lessons?.length) setActiveLessonId(prevMod.lessons[prevMod.lessons.length - 1].id);
        }
    };

    const toggleLessonCompletion = (id: string, title: string) => {
        markMaterialComplete(id, title);
    };

    const toggleModule = (moduleId: string) => {
        setOpenModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    const currentCourseProgress = modules.reduce((acc, m) =>
        acc + (m.lessons?.filter(l => materialsCompleted.includes(l.id)).length || 0), 0
    );
    const progressPercent = totalLessons > 0 ? Math.round((currentCourseProgress / totalLessons) * 100) : 0;

    return (
        <div className="min-h-screen bg-[#0A0C10] text-white font-sans selection:bg-purple-500/30 flex overflow-hidden relative">

            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-white/5 opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-900/10 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[150px] animate-pulse-slow delay-1000" />
            </div>

            <aside dir="ltr" className={`${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'} fixed inset-y-0 left-0 z-50 bg-black/90 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col overflow-hidden`}>
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold tracking-tight">Course Content</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

                    <div className="flex bg-white/5 rounded-xl p-1 mb-6 border border-white/5">
                        <button
                            onClick={() => setSidebarTab('modules')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'modules' ? 'bg-purple-600/20 text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Modules
                        </button>
                        <button
                            onClick={() => setSidebarTab('resources')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'resources' ? 'bg-blue-600/20 text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Resources
                        </button>
                    </div>

                    {sidebarTab === 'modules' ? (
                        <>
                            {modules.map((module, mIdx) => {
                                const isOpen = openModules.includes(module.id);
                                return (
                                    <div key={module.id} className="space-y-2">
                                        <button
                                            onClick={() => toggleModule(module.id)}
                                            className="w-full flex items-center justify-between text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-2 mb-2 hover:text-gray-300 transition-colors"
                                        >
                                            <span>{module.title}</span>
                                            <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
                                        </button>

                                        <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            {module.lessons?.map((lesson, lIdx) => {
                                                const isActive = activeLessonId === lesson.id;
                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => {
                                                            setActiveModuleId(module.id);
                                                            setActiveLessonId(lesson.id);
                                                            if (window.innerWidth < 768) setIsSidebarOpen(false);
                                                        }}
                                                        className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group ${isActive ? 'bg-purple-500/10 border border-purple-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500 group-hover:bg-white/10'}`}>
                                                            {materialsCompleted.includes(lesson.id) ? (
                                                                <CheckCircle size={14} className="text-green-400" />
                                                            ) : (
                                                                lesson.type === 'quiz' ? <Trophy size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium line-clamp-1">{lesson.title}</div>
                                                            <div className="text-[10px] text-gray-500">{lesson.duration || 10} min</div>
                                                        </div>
                                                        {isActive && <ChevronRight size={14} className="text-purple-400" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            {resources.length === 0 && (
                                <div className="text-center text-gray-500 py-8 border border-dashed border-white/10 rounded-xl">
                                    <FileText size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">No resources found.</p>
                                </div>
                            )}
                            {resources.map((res) => (
                                <a
                                    key={res.id}
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-200 group-hover:text-white line-clamp-2">{res.title}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-500 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
                                                    {res.type || 'LINK'}
                                                </span>
                                                <div className="flex items-center gap-1 text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Open <ArrowRight size={10} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20">
                    <button onClick={() => navigate(-1)} className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Back to Courses
                    </button>
                </div>
            </aside>

            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0 md:ml-80' : 'ml-0'} relative z-10 flex flex-col h-screen`}>

                <header className="h-24 flex items-center justify-between px-8 md:px-12 pt-6 shrink-0 relative z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(prev => !prev)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <PanelLeft size={24} />
                        </button>
                        <div className="h-10 w-px bg-white/10 hidden md:block mr-2" />
                        <div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 font-mono uppercase tracking-widest mb-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                {activeModule?.title || 'Course Module'}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight line-clamp-1">{activeLesson?.title || 'Lesson Title'}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Progress</p>
                            <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>

                        {(user || guest) ? (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-[1px] cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/profile')}>
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                    <img src={user?.user_metadata?.avatar_url || guest?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button onClick={() => navigate('/signin')} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-colors">
                                    Sign In
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-24">
                    <div className="max-w-5xl mx-auto">

                        {activeLesson && (
                            <div className="mb-8 md:mb-12 relative group animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-12 rounded-3xl overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5">
                                        <BookOpen className="w-40 h-40 md:w-[300px] md:h-[300px]" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4 md:mb-6">
                                            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-wider border border-purple-500/20">
                                                {activeModule?.title}
                                            </span>
                                            <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-2">
                                                <Clock size={12} /> {activeLesson.duration || 10} min
                                            </span>
                                        </div>
                                        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-6 tracking-tight leading-tight">
                                            {activeLesson.title}
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeLesson ? (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                {contentLoading ? (
                                    <div className="flex justify-center items-center py-20">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                                    </div>
                                ) : (
                                    <>
                                        {activeLesson.type === 'video' && (
                                            <div className="max-w-5xl mx-auto">
                                                <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.1)] group mb-10">

                                                    <div className="absolute inset-0 flex items-center justify-center">

                                                        <div className="text-center">
                                                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-sm mb-4 mx-auto border border-white/10">
                                                                <Play className="w-8 h-8 text-white/50 ml-1" />
                                                            </div>
                                                            <p className="text-gray-500 text-sm">Loading Video Content...</p>
                                                        </div>
                                                    </div>
                                                    <div className="relative z-10 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>video]:w-full [&>video]:h-full"
                                                        dangerouslySetInnerHTML={{ __html: lessonContent || '' }} />
                                                </div>

                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <h1 className="text-3xl font-bold text-white mb-2">{activeLesson.title}</h1>
                                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                                            <span className="flex items-center gap-1.5"><Video size={14} className="text-purple-400" /> Video Lesson</span>
                                                            <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-400" /> {activeLesson.duration || 10} mins</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => toggleLessonCompletion(activeLesson.id, activeLesson.title)}
                                                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                                                        {isCompleted ? <><CheckCircle size={20} /> Watched</> : <><Circle size={20} /> Mark Watched</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {activeLesson.type === 'quiz' && (
                                            (() => {
                                                let quizData = { instructions: null as string | null, questions: [] as any[] };
                                                let externalUrl: string | null = null;

                                                try {
                                                    if (lessonContent) {


                                                        if (lessonContent.trim().startsWith('http')) {
                                                            externalUrl = lessonContent.trim();
                                                        } else {
                                                            try {
                                                                const parsed = JSON.parse(lessonContent);
                                                                if (parsed.url) {
                                                                    externalUrl = parsed.url;
                                                                } else if (parsed.quiz_id) {







                                                                } else {

                                                                    if (parsed.questions && Array.isArray(parsed.questions)) {
                                                                        quizData.questions = parsed.questions;
                                                                        quizData.instructions = parsed.instructions || parsed.description || null;
                                                                    } else if (Array.isArray(parsed)) {
                                                                        quizData.questions = parsed;
                                                                    }
                                                                }
                                                            } catch (e) {

                                                                quizData.instructions = lessonContent;
                                                            }
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error("Error parsing lesson content", e);
                                                }

                                                if (externalUrl) {

                                                    return (
                                                        <div className="max-w-5xl mx-auto space-y-6">
                                                            <div className="flex items-center justify-between">
                                                                <h1 className="text-3xl font-bold text-white tracking-tight">{activeLesson.title}</h1>
                                                                <button onClick={() => toggleLessonCompletion(activeLesson.id, activeLesson.title)}
                                                                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                                                                    {isCompleted ? <><CheckCircle size={20} /> Completed</> : <><Circle size={20} /> Mark as Done</>}
                                                                </button>
                                                            </div>
                                                            <div className="relative w-full h-[800px] bg-white rounded-2xl overflow-hidden border border-white/10">
                                                                <iframe
                                                                    src={externalUrl}
                                                                    className="absolute inset-0 w-full h-full"
                                                                    frameBorder="0"
                                                                    allowFullScreen
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                } else {

                                                    return (
                                                        <div className="text-center py-20">
                                                            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)] animate-pulse">
                                                                <Trophy className="w-12 h-12 text-purple-400" />
                                                            </div>
                                                            <h2 className="text-4xl font-bold text-white mb-4">Ready to test your knowledge?</h2>

                                                            {quizData.instructions ? (
                                                                <div className="text-gray-400 text-lg mb-10 max-w-md mx-auto leading-relaxed" dangerouslySetInnerHTML={{ __html: quizData.instructions }} />
                                                            ) : (
                                                                <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
                                                                    Take the quiz to verify your understanding. You need 80% to pass.
                                                                </p>
                                                            )}

                                                            <button
                                                                onClick={() => setShowQuiz(true)}
                                                                disabled={quizData.questions.length === 0 && linkedQuizQuestions.length === 0}
                                                                className="px-10 py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-200 transition-all shadow-xl hover:scale-105 flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {quizData.questions.length > 0 || linkedQuizQuestions.length > 0 ? (
                                                                    <>Start Quiz <ArrowRight size={20} /></>
                                                                ) : (
                                                                    <>No Questions Available</>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                            })()
                                        )}

                                        {(activeLesson.type === 'text' || activeLesson.type === 'reading' || !activeLesson.type) && (
                                            <>
                                                <div className="prose prose-invert prose-lg max-w-none">

                                                    {lessonContent ? (
                                                        <div dangerouslySetInnerHTML={{ __html: lessonContent }} />
                                                    ) : (
                                                        <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl text-center text-gray-500">
                                                            No content available for this lesson.
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-center pt-8">
                                                    <button onClick={() => toggleLessonCompletion(activeLesson.id, activeLesson.title)} className={`px-8 py-3 rounded-xl font-bold text-lg transition-all flex items-center gap-3 ${isCompleted ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}>
                                                        {isCompleted ? <><CheckCircle size={20} /> Completed</> : <><Circle size={20} /> Mark as Completed</>}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                <div className="mt-20 flex items-center justify-between border-t border-white/10 pt-8">
                                    <button onClick={handlePrev} disabled={activeModuleIndex === 0 && activeLessonIndex === 0} className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed group">
                                        <div className="p-3 rounded-full border border-white/10 group-hover:bg-white/10 transition-colors"><ArrowLeft size={20} /></div>
                                        <div className="text-left hidden md:block">
                                            <div className="text-xs font-bold uppercase tracking-wider text-gray-600">Previous</div>
                                            <div className="font-bold">Previous Lesson</div>
                                        </div>
                                    </button>

                                    <button onClick={handleNext} disabled={activeModuleIndex === modules.length - 1 && activeLessonIndex === (activeModule.lessons?.length || 0) - 1} className="flex items-center gap-3 text-white hover:text-purple-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed group">
                                        <div className="text-right hidden md:block">
                                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Next</div>
                                            <div className="font-bold">Next Lesson</div>
                                        </div>
                                        <div className="p-3 rounded-full bg-white text-black group-hover:bg-purple-500 group-hover:text-white transition-all shadow-lg shadow-white/10 group-hover:shadow-purple-500/30"><ArrowRight size={20} /></div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <BookOpen size={48} className="mb-4 opacity-50" />
                                <p>Select a lesson from the sidebar to begin.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {activeLesson && (
                <NotesDrawer
                    contextType="material"
                    contextId={activeLessonId || undefined}
                    contextLabel={activeLesson.title}
                />
            )}

            {showQuiz && (
                <ModuleQuiz
                    questions={(() => {

                        if (linkedQuizQuestions.length > 0) return linkedQuizQuestions;

                        try {
                            if (!lessonContent) return [];
                            const parsed = JSON.parse(lessonContent);
                            if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
                            if (Array.isArray(parsed)) return parsed;
                            return [];
                        } catch (e) {
                            return [];
                        }
                    })()}
                    quizTitle={activeModule?.title}
                    subjectName={activeModule?.title ? `${activeModule.title} - ${subjectId}` : subjectId}
                    onPass={() => {
                        if (activeLesson) toggleLessonCompletion(activeLesson.id, activeLesson.title);
                        setShowQuiz(false);
                    }}
                    onExplain={async () => { }}

                    onClose={() => setShowQuiz(false)}
                />
            )}
        </div>
    );
}
