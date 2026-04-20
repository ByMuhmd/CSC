import React, { useState, useEffect } from 'react';
import {
    Home, Play, CheckCircle, XCircle, ArrowRight, RefreshCcw, Award,
    BookOpen, AlertCircle, Sparkles, Loader2, Menu, X, Grid, Trash2, Bot, ArrowLeft, FileText, ExternalLink, User,
    Flag, Send, Layers, Swords, Trophy
} from 'lucide-react';
import { generateExplanation, evaluateEssay } from '../services/gemini';

import { Translation as TextTranslator } from './Tools';
import { Loading as LoadingLogo } from './UIComponents';
import { MathRenderer as FormattedText } from './MathRenderer';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataSync';
import { feedbackService } from '../services/feedbackService';
import { XP_PER_CORRECT_ANSWER, XP_PER_QUIZ_COMPLETE } from '../utils/gamification';
import { normalizeQuizQuestion } from '../utils/quiz';
import DOMPurify from 'dompurify';

function MenuButton({ title, subtitle, onClick, isDark }: { title: string; subtitle: string; onClick: () => void; isDark: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`w-full group relative overflow-hidden rounded-2xl border transition-all duration-500
                ${isDark
                    ? 'bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                    : 'bg-white/80 backdrop-blur-xl border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-lg'
                }
            `}
        >

            <div className={`absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="p-6 flex items-center justify-center text-center relative z-10">
                <div>
                    <h3 className={`font-bold text-lg mb-1 transition-colors ${isDark ? 'text-white group-hover:text-purple-300' : 'text-gray-900 group-hover:text-purple-700'}`}>
                        {title}
                    </h3>
                    <p className={`text-xs font-medium uppercase tracking-wide transition-colors ${isDark ? 'text-gray-500 group-hover:text-white/60' : 'text-gray-500 group-hover:text-gray-600'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>
        </button>
    );
}

import { Pomodoro as PomodoroTimer } from './Tools';

const Sidebar = ({
    isSidebarOpen,
    setIsSidebarOpen,
    userAnswers,
    quizQuestions,
    currentIndex,
    jumpToQuestion,
    files
}) => {
    const answeredCount = Object.keys(userAnswers).length;

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-[#050505]/95 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-500 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}>
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />

                <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10">
                    <h3 className="font-bold text-lg flex items-center gap-3 text-white">
                        <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-white/5">
                            <Grid className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="tracking-tight">Quiz Map</span>
                    </h3>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 bg-white/[0.02] border-b border-white/5 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                        <span>Progress</span>
                        <span className="text-white">{answeredCount} <span className="text-gray-600 mx-1">/</span> {quizQuestions.length}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 via-white to-blue-500 transition-all duration-700 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                            style={{ width: `${(answeredCount / quizQuestions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-3 sticky top-0 bg-[#050505]/95 z-20 pb-2">Question Matrix</h4>
                    <div className="grid grid-cols-5 gap-2">
                        {quizQuestions.map((_, idx) => {
                            const status = userAnswers[idx];
                            const isActive = idx === currentIndex;
                            let btnClass = "h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-300 relative overflow-hidden group ";

                            if (isActive) {
                                btnClass += "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105 z-10";
                            } else if (!status) {
                                btnClass += "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white";
                            } else if (status.correct) {
                                btnClass += "bg-green-500/20 text-green-400 border border-green-500/30";
                            } else {
                                btnClass += "bg-red-500/20 text-red-400 border border-red-500/30";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => jumpToQuestion(idx)}
                                    className={btnClass}
                                >
                                    <span className="relative z-10 font-mono">{idx + 1}</span>
                                    {isActive && <div className="absolute inset-0 bg-white blur-md opacity-50" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {files && files.length > 0 && (
                    <div className="p-4 border-t border-white/5 relative z-10">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 pl-1">Resources</h4>
                        <div className="space-y-2">
                            {files.map((file, idx) => (
                                <a
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                                                <FileText className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors line-clamp-1">{file.label}</span>
                                        </div>
                                        <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-white/5 relative z-10">
                    <PomodoroTimer embedded={true} />
                </div>

                <div className="p-4 border-t border-white/5 bg-black/40 flex justify-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider relative z-10">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div> Correct</div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Wrong</div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div> Pending</div>
                </div>
            </div>
        </>
    );
};

import { supabase } from '../lib/supabase';
import { challengeService } from '../services/challengeService';

export default function QuizPage({
    title,
    subtitle,
    questions: initialQuestions,
    storageKey,
    categories: initialCategories,
    files = [],
    shuffleOptions = false,
    shuffleQuestions = true,
    subjectName = null,
    subjectTitle,
    fetchQuestions,
    loadingQuestions,
    initialView,
    initialCategory,
    autoStart,
    onHome,
    challengeId,
    challengeChallengerId,
    questionLimit,
    timeLimit
}: {
    title: string,
    subtitle: string,
    questions?: any[],
    storageKey: string,
    categories?: any[],
    files?: any[],
    shuffleOptions?: boolean,
    shuffleQuestions?: boolean,
    subjectName?: string | null,
    subjectTitle?: string,
    fetchQuestions?: (quizId: string) => Promise<any[] | void>,
    loadingQuestions?: boolean,
    initialView?: string,
    initialCategory?: string,
    autoStart?: boolean,
    onHome?: () => void,
    challengeId?: string | null,
    challengeChallengerId?: string | null,
    questionLimit?: number,
    timeLimit?: number
}) {
    const navigate = useNavigate();

    const getQuestionsForCategory = (sourceQuestions: any[], category: string | null | undefined) => {
        if (!category) return [];
        if (category === 'bank') {
            return sourceQuestions.filter(q => q.category === 'bank');
        }
        return sourceQuestions.filter(q => q.category === category);
    };

    const saveState = (key, value) => {
        try {
            const current = localStorage.getItem(storageKey);
            const parsed = current ? JSON.parse(current) : {};
            parsed[key] = value;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch (e) {
            console.error("Save failed", e);
        }
    };

    const loadState = (key, fallback) => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed[key] !== undefined ? parsed[key] : fallback;
            }
        } catch (e) {
            console.error("Load failed", e);
        }
        return fallback;
    };

    const [view, setView] = useState(() => initialView || loadState('view', 'home'));

    const [isLoading, setIsLoading] = useState(!!subjectName);
    const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);
    const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);

    const categories = subjectName ? dynamicCategories : (initialCategories || []);
    const questions = subjectName ? dynamicQuestions : (initialQuestions || []);

    const [currentCategory, setCurrentCategory] = useState(() => loadState('currentCategory', initialCategory || null));

    useEffect(() => {
        if (!subjectName) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: subject, error: subError } = await supabase
                    .from('subjects')
                    .select('id')
                    .ilike('name', subjectName)
                    .single();

                if (subError || !subject) {
                    console.error('Subject not found:', subError);
                    setIsLoading(false);
                    return;
                }

                const { data: quizzes, error: quizError } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('subject_id', subject.id)
                    .eq('is_published', true);

                if (quizError) throw quizError;

                const newCategories = quizzes.map(q => ({
                    id: q.id,
                    label: q.title,
                    description: q.description || `${q.time_limit ? q.time_limit + ' mins • ' : ''}Dynamic Quiz`
                }));
                setDynamicCategories(newCategories);

                if (quizzes.length > 0) {
                    const quizIds = quizzes.map(q => q.id);
                    const { data: dbQuestions, error: qError } = await supabase
                        .from('questions')
                        .select('*')
                        .in('quiz_id', quizIds);

                    if (qError) throw qError;

                    const transformedQuestions = dbQuestions
                        .map(q => normalizeQuizQuestion(q, q.quiz_id))
                        .filter(Boolean);
                    setDynamicQuestions(transformedQuestions);
                }

            } catch (err) {
                console.error('Failed to fetch dynamic quizzes:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [subjectName]);

    const [quizQuestions, setQuizQuestions] = useState(() => {
        const saved = loadState('quizQuestions', []);
        if (saved && saved.length > 0) return saved;

        if (questions.length > 0) {
            return getQuestionsForCategory(questions, initialCategory);
        }
        return [];
    });
    const [currentIndex, setCurrentIndex] = useState(() => loadState('currentIndex', 0));
    const [userAnswers, setUserAnswers] = useState(() => loadState('userAnswers', {}));
    const [score, setScore] = useState(() => loadState('score', 0));
    const [elapsedTime, setElapsedTime] = useState(() => loadState('elapsedTime', 0));
    const [timeLeft, setTimeLeft] = useState(() => loadState('timeLeft', timeLimit ? timeLimit * 60 : null));
    const [history, setHistory] = useState(() => loadState('history', []));
    const [theme, setTheme] = useState(() => loadState('theme', 'dark'));
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [isLogoError, setIsLogoError] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [evaluating, setEvaluating] = useState(null);
    const [essayResults, setEssayResults] = useState(() => loadState('essayResults', {}));
    const [quizSessionId, setQuizSessionId] = useState<string | null>(() => loadState('quizSessionId', null));

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportType, setReportType] = useState('bug');
    const [reportText, setReportText] = useState('');
    const [isReporting, setIsReporting] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);

    const [apiKey] = useState('');
    const [explanation, setExplanation] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);
    const [showExplanationModal, setShowExplanationModal] = useState(false);
    const { user } = useAuth();
    const [explanationError, setExplanationError] = useState('');

    const handleExplain = async () => {
        setIsExplaining(true);
        setExplanation('');
        setExplanationError('');
        setShowExplanationModal(true);

        const currentQ = quizQuestions[currentIndex];
        const userAnswer = userAnswers[currentIndex]?.option;

        const response = await generateExplanation(
            apiKey,
            currentQ.question,
            currentQ.options,
            currentQ.answer,
            userAnswer
        );

        if (response.error) {
            setExplanationError(response.error);
        } else {
            setExplanation(response.explanation);
        }
        setIsExplaining(false);
    };

    const handleReportSubmit = async () => {
        if (!reportText.trim()) return;

        setIsReporting(true);
        try {
            const currentQ = quizQuestions[currentIndex];
            const userAnswer = userAnswers[currentIndex];

            const message = `
Question Report:
----------------
Quiz: ${title}
Subject: ${subjectTitle || subjectName || 'N/A'}
Category: ${categories.find(c => c.id === currentCategory)?.label || currentCategory}
Question ID: ${currentQ.id || 'N/A'}
Question: ${currentQ.question}

Context:
--------
Type: ${currentQ.type}
Report Type: ${reportType}
User's Selection: ${userAnswer ? (userAnswer.option + (userAnswer.correct ? ' (Correct)' : ' (Wrong)')) : 'No selection'}
Correct Answer: ${currentQ.answer}
Image: ${currentQ.image || 'None'}

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
            }, 2000);

        } catch (err) {
            console.error('Failed to report:', err);
            alert('Failed to submit report. Please try again.');
        } finally {
            setIsReporting(false);
        }
    };

    useEffect(() => {
        let interval;
        if (view === 'quiz') {
            interval = setInterval(() => {
                if (timeLimit) {
                    setTimeLeft(prev => {
                        if (prev !== null && prev <= 1) {
                            clearInterval(interval);
                            finishQuiz();
                            return 0;
                        }
                        return prev !== null ? prev - 1 : null;
                    });
                }
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [view, timeLimit]);

    useEffect(() => {
        const stateToSave = {
            view,
            currentCategory,
            quizQuestions,
            currentIndex,
            userAnswers,
            score,
            history,
            elapsedTime,
            timeLeft,

            theme,
            essayResults,
            quizSessionId
        };
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    }, [view, currentCategory, quizQuestions, currentIndex, userAnswers, score, history, theme, essayResults, elapsedTime, timeLeft, storageKey]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const isDark = theme === 'dark';
    const bgClass = isDark ? 'bg-black' : 'bg-gray-50';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const cardBgClass = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const subTextClass = isDark ? 'text-gray-400' : 'text-gray-500';

    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const resetQuizRequest = () => {
        setShowResetConfirm(true);
    };

    const confirmResetQuiz = () => {
        setShowResetConfirm(false);
        if (onHome) {
            onHome();
        } else {
            setView('home');
            setCurrentCategory(null);
            setQuizQuestions([]);
            setCurrentIndex(0);
            setUserAnswers({});
            setEssayResults({});
            setScore(0);
            setElapsedTime(0);
            setIsSidebarOpen(false);
        }
    };

        const finishQuiz = async () => {
            const correctMCQs = quizQuestions.reduce((acc, q, idx) => {
                if (q.type === 'essay') return acc;
                return acc + (userAnswers[idx]?.correct ? 1 : 0);
            }, 0);

            const essayCount = quizQuestions.filter(q => q.type === 'essay').length;
            const finalScore = correctMCQs + essayCount;

            const xpGained = (finalScore * XP_PER_CORRECT_ANSWER) + XP_PER_QUIZ_COMPLETE;

            const lastQuizData = {
                title: title || 'Quiz',
                score: finalScore,
                timestamp: new Date().toISOString()
            };

            const currentLocal = dataService.getLocalProgress();
            dataService.saveLocalProgress({
                xp: currentLocal.xp + xpGained,
                quizzesCompleted: currentLocal.quizzesCompleted + 1,
                totalScore: currentLocal.totalScore + finalScore,
                lastQuiz: lastQuizData
            });

            if (user) {
                let secureResult = null;
                if (quizSessionId) {
                    try {
                        const submissionAnswers = quizQuestions.map((q, idx) => ({
                            question_id: q.id,
                            selected_option: userAnswers[idx]?.option || ''
                        }));
                        secureResult = await dataService.submitQuizSecurely(quizSessionId, submissionAnswers);
                    } catch (e) {
                        console.error("Secure submission failed, falling back to basic record", e);
                    }
                }

                const finalScoreToRecord = secureResult ? secureResult.score : finalScore;
                const xpToRecord = secureResult ? secureResult.xp_gained : xpGained;

                const quizResultId = await dataService.recordQuizAttempt({
                    user_id: user.id,
                    user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
                    quiz_category: categories.find(c => c.id === currentCategory)?.label || currentCategory || 'General',
                    score: finalScoreToRecord,
                    total_questions: quizQuestions.length,
                    percentage: Math.round((finalScoreToRecord / quizQuestions.length) * 100)
                });

                dataService.updateCloudProgress(user.id, secureResult ? 0 : xpToRecord, 1, finalScoreToRecord, lastQuizData, quizResultId || undefined);

                if (challengeId && challengeChallengerId) {
                    challengeService.submitScore(challengeId, user.id, finalScoreToRecord, challengeChallengerId)
                        .catch(e => console.error("Failed to submit challenge score:", e));
                }

                if (secureResult) {
                    setQuizSessionId(null);
                }
            }

            const newAttempt = {
                id: Date.now(),
                date: new Date().toISOString(),
                category: currentCategory,
                score: finalScore,
                total: quizQuestions.length,
                timeSpent: elapsedTime,
                wrongAnswers: quizQuestions
                    .map((q, idx) => ({ ...q, userAnswer: userAnswers[idx] }))
                    .filter(q => !q.userAnswer?.correct)
            };

            setScore(finalScore);
            setHistory(prev => [newAttempt, ...prev]);
            setView('result');
        };

    const startQuiz = async (catId: string) => {
        if (view === 'quiz' && currentCategory === catId) {
            return;
        }

        let fetchedQuestions: any[] | void = undefined;
        if (fetchQuestions && catId !== 'bank' && !subjectName) {
            setTargetCategory(catId);
            fetchedQuestions = await fetchQuestions(catId);
        }

        startQuizInternal(catId, Array.isArray(fetchedQuestions) ? fetchedQuestions : undefined);
    };

    const startQuizInternal = async (category, sourceQuestions = questions) => {
        if (user) {
            const sid = await dataService.startQuizSession(category !== 'general' ? category : undefined);
            if (sid) setQuizSessionId(sid);
        }
        
        const categoryData = initialCategories.find(c => c.id === category);
        let finalShuffleQuestions = categoryData?.shuffleQuestions !== undefined ? categoryData.shuffleQuestions : shuffleQuestions;
        const finalShuffleOptions = categoryData?.shuffleOptions !== undefined ? categoryData.shuffleOptions : shuffleOptions;
        
        if (questionLimit) finalShuffleQuestions = true;

        let filtered = category === 'general' 
            ? sourceQuestions 
            : getQuestionsForCategory(sourceQuestions, category);
        
        if (finalShuffleQuestions) {
            filtered.sort(() => Math.random() - 0.5);
        }

        if (finalShuffleOptions) {
            filtered = filtered.map(q => {
                if (q.type !== 'mcq' || !q.options) return q;

                const options = [...q.options];
                const specialOptions = ["All of the above", "None of the above", "All of these", "None of these"];

                const normalOptions = [];
                const stickyOptions = [];

                options.forEach(opt => {
                    if (specialOptions.some(special => opt.toLowerCase().includes(special.toLowerCase()))) {
                        stickyOptions.push(opt);
                    } else {
                        normalOptions.push(opt);
                    }
                });

                normalOptions.sort(() => Math.random() - 0.5);

                const finalOptions = [...normalOptions, ...stickyOptions];

                return { ...q, options: finalOptions };
            });
        }

        if (questionLimit) {
            filtered = filtered.slice(0, questionLimit);
        }

        setQuizQuestions(filtered);
        setCurrentCategory(category);
        setCurrentIndex(0);
        setScore(0);
        setElapsedTime(0);
        if (timeLimit) setTimeLeft(timeLimit * 60);

        setUserAnswers({});
        setEssayResults({});
        setIsSidebarOpen(false);
        setView('quiz');
    };

    const [targetCategory, setTargetCategory] = useState<string | null>(null);

    useEffect(() => {
        if (view === 'quiz' && questions.length > 0 && currentCategory) {
            const availableForCategory = currentCategory === 'general' 
                ? questions 
                : getQuestionsForCategory(questions, currentCategory);
            const shouldRepairQuizQuestions =
                quizQuestions.length === 0 ||
                (currentCategory !== 'general' && !quizQuestions.every(q => q.category === currentCategory));

            if (availableForCategory.length > 0 && shouldRepairQuizQuestions) {
                let filtered = [...availableForCategory];

                
                const categoryData = initialCategories.find(c => c.id === currentCategory);
                const actualShuffleQuestions = categoryData?.shuffleQuestions !== undefined ? categoryData.shuffleQuestions : shuffleQuestions;
                const actualShuffleOptions = categoryData?.shuffleOptions !== undefined ? categoryData.shuffleOptions : shuffleOptions;
                
                if (actualShuffleQuestions) {
                    filtered.sort(() => Math.random() - 0.5);
                }

                if (actualShuffleOptions) {
                    filtered = filtered.map(q => {
                        if (q.type !== 'mcq' || !q.options) return q;
                        const options = [...q.options];
                        const specialOptions = ["All of the above", "None of the above", "All of these", "None of these"];
                        const normalOptions = [];
                        const stickyOptions = [];
                        options.forEach(opt => {
                            if (specialOptions.some(special => opt.toLowerCase().includes(special.toLowerCase()))) {
                                stickyOptions.push(opt);
                            } else {
                                normalOptions.push(opt);
                            }
                        });
                        normalOptions.sort(() => Math.random() - 0.5);
                        return { ...q, options: [...normalOptions, ...stickyOptions] };
                    });
                }
                if (questionLimit) {
                    filtered = filtered.slice(0, questionLimit);
                }
                setQuizQuestions(filtered);
                if (timeLimit && timeLeft === null) setTimeLeft(timeLimit * 60);
            }
        }
    }, [questions, view, quizQuestions, currentCategory, initialCategories, shuffleOptions, shuffleQuestions, questionLimit, timeLimit, timeLeft]);

    useEffect(() => {
        if (autoStart && initialCategory && !subjectName) {

            const timer = setTimeout(() => {
                startQuiz(initialCategory);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [autoStart, initialCategory, subjectName]);

    const handleOptionSelect = (option) => {
        if (userAnswers[currentIndex]) return;

        const currentQ = quizQuestions[currentIndex];
        const correct = option === currentQ.answer;

        const newAnswers = {
            ...userAnswers,
            [currentIndex]: { option, correct }
        };
        setUserAnswers(newAnswers);

        if (correct) {
            setScore(s => s + 1);
        }
    };

    const handleEssaySubmit = async (idx, answer) => {
        if (!answer) return;
        setEvaluating(idx);
        const currentQ = quizQuestions[idx];
        const result = await evaluateEssay(apiKey, currentQ.question, currentQ.modelAnswer, answer);

        const forcedResult = { ...result, correct: true };
        setEssayResults(prev => ({ ...prev, [idx]: forcedResult }));

        if (forcedResult.correct) {
            setScore(s => s + 1);
        }
        setEvaluating(null);
    };

    const nextQuestion = () => {
        if (currentIndex + 1 < quizQuestions.length) {
            setCurrentIndex(prev => prev + 1);
        } else {
            finishQuiz();
        }
    };

    const jumpToQuestion = (index) => {
        setCurrentIndex(index);
        setIsSidebarOpen(false);
    };

    if (view === 'home') {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-[#030303]' : 'bg-gray-50'} ${textClass} font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500`}>
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-white/5 opacity-20 mix-blend-overlay" />
                    <div className={`absolute top-[-20%] left-[-10%] w-[70%] h-[70%] ${isDark ? 'bg-purple-900/10' : 'bg-purple-200/40'} rounded-full blur-[150px] animate-pulse-slow`} />
                    <div className={`absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] ${isDark ? 'bg-blue-900/10' : 'bg-blue-200/40'} rounded-full blur-[150px] animate-pulse-slow delay-1000`} />
                </div>

                <button
                    onClick={() => navigate(-1)}
                    className={`absolute top-6 left-6 p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'} backdrop-blur-md transition-all z-20 group`}
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="absolute top-6 right-6 z-20 flex items-center gap-4">

                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'} backdrop-blur-md transition-all`}
                    >
                        {isDark ? <Sparkles className="w-5 h-5 text-yellow-300" /> : <div className="w-5 h-5 rounded-full bg-slate-800" />}
                    </button>

                    {user && (
                        <button onClick={() => navigate('/profile')} className="group relative">
                            <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 ${isDark ? 'border-white/10' : 'border-gray-200'} transition-transform group-hover:scale-105 shadow-xl`}>
                                {user.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full ${isDark ? 'bg-white/10' : 'bg-gray-100'} flex items-center justify-center`}>
                                        <User size={18} className={isDark ? "text-white" : "text-gray-600"} />
                                    </div>
                                )}
                            </div>
                        </button>
                    )}
                </div>

                <div className="max-w-xl w-full text-center space-y-4 animate-in fade-in zoom-in duration-700 z-10 relative">

                    <div className="flex justify-center">
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-700" />
                            {!isLogoError ? (
                                <img
                                    src="/logo2.png"
                                    alt="Owl Logo"
                                    className="relative w-48 h-48 object-contain drop-shadow-2xl transition-transform duration-500"
                                    onError={() => setIsLogoError(true)}
                                />
                            ) : (
                                <div className="w-40 h-40 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800 shadow-2xl">
                                    <BookOpen className="text-gray-600 w-16 h-16" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className={`text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${isDark ? 'from-white via-white to-gray-500' : 'from-gray-900 via-gray-800 to-gray-500'} drop-shadow-sm`}>
                            {title}
                        </h1>

                        <div className="flex justify-center mt-6">
                            <div className={`group flex items-center gap-3 px-4 py-2 rounded-full ${isDark ? 'bg-black/40 border border-white/10' : 'bg-white/60 border border-gray-200'} backdrop-blur-md transition-all duration-300 hover:bg-opacity-80`}>
                                <div className="relative flex items-center justify-center w-2.5 h-2.5">
                                    <div className="absolute w-full h-full bg-green-500 rounded-full animate-ping opacity-75" />
                                    <div className="relative w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Official Curriculum
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full px-4 md:px-0">
                        {categories.length > 0 ? (
                            categories.map((cat, idx) => (
                                <MenuButton
                                    key={idx}
                                    title={cat.label}
                                    subtitle={targetCategory === cat.id && loadingQuestions ? 'Loading Questions...' : cat.description}
                                    onClick={() => startQuiz(cat.id)}
                                    isDark={isDark}
                                />
                            ))
                        ) : (
                            <div className={`md:col-span-2 rounded-3xl border p-8 text-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
                                <h2 className={`text-2xl font-black mb-2 ${textClass}`}>No Published Quizzes Yet</h2>
                                <p className={subTextClass}>This subject does not currently have published quizzes available for students.</p>
                            </div>
                        )}

                        <div className="pt-6 flex justify-center md:col-span-2">
                            <button
                                onClick={() => setView('history')}
                                className={`group relative px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-3 overflow-hidden transition-all duration-300 
                                    ${isDark
                                        ? 'bg-white text-black hover:bg-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                        : 'bg-black text-white hover:bg-gray-800 hover:shadow-xl'
                                    }`}
                            >
                                <BookOpen className="w-4 h-4" />
                                <span>Activity History</span>
                                <ArrowRight className="w-3 h-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    if (view === 'quiz') {
        const currentQ = quizQuestions[currentIndex];

        if (!currentQ) {
            return (
                <div className={`min-h-screen ${bgClass} ${textClass} flex flex-col items-center justify-center p-4`}>
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2">No Questions Found</h2>
                    <p className={`${subTextClass} mb-6`}>We couldn't find any questions for this quiz.</p>
                    <button
                        onClick={() => onHome ? onHome() : setView('home')}
                        className="px-6 py-2 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors"
                    >
                        Return Home
                    </button>
                </div>
            );
        }

        const userAnswerEntry = userAnswers[currentIndex];
        const isAnswered = !!userAnswerEntry;
        const progress = ((currentIndex + 1) / quizQuestions.length) * 100;
        const categoryLabel = categories.find(c => c.id === currentCategory)?.label || currentCategory;

        return (
            <div className={`min-h-screen ${bgClass} ${textClass} flex flex-col overflow-hidden relative font-sans transition-colors duration-500`}>
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-white/5 opacity-20 mix-blend-overlay" />
                    <div className={`absolute top-[-20%] right-[-10%] w-[60%] h-[60%] ${isDark ? 'bg-purple-900/10' : 'bg-purple-200/40'} rounded-full blur-[150px] animate-pulse-slow`} />
                    <div className={`absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] ${isDark ? 'bg-blue-900/10' : 'bg-blue-200/40'} rounded-full blur-[150px] animate-pulse-slow`} />
                </div>

                <TextTranslator apiKey={apiKey} />
                <Sidebar
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    userAnswers={userAnswers}
                    quizQuestions={quizQuestions}
                    currentIndex={currentIndex}
                    jumpToQuestion={jumpToQuestion}
                    files={files}
                />

                <div className="fixed top-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
                    <div className={`pointer-events-auto ${isDark ? 'bg-[#0A0A0A]/80 border-white/10' : 'bg-white/80 border-gray-200'} backdrop-blur-3xl rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.12)] py-2 px-3 md:px-6 flex items-center gap-2 md:gap-6 relative overflow-hidden transition-all duration-500`}>

                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                            <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${progress}%` }} />
                        </div>

                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            title="Menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center">
                            <span className={`text-[8px] uppercase tracking-[0.2em] font-bold ${subTextClass} mb-0.5 opacity-50`}>Question</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`font-black text-sm font-mono ${textClass}`}>{currentIndex + 1}</span>
                                <span className={`text-[10px] ${subTextClass} font-mono opacity-50`}>/ {quizQuestions.length}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center min-w-[2.5rem] md:min-w-[3.5rem]">
                            <span className={`text-[8px] uppercase tracking-[0.2em] font-bold ${subTextClass} mb-0.5 opacity-50`}>Score</span>
                            <span className="font-black text-sm text-green-400 font-mono drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]">{score}</span>
                        </div>

                        <div className="flex flex-col items-center min-w-[2.5rem] md:min-w-[3.5rem]">
                            <span className={`text-[8px] uppercase tracking-[0.2em] font-bold ${subTextClass} mb-0.5 opacity-50`}>{timeLimit ? 'Remaining' : 'Time'}</span>
                            <span className={`font-black text-sm font-mono tracking-wider ${timeLimit && timeLeft !== null && timeLeft < 60 ? 'text-red-500 animate-pulse' : textClass}`}>
                                {timeLimit && timeLeft !== null 
                                    ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
                                    : `${Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:${(elapsedTime % 60).toString().padStart(2, '0')}`
                                }
                            </span>
                        </div>

                        <div className="flex items-center gap-2 pl-2 border-l border-white/5">
                            <button
                                onClick={resetQuizRequest}
                                className="p-2 rounded-full hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all"
                                title="Reset Quiz"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => onHome ? onHome() : setView('home')}
                                className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'}`}
                                title="Return Home"
                            >
                                <Home className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {showResetConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
                        <div className={`relative w-full max-w-sm p-6 rounded-3xl border ${isDark ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-gray-200'} shadow-2xl animate-in fade-in zoom-in duration-300`}>
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="p-4 rounded-full bg-red-500/10 text-red-500 mb-2">
                                    <AlertCircle size={32} />
                                </div>
                                <h3 className={`text-xl font-black ${textClass}`}>Reset Quiz?</h3>
                                <p className={`text-sm ${subTextClass}`}>
                                    Are you sure you want to reset your progress? This action cannot be undone.
                                </p>
                                <div className="grid grid-cols-2 gap-3 w-full pt-4">
                                    <button
                                        onClick={() => setShowResetConfirm(false)}
                                        className={`py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} transition-all`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmResetQuiz}
                                        className="py-3 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all"
                                    >
                                        Yes, Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto pt-32 pb-40 px-4 flex justify-center custom-scrollbar z-10">
                    <div className="w-full max-w-3xl animate-in fade-in zoom-in duration-500">
                        <div className={`${isDark ? 'bg-[#0A0A0A]/60 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-white/80 border-gray-200 shadow-xl'} backdrop-blur-2xl rounded-[2rem] border overflow-hidden relative group transition-colors duration-500`}>

                            <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine mix-blend-overlay" />

                            <div className="p-8 md:p-12">
                                {currentQ.image && (
                                    <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                                        <img src={currentQ.image} alt="Question" className="w-full h-auto max-h-[400px] object-contain bg-black/50" />
                                    </div>
                                )}
                                <h2 className={`text-2xl md:text-3xl font-black ${textClass} mb-10 leading-snug tracking-tight`} dir="auto">
                                    <FormattedText text={currentQ.question} />
                                </h2>

                                <div className="space-y-4">
                                    {currentQ.type === 'essay' ? (
                                        <div className="space-y-6">
                                            <div className={`flex items-start gap-4 p-5 rounded-2xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                                                <AlertCircle className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'} mt-0.5`} />
                                                <div className="space-y-1">
                                                    <h4 className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Automatic Points</h4>
                                                    <p className={`text-xs ${isDark ? 'text-blue-300/80' : 'text-blue-600/80'} leading-relaxed`}>
                                                        This essay question is for practice. You receive <strong>full points automatically</strong> for this question, even if you skip it.
                                                    </p>
                                                </div>
                                            </div>

                                            <textarea
                                                className={`w-full bg-black/20 border ${essayResults[currentIndex]?.correct ? 'border-green-500/50' : essayResults[currentIndex]?.correct === false ? 'border-red-500/50' : 'border-white/10'} rounded-2xl p-6 text-white focus:outline-none focus:border-purple-500/50 focus:bg-black/40 transition-all min-h-[160px] text-lg resize-none shadow-inner`}
                                                placeholder="Type your answer here..."
                                                value={userAnswers[currentIndex]?.option || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setUserAnswers(prev => ({ ...prev, [currentIndex]: { option: val } }));
                                                }}
                                                disabled={!!essayResults[currentIndex]?.correct}
                                            />

                                            {!essayResults[currentIndex]?.correct && (
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => handleEssaySubmit(currentIndex, userAnswers[currentIndex]?.option)}
                                                        disabled={evaluating === currentIndex || !userAnswers[currentIndex]?.option}
                                                        className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95"
                                                    >
                                                        {evaluating === currentIndex ? <LoadingLogo className="w-5 h-5 text-white" /> : <Sparkles size={18} />}
                                                        Check Answer
                                                    </button>
                                                </div>
                                            )}

                                            {essayResults[currentIndex] && (
                                                <div className={`p-6 rounded-2xl border ${essayResults[currentIndex].correct ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} animate-in fade-in slide-in-from-top-4`}>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        {essayResults[currentIndex].correct ? <CheckCircle className="text-green-400 w-6 h-6" /> : <XCircle className="text-red-400 w-6 h-6" />}
                                                        <span className={`font-bold text-lg ${essayResults[currentIndex].correct ? 'text-green-400' : 'text-red-400'}`}>
                                                            {essayResults[currentIndex].correct ? 'Correct Answer' : 'Needs Improvement'}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-300 text-base font-arabic leading-relaxed" dir="rtl">{essayResults[currentIndex].feedback}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        currentQ.options.map((option, idx) => {
                                            const isSelected = userAnswerEntry?.option === option;
                                            const isCorrect = userAnswerEntry?.correct;
                                            const isAnswer = option === currentQ.answer;

                                            let baseStyle = "w-full text-left p-6 rounded-2xl transition-all duration-300 flex justify-between items-center font-medium text-lg border group/opt relative overflow-hidden ";

                                            if (isAnswered) {
                                                if (isSelected && isCorrect) {
                                                    baseStyle += "border-green-500/50 bg-green-500/20 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.15)]";
                                                } else if (isSelected && !isCorrect) {
                                                    baseStyle += "border-red-500/50 bg-red-500/20 text-red-400";
                                                } else if (!isSelected && isAnswer) {
                                                    baseStyle += "border-green-500/30 bg-green-500/10 text-green-400/80";
                                                } else {
                                                    baseStyle += isDark ? "border-transparent bg-white/5 text-gray-600 opacity-40" : "border-transparent bg-gray-100 text-gray-400 opacity-40";
                                                }
                                            } else {
                                                if (isDark) {
                                                    baseStyle += "border-white/5 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 text-gray-300 hover:text-purple-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:scale-[1.01]";
                                                } else {
                                                    baseStyle += "border-gray-200 bg-gray-50 hover:bg-white hover:border-purple-300 text-gray-700 hover:text-purple-700 hover:shadow-lg hover:scale-[1.01]";
                                                }
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleOptionSelect(option)}
                                                    disabled={isAnswered}
                                                    className={baseStyle}
                                                    dir="auto"
                                                >
                                                    <span className="relative z-10"><FormattedText text={option} /></span>
                                                    {isAnswered && isAnswer && <CheckCircle className="text-green-500 w-6 h-6 relative z-10" />}
                                                    {isAnswered && isSelected && !isCorrect && <XCircle className="text-red-500 w-6 h-6 relative z-10" />}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className={`px-12 pb-8 flex justify-end gap-3 ${isDark ? 'border-t border-white/5' : ''} pt-6`}>
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${isDark
                                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                        }`}
                                    title="Report Issue"
                                >
                                    <Flag className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleExplain}
                                    disabled={isExplaining}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${isDark
                                        ? 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                                        }`}
                                >
                                    {isExplaining ? <LoadingLogo className="w-4 h-4 text-purple-400" /> : <Sparkles className="w-4 h-4" />}
                                    Explain with AI
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
                    <div className={`pointer-events-auto flex items-center justify-between gap-4 w-full max-w-lg ${isDark ? 'bg-[#0A0A0A]/80 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-2xl border p-2 rounded-full shadow-2xl`}>
                        <button
                            onClick={() => {
                                if (currentIndex > 0) {
                                    setCurrentIndex(c => c - 1);
                                }
                            }}
                            disabled={currentIndex === 0}
                            className={`p-4 rounded-full transition-all ${currentIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'hover:bg-white/10 text-white hover:scale-105 active:scale-95'}`}
                        >
                            <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>

                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-0.5">Progress</span>
                            <div className="flex items-center gap-1.5">
                                <span className={`font-black ${textClass}`}>{Object.keys(userAnswers).length}</span>
                                <span className="text-gray-600 text-xs">/ {quizQuestions.length} answered</span>
                            </div>
                        </div>

                        <button
                            onClick={nextQuestion}
                            className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            {currentIndex + 1 === quizQuestions.length ? 'FINISH' : 'NEXT'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {showExplanationModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className={`w-full max-w-2xl ${isDark ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-gray-200'} border rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden`}>
                            <div className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-gray-200'} flex justify-between items-center bg-white/5`}>
                                <h3 className={`text-lg font-bold ${textClass} flex items-center gap-2`}>
                                    <Bot className="w-6 h-6 text-purple-400" /> AI Explanation
                                </h3>
                                <button onClick={() => setShowExplanationModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                {isExplaining ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-6">
                                        <LoadingLogo className="w-12 h-12 text-purple-500" />
                                        <p className={`text-sm ${subTextClass} animate-pulse font-medium tracking-wide`}>ANALYZING QUESTION...</p>
                                    </div>
                                ) : explanationError ? (
                                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        {explanationError}
                                    </div>
                                ) : (
                                    <div className={`prose ${isDark ? 'prose-invert' : ''} max-w-none text-lg leading-relaxed`} dir="rtl">
                                        <FormattedText text={explanation} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {showReportModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className={`w-full max-w-lg ${isDark ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-gray-200'} border rounded-3xl shadow-2xl overflow-hidden flex flex-col`}>
                            <div className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-gray-200'} flex justify-between items-center bg-white/5`}>
                                <h3 className={`text-lg font-bold ${textClass} flex items-center gap-2`}>
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
                                        <h4 className={`text-xl font-bold ${textClass}`}>Report Sent!</h4>
                                        <p className={subTextClass}>Thank you for helping us improve.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>Issue Type</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['bug', 'wrong_answer', 'typo', 'suggestion'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setReportType(type)}
                                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${reportType === type
                                                            ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                                                            : isDark ? 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {type.replace('_', ' ').toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>Details</label>
                                            <textarea
                                                value={reportText}
                                                onChange={e => setReportText(e.target.value)}
                                                placeholder="Please describe the issue..."
                                                className={`w-full p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 text-black'} focus:outline-none focus:border-purple-500 min-h-[120px] resize-none`}
                                            />
                                        </div>

                                        <div className="pt-4 flex justify-end gap-3">
                                            <button
                                                onClick={() => setShowReportModal(false)}
                                                className={`px-6 py-3 rounded-xl font-bold text-sm ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600'} transition-colors`}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleReportSubmit}
                                                disabled={!reportText.trim() || isReporting}
                                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isReporting ? <LoadingLogo className="w-4 h-4 text-white" /> : <Send className="w-4 h-4" />}
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

    if (view === 'result') {
        const percentage = Math.round((score / quizQuestions.length) * 100);
        const passed = percentage >= 60;

        return (
            <div className={`min-h-screen ${isDark ? 'bg-[#030303]' : 'bg-gray-50'} ${textClass} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500`}>
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-white/5 opacity-20 mix-blend-overlay" />
                    <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] ${isDark ? 'bg-purple-900/10' : 'bg-purple-200/40'} rounded-full blur-[150px]`} />
                    <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] ${isDark ? 'bg-blue-900/10' : 'bg-blue-200/40'} rounded-full blur-[150px]`} />
                </div>

                <div className={`w-full max-w-lg ${isDark ? 'bg-[#0A0A0A]/40 border-white/5' : 'bg-white/80 border-gray-200'} backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.3)] text-center animate-in fade-in zoom-in duration-700 z-10 border relative overflow-hidden group`}>

                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-transparent pointer-events-none" />

                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${passed ? 'green' : 'red'}-500 to-transparent opacity-80`} />

                    <div className="mb-10 flex justify-center relative z-20">
                        <div className={`w-32 h-32 flex items-center justify-center rounded-full border-4 ${passed ? 'border-green-500/50 text-green-400 shadow-[0_0_40px_rgba(34,197,94,0.2)] bg-green-500/5' : 'border-red-500/50 text-red-400 shadow-[0_0_40px_rgba(239,68,68,0.2)] bg-red-500/5'} backdrop-blur-md relative`}>
                            <div className={`absolute inset-0 ${passed ? 'bg-green-400' : 'bg-red-400'} opacity-10 rounded-full animate-pulse`} />
                            {passed ? <Award className="w-14 h-14" /> : <AlertCircle className="w-14 h-14" />}
                        </div>
                    </div>

                    <div className="relative z-20">
                        <h2 className={`text-4xl md:text-5xl font-black mb-3 uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${passed ? 'from-white to-green-400' : 'from-white to-red-400'}`}>
                            {passed ? "Passed" : "Failed"}
                        </h2>
                        <p className={`${subTextClass} mb-10 font-medium text-lg tracking-wide`}>
                            Score: <span className={`font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{score}</span> / {quizQuestions.length}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className={`p-6 rounded-3xl ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'} border flex flex-col items-center justify-center gap-1 group/stat hover:bg-white/10 transition-colors`}>
                                <div className={`text-[10px] ${subTextClass} uppercase tracking-widest font-bold`}>Accuracy</div>
                                <div className={`text-3xl font-black ${passed ? 'text-green-400' : 'text-red-400'}`}>{percentage}%</div>
                            </div>
                            <div className={`p-6 rounded-3xl ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'} border flex flex-col items-center justify-center gap-1 group/stat hover:bg-white/10 transition-colors`}>
                                <div className={`text-[10px] ${subTextClass} uppercase tracking-widest font-bold`}>Status</div>
                                <div className={`text-3xl font-black text-white`}>{passed ? 'PASS' : 'RETRY'}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {challengeId ? (
                                <>
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl mb-4 animate-in slide-in-from-top-2">
                                        <div className="flex items-center justify-center gap-2 text-purple-400 font-bold text-sm mb-1">
                                            <Swords size={18} /> Challenge Submitted!
                                        </div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Your score of {score} has been recorded in the duel.</p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/challenges')}
                                        className="w-full py-5 rounded-2xl bg-purple-600 text-white hover:bg-purple-500 font-bold text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                                    >
                                        <Trophy className="w-5 h-5" /> View Challenge Results
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setScore(0);
                                        setUserAnswers({});
                                        setEssayResults({});
                                        setCurrentIndex(0);
                                        setView('quiz');
                                    }}
                                    className={`w-full py-5 rounded-2xl ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} font-bold text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3`}
                                >
                                    <RefreshCcw className="w-5 h-5" /> Try Again
                                </button>
                            )}
                            <button
                                onClick={() => onHome ? onHome() : setView('home')}
                                className={`w-full py-5 rounded-2xl ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black'} border font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3`}
                            >
                                <Home className="w-5 h-5" /> Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    if (view === 'history') {

        const getMostWrongQuestions = () => {
            const wrongCounts: Record<string, { count: number, question: any }> = {};
            history.forEach(attempt => {
                attempt.wrongAnswers.forEach(q => {
                    const key = q.question;
                    if (!wrongCounts[key]) {
                        wrongCounts[key] = { count: 0, question: q };
                    }
                    wrongCounts[key].count++;
                });
            });
            return Object.values(wrongCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);
        };

        const mostWrong = getMostWrongQuestions();

        return (
            <div className={`min-h-screen ${isDark ? 'bg-[#030303]' : 'bg-gray-50'} ${textClass} p-4 relative overflow-hidden flex flex-col items-center transition-colors duration-500`}>

                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-white/5 opacity-20 mix-blend-overlay" />
                    <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] ${isDark ? 'bg-purple-900/10' : 'bg-purple-200/40'} rounded-full blur-[150px] animate-pulse-slow`} />
                    <div className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] ${isDark ? 'bg-blue-900/10' : 'bg-blue-200/40'} rounded-full blur-[150px] animate-pulse-slow delay-1000`} />
                </div>

                <div className="w-full max-w-4xl z-10 flex flex-col h-full pt-20">

                    <div className="fixed top-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
                        <div className={`pointer-events-auto max-w-2xl w-full ${isDark ? 'bg-[#0A0A0A]/80 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-2xl rounded-full border shadow-2xl p-2 px-6 flex items-center justify-between`}>
                            <h2 className={`text-lg font-black uppercase tracking-tighter ${textClass}`}>Activity History</h2>
                            <button
                                onClick={() => onHome ? onHome() : setView('home')}
                                className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'} transition-all`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pb-12">
                        {mostWrong.length > 0 && (
                            <div className="space-y-6">
                                <h3 className={`text-xs font-bold ${subTextClass} uppercase tracking-[0.2em] flex items-center gap-2 pl-2`}>
                                    <AlertCircle className="w-4 h-4 text-red-500" /> Focus Areas
                                </h3>
                                <div className="grid gap-4 md:grid-cols-3">
                                    {mostWrong.map((item, idx) => (
                                        <div key={idx} className={`${isDark ? 'bg-[#0A0A0A]/60 border-white/5' : 'bg-white/80 border-gray-200'} p-6 rounded-[1.5rem] border transition-all hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.1)] group backdrop-blur-xl relative overflow-hidden`}>
                                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="flex items-center justify-between mb-4 relative z-10">
                                                <div className="text-red-500 font-black text-4xl">{item.count}<span className="text-base align-top opactiy-50 ml-1">x</span></div>
                                                <div className="p-2 bg-red-500/10 rounded-xl text-red-500 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <XCircle className="w-5 h-5" />
                                                </div>
                                            </div>

                                            <div className={`text-[10px] ${subTextClass} uppercase tracking-wider mb-2`}>Often Missed</div>
                                            <div className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'} line-clamp-2 leading-relaxed tracking-tight`}>
                                                <FormattedText text={item.question.question} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            <h3 className={`text-xs font-bold ${subTextClass} uppercase tracking-[0.2em] flex items-center gap-2 pl-2`}>
                                <BookOpen className="w-4 h-4 text-purple-500" /> Recent Sessions
                            </h3>
                            {history.length === 0 ? (
                                <div className={`text-center py-24 rounded-[2rem] border border-dashed ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-300 bg-gray-50'}`}>
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                                        <BookOpen className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <p className={`${textClass} font-bold text-lg`}>No attempts recorded</p>
                                    <p className={`${subTextClass} text-sm mt-2`}>Complete a quiz to start building your history.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {history.slice().reverse().map((attempt) => (
                                        <button
                                            key={attempt.id}
                                            onClick={() => setSelectedAttempt(attempt)}
                                            className={`w-full group relative overflow-hidden ${isDark ? 'bg-[#0A0A0A]/60 border-white/5 hover:border-white/20' : 'bg-white/80 border-gray-200 hover:border-purple-300'} p-6 rounded-[1.5rem] border text-left transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] backdrop-blur-xl`}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                            <div className="flex justify-between items-center relative z-10">
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${attempt.score / attempt.total >= 0.6 ? 'bg-green-500/10 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}`}>
                                                        {attempt.score / attempt.total >= 0.6 ? <Award className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
                                                    </div>
                                                    <div>
                                                        <div className={`text-[10px] ${subTextClass} uppercase tracking-wider mb-1.5 flex items-center gap-2`}>
                                                            <span>{new Date(attempt.date).toLocaleDateString()}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                            <span>{new Date(attempt.date).toLocaleTimeString()}</span>
                                                        </div>
                                                        <h3 className={`text-xl font-black ${textClass} group-hover:text-purple-400 transition-colors tracking-tight`}>
                                                            {categories.find(c => c.id === attempt.category)?.label || attempt.category}
                                                        </h3>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8">
                                                    <div className="text-right hidden sm:block">
                                                        <div className={`text-[10px] ${subTextClass} uppercase tracking-wider mb-0.5`}>Score</div>
                                                        <div className={`text-3xl font-black ${attempt.score / attempt.total >= 0.6 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {attempt.score}<span className="text-base opacity-40 text-gray-500">/{attempt.total}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`w-10 h-10 rounded-full border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all group-hover:scale-110`}>
                                                        <ArrowRight className={`w-5 h-5 ${subTextClass} group-hover:text-black transition-colors`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {selectedAttempt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className={`w-full max-w-3xl max-h-[90vh] ${isDark ? 'bg-[#0A0A0A] border-white/10 shadow-[0_0_50px_rgba(168,85,247,0.1)]' : 'bg-white border-gray-200'} border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300`}>
                            <div className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-gray-200'} flex justify-between items-center bg-white/5`}>
                                <div>
                                    <div className={`text-[10px] ${subTextClass} uppercase tracking-[0.2em] mb-1`}>Attempt Details</div>
                                    <h3 className={`text-xl font-black ${textClass} flex items-center gap-2`}>
                                        {categories.find(c => c.id === selectedAttempt.category)?.label || selectedAttempt.category}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedAttempt(null)}
                                    className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'} transition-colors`}
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="flex justify-center mb-10">
                                    <div className={`text-center p-8 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${isDark ? 'border-white/5' : 'border-gray-200'} min-w-[280px]`}>
                                        <div className={`text-[10px] ${subTextClass} uppercase tracking-[0.2em] mb-3`}>Final Score</div>
                                        <div className={`text-6xl font-black ${selectedAttempt.score / selectedAttempt.total >= 0.6 ? 'text-green-500' : 'text-red-500'} drop-shadow-sm`}>
                                            {selectedAttempt.score}/{selectedAttempt.total}
                                        </div>
                                    </div>
                                </div>

                                {selectedAttempt.wrongAnswers.length > 0 ? (
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-bold text-red-500 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                            <AlertCircle className="w-4 h-4" /> Incorrect Answers
                                        </h4>
                                        {selectedAttempt.wrongAnswers.map((q, i) => (
                                            <div key={i} className={`${isDark ? 'bg-red-500/5 border-red-500/10' : 'bg-red-50 border-red-100'} border rounded-2xl p-6`}>
                                                <div className={`font-medium ${textClass} mb-6 text-lg leading-relaxed font-serif`}>
                                                    <FormattedText text={q.question} />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-white text-red-600 border border-red-100'}`}>
                                                        <span className="block text-[10px] font-bold opacity-70 uppercase mb-1 tracking-wider">Your Answer</span>
                                                        <p className="font-bold text-lg">{q.userAnswer?.option || "Skipped"}</p>
                                                    </div>
                                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-white text-green-600 border border-green-100'}`}>
                                                        <span className="block text-[10px] font-bold opacity-70 uppercase mb-1 tracking-wider">Correct Answer</span>
                                                        <p className="font-bold text-lg">{q.answer}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                                            <Award className="w-10 h-10" />
                                        </div>
                                        <h3 className={`text-2xl font-black ${textClass} mb-2`}>Perfect Score!</h3>
                                        <p className={subTextClass}>You answered all questions correctly. Outstanding work!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    }
}
