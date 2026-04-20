import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    BookOpen, Plus, Edit, Trash2, Save, X, Layers, ChevronRight,
    ArrowLeft, FileText, Video, Youtube, HardDrive, Link as LinkIcon,
    ExternalLink, Search, Filter, Loader2, Edit2, ArrowUp, ArrowDown, Sparkles
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { courseService, CourseModule, CourseLesson } from '../../services/courseService';
import AdminLessonImportModal from './AdminLessonImportModal';
import { generateLessonFromTopic } from '../../services/gemini';

type ViewMode = 'semesters' | 'subjects' | 'content';
type TabMode = 'courseware' | 'resources';

export default function AdminMaterials() {
    const [view, setView] = useState<ViewMode>('semesters');
    const [selectedSemester, setSelectedSemester] = useState<any | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<any | null>(null);

    const handleSelectSemester = (semester: any) => {
        setSelectedSemester(semester);
        setView('subjects');
    };

    const handleSelectSubject = (subject: any) => {
        setSelectedSubject(subject);
        setView('content');
    };

    const goBack = () => {
        if (view === 'content') {
            setView('subjects');
            setSelectedSubject(null);
        } else if (view === 'subjects') {
            setView('semesters');
            setSelectedSemester(null);
        }
    };

    return (
        <div className="space-y-6 pb-20">

            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <span className={view === 'semesters' ? 'text-white font-bold' : 'cursor-pointer hover:text-white'} onClick={() => { setView('semesters'); setSelectedSemester(null); setSelectedSubject(null); }}>
                    Materials
                </span>
                {selectedSemester && (
                    <>
                        <ChevronRight size={14} />
                        <span className={view === 'subjects' ? 'text-white font-bold' : 'cursor-pointer hover:text-white'} onClick={() => { setView('subjects'); setSelectedSubject(null); }}>
                            {selectedSemester.title}
                        </span>
                    </>
                )}
                {selectedSubject && (
                    <>
                        <ChevronRight size={14} />
                        <span className="text-white font-bold">{selectedSubject.name}</span>
                    </>
                )}
            </div>

            {view === 'semesters' && (
                <SemesterList onSelect={handleSelectSemester} />
            )}

            {view === 'subjects' && selectedSemester && (
                <SubjectList semester={selectedSemester} onSelect={handleSelectSubject} onBack={goBack} />
            )}

            {view === 'content' && selectedSubject && (
                <SubjectContentManager subject={selectedSubject} semester={selectedSemester} onBack={goBack} />
            )}
        </div>
    );
}

