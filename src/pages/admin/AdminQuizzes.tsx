import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, FileText, Clock, FolderOpen, ArrowRight, Loader2, BookOpen, Layers, ChevronRight, ChevronLeft, X, AlertTriangle, Upload, Download, Copy, Sparkles, Lock, Link as LinkIcon, ArrowLeft, Save, CheckCircle, Edit, QrCode, HelpCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import AdminQuizImportModal from './AdminQuizImportModal';
import * as LucideIcons from 'lucide-react';
import { normalizeQuizAccessCode } from '../../utils/quizAccess';

import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';

type ViewMode = 'semesters' | 'subjects' | 'quizzes' | 'detail';

export default function AdminQuizzes() {

    const { profile } = useAuth();
    const { showToast } = useToast();
    const [viewMode, setViewMode] = useState<ViewMode | 'search'>('semesters');
    const [selectedSemester, setSelectedSemester] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

    const [semesters, setSemesters] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setViewMode('search');
        setIsSearching(true);

        setSelectedSemester(null);
        setSelectedSubject(null);

        try {
            const [questionsRes, quizzesRes] = await Promise.all([
                supabase
                    .from('questions')
                    .select(`
                        quizzes (
                            id,
                            title,
                            subject_id,
                            subjects (name),
                            profiles:submitted_by(full_name)
                        )
                    `)
                    .ilike('question', `%${searchQuery}%`)
                    .limit(20),
                supabase
                    .from('quizzes')
                    .select(`
                        subjects (name),
                        questions(count)
                    `)
                    .ilike('title', `%${searchQuery}%`)
                    .limit(20)
            ]);

            if (questionsRes.error) throw questionsRes.error;
            if (quizzesRes.error) throw quizzesRes.error;

            const formattedQuizzes = (quizzesRes.data || []).map(q => ({
                ...q,
                isQuizResult: true,
                question_count: q.questions?.[0]?.count || 0
            }));

            setSearchResults([...formattedQuizzes, ...(questionsRes.data || [])]);
        } catch (err) {
            console.error(err);
            showToast('Search Failed', 'An error occurred while searching for quizzes.', 'error');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(false);

    const fetchRecentQuizzes = async () => {
        setLoadingRecent(true);
        try {
            const { data, error } = await supabase
                .from('quizzes')
                .select(`
                    subjects (name),
                    profiles:submitted_by(full_name),
                    questions(count)
                `)
                .order('created_at', { ascending: false })
                .limit(6);
            
            if (error) {
                console.warn('Recent quizzes fetch with profiles failed, trying simple fetch:', error);
                const { data: simpleData, error: simpleError } = await supabase
                    .from('quizzes')
                    .select(`
                        subjects (name),
                        questions(count)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(6);
                
                if (simpleError) throw simpleError;
                setRecentQuizzes(simpleData || []);
            } else {
                setRecentQuizzes(data || []);
            }
        } catch (err) {
            console.error('Error fetching recent quizzes:', err);
        } finally {
            setLoadingRecent(false);
        }
    };

    const getCreatorName = (quiz: any) => {
        if (!quiz.profiles) return 'System';
        return quiz.profiles.full_name || quiz.profiles.username || quiz.profiles.email?.split('@')[0] || 'Unknown';
    };

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [importModalMode, setImportModalMode] = useState<'csv' | 'ai' | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);

    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [newQuizDescription, setNewQuizDescription] = useState('');
    const [newQuizTimeLimit, setNewQuizTimeLimit] = useState<number>(0);
    const [newQuizIsPrivate, setNewQuizIsPrivate] = useState(false);
    const [newQuizShuffleQuestions, setNewQuizShuffleQuestions] = useState(true);
    const [newQuizShuffleOptions, setNewQuizShuffleOptions] = useState(true);
    const [createLoading, setCreateLoading] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (viewMode === 'semesters') {
            fetchSemesters();
            fetchRecentQuizzes();
        }
        if (viewMode === 'subjects' && selectedSemester) fetchSubjects();
        if (viewMode === 'quizzes' && selectedSubject) fetchQuizzes();
    }, [viewMode, selectedSemester, selectedSubject]);

    const fetchSemesters = async () => {
        setLoading(true);
        const { data } = await supabase.from('semesters').select('*').order('id');
        if (data) setSemesters(data);
        setLoading(false);
    };

    const fetchSubjects = async () => {
        if (!selectedSemester) return;
        const { data, error } = await supabase
            .from('subjects')
            .select(`
                quizzes:quizzes(id, is_published)
            `)
            .eq('semester_id', selectedSemester.id)
            .order('name');
        
        if (data) {
            const transformed = data.map(sub => ({
                ...sub,
                published_count: (sub.quizzes || []).filter((q: any) => q.is_published).length,
                total_quizzes: (sub.quizzes || []).length
            }));
            setSubjects(transformed);
        }
        setLoading(false);
    };

    const fetchQuizzes = async () => {
        setLoading(true);
        if (!selectedSubject) return;

        const { data, error } = await supabase
            .from('quizzes')
            .select('*, questions(count)')
            .eq('subject_id', selectedSubject.id)
            .order('created_at', { ascending: false });


        if (!error && data) {
            const transformed = data.map(q => ({
                ...q,
                question_count: q.questions?.[0]?.count || 0
            }));
            setQuizzes(transformed);
        }
        setLoading(false);
    };

    const handleSemesterClick = (semester: any) => {
        setSelectedSemester(semester);
        setViewMode('subjects');
    };

    const handleSubjectClick = (subject: any) => {
        setSelectedSubject(subject);
        setViewMode('quizzes');
    };

    const handleQuizClick = (id: string, questionId?: string) => {
        setSelectedQuizId(id);
        if (questionId) setSelectedQuestionId(questionId);
        setViewMode('detail');
    };

    const openCreateModal = () => {
        setNewQuizTitle('');
        setNewQuizDescription('');
        setNewQuizTimeLimit(0);
        setNewQuizIsPrivate(false);
        setNewQuizShuffleQuestions(true);
        setNewQuizShuffleOptions(true);
        setShowCreateModal(true);
    };

    const handleTogglePublish = async (e: React.MouseEvent, quizId: string, currentStatus: boolean) => {
        e.stopPropagation();
        const { error } = await supabase
            .from('quizzes')
            .update({ is_published: !currentStatus })
            .eq('id', quizId);

        if (!error) {
            setQuizzes(quizzes.map(q => q.id === quizId ? { ...q, is_published: !currentStatus } : q));
            setRecentQuizzes(recentQuizzes.map(q => q.id === quizId ? { ...q, is_published: !currentStatus } : q));
        }
    };

    const confirmCreateQuiz = async () => {
        if (!newQuizTitle.trim()) return;
        if (!selectedSubject) return;

        setCreateLoading(true);
        const { data, error } = await supabase
            .from('quizzes')
            .insert({
                title: newQuizTitle,
                description: newQuizDescription,
                time_limit: newQuizTimeLimit,
                is_published: false,
                is_private: newQuizIsPrivate,
                shuffle_questions: newQuizShuffleQuestions,
                shuffle_options: newQuizShuffleOptions,
                subject_id: selectedSubject.id,
                semester_id: selectedSemester.id,
                submitted_by: profile?.id || null
            })
            .select('*, subjects(name), profiles:submitted_by(full_name), questions(count)')
            .single();

        if (!error && data) {
            setQuizzes([data, ...quizzes]);
            setRecentQuizzes([data, ...recentQuizzes].slice(0, 6));
            setShowCreateModal(false);
            handleQuizClick(data.id);
        }
        setCreateLoading(false);
    };

    const handleCloneQuiz = async (e: React.MouseEvent, quizId: string) => {
        e.stopPropagation();
        if (!window.confirm("Duplicate this quiz?")) return;
        setCreateLoading(true);

        try {
            const { data: original, error: fError } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();
            if (fError) throw fError;

            const { data: clone, error: cError } = await supabase
                .from('quizzes')
                .insert({
                    ...original,
                    id: undefined,
                    created_at: undefined,
                    title: `${original.title} (Copy)`,
                    is_published: false
                })
                .select()
                .single();
            if (cError) throw cError;

            const { data: questions } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', quizId);

            if (questions && questions.length > 0) {
                const newQuestions = questions.map(q => ({
                    ...q,
                    id: undefined,
                    created_at: undefined,
                    quiz_id: clone.id
                }));
                await supabase.from('questions').insert(newQuestions);
            }

            fetchQuizzes();
        } catch (e: any) {
            showToast("Cloning Failed", e.message, 'error');
        } finally {
            setCreateLoading(false);
        }
    };

    const openDeleteModal = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setQuizToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDeleteQuiz = async () => {
        if (!quizToDelete) return;

        const { error } = await supabase.from('quizzes').delete().eq('id', quizToDelete);
        if (!error) {
            setQuizzes(prev => prev.filter(q => q.id !== quizToDelete));
            setShowDeleteModal(false);
            setQuizToDelete(null);
        }
    };

    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        const IconComponent = (LucideIcons as any)[name];
        return IconComponent ? <IconComponent className={className} /> : <BookOpen className={className} />;
    };

    const copyPrivateLink = (e: React.MouseEvent, quizId: string) => {
        e.stopPropagation();
        const link = `${window.location.origin}/quiz/${quizId}`;
        navigator.clipboard.writeText(link);
        showToast('Link Copied', 'Private link copied to clipboard', 'success');
    };

    const handleBack = () => {
        if (viewMode === 'detail') {

            setViewMode(selectedSubject ? 'quizzes' : 'search');
            setSelectedQuizId(null);
            setSelectedQuestionId(null);
        } else if (viewMode === 'quizzes') {
            setViewMode('subjects');
            setSelectedSubject(null);
        } else if (viewMode === 'subjects') {
            setViewMode('semesters');
            setSelectedSemester(null);
        } else if (viewMode === 'search') {
            setViewMode('semesters');
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    if (viewMode === 'detail' && selectedQuizId) {
        return (
            <InlineAdminQuizDetail
                quizId={selectedQuizId}
                onBack={handleBack}
                initialQuestionId={selectedQuestionId}
            />
        );
    }

    return (
        <div className="min-h-screen pb-20 space-y-8 animate-in fade-in duration-700">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-[#0A0C10]/80 border border-white/5 p-8 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <BookOpen size={180} />
                    </div>
                    
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 mb-4">
                                <span className="cursor-pointer hover:text-white transition-colors" onClick={() => { setViewMode('semesters'); setSelectedSemester(null); setSelectedSubject(null); }}>Academy</span>
                                {selectedSemester && (
                                    <>
                                        <ChevronRight size={10} className="text-gray-700" />
                                        <span className="cursor-pointer hover:text-white transition-colors" onClick={() => { setViewMode('subjects'); setSelectedSubject(null); }}>{selectedSemester.title}</span>
                                    </>
                                )}
                                {selectedSubject && (
                                    <>
                                        <ChevronRight size={10} className="text-gray-700" />
                                        <span className="text-white">{selectedSubject.name}</span>
                                    </>
                                )}
                            </div>
                            
                            <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
                                {viewMode === 'semesters' ? 'Quiz Management' : 
                                 viewMode === 'subjects' ? selectedSemester?.title :
                                 viewMode === 'quizzes' ? selectedSubject?.name :
                                 viewMode === 'search' ? 'Global Search' : 'Editor'}
                            </h1>
                            <p className="text-gray-500 text-lg font-medium max-w-xl">
                                {viewMode === 'semesters' ? 'Select a semester to manage its academic subjects and quizzes.' : 
                                 viewMode === 'subjects' ? `Managing subjects for ${selectedSemester?.title}.` :
                                 `Curating quizzes for ${selectedSubject?.name}.`}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <form onSubmit={handleSearch} className="relative group/search w-full sm:w-80">
                                <LucideIcons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/search:text-purple-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search database..."
                                    className="w-full pl-12 pr-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all shadow-inner"
                                />
                            </form>

                            {viewMode === 'quizzes' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setImportModalMode('ai')}
                                        className="p-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-2xl transition-all border border-purple-500/20 group/btn"
                                        title="AI Import"
                                    >
                                        <Sparkles size={22} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                    <button
                                        onClick={openCreateModal}
                                        className="flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-2xl font-black transition-all shadow-xl active:scale-95"
                                    >
                                        <Plus size={20} />
                                        <span>Create New</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="animate-spin text-purple-500 w-12 h-12" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Synchronizing Data...</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {viewMode === 'semesters' && (
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                            <div className="xl:col-span-3 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                        <Clock className="text-purple-500" />
                                        Recent Quizzes
                                    </h2>
                                </div>
                                
                                {loadingRecent ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse border border-white/5" />)}
                                    </div>
                                ) : recentQuizzes.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {recentQuizzes.map(quiz => (
                                            <div
                                                key={quiz.id}
                                                onClick={() => handleQuizClick(quiz.id)}
                                                className="group cursor-pointer relative bg-[#0A0C10] border border-white/5 p-6 rounded-3xl hover:border-purple-500/40 hover:bg-white/5 transition-all duration-500"
                                            >
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-500">
                                                        <FileText size={22} />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => handleTogglePublish(e, quiz.id, quiz.is_published)}
                                                            className={`p-2 rounded-xl transition-all ${quiz.is_published ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 bg-white/5 hover:text-white'}`}
                                                        >
                                                            {quiz.is_published ? <LucideIcons.Eye size={16} /> : <LucideIcons.EyeOff size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-300 transition-colors">{quiz.title}</h3>
                                                <div className="flex flex-col gap-1 mb-6">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{quiz.subjects?.name || 'General'}</span>
                                                    <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">By: {getCreatorName(quiz)}</span>
                                                </div>
                                                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-tighter">
                                                    <span className="flex items-center gap-1"><FolderOpen size={12} /> {quiz.questions?.[0]?.count || 0} Questions</span>
                                                    <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl py-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No recent activity detected.</div>
                                )}
                            </div>
                            
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                    <AlertTriangle className="text-amber-500" />
                                    Analytics
                                </h2>
                                <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-3xl shadow-xl shadow-purple-900/20 text-white group cursor-default">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-70">Knowledge Density</p>
                                    <div className="text-5xl font-black mt-2 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                                        {semesters.length}
                                    </div>
                                    <p className="text-sm font-medium mt-1 opacity-90">Active Semesters</p>
                                    <div className="mt-8 pt-8 border-t border-white/20 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-2xl font-black tracking-tighter">{recentQuizzes.filter(q => q.is_published).length}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Published</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black tracking-tighter">{recentQuizzes.filter(q => !q.is_published).length}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Drafts</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-8">
                        {viewMode === 'semesters' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {semesters.map(semester => (
                                    <div
                                        key={semester.id}
                                        onClick={() => handleSemesterClick(semester)}
                                        className="group relative bg-[#0A0C10] border border-white/5 p-10 rounded-[2.5rem] hover:border-purple-500/30 hover:bg-white/5 transition-all duration-500 cursor-pointer overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-12 text-white/5 group-hover:text-white/10 group-hover:scale-110 transition-all duration-700">
                                            <Layers size={140} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-purple-400 mb-8 group-hover:bg-purple-500 group-hover:text-white transition-all duration-500 shadow-xl">
                                                <Layers size={32} />
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-4 tracking-tight group-hover:translate-x-2 transition-transform duration-500">{semester.title}</h3>
                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-10">
                                                <span>{semester.subject_count} Subjects</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                <span>{semester.total_quizzes} Quizzes</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-purple-400 font-black text-xs uppercase tracking-widest">
                                                <span>Explore Topics</span>
                                                <ArrowRight size={18} className="group-hover:translate-x-3 transition-transform duration-500" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {viewMode === 'subjects' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {subjects.map(subject => (
                                    <div
                                        key={subject.id}
                                        onClick={() => handleSubjectClick(subject)}
                                        className="group relative bg-[#0A0C10] border border-white/5 p-10 rounded-[2.5rem] hover:border-purple-500/30 hover:bg-white/5 transition-all duration-500 cursor-pointer overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-12 text-white/5 group-hover:text-white/10 group-hover:scale-110 transition-all duration-700">
                                            <BookOpen size={140} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-purple-400 mb-8 group-hover:bg-purple-500 group-hover:text-white transition-all duration-500 shadow-xl">
                                                <BookOpen size={32} />
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-4 tracking-tight group-hover:translate-x-2 transition-transform duration-500">{subject.name}</h3>
                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-10">
                                                <span>{subject.total_quizzes} Quizzes</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                <span className="text-emerald-500">{subject.published_count} Published</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-purple-400 font-black text-xs uppercase tracking-widest">
                                                <span>Manage Quizzes</span>
                                                <ArrowRight size={18} className="group-hover:translate-x-3 transition-transform duration-500" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {viewMode === 'quizzes' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {quizzes.map((quiz, index) => (
                                    <div
                                        key={quiz.id}
                                        onClick={() => handleQuizClick(quiz.id)}
                                        className={`group relative overflow-hidden bg-[#0A0C10] border border-white/5 rounded-[32px] hover:border-purple-500/30 hover:bg-white/5 transition-all duration-500 cursor-pointer flex flex-col justify-between ${
                                            index % 5 === 0 ? 'md:col-span-2 md:row-span-1 h-72' : 'md:col-span-1 h-72'
                                        }`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="absolute right-0 bottom-0 w-32 h-32 bg-purple-500/10 blur-[60px] rounded-full group-hover:bg-purple-500/20 transition-colors pointer-events-none" />

                                        <div className="p-8 relative z-10 flex flex-col h-full justify-between">
                                            <div className="flex justify-between items-start">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl">
                                                    <FileText size={28} />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowQRModal(true); setSelectedQuizId(quiz.id); }}
                                                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all border border-white/5"
                                                        title="QR Code"
                                                    >
                                                        <QrCode size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleCloneQuiz(e, quiz.id)}
                                                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all border border-white/5"
                                                        title="Clone"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => openDeleteModal(e, quiz.id)}
                                                        className="p-2.5 bg-white/5 hover:bg-red-500/10 rounded-xl text-gray-600 hover:text-red-400 transition-all border border-white/5"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-2xl font-black text-white mb-2 line-clamp-1 group-hover:text-purple-300 transition-colors tracking-tight">{quiz.title}</h3>
                                                <p className="text-gray-500 text-sm font-medium line-clamp-2">{quiz.description || 'No description provided.'}</p>
                                            </div>

                                            <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${quiz.is_published ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                        {quiz.is_published ? 'Live' : 'Draft'}
                                                    </span>
                                                </div>
                                                <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] font-black uppercase tracking-[0.15em] text-purple-400">
                                                    {quiz.question_count} Qs
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {quizzes.length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-600 mb-6">
                                            <AlertTriangle size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">No Quizzes Found</h3>
                                        <p className="text-gray-500 font-medium mb-8">This subject doesn't have any quizzes yet.</p>
                                        <button
                                            onClick={openCreateModal}
                                            className="flex items-center gap-3 px-8 py-4 bg-purple-600 text-white hover:bg-purple-500 rounded-2xl font-black transition-all shadow-xl active:scale-95"
                                        >
                                            <Plus size={20} />
                                            <span>Create First Quiz</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {viewMode === 'search' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-black text-white">Search Results</h2>
                                    <button onClick={() => setViewMode('semesters')} className="text-purple-400 font-bold flex items-center gap-2 hover:text-purple-300">
                                        <X size={18} /> Clear Search
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {searchResults.map((result, idx) => (
                                        <div
                                            key={result.id || idx}
                                            onClick={() => handleQuizClick(result.isQuizResult ? result.id : result.quiz_id, !result.isQuizResult ? result.id : undefined)}
                                            className="group relative bg-[#0A0C10] border border-white/5 p-6 rounded-3xl hover:border-purple-500/30 hover:bg-white/5 transition-all duration-500 cursor-pointer"
                                        >
                                            {result.isQuizResult ? (
                                                <>
                                                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                                                        <FileText size={22} />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">Quiz: {result.title}</h3>
                                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{result.subjects?.name}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
                                                        <HelpCircle size={22} />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{result.question}</h3>
                                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">In: {result.quizzes?.title}</p>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && !isSearching && (
                                        <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No results found for "{searchQuery}".</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {showCreateModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                                <div className="relative bg-[#0F1115] border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
                                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Plus className="text-purple-500" />
                                            Create New Quiz
                                        </h2>
                                        <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Quiz Title</label>
                                            <input
                                                type="text"
                                                value={newQuizTitle}
                                                onChange={(e) => setNewQuizTitle(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all font-bold"
                                                placeholder="Enter quiz title..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Description (Optional)</label>
                                            <textarea
                                                rows={3}
                                                value={newQuizDescription}
                                                onChange={(e) => setNewQuizDescription(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all text-sm"
                                                placeholder="Brief instructions or summary..."
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Time Limit (Min)</label>
                                                <input
                                                    type="number"
                                                    value={newQuizTimeLimit}
                                                    onChange={(e) => setNewQuizTimeLimit(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono"
                                                    placeholder="0 for unlimited"
                                                />
                                            </div>
                                            <div className="flex flex-col justify-end gap-2 pb-1">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={newQuizIsPrivate}
                                                        onChange={(e) => setNewQuizIsPrivate(e.target.checked)}
                                                        className="w-5 h-5 rounded border-white/10 bg-black/40 text-purple-500 focus:ring-purple-500/50"
                                                    />
                                                    <span className="text-xs font-bold text-gray-400 uppercase group-hover:text-white transition-colors">Private Quiz</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={newQuizShuffleQuestions}
                                                    onChange={(e) => setNewQuizShuffleQuestions(e.target.checked)}
                                                    className="w-5 h-5 rounded border-white/10 bg-black/40 text-purple-500 focus:ring-purple-500/50"
                                                />
                                                <span className="text-xs font-bold text-gray-400 uppercase group-hover:text-white transition-colors">Shuffle Questions</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={newQuizShuffleOptions}
                                                    onChange={(e) => setNewQuizShuffleOptions(e.target.checked)}
                                                    className="w-5 h-5 rounded border-white/10 bg-black/40 text-purple-500 focus:ring-purple-500/50"
                                                />
                                                <span className="text-xs font-bold text-gray-400 uppercase group-hover:text-white transition-colors">Shuffle Options</span>
                                            </label>
                                        </div>

                                        <button
                                            onClick={confirmCreateQuiz}
                                            disabled={createLoading || !newQuizTitle.trim()}
                                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                                        >
                                            {createLoading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                                            Create Quiz
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {importModalMode && selectedSubject && selectedSemester && (
                <AdminQuizImportModal
                    subjectId={selectedSubject.id}
                    semesterId={selectedSemester.id}
                    initialMode={importModalMode}
                    onClose={() => setImportModalMode(null)}
                    onSuccess={() => fetchQuizzes()}
                />
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative bg-[#0F1115] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-8 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Delete Quiz?</h2>
                            <p className="text-gray-400 mb-8">
                                This will permanently delete this quiz and all {quizzes.find(q => q.id === quizToDelete)?.question_count || 0} questions associated with it. This action cannot be undone.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteQuiz}
                                    className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 transition-colors"
                                >
                                    Delete Quiz
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showQRModal && selectedQuizId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowQRModal(false)} />
                    <div className="relative bg-white border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 p-8 flex flex-col items-center gap-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-black mb-2">Scan to Start</h2>
                            <p className="text-gray-500 font-medium">{quizzes.find(q => q.id === selectedQuizId)?.title}</p>
                        </div>

                        <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100" id="qr-code-wrapper">
                            <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
                                <QRCode
                                    size={256}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    value={`${window.location.origin}/quiz/${selectedQuizId}`}
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="flex-1 px-5 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={async () => {
                                    const element = document.getElementById('qr-code-wrapper');
                                    if (element) {
                                        const canvas = await html2canvas(element, { backgroundColor: '#ffffff' });
                                        const link = document.createElement('a');
                                        link.download = `quiz-qr-${selectedQuizId}.png`;
                                        link.href = canvas.toDataURL();
                                        link.click();
                                    }
                                }}
                                className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                Save Image
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <LucideIcons.Printer size={18} />
                                Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface InlineDetailProps {
    quizId: string;
    onBack: () => void;
    initialQuestionId?: string | null;
}

function InlineAdminQuizDetail({ quizId, onBack, initialQuestionId }: InlineDetailProps) {
    const { showToast } = useToast();
    const [quiz, setQuiz] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(0);
    const [subjectId, setSubjectId] = useState('');
    const [semesterId, setSemesterId] = useState<number | null>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [shuffleOptions, setShuffleOptions] = useState(true);
    const [accessCode, setAccessCode] = useState('');

    const [subjects, setSubjects] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);

    const [showQuestionEditor, setShowQuestionEditor] = useState(false);
    const [importModalMode, setImportModalMode] = useState<'csv' | 'ai' | null>(null);
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const { profile } = useAuth();

    useEffect(() => {
        fetchFormData();
        fetchQuizDetails();
        if (initialQuestionId) {
            handleEditQuestion(initialQuestionId);
        }
    }, [quizId]);

    const fetchFormData = async () => {
        const { data: sems } = await supabase.from('semesters').select('*').order('id');
        if (sems) setSemesters(sems);

        const { data: subs } = await supabase.from('subjects').select('*').order('name');
        if (subs) setSubjects(subs);
    };

    const fetchQuizDetails = async () => {
        const { data: quizData, error } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', quizId)
            .single();

        if (error) {
            console.error('Error fetching quiz:', error);
        }

        if (quizData) {
            setQuiz(quizData);
            setTitle(quizData.title);
            setDescription(quizData.description || '');
            setTimeLimit(quizData.time_limit || 0);
            setSubjectId(quizData.subject_id || '');
            setSemesterId(quizData.semester_id || null);
            setIsPublished(quizData.is_published || false);
            setIsPrivate(quizData.is_private || false);
            setShuffleQuestions(quizData.shuffle_questions !== false);
            setShuffleOptions(quizData.shuffle_options !== false);
            setAccessCode(quizData.access_code || '');

            const { data: qData } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', quizId)
                .order('created_at', { ascending: true });

            if (qData) {
                setQuestions(qData);
            }
        }
    };

    const handleSaveSettings = async () => {
        if (!title.trim()) {
            showToast('Validation Error', 'Quiz title cannot be empty.', 'error');
            return;
        }

        const updates = {
            title,
            description,
            time_limit: timeLimit,
            subject_id: subjectId || null,
            semester_id: semesterId || null,
            is_published: isPublished,
            is_private: isPrivate,
            shuffle_questions: shuffleQuestions,
            shuffle_options: shuffleOptions,
            access_code: normalizeQuizAccessCode(accessCode) || null,
        };


        const { error } = await supabase
            .from('quizzes')
            .update(updates)
            .eq('id', quizId);

        if (error) {
            showToast('Error', 'Failed to save settings: ' + error.message, 'error');
        } else {
            showToast('Success', 'Quiz settings saved successfully!', 'success');
            fetchQuizDetails();
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!window.confirm('Remove this question from the quiz?')) return;

        const { error } = await supabase.from('questions').delete().eq('id', id);
        if (!error) {
            setQuestions(prev => prev.filter(q => q.id !== id));
        }
    };

    const handleEditQuestion = (id: string) => {
        setEditingQuestionId(id);
        setShowQuestionEditor(true);
    };

    const togglePublish = async () => {
        const newState = !isPublished;
        const { error } = await supabase
            .from('quizzes')
            .update({ is_published: newState })
            .eq('id', quizId);

        if (error) {
            showToast('Error', 'Failed to update publish status', 'error');
        } else {
            setIsPublished(newState);
            showToast('Success', newState ? 'Quiz Published!' : 'Quiz Unpublished', 'success');
        }
    };

    const handleAddQuestion = () => {
        setEditingQuestionId(null);
        setShowQuestionEditor(true);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-white">{quiz?.title || 'Loading...'}</h1>
                    <p className="text-gray-400 text-sm">Manage questions and settings</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <button
                        onClick={togglePublish}
                        className={`px-4 py-2 rounded-xl font-bold transition-all border ${isPublished
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                            }`}
                    >
                        {isPublished ? 'Published' : 'Draft'}
                    </button>
                    <button
                        onClick={handleSaveSettings}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
                    >
                        <Save size={18} />
                        <span>Save Settings</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                    <div className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock className="text-purple-400" size={20} />
                            <span>Configuration</span>
                        </h3>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Quiz Title</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none font-bold"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Description</label>
                            <textarea
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none text-sm"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Semester</label>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none text-sm appearance-none"
                                    value={semesterId || ''}
                                    onChange={e => setSemesterId(e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">None</option>
                                    {semesters.map(sem => (
                                        <option key={sem.id} value={sem.id}>{sem.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Subject</label>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none text-sm appearance-none"
                                    value={subjectId}
                                    onChange={e => {
                                        const nextSubjectId = e.target.value;
                                        setSubjectId(nextSubjectId);
                                        const selectedSubject = subjects.find(sub => sub.id === nextSubjectId);
                                        if (selectedSubject?.semester_id) {
                                            setSemesterId(selectedSubject.semester_id);
                                        }
                                    }}
                                >
                                    <option value="">None</option>
                                    {subjects
                                        .filter(sub => !semesterId || sub.semester_id === semesterId)
                                        .map(sub => (
                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Time Limit (Minutes)</label>
                            <input
                                type="number"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none font-mono"
                                value={timeLimit}
                                onChange={e => setTimeLimit(Number(e.target.value))}
                                placeholder="0 for unlimited"
                            />
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsPrivate(!isPrivate)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${isPrivate ? 'bg-purple-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isPrivate ? 'translate-x-4' : ''}`} />
                                    </button>
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase">Private Quiz</p>
                                        <p className="text-[10px] text-gray-500">Only accessible via direct link</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => setShuffleQuestions(!shuffleQuestions)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${shuffleQuestions ? 'bg-purple-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${shuffleQuestions ? 'translate-x-4' : ''}`} />
                                    </button>
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase">Shuffle Questions</p>
                                        <p className="text-[10px] text-gray-500">Randomize question order</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => setShuffleOptions(!shuffleOptions)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${shuffleOptions ? 'bg-blue-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${shuffleOptions ? 'translate-x-4' : ''}`} />
                                    </button>
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase">Shuffle Options</p>
                                        <p className="text-[10px] text-gray-500">Randomize choice order (A, B, C...)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 mt-4 border-t border-white/5">
                                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Custom Access Code</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none font-mono text-sm uppercase tracking-widest"
                                    value={accessCode}
                                    onChange={e => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                                    placeholder="CODE-123"
                                />
                                <p className="text-[10px] text-gray-400">Short code for easier access (Optional). Can be shared between related quizzes.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Summary</h3>
                        <div className="flex justify-between items-center text-sm py-2 border-b border-white/5">
                            <span className="text-gray-400">Total Questions</span>
                            <span className="font-mono font-bold text-white">{questions.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-2 border-b border-white/5">
                            <span className="text-gray-400">Total Points</span>
                            <span className="font-mono font-bold text-white">{questions.length}</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-2xl flex flex-col overflow-hidden h-full">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Questions</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setImportModalMode('ai')}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-sm font-bold text-purple-400 transition-all"
                                title="Magic Generator"
                            >
                                <Sparkles size={16} />
                                <span className="hidden sm:inline">Magic AI</span>
                            </button>
                            <button
                                onClick={() => setImportModalMode('csv')}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-sm font-bold text-blue-400 transition-all"
                                title="Import CSV"
                            >
                                <FileText size={16} />
                                <span className="hidden sm:inline">Import</span>
                            </button>
                            <button
                                onClick={handleAddQuestion}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm font-bold text-white transition-all"
                            >
                                <Plus size={16} />
                                Add Manual
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {questions.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No questions yet.</p>
                            </div>
                        ) : (
                            questions.map((q, idx) => (
                                <div key={q.id} className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-purple-500/20 transition-all group">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex gap-4">
                                            <div className="flex-none w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-gray-500">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-200 line-clamp-2">{q.question}</p>
                                                {q.image_url && (
                                                    <div className="mt-2 w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                                                        <img src={q.image_url} alt="Question" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${q.type === 'mcq' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                                        {q.type}
                                                    </span>
                                                    <span className="text-xs text-gray-600 font-mono">
                                                        {q.type === 'mcq' ? `${q.options?.length || 0} Options` : 'Essay Model'}
                                                    </span>
                                                </div>

                                                {(q.answer || q.model_answer) && (
                                                    <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
                                                        <CheckCircle size={12} />
                                                        <span>
                                                            Answer: <span className="font-bold text-emerald-300">{q.answer || q.model_answer}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditQuestion(q.id)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {showQuestionEditor && (
                <InlineAdminQuizEditor
                    onClose={() => {
                        setShowQuestionEditor(false);
                        fetchQuizDetails();
                    }}
                    editId={editingQuestionId}
                    quizId={quizId}
                />
            )}

            {importModalMode && (
                <AdminQuizImportModal
                    onClose={() => setImportModalMode(null)}
                    onSuccess={() => {
                        fetchQuizDetails();
                        showToast('Success', 'Questions imported successfully!', 'success');
                    }}
                    subjectId={subjectId}
                    semesterId={semesterId || 0}
                    targetQuizId={quizId}
                    initialMode={importModalMode}
                />
            )}
        </div>
    );
}

interface InlineEditorProps {
    onClose: () => void;
    editId?: string | null;
    quizId?: string;
}

function InlineAdminQuizEditor({ onClose, editId, quizId }: InlineEditorProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        category: 'mid_term',
        type: 'mcq',
        question: '',
        options: ['', '', '', ''],
        answer: '',
        model_answer: '',
        image_url: '',
        image_file: null as File | null
    });

    useEffect(() => {
        if (editId) {
            loadQuestion(editId);
        }
    }, [editId]);

    const loadQuestion = async (id: string) => {
        setLoading(true);
        const { data } = await supabase.from('questions').select('*').eq('id', id).single();
        if (data) {
            let loadedType = data.type;
            if (data.type === 'mcq' &&
                data.options?.length === 2 &&
                data.options[0] === 'True' &&
                data.options[1] === 'False') {
                loadedType = 'true_false';
            }

            setFormData({
                category: data.category,
                type: loadedType,
                question: data.question,
                options: data.options || ['', '', '', ''],
                answer: data.answer || '',
                model_answer: data.model_answer || '',
                image_url: data.image_url || '',
                image_file: null
            });
        }
        setLoading(false);
    };

    const handleOptionChange = (idx: number, val: string) => {
        const newOptions = [...formData.options];
        newOptions[idx] = val;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData(prev => ({
                ...prev,
                image_file: file,
                image_url: URL.createObjectURL(file)
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalImageUrl = formData.image_url;

            if (formData.image_file) {
                const fileExt = formData.image_file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('quiz-assets')
                    .upload(fileName, formData.image_file);

                if (uploadError) {
                    if (uploadError.message.includes('Bucket not found')) {
                        showToast("Bucket Error", "Storage bucket 'quiz-assets' does not exist.", 'error');
                        setLoading(false);
                        return;
                    }
                    throw uploadError;
                }

                const { data } = supabase.storage.from('quiz-assets').getPublicUrl(fileName);
                finalImageUrl = data.publicUrl;
            }

            const dbType = formData.type === 'true_false' ? 'mcq' : formData.type;

            const payload: any = {
                category: formData.category,
                type: dbType,
                question: formData.question,
                quiz_id: quizId,
                image_url: finalImageUrl
            };

            if (formData.type === 'mcq' || formData.type === 'true_false') {
                payload.options = formData.type === 'true_false' ? ['True', 'False'] : formData.options;
                payload.answer = formData.answer;
            } else {
                payload.model_answer = formData.model_answer;
            }

            if (editId) {
                const { error } = await supabase.from('questions').update(payload).eq('id', editId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('questions').insert(payload);
                if (error) throw error;
            }
            onClose();
        } catch (error: any) {
            console.error("Save error:", error);
            if (error.code === '42501') {
                showToast("Access Denied", "Permission denied (RLS). Admin role required.", 'error');
            } else {
                showToast("Save Error", error.message || "Unknown error", 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
            <div className="bg-[#0A0C10]/95 backdrop-blur-2xl border border-white/10 w-full max-w-2xl rounded-3xl p-8 relative shadow-2xl animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                    <X size={20} />
                </button>

                <h2 className="text-3xl font-black mb-1 text-white">
                    {editId ? 'Edit Question' : 'New Question'}
                </h2>
                <p className="text-gray-400 text-sm mb-8">
                    {editId ? 'Modify existing knowledge base content.' : 'Add a new challenge to the database.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">Category</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all font-medium"
                                value={formData.category}
                                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                placeholder="e.g. mid_term"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">Type</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none appearance-none transition-all font-bold cursor-pointer hover:bg-white/5"
                                    value={formData.type}
                                    onChange={e => {
                                        const newType = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            type: newType,
                                            options: newType === 'true_false' ? ['True', 'False'] : prev.options.length === 2 ? ['', '', '', ''] : prev.options
                                        }));
                                    }}
                                >
                                    <option value="mcq">Multiple Choice</option>
                                    <option value="true_false">True / False</option>
                                    <option value="essay">Essay / Open Ended</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">Question Image (Optional)</label>
                        <div className="flex items-center gap-4">
                            <div className="relative group w-24 h-24 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer hover:border-purple-500/50 transition-all">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                {formData.image_url ? (
                                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Upload className="text-gray-500 group-hover:text-purple-400" size={24} />
                                )}
                            </div>
                            {formData.image_url && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, image_url: '', image_file: null }))}
                                    className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-1"
                                >
                                    <Trash2 size={14} /> Remove
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">Question Text</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all font-medium leading-relaxed"
                            value={formData.question}
                            onChange={e => setFormData(prev => ({ ...prev, question: e.target.value }))}
                            placeholder="Enter the question here..."
                        />
                    </div>

                    {formData.type === 'mcq' || formData.type === 'true_false' ? (
                        <div className="space-y-4 border-t border-white/5 pt-6">
                            <label className="block text-xs font-bold uppercase text-purple-400 tracking-wider flex items-center gap-2">
                                Options <span className="text-gray-600 font-normal normal-case ml-auto text-[10px]">* Select correct answer</span>
                            </label>
                            {formData.options.map((opt, idx) => (
                                <div key={idx} className="flex gap-3 group">
                                    <div className="flex-none w-10 h-[52px] flex items-center justify-center bg-white/5 rounded-xl font-bold text-gray-500 border border-white/5">
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            required
                                            disabled={formData.type === 'true_false'}
                                            className={`w-full h-full bg-black/40 border border-white/10 rounded-xl px-4 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all ${formData.type === 'true_false' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={opt}
                                            onChange={e => handleOptionChange(idx, e.target.value)}
                                            placeholder={`Option ${idx + 1}`}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, answer: opt }))}
                                        className={`w-14 rounded-xl border flex items-center justify-center transition-all ${formData.answer === opt && opt !== ''
                                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20 border-emerald-500 text-white scale-105'
                                            : 'border-white/10 text-gray-600 hover:bg-white/5 hover:text-gray-400'
                                            }`}
                                        title="Mark as Correct Answer"
                                    >
                                        <CheckCircle size={20} className={formData.answer === opt && opt !== '' ? 'fill-current' : ''} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Model Answer (for AI)</label>
                            <textarea
                                rows={4}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all font-mono text-sm leading-relaxed"
                                value={formData.model_answer}
                                onChange={e => setFormData(prev => ({ ...prev, model_answer: e.target.value }))}
                                placeholder="Enter the ideal answer for evaluation..."
                            />
                        </div>
                    )}

                    <div className="pt-6 flex justify-end gap-3 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/40 disabled:opacity-50 hover:scale-105 active:scale-95"
                        >
                            {loading ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
