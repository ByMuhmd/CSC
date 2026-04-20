import React, { useState } from 'react';
import { X, Sparkles, Clipboard, Loader2, Save, BookOpen, Clock } from 'lucide-react';
import { generateLessonFromTopic, splitTextIntoLessons, GeneratedLesson } from '../../services/gemini';

interface Props {
    onClose: () => void;
    onSuccess: (lessons: GeneratedLesson[]) => void;
}

export default function AdminLessonImportModal({ onClose, onSuccess }: Props) {
    const [mode, setMode] = useState<'ai' | 'paste'>('ai');
    const [loading, setLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [rawText, setRawText] = useState('');
    const [previewLessons, setPreviewLessons] = useState<GeneratedLesson[]>([]);
    const [step, setStep] = useState<'input' | 'preview'>('input');

    const handleGenerate = async () => {
        setLoading(true);
        try {
            let result;
            if (mode === 'ai') {
                result = await generateLessonFromTopic('', topic);
            } else {
                result = await splitTextIntoLessons('', rawText);
            }

            if (result.error) {
                alert(result.error);
            } else if (result.lessons) {
                setPreviewLessons(result.lessons);
                setStep('preview');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        onSuccess(previewLessons);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 md:p-8 pointer-events-auto">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
            <div className="relative w-full max-w-5xl bg-[#0B0D11] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 md:gap-4">
                            <Sparkles className="text-purple-400 shrink-0" /> <span className="truncate">Smart Lesson Importer</span>
                        </h2>
                        <p className="text-gray-400 text-xs md:text-sm mt-1 ml-1">Easily create multiple lessons using AI or raw text.</p>
                    </div>
                    <button onClick={onClose} className="p-2 md:p-3 hover:bg-white/10 rounded-2xl text-gray-400 transition-all hover:rotate-90">
                        <X size={24} className="md:w-7 md:h-7" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                    {step === 'input' ? (
                        <div className="space-y-6 md:y-8">
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit">
                                <button
                                    onClick={() => setMode('ai')}
                                    className={`px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${mode === 'ai' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    AI Generation
                                </button>
                                <button
                                    onClick={() => setMode('paste')}
                                    className={`px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${mode === 'paste' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Smart Paste
                                </button>
                            </div>

                            {mode === 'ai' ? (
                                <div className="space-y-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Lesson Topic</label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="e.g. Introduction to Quantum Physics"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white text-base md:text-lg focus:border-purple-500 outline-none transition-all"
                                    />
                                    <p className="text-[10px] md:text-xs text-gray-500">AI will generate a series of structured lessons based on this topic.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Paste Educational Content</label>
                                    <textarea
                                        value={rawText}
                                        onChange={(e) => setRawText(e.target.value)}
                                        placeholder="Paste your long text here..."
                                        className="w-full h-60 md:h-80 bg-white/5 border border-white/10 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white font-mono text-xs md:text-sm focus:border-purple-500 outline-none transition-all resize-none"
                                    />
                                    <p className="text-[10px] md:text-xs text-gray-500">AI will intelligently split this text into logical lessons.</p>
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={loading || (mode === 'ai' ? !topic : !rawText)}
                                className="w-full py-3 md:py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                                {mode === 'ai' ? 'Generate Lessons' : 'Split into Lessons'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base md:text-lg font-bold text-white">Preview Lessons ({previewLessons.length})</h3>
                                <button onClick={() => setStep('input')} className="text-xs md:text-sm text-purple-400 hover:underline">Go Back</button>
                            </div>
                            <div className="grid gap-4">
                                {previewLessons.map((lesson, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-6 hover:border-purple-500/30 transition-all group">
                                        <div className="flex justify-between items-start mb-3 md:mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-sm md:text-base">
                                                    {idx + 1}
                                                </div>
                                                <h4 className="text-base md:text-lg font-bold text-white leading-tight">{lesson.title}</h4>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-500 bg-black/40 px-2 md:px-3 py-1 rounded-full shrink-0">
                                                <Clock size={12} /> {lesson.duration}m
                                            </div>
                                        </div>
                                        <div 
                                            className="text-gray-400 text-xs md:text-sm line-clamp-3 prose prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: lesson.content }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {step === 'preview' && (
                    <div className="p-4 md:p-6 border-t border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-end gap-3 md:gap-4">
                        <button onClick={() => setStep('input')} className="px-6 md:px-8 py-2 md:py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors text-sm">Cancel</button>
                        <button 
                            onClick={handleConfirm}
                            className="px-6 md:px-8 py-2 md:py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all text-sm"
                        >
                            Import {previewLessons.length} Lessons
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