function SemesterList({ onSelect }: { onSelect: (sem: any) => void }) {
    const [semesters, setSemesters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<any>({ id: '', title: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('semesters').select('*').order('id');
        if (data) setSemesters(data);
        setLoading(false);
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            if (editingId) {
                await supabase.from('semesters').update({ title: formData.title, description: formData.description }).eq('id', editingId);
            } else {
                await supabase.from('semesters').insert({ ...formData, id: parseInt(formData.id) });
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Failed to save.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Start by deleting all subjects in this semester first. Are you sure?')) return;
        await supabase.from('semesters').delete().eq('id', id);
        fetchData();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Semesters
                    </h1>
                    <p className="text-gray-400 mt-2">Select a semester to manage its subjects.</p>
                </div>
                <button onClick={() => { setEditingId(null); setFormData({ id: '', title: '', description: '' }); setShowModal(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-105">
                    <Plus size={18} /> Add Semester
                </button>
            </div>

            {loading ? <Loader2 className="animate-spin text-purple-500 mx-auto" /> : (
                <div className="grid gap-4">
                    {semesters.map(sem => (
                        <div key={sem.id}
                            onClick={() => onSelect(sem)}
                            className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex items-center justify-between hover:border-purple-500/30 transition-all cursor-pointer group">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Semester {sem.id}: {sem.title}</h3>
                                <p className="text-gray-500">{sem.description}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => { setEditingId(sem.id); setFormData(sem); setShowModal(true); }} className="p-2 hover:bg-white/10 rounded-lg text-blue-400"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(sem.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400"><Trash2 size={18} /></button>
                                </div>
                                <ChevronRight className="text-gray-600 group-hover:text-purple-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <Modal title={editingId ? 'Edit Semester' : 'Add Semester'} onClose={() => setShowModal(false)}>
                    <div className="space-y-4">
                        {!editingId && (
                            <Input label="Semester ID (Number)" value={formData.id} onChange={v => setFormData({ ...formData, id: v })} type="number" placeholder="e.g. 10" />
                        )}
                        <Input label="Title" value={formData.title} onChange={v => setFormData({ ...formData, title: v })} placeholder="e.g. First Semester" />
                        <Input label="Description" value={formData.description || ''} onChange={v => setFormData({ ...formData, description: v })} placeholder="Description..." isTextArea />
                        <div className="flex justify-end gap-3 pt-4">
                            <Button onClick={() => setShowModal(false)} variant="secondary">Cancel</Button>
                            <Button onClick={handleSave} loading={submitting}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function SubjectList({ semester, onSelect, onBack }: { semester: any, onSelect: (sub: any) => void, onBack: () => void }) {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({ id: '', name: '', icon_name: 'BookOpen', semester_id: semester.id, is_coming_soon: false });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchData(); }, [semester.id]);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('subjects').select('*').eq('semester_id', semester.id).order('name');
        if (data) setSubjects(data);
        setLoading(false);
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const payload = { ...formData, semester_id: semester.id, is_coming_soon: !!formData.is_coming_soon };
            if (editingId) {
                await supabase.from('subjects').update(payload).eq('id', editingId);
            } else {
                await supabase.from('subjects').insert(payload);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Failed to save subject.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        await supabase.from('subjects').delete().eq('id', id);
        fetchData();
    };

    const RenderIcon = ({ name }: { name: string }) => {
        const Icon = (LucideIcons as any)[name] || BookOpen;
        return <Icon size={24} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><ArrowLeft /></button>
                    <div>
                        <h1 className="text-4xl font-black text-white">{semester.title}</h1>
                        <p className="text-gray-400 mt-1">Subjects</p>
                    </div>
                </div>
                <button onClick={() => { setEditingId(null); setFormData({ id: '', name: '', icon_name: 'BookOpen', semester_id: semester.id, is_coming_soon: false }); setShowModal(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all">
                    <Plus size={18} /> Add Subject
                </button>
            </div>

            {loading ? <Loader2 className="animate-spin text-purple-500 mx-auto" /> : (
                <div className="grid gap-4">
                    {subjects.length === 0 && <div className="text-center text-gray-500 py-10">No subjects found. Add one to get started.</div>}
                    {subjects.map(sub => (
                        <div key={sub.id}
                            onClick={() => onSelect(sub)}
                            className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-purple-500/30 transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/5 flex items-center justify-center text-purple-400">
                                    <RenderIcon name={sub.icon_name} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{sub.name}</h3>
                                    <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">{sub.id}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => { setEditingId(sub.id); setFormData(sub); setShowModal(true); }} className="p-2 hover:bg-white/10 rounded-lg text-blue-400"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(sub.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400"><Trash2 size={18} /></button>
                                </div>
                                <ChevronRight className="text-gray-600 group-hover:text-purple-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <Modal title={editingId ? 'Edit Subject' : 'Add Subject'} onClose={() => setShowModal(false)}>
                    <div className="space-y-4">
                        <Input label="Name" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g. Calculus" />
                        <Input label="Slug ID (Unique)" value={formData.id} onChange={v => setFormData({ ...formData, id: v.toLowerCase().replace(/\s+/g, '-') })} disabled={!!editingId} placeholder="e.g. calculus" />
                        <Input label="Icon Name (Lucide)" value={formData.icon_name} onChange={v => setFormData({ ...formData, icon_name: v })} placeholder="e.g. Activity" />
                        <div className="pt-2">
                            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.is_coming_soon || false}
                                    onChange={e => setFormData({ ...formData, is_coming_soon: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-600 bg-black/40 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                                />
                                <span className="font-bold text-sm text-gray-300">Coming Soon Mode</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button onClick={() => setShowModal(false)} variant="secondary">Cancel</Button>
                            <Button onClick={handleSave} loading={submitting}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function SubjectContentManager({ subject, semester, onBack }: { subject: any, semester: any, onBack: () => void }) {
    const [activeTab, setActiveTab] = useState<TabMode>('courseware');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><ArrowLeft /></button>
                    <div>
                        <h1 className="text-3xl font-black text-white">{subject.name}</h1>
                        <p className="text-gray-400 mt-1">{semester?.title} • Content Manager</p>
                    </div>
                </div>
                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setActiveTab('courseware')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'courseware' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                        Courseware
                    </button>
                    <button onClick={() => setActiveTab('resources')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'resources' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                        Resources
                    </button>
                </div>
            </div>

            {activeTab === 'courseware' ? (
                <CoursewareManager subjectId={subject.id} />
            ) : (
                <ResourcesManager subjectId={subject.id} />
            )}
        </div>
    );
}

const TEMPLATES = {
    reading: `<div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" class="text-purple-400" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <h3 class="text-2xl font-bold text-white tracking-tight">Introduction</h3>
    </div>
    
    <div class="text-gray-300 leading-relaxed text-lg font-arabic mb-4 space-y-6" dir="rtl">
        <p>اكتب مقدمة الدرس هنا...</p>
    </div>
</div>`,
    video: `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/YOUR_VIDEO_ID" title="Video Player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
    quiz: JSON.stringify({
        instructions: `<p class="text-gray-300 text-lg mb-8 leading-relaxed">
    This quiz will test your understanding of the concepts covered in this module. 
    Make sure you have reviewed the material thoroughly before starting.
</p>
<div class="bg-white/5 p-4 rounded-xl border border-white/10 text-left space-y-2 mb-8">
    <div class="flex items-center gap-2 text-gray-400">
        <span class="text-purple-400">●</span> <span class="text-white">Multiple Choice & Essay</span>
    </div>
    <div class="flex items-center gap-2 text-gray-400">
        <span class="text-purple-400">●</span> 80% Passing Score
    </div>
</div>`,
        questions: [
            {
                question: "What is the capital of France?",
                type: "multiple_choice",
                options: ["London", "Berlin", "Paris", "Madrid"],
                correctAnswer: 2
            },
            {
                question: "Explain the importance of reactive programming.",
                type: "essay",
                modelAnswer: "Reactive programming allows for efficient data handling..."
            }
        ]
    }, null, 2)
};

interface QuizQuestion {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
}

function CoursewareManager({ subjectId }: { subjectId: string }) {
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingModule, setEditingModule] = useState<Partial<CourseModule> | null>(null);
    const [editingLesson, setEditingLesson] = useState<Partial<CourseLesson> | null>(null);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);

    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({ id: '', text: '', options: ['', '', '', ''], correctAnswer: '' });

    useEffect(() => {
        fetchContent();
        fetchQuizzes();
    }, [subjectId]);

    const fetchQuizzes = async () => {

        const { data, error } = await supabase.from('quizzes').select('*').eq('subject_id', subjectId).order('created_at', { ascending: false });
        if (error) console.error('Error fetching quizzes:', error);
        if (data) setAvailableQuizzes(data);
    };

    useEffect(() => {
        if (editingLesson?.type === 'quiz' && editingLesson.content_html) {
            try {
                const parsed = JSON.parse(editingLesson.content_html);
                if (parsed.questions && Array.isArray(parsed.questions)) {
                    setQuizQuestions(parsed.questions);
                } else {
                    setQuizQuestions([]);
                }
            } catch (e) {

                setQuizQuestions([]);
            }
        } else {
            setQuizQuestions([]);
        }
    }, [editingLesson]);

    const fetchContent = async () => {
        setLoading(true);
        try {
            const data = await courseService.getCourseContent(subjectId);
            setModules(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveModule = async () => {
        try {
            if (editingModule?.id) {
                await courseService.updateModule(editingModule.id, { title: editingModule.title, order_index: editingModule.order_index });
            } else {
                await courseService.createModule({
                    subject_id: subjectId,
                    title: editingModule?.title || 'New Module',
                    order_index: modules.length
                });
            }
            setIsModuleModalOpen(false);
            fetchContent();
        } catch (e) { alert('Error saving module'); }
    };

    const handleDeleteModule = async (id: string) => {
        if (!confirm('Delete module and lessons?')) return;
        await courseService.deleteModule(id);
        fetchContent();
    };

    const handleSaveLesson = async () => {
        if (!editingModule?.id) return;

        let contentToSave = editingLesson?.content_html || '';

        if (editingLesson?.type === 'quiz') {



        }

        try {
            if (editingLesson?.id) {
                await courseService.updateLesson(editingLesson.id, { ...editingLesson, content_html: contentToSave });
            } else {
                await courseService.createLesson({
                    module_id: editingModule.id!,
                    title: editingLesson?.title || 'New Lesson',
                    content_html: contentToSave,
                    duration: editingLesson?.duration || 5,
                    type: editingLesson?.type || 'text',
                    order_index: editingLesson?.order_index || 0
                });
            }
            setIsLessonModalOpen(false);
            fetchContent();
        } catch (e) { alert('Error saving lesson'); }
    };

    const handleDeleteLesson = async (id: string) => {
        if (!confirm('Delete lesson?')) return;
        await courseService.deleteLesson(id);
        fetchContent();
    };

    const handleMoveLesson = async (lessonId: string, direction: 'up' | 'down', moduleId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module || !module.lessons) return;

        const currentIndex = module.lessons.findIndex(l => l.id === lessonId);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= module.lessons.length) return;

        const currentLesson = module.lessons[currentIndex];
        const targetLesson = module.lessons[targetIndex];

        const newModules = [...modules];
        const modIndex = newModules.findIndex(m => m.id === moduleId);
        newModules[modIndex].lessons![currentIndex] = targetLesson;
        newModules[modIndex].lessons![targetIndex] = currentLesson;
        setModules(newModules);

        try {

            await Promise.all([
                courseService.updateLesson(currentLesson.id, { order_index: targetLesson.order_index }),
                courseService.updateLesson(targetLesson.id, { order_index: currentLesson.order_index })
            ]);

            fetchContent();
        } catch (error) {
            console.error('Failed to move lesson', error);
            alert('Failed to move lesson');
            fetchContent();
        }
    };

    const loadTemplate = (type: 'reading' | 'video' | 'quiz') => {
        if (!editingLesson) return;
        if (type === 'video') {
            const url = window.prompt("YouTube URL:");
            if (!url) return;
            const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^#&?]*)/)?.[1];
            if (videoId) {
                setEditingLesson({ ...editingLesson, content_html: TEMPLATES.video.replace('YOUR_VIDEO_ID', videoId), type: 'video' });
            }
        } else if (type === 'quiz') {
            if (confirm('This will overwrite current content. Continue?')) {
                setEditingLesson({ ...editingLesson, content_html: TEMPLATES.quiz, type: 'quiz' });
            }
        } else {
            setEditingLesson({ ...editingLesson, content_html: TEMPLATES[type], type: 'text' });
        }
    };

    const handleAIGenerateContent = async () => {
        if (!editingLesson?.title) return alert('Please enter a lesson title first');
        setAiGenerating(true);
        try {
            const result = await generateLessonFromTopic('', editingLesson.title, 'educational and detailed');
            if (result.error) alert(result.error);
            else if (result.lessons && result.lessons.length > 0) {
                setEditingLesson({ ...editingLesson, content_html: result.lessons[0].content });
            }
        } finally {
            setAiGenerating(false);
        }
    };

    const handleBulkImport = async (generatedLessons: any[]) => {
        if (!editingModule?.id) return;
        setLoading(true);
        try {
            const startOrder = modules.find(m => m.id === editingModule.id)?.lessons?.length || 0;
            await Promise.all(generatedLessons.map((l, idx) => 
                courseService.createLesson({
                    module_id: editingModule.id!,
                    title: l.title,
                    content_html: l.content,
                    duration: l.duration || 10,
                    type: 'text',
                    order_index: startOrder + idx
                })
            ));
            fetchContent();
        } catch (e) { alert('Error importing lessons'); }
        finally { setLoading(false); }
    };

    const isExternalQuiz = (html: string | undefined) => {
        if (!html) return false;
        return html.includes('"url":') || html.startsWith('http') || html.includes('docs.google.com');
    };

    const setQuizMode = (mode: 'internal' | 'external') => {
        if (!editingLesson) return;
        if (mode === 'internal') {
            setEditingLesson({ ...editingLesson, content_html: '' });
        } else {
            setEditingLesson({ ...editingLesson, content_html: JSON.stringify({ url: '', type: 'external' }) });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Modules & Lessons</h3>
                <Button onClick={() => { setEditingModule({ title: '', order_index: modules.length }); setIsModuleModalOpen(true); }}>
                    <Plus size={16} /> Add Module
                </Button>
            </div>

            {loading ? <Loader2 className="animate-spin text-purple-500 mx-auto" /> : (
                <div className="space-y-4">
                    {modules.length === 0 && <div className="text-gray-500 text-center py-10 border border-dashed border-white/10 rounded-xl">No modules yet.</div>}
                    {modules.map(module => (
                        <div key={module.id} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all">
                            <div className="p-4 flex items-center justify-between bg-black/20">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><BookOpen size={20} /></div>
                                    <h3 className="font-bold text-white text-lg">{module.title}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setEditingModule(module); setIsModuleModalOpen(true); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteModule(module.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400"><Trash2 size={16} /></button>
                                    <button onClick={() => { setEditingModule(module); setEditingLesson({ module_id: module.id, title: '', content_html: '', type: 'text', duration: 10, order_index: (module.lessons?.length || 0) }); setIsLessonModalOpen(true); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-bold uppercase ml-2 transition-all">
                                        <Plus size={14} /> Add Lesson
                                    </button>
                                    <button onClick={() => { setEditingModule(module); setIsImportModalOpen(true); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-xs font-bold uppercase text-purple-400 transition-all">
                                        <Sparkles size={14} /> Smart Import
                                    </button>
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                {module.lessons?.map(lesson => (
                                    <div key={lesson.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 group transition-colors ml-4 border-l-2 border-transparent hover:border-blue-500/30">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg ${lesson.type === 'video' ? 'bg-red-500/10 text-red-400' : 'bg-gray-700/30 text-gray-400'}`}>
                                                {lesson.type === 'video' ? <Video size={14} /> : <FileText size={14} />}
                                            </div>
                                            <span className="text-gray-300 font-medium">{lesson.title}</span>
                                            <span className="text-xs text-gray-600 bg-black/30 px-2 py-0.5 rounded">{lesson.duration}m</span>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex flex-col gap-1 mr-2">
                                                <button
                                                    onClick={() => handleMoveLesson(lesson.id, 'up', module.id)}
                                                    disabled={lesson === module.lessons?.[0]}
                                                    className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <ArrowUp size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveLesson(lesson.id, 'down', module.id)}
                                                    disabled={lesson === module.lessons?.[module.lessons.length - 1]}
                                                    className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <ArrowDown size={12} />
                                                </button>
                                            </div>
                                            <button onClick={() => { setEditingModule(module); setEditingLesson(lesson); setIsLessonModalOpen(true); }} className="text-gray-500 hover:text-white"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDeleteLesson(lesson.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModuleModalOpen && (
                <Modal title={editingModule?.id ? 'Edit Module' : 'Add Module'} onClose={() => setIsModuleModalOpen(false)}>
                    <div className="space-y-4">
                        <Input label="Title" value={editingModule?.title || ''} onChange={v => setEditingModule({ ...editingModule, title: v })} placeholder="e.g. Week 1" />
                        <Input label="Order Index" value={editingModule?.order_index || 0} onChange={v => setEditingModule({ ...editingModule, order_index: parseInt(v) })} type="number" />
                        <div className="flex justify-end gap-3 pt-4">
                            <Button onClick={() => setIsModuleModalOpen(false)} variant="secondary">Cancel</Button>
                            <Button onClick={handleSaveModule}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {isLessonModalOpen && (
                <Modal title={editingLesson?.id ? 'Edit Lesson' : 'Add Lesson'} onClose={() => setIsLessonModalOpen(false)} size="lg">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Input label="Title" value={editingLesson?.title || ''} onChange={v => setEditingLesson({ ...editingLesson, title: v })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Type</label>
                            <select value={editingLesson?.type || 'text'} onChange={e => setEditingLesson({ ...editingLesson, type: e.target.value as any })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                                <option value="text">Text / Reading</option>
                                <option value="video">Video</option>
                                <option value="quiz">Quiz</option>
                            </select>
                        </div>
                        <div>
                            <Input label="Duration (m)" value={editingLesson?.duration || 5} onChange={v => setEditingLesson({ ...editingLesson, duration: parseInt(v) })} type="number" />
                        </div>

                        {editingLesson?.type === 'quiz' ? (
                            <div className="col-span-2 space-y-4">
                                <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl">
                                    <h5 className="font-bold text-purple-400 mb-2">Link to Interactive Quiz</h5>
                                    <p className="text-xs text-gray-400 mb-4">Select an existing quiz to link to this lesson. Use the Quiz Manager to create them.</p>

                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500"
                                        value={(() => {
                                            try {
                                                const parsed = JSON.parse(editingLesson.content_html || '{}');
                                                return parsed.quiz_id || '';
                                            } catch { return ''; }
                                        })()}
                                        onChange={e => {
                                            const quizId = e.target.value;
                                            const quiz = availableQuizzes.find(q => q.id === quizId);
                                            const payload = JSON.stringify({
                                                quiz_id: quizId,
                                                title: quiz?.title || editingLesson.title,
                                                type: 'internal_quiz'
                                            });
                                            setEditingLesson({ ...editingLesson, content_html: payload });
                                        }}
                                    >
                                        <option value="">Select a Quiz...</option>
                                        {availableQuizzes.map(q => (
                                            <option key={q.id} value={q.id}>{q.title} ({q.questions_count || 0} Qs)</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="border-t border-white/10 pt-4">
                                    <h5 className="font-bold text-xs uppercase text-gray-500 mb-2">Or Use External Link</h5>
                                    <Input
                                        label="External Quiz URL"
                                        value={isExternalQuiz(editingLesson.content_html) ? (JSON.parse(editingLesson.content_html || '{}').url || editingLesson.content_html) : ''}
                                        onChange={v => {
                                            const payload = JSON.stringify({ url: v, type: 'external' });
                                            setEditingLesson({ ...editingLesson, content_html: payload });
                                        }}
                                        placeholder="https://docs.google.com/forms/..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="col-span-2">
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex justify-between items-center bg-transparent">
                                    <span>Content (HTML/Markdown/JSON)</span>
                                    <div className="flex gap-2">
                                        <button onClick={handleAIGenerateContent} disabled={aiGenerating} className="flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/20 px-2 rounded hover:bg-emerald-500/10 disabled:opacity-50">
                                            {aiGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                            Write with AI
                                        </button>
                                        <button onClick={() => loadTemplate('reading')} className="text-[10px] text-purple-400 border border-purple-500/20 px-2 rounded hover:bg-purple-500/10">Reading</button>
                                        <button onClick={() => loadTemplate('video')} className="text-[10px] text-blue-400 border border-blue-500/20 px-2 rounded hover:bg-blue-500/10">Video</button>
                                    </div>
                                </label>

                                <textarea
                                    value={editingLesson?.content_html || ''}
                                    onChange={e => setEditingLesson({ ...editingLesson!, content_html: e.target.value })}
                                    className={`w-full h-80 bg-black/50 border rounded-xl px-4 py-3 text-white font-mono text-sm outline-none resize-none border-white/10`}
                                    placeholder="Content goes here..."
                                />
                            </div>
                        )}

                        <div className="col-span-2 flex justify-end gap-3 pt-4 border-t border-white/10">
                            <Button onClick={() => setIsLessonModalOpen(false)} variant="secondary">Cancel</Button>
                            <Button onClick={handleSaveLesson}>Save Lesson</Button>
                        </div>
                    </div>
                </Modal>
            )}
            {isImportModalOpen && (
                <AdminLessonImportModal 
                    onClose={() => setIsImportModalOpen(false)} 
                    onSuccess={handleBulkImport} 
                />
            )}
        </div>
    );
}

function ResourcesManager({ subjectId }: { subjectId: string }) {
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: '', type: 'pdf', category: 'resource', url: '', subject_id: subjectId });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchData(); }, [subjectId]);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('materials').select('*').eq('subject_id', subjectId).order('created_at', { ascending: false });
        if (data) setMaterials(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.url) return alert('Fill required fields');
        setSubmitting(true);
        try {
            if (editingId) {
                await supabase.from('materials').update(formData).eq('id', editingId);
            } else {
                await supabase.from('materials').insert(formData);
            }
            setShowModal(false);
            fetchData();
        } catch (e) { alert('Error saving'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete material?')) return;
        await supabase.from('materials').delete().eq('id', id);
        fetchData();
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'youtube': return <Youtube size={18} className="text-red-400" />;
            case 'drive': return <HardDrive size={18} className="text-blue-400" />;
            case 'pdf': return <FileText size={18} className="text-red-400" />;
            case 'video': return <Video size={18} className="text-purple-400" />;
            default: return <LinkIcon size={18} className="text-gray-400" />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Resources & Files</h3>
                <Button onClick={() => { setEditingId(null); setFormData({ title: '', type: 'pdf', category: 'resource', url: '', subject_id: subjectId }); setShowModal(true); }}>
                    <Plus size={16} /> Add Material
                </Button>
            </div>

            {loading ? <Loader2 className="animate-spin text-purple-500 mx-auto" /> : (
                <div className="grid gap-4">
                    {materials.length === 0 && <div className="text-gray-500 text-center py-10 border border-dashed border-white/10 rounded-xl">No resources found.</div>}
                    {materials.map(item => (
                        <div key={item.id} className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-500/30 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                    {getIconForType(item.type)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">{item.title}</h3>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${item.category === 'exam' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                                            {item.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">{item.url} <ExternalLink size={10} /></a>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingId(item.id); setFormData(item); setShowModal(true); }} className="p-2 hover:bg-white/10 rounded-lg text-blue-400"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <Modal title={editingId ? 'Edit Material' : 'Add Material'} onClose={() => setShowModal(false)}>
                    <div className="space-y-4">
                        <Input label="Title" value={formData.title} onChange={v => setFormData({ ...formData, title: v })} placeholder="e.g. Syllabus" />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none">
                                    <option value="pdf">PDF Document</option>
                                    <option value="drive">Google Drive</option>
                                    <option value="youtube">YouTube Video</option>
                                    <option value="video">Direct Video</option>
                                    <option value="link">External Link</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none">
                                    <option value="resource">Resource</option>
                                    <option value="exam">Exam / Quiz</option>
                                    <option value="lecture">Lecture</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <Input label="URL" value={formData.url} onChange={v => setFormData({ ...formData, url: v })} placeholder="https://..." />
                        <div className="flex justify-end gap-3 pt-4">
                            <Button onClick={() => setShowModal(false)} variant="secondary">Cancel</Button>
                            <Button onClick={handleSave} loading={submitting}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function Modal({ title, children, onClose, size = 'md' }: { title: string, children: React.ReactNode, onClose: () => void, size?: 'md' | 'lg' }) {
    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 pointer-events-auto">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
            <div className={`relative bg-[#0F1115] border border-white/10 rounded-[2rem] w-full ${size === 'lg' ? 'max-w-4xl' : 'max-w-xl'} shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden`}>
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h2 className="text-2xl font-black text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all hover:rotate-90"><X size={24} /></button>
                </div>
                <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">{children}</div>
            </div>
        </div>
    );
}

function Input({ label, value, onChange, placeholder, type = 'text', disabled, isTextArea }: any) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
            {isTextArea ? (
                <textarea value={value} onChange={e => onChange(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500/50 outline-none h-24" placeholder={placeholder} disabled={disabled} />
            ) : (
                <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500/50 outline-none" placeholder={placeholder} disabled={disabled} />
            )}
        </div>
    );
}

function Button({ children, onClick, variant = 'primary', loading }: any) {
    return (
        <button onClick={onClick} disabled={loading} className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors ${variant === 'primary' ? 'bg-purple-600 text-white hover:bg-purple-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            {loading && <Loader2 className="animate-spin" size={16} />}
            {children}
        </button>
    );
}
