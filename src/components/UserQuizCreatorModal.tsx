import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, X, Save, Loader2, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

type QuestionType = 'mcq' | 'true_false' | 'essay';

interface DraftQuestion {
    id: string;
    type: QuestionType;
    question: string;
    options: string[];
    answer: string;
    model_answer: string;
}

interface Props {
    onClose: () => void;
    onSuccess?: () => void;
    mode?: 'modal' | 'page';
}

const createBlankQuestion = (): DraftQuestion => ({
    id: crypto.randomUUID(),
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    answer: '',
    model_answer: '',
});

export default function UserQuizCreatorModal({ onClose, onSuccess, mode = 'modal' }: Props) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [semesters, setSemesters] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(0);
    const [semesterId, setSemesterId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [questions, setQuestions] = useState<DraftQuestion[]>([createBlankQuestion()]);

    useEffect(() => {
        const loadMeta = async () => {
            setLoadingMeta(true);
            const [{ data: sems }, { data: subs }] = await Promise.all([
                supabase.from('semesters').select('*').order('id'),
                supabase.from('subjects').select('*').order('semester_id').order('name')
            ]);

            setSemesters(sems || []);
            setSubjects(subs || []);
            setLoadingMeta(false);
        };

        loadMeta();
    }, []);

    const filteredSubjects = useMemo(
        () => subjects.filter(subject => !semesterId || String(subject.semester_id) === String(semesterId)),
        [subjects, semesterId]
    );

    const answeredQuestions = useMemo(
        () => questions.filter(question => question.question.trim()).length,
        [questions]
    );

    const completionPercentage = questions.length === 0
        ? 0
        : Math.round((answeredQuestions / questions.length) * 100);

    const isPageMode = mode === 'page';

    const updateQuestion = (id: string, updates: Partial<DraftQuestion>) => {
        setQuestions(prev => prev.map(question => question.id === id ? { ...question, ...updates } : question));
    };

    const updateOption = (id: string, index: number, value: string) => {
        setQuestions(prev => prev.map(question => {
            if (question.id !== id) return question;
            const nextOptions = [...question.options];
            nextOptions[index] = value;
            const nextAnswer = question.answer === question.options[index] ? value : question.answer;
            return { ...question, options: nextOptions, answer: nextAnswer };
        }));
    };

    const addQuestion = () => setQuestions(prev => [...prev, createBlankQuestion()]);

    const removeQuestion = (id: string) => {
        setQuestions(prev => prev.length > 1 ? prev.filter(question => question.id !== id) : prev);
    };

    const validateQuestions = () => {
        for (const question of questions) {
            if (!question.question.trim()) return 'Each question needs text.';
            if (question.type === 'essay' && !question.model_answer.trim()) return 'Essay questions need a model answer.';
            if (question.type !== 'essay') {
                const normalizedOptions = question.type === 'true_false' ? ['True', 'False'] : question.options.map(option => option.trim()).filter(Boolean);
                if (normalizedOptions.length < 2) return 'Each objective question needs at least two options.';
                if (!question.answer.trim()) return 'Each objective question needs a correct answer.';
            }
        }
        return null;
    };

    const handleSubmit = async () => {
        if (!user) {
            showToast('Sign In Required', 'You need an account before you can submit a quiz.', 'warning');
            return;
        }

        if (!title.trim() || !semesterId || !subjectId) {
            showToast('Missing Data', 'Please choose a semester, subject, and title first.', 'warning');
            return;
        }

        const validationError = validateQuestions();
        if (validationError) {
            showToast('Quiz Incomplete', validationError, 'warning');
            return;
        }

        setSaving(true);

        try {
            const creatorName = user.user_metadata?.full_name || user.email || 'Unknown user';
            const finalDescription = [
                description.trim(),
                `Submitted by ${creatorName}`,
            ].filter(Boolean).join('\n\n');

            const { data: quiz, error: quizError } = await supabase
                .from('quizzes')
                .insert({
                    title: title.trim(),
                    description: finalDescription,
                    submitted_by: user.id,
                    subject_id: subjectId,
                    semester_id: Number(semesterId),
                    time_limit: timeLimit,
                    is_published: true,
                    is_private: true,
                    shuffle_questions: true,
                    shuffle_options: true,
                    access_code: accessCode.trim().toUpperCase() || null,
                })
                .select()
                .single();

            if (quizError) throw quizError;

            const questionRows = questions.map((question, index) => ({
                quiz_id: quiz.id,
                question: question.question.trim(),
                type: question.type === 'true_false' ? 'mcq' : question.type,
                options: question.type === 'essay'
                    ? null
                    : question.type === 'true_false'
                        ? ['True', 'False']
                        : question.options.map(option => option.trim()).filter(Boolean),
                answer: question.type === 'essay' ? null : question.answer.trim(),
                model_answer: question.type === 'essay' ? question.model_answer.trim() : null,
                category: 'user_submission',
                order: index + 1,
            }));

            const { error: questionError } = await supabase.from('questions').insert(questionRows);
            if (questionError) throw questionError;

            showToast('Quiz Published', 'Your quiz is now published as private by default.', 'success');
            onSuccess?.();
            onClose();
        } catch (error: any) {
            const message = error?.message?.includes('row-level security')
                ? 'Database policy is currently blocking user quiz submissions. An admin needs to allow inserts for signed-in users.'
                : error?.message || 'Failed to submit your quiz.';

            showToast('Submit Failed', message, 'error', 7000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={isPageMode ? 'relative z-10 mx-auto w-full max-w-6xl' : 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6'}>
            {!isPageMode && <div className="absolute inset-0 bg-[#05070a]/85 backdrop-blur-md" onClick={onClose} />}

            <div className={`relative w-full overflow-hidden rounded-[34px] border border-white/10 bg-[#090b10] ${isPageMode ? 'max-h-none shadow-[0_18px_70px_rgba(0,0,0,0.45)]' : 'max-h-[94vh] shadow-[0_30px_120px_rgba(0,0,0,0.65)]'}`}>
                <div className="pointer-events-none absolute -top-24 right-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-[120px]" />
                <div className="pointer-events-none absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-[120px]" />

                <div className="relative flex flex-col gap-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-transparent to-emerald-500/10 px-6 py-6 md:flex-row md:items-start md:justify-between md:px-8">
                    <div className="min-w-0">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                            <Lock size={12} />
                            Private By Default
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">Create Your Own Quiz</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                            Build your quiz with your own structure. Your submission is private by default once saved.
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300">
                                {questions.length} Questions
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300">
                                {completionPercentage}% Filled
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300">
                                {timeLimit > 0 ? `${timeLimit} Min Limit` : 'No Time Limit'}
                            </span>
                        </div>
                    </div>

                    <button onClick={onClose} className="self-start rounded-full p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white" aria-label={isPageMode ? 'Back' : 'Close'}>
                        <X size={20} />
                    </button>
                </div>

                <div className={`relative px-6 py-6 md:px-8 ${isPageMode ? '' : 'max-h-[calc(94vh-145px)] overflow-y-auto'}`}>
                    {loadingMeta ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                        </div>
                    ) : (
                        <div className="space-y-7">
                            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-300">Quiz Settings</h3>
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/80">Required before submit</span>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Semester</label>
                                    <select
                                        value={semesterId}
                                        onChange={e => {
                                            setSemesterId(e.target.value);
                                            setSubjectId('');
                                        }}
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500"
                                    >
                                        <option value="">Choose semester</option>
                                        {semesters.map(semester => (
                                            <option key={semester.id} value={semester.id}>{semester.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Subject</label>
                                    <select
                                        value={subjectId}
                                        onChange={e => setSubjectId(e.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500"
                                    >
                                        <option value="">Choose subject</option>
                                        {filteredSubjects.map(subject => (
                                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Quiz Title</label>
                                    <input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Midterm Revision Pack"
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Access Code Optional</label>
                                    <input
                                        value={accessCode}
                                        onChange={e => setAccessCode(e.target.value.replace(/[^a-zA-Z0-9# -]/g, ''))}
                                        placeholder="e.g. #mid24"
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</label>
                                    <textarea
                                        rows={4}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="What should the admin know about this quiz?"
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Time Limit</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={timeLimit}
                                        onChange={e => setTimeLimit(Number(e.target.value))}
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500"
                                    />
                                    <p className="text-xs text-gray-500">Use `0` for unlimited.</p>
                                </div>
                            </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-white">Questions</h3>
                                        <p className="text-sm text-gray-400">Design your questions and mark the correct answer for each one.</p>
                                    </div>
                                    <button
                                        onClick={addQuestion}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                                    >
                                        <Plus size={18} />
                                        Add Question
                                    </button>
                                </div>

                                {questions.map((question, index) => (
                                    <div key={question.id} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-sm font-black text-cyan-200">
                                                    {index + 1}
                                                </div>
                                                <div className="hidden sm:block text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Question {index + 1}</div>
                                                <select
                                                    value={question.type}
                                                    onChange={e => {
                                                        const nextType = e.target.value as QuestionType;
                                                        updateQuestion(question.id, {
                                                            type: nextType,
                                                            options: nextType === 'true_false' ? ['True', 'False'] : nextType === 'essay' ? [] : ['', '', '', ''],
                                                            answer: '',
                                                            model_answer: ''
                                                        });
                                                    }}
                                                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-500"
                                                >
                                                    <option value="mcq">Multiple Choice</option>
                                                    <option value="true_false">True / False</option>
                                                    <option value="essay">Essay</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(question.id)}
                                                disabled={questions.length === 1}
                                                className="rounded-2xl p-3 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <textarea
                                                rows={3}
                                                value={question.question}
                                                onChange={e => updateQuestion(question.id, { question: e.target.value })}
                                                placeholder="Write the question"
                                                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500"
                                            />

                                            {question.type === 'essay' ? (
                                                <textarea
                                                    rows={3}
                                                    value={question.model_answer}
                                                    onChange={e => updateQuestion(question.id, { model_answer: e.target.value })}
                                                    placeholder="Model answer"
                                                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500"
                                                />
                                            ) : (
                                                <div className="space-y-3">
                                                    {(question.type === 'true_false' ? ['True', 'False'] : question.options).map((option, optionIndex) => (
                                                        <div key={optionIndex} className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => updateQuestion(question.id, { answer: option })}
                                                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-black transition-all ${
                                                                    question.answer === option && option
                                                                        ? 'border-emerald-400 bg-emerald-500 text-white'
                                                                        : 'border-white/10 bg-black/40 text-gray-400 hover:border-emerald-400/40'
                                                                }`}
                                                                type="button"
                                                            >
                                                                {String.fromCharCode(65 + optionIndex)}
                                                            </button>
                                                            <input
                                                                value={option}
                                                                disabled={question.type === 'true_false'}
                                                                onChange={e => updateOption(question.id, optionIndex, e.target.value)}
                                                                placeholder={`Option ${optionIndex + 1}`}
                                                                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition-colors focus:border-cyan-500 disabled:opacity-70"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="sticky bottom-0 z-10 -mx-6 mt-2 border-t border-white/10 bg-[#090b10]/95 px-6 py-4 backdrop-blur md:-mx-8 md:px-8">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <p className="flex items-center gap-2 text-sm text-gray-400">
                                    <Sparkles size={16} className="text-blue-300" />
                                    Submitted quizzes are private by default.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300 md:inline-flex">
                                            <CheckCircle2 size={12} />
                                            {answeredQuestions}/{questions.length} Ready
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="rounded-2xl px-5 py-3 font-bold text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={saving}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-60"
                                        >
                                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            Publish Quiz
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
