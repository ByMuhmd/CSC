import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import QuizPage from '../components/QuizPage';
import { PageLoader } from '../components/AppShell';
import { Loader2, AlertTriangle, ArrowLeft, Layers, FileText, ArrowRight, Clock } from 'lucide-react';
import { normalizeQuizQuestion } from '../utils/quiz';
import { normalizeQuizAccessCode, normalizeQuizLookupValue } from '../utils/quizAccess';
import { useAuth } from '../context/AuthContext';

export default function DirectQuizPage() {
    const { quizId } = useParams();
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const challengeId = searchParams.get('challengeId');
    const customQuestionLimit = Number(searchParams.get('limit') || searchParams.get('questions') || 0) || undefined;
    const customTimeLimit = Number(searchParams.get('time') || searchParams.get('minutes') || 0) || undefined;
    const [challengeData, setChallengeData] = useState<any>(null);
    const [quiz, setQuiz] = useState<any>(null);
    const [multipleQuizzes, setMultipleQuizzes] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        if (quizId) fetchQuiz();
    }, [quizId]);

    const fetchQuiz = async () => {
        setLoading(true);
        try {
            let qQuery = supabase.from('quizzes').select(`*, subjects(name, semesters(title))`);
            const normalizedQuizValue = normalizeQuizLookupValue(quizId);
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedQuizValue || '');

            if (isUUID) {
                qQuery = qQuery.eq('id', normalizedQuizValue);
            } else {
                qQuery = qQuery.eq('access_code', normalizeQuizAccessCode(normalizedQuizValue));
            }

            const { data: quizzesData, error: quizError } = await qQuery;

            if (quizError || !quizzesData || quizzesData.length === 0) throw new Error("Quiz not found");

            const accessibleQuizzes = quizzesData.filter((q: any) => {
                if (q.is_published) return true;
                if (!user) return false;
                return q.submitted_by === user.id || isAdmin;
            });

            if (accessibleQuizzes.length === 0) {
                throw new Error("This quiz is currently unavailable.");
            }

            if (accessibleQuizzes.length > 1) {
                setMultipleQuizzes(accessibleQuizzes);
                setLoading(false);
                return;
            }

            const quizData = accessibleQuizzes[0];
            setQuiz(quizData);
            
            await fetchQuizQuestions(quizData);

            if (challengeId) {
                const { data: challenge, error: challengeErr } = await supabase
                    .from('challenges')
                    .select('*')
                    .eq('id', challengeId)
                    .maybeSingle();
                if (!challengeErr) setChallengeData(challenge);
            }

        } catch (err: any) {
            console.error("Error fetching quiz:", err);
            setError(err.message || "Failed to load quiz");
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizQuestions = async (quizData: any) => {
        setLoading(true);
        try {
            const { data: questionsData, error: qError } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', quizData.id)
                .order('order', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: true });

            if (qError) throw qError;
            const transformedQuestions = (questionsData || [])
                .map((q: any) => normalizeQuizQuestion(q, quizData.id))
                .filter(Boolean);

            setQuestions(transformedQuestions);
        } catch (err: any) {
            console.error("Error fetching questions:", err);
            setError(err.message || "Failed to load questions");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <PageLoader />;
    if (multipleQuizzes.length > 0 && !quiz) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 opacity-20" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6">
                            <Layers className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Select a Quiz</h1>
                        <p className="text-gray-400">Multiple quizzes found for code: <span className="text-purple-400 font-mono font-bold uppercase">{quizId}</span></p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {multipleQuizzes.map((q) => (
                            <button
                                key={q.id}
                                onClick={() => {
                                    setQuiz(q);
                                    fetchQuizQuestions(q);
                                }}
                                className="group relative bg-[#0A0C10] border border-white/10 p-6 rounded-2xl text-left hover:border-purple-500/50 hover:bg-white/5 transition-all duration-300 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                                    <ArrowRight className="text-purple-500" />
                                </div>
                                
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold group-hover:text-purple-300 transition-colors">{q.title}</h3>
                                        <p className="text-gray-500 text-sm mt-1">{q.subjects?.name || 'Private Quiz'}</p>
                                        <div className="flex gap-4 mt-4 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                            <span className="flex items-center gap-1.5"><Clock size={12} /> {q.time_limit || '∞'} Min</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-4 text-gray-500 font-bold hover:text-white transition-colors"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="text-center max-w-md bg-[#0A0C10] border border-white/10 p-8 rounded-2xl shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <AlertTriangle size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Unavailable</h1>
                    <p className="text-gray-400 mb-8">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all w-full flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={18} />
                        Return Home
                    </button>
                </div>
            </div>
        );
    }
    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 opacity-20" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 max-w-lg w-full bg-[#0A0C10] border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                        <Loader2 className="w-8 h-8 text-white animate-spin-slow" />
                    </div>

                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">{quiz.title}</h1>
                        <p className="text-gray-400 text-lg">{quiz.subjects?.name || 'Private Quiz'}</p>
                    </div>

                    <div className="flex justify-center gap-8 py-6 border-y border-white/5">
                        <div className="text-center">
                            <p className="text-2xl font-bold font-mono">{questions.length}</p>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500">Questions</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold font-mono">{quiz.time_limit || '∞'}</p>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500">Minutes</p>
                        </div>
                    </div>

                    {quiz.description && <p className="text-sm text-gray-500">{quiz.description}</p>}

                    <div className="space-y-3">
                        <button
                            onClick={() => setHasStarted(true)}
                            className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Start Quiz
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 text-gray-500 font-bold hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <QuizPage
            title={quiz.title}
            subtitle={quiz.subjects?.name || 'Private Quiz'}
            questions={questions}
            storageKey={`quiz_direct_${quiz.id}`}
            categories={[{ id: quiz.id, label: 'General', description: 'All Questions' }]}
            files={[]}
            fetchQuestions={async () => { }}
            loadingQuestions={false}
            subjectTitle={quiz.subjects?.name}
            shuffleQuestions={quiz.shuffle_questions !== false}
            shuffleOptions={quiz.shuffle_options !== false}
            initialView="quiz"
            initialCategory={quiz.id}
            challengeId={challengeId}
            challengeChallengerId={challengeData?.challenger_id}
            questionLimit={customQuestionLimit}
            timeLimit={customTimeLimit}
            onHome={() => {
                if (quiz.semester_id && quiz.subject_id) {
                    navigate(`/quizzes/${quiz.semester_id}/${quiz.subject_id}`);
                } else if (quiz.semester_id) {
                    navigate(`/quizzes/${quiz.semester_id}`);
                } else {
                    navigate('/quizzes');
                }
            }}
        />
    );
}
