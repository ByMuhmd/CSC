import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Video, Download, PanelLeft, X, HardDrive, Youtube, ExternalLink, BookOpen, User, Loader2, BrainCircuit, Play, Clock, Trophy, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useMaintenance } from '../hooks/useMaintenance';
import MaintenancePage from './MaintenancePage';
import * as LucideIcons from 'lucide-react';
import { courseService, CourseModule, CourseLesson } from '../services/courseService';

function InlineSubjectCourseware({ subjectId, semesterId }: { subjectId: string; semesterId?: string }) {
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                const data = await courseService.getCourseContent(subjectId);
                setModules(data || []);

                const initialExpanded: Record<string, boolean> = {};
                data?.forEach((m) => {
                    initialExpanded[m.id] = true;
                });
                setExpandedModules(initialExpanded);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [subjectId]);

    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    const handleLessonClick = (lesson: CourseLesson) => {
        if (lesson.type === 'quiz') {
            try {
                const content = JSON.parse(lesson.content_html);
                if (content.type === 'internal_quiz' && content.quiz_id) {
                    navigate(`/quizzes/${semesterId || 'general'}/${subjectId}?quizId=${content.quiz_id}`);
                } else if (content.url) {
                    window.open(content.url, '_blank');
                } else {
                    alert('This quiz format is being updated. Please contact support.');
                }
            } catch (e) {
                console.error('Invalid quiz content', e);
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading course content...</div>;

    if (modules.length === 0)
        return (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl">
                <div className="text-gray-500 mb-2">No course content available yet.</div>
            </div>
        );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {modules.map((module, mIdx) => (
                <div key={module.id} className="bg-[#0F1115] border border-white/5 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                                {mIdx + 1}
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-white text-lg">{module.title}</h3>
                                <div className="text-xs text-gray-500">{module.lessons?.length || 0} Lessons</div>
                            </div>
                        </div>
                        {expandedModules[module.id] ? <ChevronDown className="text-gray-500" /> : <ChevronRight className="text-gray-500" />}
                    </button>

                    {expandedModules[module.id] && (
                        <div className="divide-y divide-white/5">
                            {module.lessons?.map((lesson) => (
                                <button
                                    key={lesson.id}
                                    onClick={() => handleLessonClick(lesson)}
                                    className="w-full flex items-center justify-between p-4 pl-16 hover:bg-white/5 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${lesson.type === 'video' ? 'bg-red-500/10 text-red-400' : lesson.type === 'quiz' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-700/30 text-gray-400'}`}>
                                            {lesson.type === 'video' ? <Video size={16} /> : lesson.type === 'quiz' ? <Play size={16} /> : <FileText size={16} />}
                                        </div>
                                        <div>
                                            <div className="text-gray-300 font-medium group-hover:text-white transition-colors">{lesson.title}</div>
                                            <div className="text-xs text-gray-600">{lesson.duration} min • {lesson.type}</div>
                                        </div>
                                    </div>

                                    <div className="px-3 py-1 rounded-full border border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:border-white/20 group-hover:text-gray-300 transition-all">
                                        Start
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function SubjectMaterials() {
    const { semesterId, subjectId } = useParams();
    const navigate = useNavigate();
    const { user, guest } = useAuth();
    const { isSystemMaintenance, isMaterialsHidden } = useMaintenance();

    const [subject, setSubject] = useState<any>(null);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('isSidebarOpen');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('isSidebarOpen', JSON.stringify(isSidebarOpen));
    }, [isSidebarOpen]);

    useEffect(() => {
        const fetchSubject = async () => {
            if (!subjectId) return;

            const { data, error } = await supabase
                .from('subjects')
                .select(`
                    *,
                    materials (*)
                `)
                .eq('id', subjectId)
                .single();

            if (data) setSubject(data);

            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .select('*, questions(count)')
                .eq('subject_id', subjectId)
                .eq('is_published', true)
                .or('is_private.is.null,is_private.eq.false')
                .order('created_at', { ascending: false });

            if (quizData) {
                setQuizzes(quizData.map((quiz: any) => ({
                    ...quiz,
                    questions_count: quiz.questions?.[0]?.count || 0
                })));
            }

            setLoading(false);
        };

        fetchSubject();
    }, [subjectId]);

    if (isSystemMaintenance) {
        return <MaintenancePage scope="system" />;
    }

    if (isMaterialsHidden) {
        return <MaintenancePage scope="materials" />;
    }

    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        const IconComponent = (LucideIcons as any)[name];
        return IconComponent ? <IconComponent className={className} /> : <BookOpen className={className} />;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-500 w-10 h-10" />
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Subject Not Found</h1>
                    <Link to="/" className="text-purple-400 hover:text-purple-300">Return Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans flex overflow-hidden">

            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            <div className={`${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'} fixed inset-y-0 left-0 z-50 bg-black/90 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col overflow-hidden`}>
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <RenderIcon name={subject.icon_name} className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold tracking-tight line-clamp-1">{subject.name}</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

                    <div className="space-y-2 mb-6">
                        <button
                            onClick={() => setSelectedItem({ type: 'courseware', title: 'Course Modules' })}
                            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group ${selectedItem?.type === 'courseware' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedItem?.type === 'courseware' ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                <BookOpen size={16} />
                            </div>
                            <div className="font-bold">Course Modules</div>
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Resources</h3>
                        {subject.materials?.filter((m: any) => m.category === 'resource' || !m.category).length > 0 ? (
                            subject.materials.filter((m: any) => m.category === 'resource' || !m.category).map((resource: any, idx: number) => (
                                <button
                                    key={resource.id || idx}
                                    onClick={() => setSelectedItem(resource)}
                                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group ${selectedItem?.id === resource.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 group-hover:bg-white/10`}>
                                        {resource.type === 'youtube' ? <Youtube size={16} className="text-red-400" /> :
                                            resource.type === 'drive' ? <HardDrive size={16} className="text-blue-400" /> :
                                                resource.type === 'video' ? <Video size={16} className="text-purple-400" /> :
                                                    <FileText size={16} className="text-emerald-400" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium line-clamp-1">{resource.title}</div>
                                        <div className="text-[10px] text-gray-500 capitalize">{resource.type}</div>
                                    </div>
                                    <ExternalLink size={14} className="text-gray-600 group-hover:text-gray-400" />
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm italic">
                                No resources available yet.
                            </div>
                        )}
                    </div>

                    {quizzes.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Interactive Quizzes</h3>
                            {quizzes.map((quiz: any) => (
                                <button
                                    key={quiz.id}
                                    onClick={() => setSelectedItem({ ...quiz, type: 'quiz' })}
                                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group ${selectedItem?.id === quiz.id ? 'bg-purple-500/20 text-white border border-purple-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedItem?.id === quiz.id ? 'bg-purple-500 text-white' : 'bg-white/5 group-hover:bg-purple-500/20 group-hover:text-purple-400'}`}>
                                        <BrainCircuit size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium line-clamp-1">{quiz.title}</div>
                                        <div className="text-[10px] text-gray-500 capitalize">{quiz.questions_count || '?'} Questions</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {subject.materials?.filter((m: any) => m.category === 'exam').length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Exams (PDF)</h3>
                            {subject.materials.filter((m: any) => m.category === 'exam').map((resource: any, idx: number) => (
                                <button
                                    key={resource.id || idx}
                                    onClick={() => setSelectedItem(resource)}
                                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group ${selectedItem?.id === resource.id ? 'bg-red-500/20 text-white border border-red-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedItem?.id === resource.id ? 'bg-red-500 text-white' : 'bg-white/5 group-hover:bg-red-500/20 group-hover:text-red-400'}`}>
                                        <FileText size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium line-clamp-1">{resource.title}</div>
                                        <div className="text-[10px] text-gray-500 capitalize">Exam Paper</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20">
                    <button onClick={() => navigate(-1)} className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Back
                    </button>
                </div>
            </div>

            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0 md:ml-80' : 'ml-0'} relative z-10 flex flex-col h-screen`}>

                <header className="h-20 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <PanelLeft size={20} />
                        </button>
                        <div className="h-6 w-px bg-white/10" />
                        <h2 className="text-lg font-bold text-white hidden md:block">{subject.name}</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {(user || guest) ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/50 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/profile')}>
                                {(user?.user_metadata?.avatar_url || guest?.avatar_url) ? (
                                    <img src={user?.user_metadata?.avatar_url || guest?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-purple-600 flex items-center justify-center">
                                        <BookOpen size={16} className="text-white" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                <RenderIcon name={subject.icon_name} className="w-5 h-5 text-purple-400" />
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 flex items-center justify-center relative">
                    {!selectedItem ? (
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-12 text-center max-w-2xl animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <RenderIcon name={subject.icon_name} className="w-10 h-10 text-purple-400" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4 text-white">Course Content</h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                Select a resource or quiz from the sidebar to view materials for {subject.name}.
                            </p>
                            <button
                                onClick={() => setSelectedItem({ type: 'courseware', title: 'Course Modules' })}
                                className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Start Learning
                            </button>
                        </div>
                    ) : selectedItem.type === 'courseware' ? (
                        <div className="w-full max-w-4xl mx-auto">
                            <div className="mb-8">
                                <h2 className="text-3xl font-black text-white mb-2">Course Modules</h2>
                                <p className="text-gray-400">Follow the learning path for {subject.name}</p>
                            </div>
                            <InlineSubjectCourseware subjectId={subjectId!} semesterId={semesterId} />
                        </div>
                    ) : selectedItem.type === 'quiz' ? (
                        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-[#0F1115] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

                                <div className="p-8 md:p-12 relative z-10">
                                    <div className="flex items-start justify-between mb-8">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider">
                                                    Interactive Quiz
                                                </div>
                                                {selectedItem.time_limit && (
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        <Clock size={14} />
                                                        {selectedItem.time_limit} Mins
                                                    </div>
                                                )}
                                            </div>
                                            <h2 className="text-4xl font-black text-white mb-4 leading-tight">{selectedItem.title}</h2>
                                            <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
                                                {selectedItem.description || "Test your knowledge with this interactive quiz designed to reinforce your understanding of the subject matter."}
                                            </p>
                                        </div>
                                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl rotate-3">
                                            <BrainCircuit size={48} className="text-white" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-10">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Questions</div>
                                            <div className="text-2xl font-bold text-white">{selectedItem.questions_count || '?'}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Pass Score</div>
                                            <div className="text-2xl font-bold text-white">80%</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => navigate(`/quizzes/${semesterId}/${subjectId}?quizId=${selectedItem.id}`)}
                                            className="flex-1 py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-3 group"
                                        >
                                            <Play size={20} className="fill-current" />
                                            Start Quiz
                                            <ArrowLeft className="w-5 h-5 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 rotate-180 transition-all" />
                                        </button>
                                        {user && (
                                            <button className="px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all">
                                                <Trophy size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-[#0F1115] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <div className="p-8 md:p-12">
                                    <div className="flex items-start justify-between mb-8">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${selectedItem.type === 'youtube' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-blue-500/20 border-blue-500/30 text-blue-400'}`}>
                                                    {selectedItem.type === 'youtube' ? 'Video Lookup' : 'Document Resource'}
                                                </div>
                                            </div>
                                            <h2 className="text-3xl font-bold text-white mb-4">{selectedItem.title}</h2>
                                            <p className="text-gray-400 text-lg leading-relaxed">
                                                External resource. Click the button below to open.
                                            </p>
                                        </div>
                                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl ${selectedItem.type === 'youtube' ? 'bg-red-500' : 'bg-blue-600'}`}>
                                            {selectedItem.type === 'youtube' ? <Youtube size={40} className="text-white" /> : <ExternalLink size={40} className="text-white" />}
                                        </div>
                                    </div>

                                    <a
                                        href={selectedItem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-3"
                                    >
                                        Open Resource <ExternalLink size={20} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
