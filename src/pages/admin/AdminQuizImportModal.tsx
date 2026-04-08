import React, { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, FileText, CheckCircle, AlertTriangle, Download, Loader2, Save, Sparkles, Clipboard } from 'lucide-react';
import { generateQuizFromTopic, parseQuizFromText, GeneratedQuestion } from '../../services/gemini';
import { MathRenderer as FormattedText } from '../../components/MathRenderer';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
    subjectId: string;
    semesterId: number;
    targetQuizId?: string;
    initialMode?: 'csv' | 'ai';
}

export default function AdminQuizImportModal({ onClose, onSuccess, subjectId, semesterId, targetQuizId, initialMode = 'ai' }: Props) {
    const [mode, setMode] = useState<'csv' | 'ai'>(initialMode);
    const [loading, setLoading] = useState(false);

    const [quizTitle, setQuizTitle] = useState('');

    const [csvStep, setCsvStep] = useState<'upload' | 'preview'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [aiStep, setAiStep] = useState<'input' | 'preview'>('input');
    const [aiMode, setAiMode] = useState<'topic' | 'paste'>('topic');
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [count, setCount] = useState(5);
    const [rawText, setRawText] = useState('');
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

    const downloadTemplate = () => {
        const headers = ['Question,Type,Options (semicolon separated),Correct Answer,Points'];
        const example1 = ['"What is 2+2?",mcq,"3;4;5;6",4,1'];
        const example2 = ['"Explain the theory of relativity.",essay,,E=mc^2 explanation...,5'];
        const csvContent = [headers, example1, example2].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quiz_import_template.csv';
        a.click();
    };

    const parseCSV = (currentFile: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            const data: any[] = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const row = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(val => val.replace(/^"|"$/g, '').trim()) || [];
                if (row.length < 2) continue;

                const question = row[0];
                const type = row[1]?.toLowerCase() || 'mcq';
                const optionsRaw = row[2] || '';
                const answer = row[3] || '';
                const points = parseInt(row[4] || '1', 10);
                const options = optionsRaw.split(';').map(o => o.trim()).filter(Boolean);

                data.push({
                    question,
                    type,
                    options: options.length > 0 ? options : ['', '', '', ''],
                    answer,
                    points,
                    isValid: !!question && (type === 'essay' || (type === 'mcq' && options.length >= 2 && !!answer))
                });
            }

            setParsedData(data);
            setCsvStep('preview');
            if (!quizTitle.trim()) {
                setQuizTitle(currentFile.name.replace('.csv', ''));
            }
        };
        reader.readAsText(currentFile);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const nextFile = e.target.files[0];
            setFile(nextFile);
            parseCSV(nextFile);
        }
    };

    const saveQuestions = async (questionsPayload: any[], fallbackTitle: string, sourceLabel: string) => {
        let quizId = targetQuizId;

        if (!quizId) {
            const { data: quiz, error: quizError } = await supabase
                .from('quizzes')
                .insert({
                    title: quizTitle || fallbackTitle,
                    description: sourceLabel,
                    subject_id: subjectId,
                    semester_id: semesterId,
                    is_published: false,
                    time_limit: 0
                })
                .select()
                .single();

            if (quizError) throw quizError;
            quizId = quiz.id;
        }

        const { error: qError } = await supabase.from('questions').insert(
            questionsPayload.map((item, idx) => ({ ...item, quiz_id: quizId, order: idx + 1 }))
        );
        if (qError) throw qError;
    };

    const handleImportCSV = async () => {
        if ((!targetQuizId && !quizTitle) || parsedData.filter(d => d.isValid).length === 0) return;
        setLoading(true);

        try {
            const questions = parsedData
                .filter(item => item.isValid)
                .map((item) => ({
                    question: item.question,
                    type: item.type === 'essay' ? 'essay' : 'mcq',
                    options: item.type === 'mcq' ? item.options : null,
                    answer: item.type === 'mcq' ? item.answer : null,
                    model_answer: item.type === 'essay' ? item.answer : null,
                    points: item.points
                }));

            await saveQuestions(questions, file?.name?.replace('.csv', '') || 'Imported Quiz', `Imported from ${file?.name || 'CSV file'}`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Import failed:', error);
            alert(`Import failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAI = async () => {
        setLoading(true);
        const apiKey = '';

        try {
            let result;
            if (aiMode === 'topic') {
                if (!topic.trim()) return;
                if (!quizTitle.trim()) {
                    setQuizTitle(`${topic} (${difficulty})`);
                }
                result = await generateQuizFromTopic(apiKey, topic, count, difficulty);
            } else {
                if (!rawText.trim()) return;
                if (!quizTitle.trim()) {
                    setQuizTitle('Smart Paste Quiz');
                }
                result = await parseQuizFromText(apiKey, rawText);
            }

            if (result.error) {
                alert('AI Error: ' + result.error);
            } else {
                setGeneratedQuestions(result.questions);
                setAiStep('preview');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAI = async () => {
        if ((!targetQuizId && !quizTitle) || generatedQuestions.length === 0) return;
        setLoading(true);

        try {
            const questions = generatedQuestions.map((item) => ({
                question: item.question,
                type: item.type,
                options: item.options || null,
                answer: item.type === 'mcq' ? item.answer : null,
                model_answer: item.type === 'essay' ? item.answer : null,
                points: 1
            }));

            await saveQuestions(
                questions,
                aiMode === 'topic' ? `${topic} (${difficulty})` : 'Smart Paste Quiz',
                `Generated by AI (${aiMode === 'topic' ? 'From Topic' : 'Smart Paste'})`
            );

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Save failed:', error);
            alert('Save failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const canCloseFromBack = mode === 'csv' ? csvStep === 'upload' : aiStep === 'input';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#0F1115] border border-white/10 rounded-3xl w-full max-w-5xl shadow-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-900/10 to-transparent rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
                            {mode === 'ai' ? <Sparkles size={22} /> : <FileText size={22} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Quiz Import Center</h2>
                            <p className="text-gray-400 text-sm">Generate with AI or import from CSV.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-white/5">
                    <button
                        onClick={() => setMode('ai')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'ai' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <span className="inline-flex items-center gap-2"><Sparkles size={14} /> AI Generator</span>
                    </button>
                    <button
                        onClick={() => setMode('csv')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'csv' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <span className="inline-flex items-center gap-2"><Upload size={14} /> CSV Import</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {mode === 'csv' ? (
                        csvStep === 'upload' ? (
                            <div className="flex flex-col items-center justify-center h-full py-10 space-y-6">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full max-w-lg h-60 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-white/5 transition-all group"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="text-blue-400" size={30} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Click to upload CSV</h3>
                                    <p className="text-gray-500 text-sm mt-2">or drag and drop file here</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <button
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white text-sm font-bold transition-all"
                                >
                                    <Download size={16} />
                                    Download Template
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {!targetQuizId && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quiz Title</label>
                                            <input
                                                type="text"
                                                value={quizTitle}
                                                onChange={(e) => setQuizTitle(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none"
                                                placeholder="e.g. Imported Quiz 1"
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 pt-6">
                                        <div className="text-sm">
                                            <span className="text-gray-400">Total Rows:</span>
                                            <span className="text-white font-bold ml-2">{parsedData.length}</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-gray-400">Valid:</span>
                                            <span className="text-emerald-400 font-bold ml-2">{parsedData.filter(d => d.isValid).length}</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-gray-400">Invalid:</span>
                                            <span className="text-red-400 font-bold ml-2">{parsedData.filter(d => !d.isValid).length}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-white/10 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white/5 text-gray-400 font-bold uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Question</th>
                                                <th className="px-4 py-3">Type</th>
                                                <th className="px-4 py-3">Options</th>
                                                <th className="px-4 py-3">Answer</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {parsedData.map((row, idx) => (
                                                <tr key={idx} className={`hover:bg-white/5 ${!row.isValid ? 'bg-red-500/5' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        {row.isValid ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-red-500" />}
                                                    </td>
                                                    <td className="px-4 py-3 text-white max-w-xs truncate" title={row.question}>{row.question}</td>
                                                    <td className="px-4 py-3 text-gray-400">{row.type}</td>
                                                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={row.options.join('; ')}>{row.type === 'mcq' ? row.options.join(', ') : '-'}</td>
                                                    <td className="px-4 py-3 text-blue-300 max-w-[100px] truncate">{row.answer}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        aiStep === 'input' ? (
                            <div className="space-y-8 max-w-2xl mx-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setAiMode('topic')}
                                        className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all ${aiMode === 'topic' ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        <Sparkles size={30} />
                                        <span className="font-bold">Generate from Topic</span>
                                    </button>
                                    <button
                                        onClick={() => setAiMode('paste')}
                                        className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all ${aiMode === 'paste' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        <Clipboard size={30} />
                                        <span className="font-bold">Smart Paste</span>
                                    </button>
                                </div>

                                {aiMode === 'topic' ? (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-gray-500">Topic</label>
                                            <input
                                                type="text"
                                                value={topic}
                                                onChange={e => setTopic(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 outline-none text-lg font-bold"
                                                placeholder="e.g. Operating System Deadlocks"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-gray-500">Difficulty</label>
                                                <select
                                                    value={difficulty}
                                                    onChange={e => setDifficulty(e.target.value as any)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 outline-none appearance-none"
                                                >
                                                    <option value="easy">Easy</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="hard">Hard</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-gray-500">Question Count</label>
                                                <input
                                                    type="number"
                                                    value={count}
                                                    onChange={e => setCount(Number(e.target.value))}
                                                    min={1}
                                                    max={20}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Raw Text Content</label>
                                        <textarea
                                            value={rawText}
                                            onChange={e => setRawText(e.target.value)}
                                            rows={10}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 outline-none font-mono text-sm leading-relaxed"
                                            placeholder="Paste your questions here..."
                                            autoFocus
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerateAI}
                                    disabled={loading || (aiMode === 'topic' ? !topic.trim() : !rawText.trim())}
                                    className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-50 ${aiMode === 'topic' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                                    {loading ? 'Generating...' : 'Generate Questions'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    {!targetQuizId && (
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs font-bold uppercase text-gray-500">Quiz Title</label>
                                            <input
                                                type="text"
                                                value={quizTitle}
                                                onChange={e => setQuizTitle(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none font-bold"
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center pt-6 gap-4">
                                        <div className="text-sm font-bold text-gray-400">
                                            Found <span className="text-white">{generatedQuestions.length}</span> questions
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {generatedQuestions.map((q, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 flex gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-gray-500 font-bold shrink-0">{idx + 1}</div>
                                            <div className="flex-1 space-y-2">
                                                <div className="font-bold text-white"><FormattedText text={q.question} /></div>

                                                {q.type === 'mcq' && q.options ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {q.options.map((opt, i) => (
                                                            <div key={i} className={`text-sm px-3 py-2 rounded-lg border ${opt === q.answer ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/20 border-white/5 text-gray-400'}`}>
                                                                <FormattedText text={opt} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-400 italic border-l-2 border-white/10 pl-3">
                                                        Model Answer: <FormattedText text={q.answer} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0F1115]">
                    <button
                        onClick={() => {
                            if (mode === 'csv' && csvStep === 'preview') {
                                setCsvStep('upload');
                                return;
                            }
                            if (mode === 'ai' && aiStep === 'preview') {
                                setAiStep('input');
                                return;
                            }
                            onClose();
                        }}
                        className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        {canCloseFromBack ? 'Cancel' : 'Back'}
                    </button>

                    {mode === 'csv' && csvStep === 'preview' && (
                        <button
                            onClick={handleImportCSV}
                            disabled={loading || (!targetQuizId && !quizTitle.trim()) || parsedData.filter(d => d.isValid).length === 0}
                            className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Import Quiz
                        </button>
                    )}

                    {mode === 'ai' && aiStep === 'preview' && (
                        <button
                            onClick={handleSaveAI}
                            disabled={loading || (!targetQuizId && !quizTitle.trim())}
                            className="px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Quiz
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
