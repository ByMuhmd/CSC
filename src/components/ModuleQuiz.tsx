import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle, ArrowRight, Clock, Trophy, Sparkles, XCircle, Flag, Send } from 'lucide-react';
import { evaluateEssay } from '../services/gemini';
import { feedbackService } from '../services/feedbackService';

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] group relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
            {children}
        </div>
    </div>
);

interface ModuleQuizProps {
    questions: any[];
    onPass: () => void;
    onExplain: (q: string, a: string, u: string) => void;
    onClose: () => void;
    onAttempt?: (score: number, total: number) => void;
    quizTitle?: string;
    subjectName?: string;
}

export default function ModuleQuiz({ questions, onPass, onExplain, onClose, onAttempt, quizTitle, subjectName }: ModuleQuizProps) {
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [submitted, setSubmitted] = useState(false);
    const [passed, setPassed] = useState(false);
    const [explaining, setExplaining] = useState<number | null>(null);
    const [evaluating, setEvaluating] = useState<number | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [essayResults, setEssayResults] = useState<Record<number, { correct: boolean; feedback: string }>>({});
    const [quizStarted, setQuizStarted] = useState(false);
    const [honorCodeAccepted, setHonorCodeAccepted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30 * 60);
    const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportType, setReportType] = useState('bug');
    const [reportText, setReportText] = useState('');
    const [isReporting, setIsReporting] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [reportingQuestionIndex, setReportingQuestionIndex] = useState<number | null>(null);

    const handleReportSubmit = async () => {
        if (!reportText.trim() || reportingQuestionIndex === null) return;

        setIsReporting(true);
        try {
            const currentQ = shuffledQuestions[reportingQuestionIndex];
            const userAnswerIdx = answers[reportingQuestionIndex];
            const userAnswer = currentQ.type === 'essay' ? answers[reportingQuestionIndex] : (userAnswerIdx !== undefined ? currentQ.options[userAnswerIdx] : 'Skipped');
            const correctAnswer = currentQ.type === 'essay' ? 'See Model Answer' : currentQ.options[currentQ.correctAnswer];

            const message = `
Module Quiz Report:
-------------------
Quiz: ${quizTitle || 'Module Quiz'}
Subject: ${subjectName || 'N/A'}
Question: ${currentQ.question}
Type: ${currentQ.type}
Report Type: ${reportType}

Context:
--------
User Answer: ${userAnswer}
Correct Answer: ${correctAnswer}
Options: ${currentQ.type !== 'essay' ? currentQ.options.join(' | ') : 'Essay'}

User Report:
------------
${reportText}
            `.trim();

            await feedbackService.submitFeedback({
                type: 'bug',
                message: message
            });

            setReportSuccess(true);
            setTimeout(() => {
                setReportSuccess(false);
                setShowReportModal(false);
                setReportText('');
                setReportType('bug');
                setReportingQuestionIndex(null);
            }, 2000);

        } catch (err) {
            console.error('Failed to report:', err);
            alert('Failed to submit report. Please try again.');
        } finally {
            setIsReporting(false);
        }
    };

    useEffect(() => {
        if (questions && questions.length > 0) {

            const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, 10);
            setShuffledQuestions(shuffled);
            setAnswers({}); // Reset answers if questions change
            setSubmitted(false);
            setPassed(false);
            setQuizStarted(false);
        }
    }, [questions]);

    useEffect(() => {
        let timer: any;
        if (quizStarted && !submitted && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [quizStarted, submitted, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleSubmit = () => {
        let correct = 0;
        shuffledQuestions.forEach((q, idx) => {
            if (q.type === 'essay') {
                if (essayResults[idx]?.correct) correct++;
            } else {
                if (answers[idx] === q.correctAnswer) correct++;
            }
        });
        const score = (correct / shuffledQuestions.length) * 100;

        if (onAttempt) {
            onAttempt(score, shuffledQuestions.length);
        }

        setSubmitted(true);
        setShowSummary(true);
        if (score >= 80) {
            setPassed(true);
        }
    };

    const currentScore = Math.round((shuffledQuestions.reduce((acc, q, i) => {
        if (q.type === 'essay') return acc + (essayResults[i]?.correct ? 1 : 0);
        return acc + (answers[i] === q.correctAnswer ? 1 : 0);
    }, 0) / shuffledQuestions.length) * 100);

    if (!quizStarted) {
        return (
            <div className="fixed inset-0 z-50 bg-[#0A0C10] flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0A0C10] to-[#0A0C10] z-0" />
                <div className="absolute inset-0 bg-white/5 opacity-20 z-0 pointer-events-none brightness-100 contrast-150" />

                <button className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all z-50 group border border-white/5 backdrop-blur-md" onClick={onClose}>
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <div className="relative z-10 max-w-3xl w-full p-8">
                    <div className="w-32 h-32 mx-auto mb-12 relative group">
                        <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-[60px] animate-pulse" />
                        <div className="relative w-full h-full bg-black/40 backdrop-blur-2xl rounded-full border-2 border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500">
                            <Lock className="w-12 h-12 text-white/90" />
                        </div>
                    </div>

                    <h2 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-6 tracking-tight">
                        Honor Code
                    </h2>
                    <p className="text-xl text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed">
                        Assessments are designed to test <span className="text-white font-bold">your</span> understanding. Please commit to integrity before proceeding.
                    </p>

                    <div className="grid gap-4 mb-12 text-left bg-white/5 p-1 rounded-3xl border border-white/10 backdrop-blur-xl">
                        {[
                            "I agree to complete this quiz without unauthorized assistance.",
                            "I have 30 minutes to complete the quiz.",
                            "Unlimited attempts allowed."
                        ].map((text, i) => (
                            <div key={i} className="flex items-center gap-4 p-5 hover:bg-white/5 rounded-2xl transition-colors group">
                                <div className="p-2 bg-green-500/10 rounded-full border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                                <span className="text-lg text-gray-300 font-medium">{text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-8">
                        <label className="flex items-center gap-4 cursor-pointer group select-none py-2 px-4 rounded-xl hover:bg-white/5 transition-colors">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${honorCodeAccepted ? 'bg-purple-600 border-purple-600 scale-110' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                {honorCodeAccepted && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={honorCodeAccepted} onChange={(e) => setHonorCodeAccepted(e.target.checked)} />
                            <span className="text-gray-400 group-hover:text-white transition-colors text-lg font-medium">I accept the Honor Code</span>
                        </label>

                        <button
                            onClick={() => setQuizStarted(true)}
                            disabled={!honorCodeAccepted}
                            className="group relative px-12 py-5 bg-white text-black rounded-2xl font-bold text-xl hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                Start Assessment <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted && showSummary) {
        return (
            <div className="fixed inset-0 z-50 bg-[#0A0C10] flex flex-col overflow-hidden animate-in fade-in duration-500">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/10 via-[#0A0C10] to-[#0A0C10] z-0 pointer-events-none" />

                <div className="relative z-20 border-b border-white/5 bg-black/40 backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl border border-white/5 ${passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {passed ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">{passed ? 'Assessment Passed' : 'Assessment Failed'}</h3>
                                <p className={`text-sm font-mono font-bold uppercase tracking-wider ${passed ? 'text-green-500' : 'text-red-500'}`}>Final Score: {currentScore}%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {passed ? (
                                <button onClick={() => { onPass(); }} className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                    Next Module <ArrowRight size={18} />
                                </button>
                            ) : (
                                <button onClick={() => { setSubmitted(false); setAnswers({}); setEssayResults({}); setPassed(false); setQuizStarted(false); setTimeLeft(30 * 60); setShowSummary(false); }} className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold transition-all hover:scale-105">
                                    Try Again
                                </button>
                            )}
                            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
                        {shuffledQuestions.map((q, idx) => {
                            const isCorrect = q.type === 'essay'
                                ? essayResults[idx]?.correct
                                : answers[idx] === q.correctAnswer;

                            return (
                                <div key={idx} style={{ animationDelay: `${idx * 100}ms` }} className={`group relative p-8 rounded-3xl border transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 fill-mode-both ${isCorrect ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-red-500/[0.02] border-red-500/20 hover:bg-red-500/[0.04]'}`}>
                                    <div className="flex items-start gap-6">
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border ${isCorrect ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                            {isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <p className="text-xl md:text-2xl font-medium text-gray-200 leading-relaxed">{q.question}</p>

                                            <div className="grid md:grid-cols-2 gap-4 pt-4">
                                                <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                                                    <span className="text-xs font-bold uppercase tracking-widest opacity-50 block mb-2">Your Answer</span>
                                                    {q.type === 'essay' ? (
                                                        <p className="text-gray-300 font-mono text-sm">{answers[idx] || 'No Answer'}</p>
                                                    ) : (
                                                        <p className="text-gray-200 font-medium">{q.options[answers[idx]] || 'Skipped'}</p>
                                                    )}
                                                </div>
                                                {!isCorrect && q.type !== 'essay' && (
                                                    <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5/5">
                                                        <span className="text-xs font-bold uppercase tracking-widest text-green-500/50 block mb-2">Correct Answer</span>
                                                        <p className="text-green-400 font-medium">{q.options[q.correctAnswer]}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {!isCorrect && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <button
                                                        onClick={() => { setExplaining(idx); onExplain(q.question, q.type === 'essay' ? 'Ideal Answer' : q.options[q.correctAnswer], q.type === 'essay' ? answers[idx] : q.options[answers[idx]]); }}
                                                        disabled={explaining === idx}
                                                        className="text-sm font-medium text-purple-400 hover:text-purple-300 flex items-center gap-2 transition-colors px-4 py-2 hover:bg-purple-500/10 rounded-lg w-fit"
                                                    >
                                                        {explaining === idx ? 'Analyzing...' : 'Ask AI Explanation'}
                                                    </button>
                                                    <button
                                                        onClick={() => { setReportingQuestionIndex(idx); setShowReportModal(true); }}
                                                        className="text-sm font-medium text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors px-4 py-2 hover:bg-red-500/10 rounded-lg w-fit"
                                                    >
                                                        <Flag size={16} />
                                                        Report Issue
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div >
        );
    }

    const progress = ((Object.keys(answers).length) / shuffledQuestions.length) * 100;

    return (
        <div className="fixed inset-0 z-50 bg-[#0A0C10] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-20 px-8 h-24 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Assessment In Progress</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">Question {Object.keys(answers).length + 1}</span>
                            <span className="text-lg text-gray-600">/ {shuffledQuestions.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`px-6 py-3 rounded-full font-mono text-xl font-bold border backdrop-blur-md flex items-center gap-3 transition-all duration-300 ${timeLeft < 60 ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-300'}`}>
                        <Clock size={20} className={timeLeft < 60 ? 'animate-spin' : ''} />
                        {formatTime(timeLeft)}
                    </div>
                    <button onClick={onClose} className="p-4 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="relative w-full h-1 bg-white/5">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] animate-scan transition-all duration-700 ease-out shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-8 md:p-16 flex flex-col items-center">
                <div className="max-w-4xl w-full pb-32">
                    {shuffledQuestions.map((q, idx) => (
                        <div key={idx} className={`${idx === Object.keys(answers).length ? 'block animate-in fade-in slide-in-from-bottom-8 duration-700' : 'hidden'}`}>

                            <h2 className="text-3xl md:text-5xl font-medium text-white leading-tight mb-16" dir="ltr">
                                {q.question}
                            </h2>

                            <div className="space-y-4">
                                {q.type === 'essay' ? (
                                    <div className="space-y-6">
                                        <textarea
                                            autoFocus
                                            className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-xl text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all min-h-[300px] placeholder:text-gray-700 resize-none shadow-inner"
                                            placeholder="Type your answer here..."
                                            value={answers[idx] || ''}
                                            onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
                                            disabled={essayResults[idx]?.correct}
                                        />

                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-500">Press <b>Enter</b> to submit answer</p>
                                            <button
                                                onClick={async () => {
                                                    if (!answers[idx]) return;
                                                    setEvaluating(idx);
                                                    const apiKey = '';
                                                    const result = await evaluateEssay(apiKey, q.question, q.modelAnswer, answers[idx]);
                                                    setEssayResults(prev => ({ ...prev, [idx]: result }));
                                                    setEvaluating(null);
                                                }}
                                                disabled={evaluating === idx || !answers[idx]}
                                                className="px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-3 shadow-lg shadow-purple-900/20"
                                            >
                                                {evaluating === idx ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Sparkles size={20} />}
                                                Check Answer
                                            </button>
                                        </div>

                                        {essayResults[idx] && (
                                            <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in">
                                                <div className="flex items-center gap-3 mb-4">
                                                    {essayResults[idx].correct ? <CheckCircle className="text-green-400" /> : <XCircle className="text-red-400" />}
                                                    <span className={`font-bold text-lg ${essayResults[idx].correct ? 'text-green-400' : 'text-red-400'}`}>
                                                        {essayResults[idx].correct ? 'Perfect Match' : 'Needs Improvement'}
                                                    </span>
                                                </div>
                                                <p className="text-gray-300 text-lg leading-relaxed">{essayResults[idx].feedback}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {q.options.map((opt: string, optIdx: number) => (
                                            <label
                                                key={optIdx}
                                                className={`group relative flex items-center gap-8 p-8 rounded-2xl cursor-pointer transition-all duration-300 border ${answers[idx] === optIdx ? 'bg-white text-black border-white scale-[1.02] shadow-[0_0_50px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${answers[idx] === optIdx ? 'border-black' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                                    {answers[idx] === optIdx && <div className="w-4 h-4 rounded-full bg-black" />}
                                                </div>
                                                <span className="text-2xl font-medium tracking-tight">{opt}</span>
                                                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold uppercase tracking-widest">Select</span>
                                                <input type="radio" name={`q-${idx}`} checked={answers[idx] === optIdx} onChange={() => setAnswers({ ...answers, [idx]: optIdx })} className="hidden" />
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="fixed bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/90 to-transparent z-40 flex justify-center pointer-events-none">
                        <button
                            onClick={handleSubmit}
                            disabled={Object.keys(answers).length < shuffledQuestions.length}
                            className={`pointer-events-auto px-16 py-5 bg-white text-black rounded-full font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] disabled:opacity-0 disabled:translate-y-10 duration-500`}
                        >
                            Complete Assessment
                        </button>
                    </div>
                </div>
            </div>

            {showReportModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Flag className="w-5 h-5 text-red-500" /> Report Issue
                            </h3>
                            <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {reportSuccess ? (
                                <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in">
                                    <div className="p-4 rounded-full bg-green-500/10 text-green-500">
                                        <CheckCircle className="w-12 h-12" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white">Report Sent!</h4>
                                    <p className="text-gray-400">Thank you for helping us improve.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Issue Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['bug', 'wrong_answer', 'typo', 'suggestion'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setReportType(type)}
                                                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${reportType === type
                                                        ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                                                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {type.replace('_', ' ').toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Details</label>
                                        <textarea
                                            value={reportText}
                                            onChange={e => setReportText(e.target.value)}
                                            placeholder="Please describe the issue..."
                                            className="w-full p-4 rounded-xl border bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 min-h-[120px] resize-none"
                                        />
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowReportModal(false)}
                                            className="px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleReportSubmit}
                                            disabled={!reportText.trim() || isReporting}
                                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isReporting ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                                            Submit Report
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
