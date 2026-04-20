import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import QuizPage from '../components/QuizPage';
import { supabase } from '../lib/supabase';
import { PageLoader } from '../components/AppShell';
import { useQuizBank } from '../hooks/useQuizBank';
import { subjectMatches } from '../utils/subjects';
import { normalizeQuizQuestion } from '../utils/quiz';
import { SEMESTERS } from '../data/semesters';
import { useMaintenance } from '../hooks/useMaintenance';
import MaintenancePage from './MaintenancePage';

export default function SubjectQuiz() {
    const { semesterId, subjectId } = useParams();
    const [searchParams] = useSearchParams();
    const quizId = searchParams.get('quizId');
    const challengeId = searchParams.get('challengeId');
    const generatedQuestionLimit = Number(searchParams.get('limit') || searchParams.get('questions') || 0) || undefined;
    const generatedTimeLimit = Number(searchParams.get('time') || searchParams.get('minutes') || 0) || undefined;
    const isGeneratedQuiz = quizId === 'general';
    const [challengeChallengerId, setChallengeChallengerId] = useState(searchParams.get('challengerId'));
    const { questions, categories, loading: quizLoading, error, fetchQuestionsForQuiz, loadingQuestions, isOffline } = useQuizBank(subjectId, semesterId);
    
    const [subject, setSubject] = useState<any>(null);
    const [semester, setSemester] = useState<any>(null);
    const [subjectLoading, setSubjectLoading] = useState(true);
    const [fallbackQuizCategory, setFallbackQuizCategory] = useState<any | null>(null);
    const [challengeQuestions, setChallengeQuestions] = useState<any[]>([]);
    const [challengeLoading, setChallengeLoading] = useState(false);
    const { isSystemMaintenance, isQuizzesHidden } = useMaintenance();

    useEffect(() => {
        const fetchData = async () => {
            if (!subjectId || !semesterId) return;
            try {
                const isSemesterWideChallenge = challengeId && subjectId === 'all';
                const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const semesterDefinition = SEMESTERS.find(sem => String(sem.id) === String(semesterId));
                
                let resolvedSubjectId = subjectId;
                if (isSemesterWideChallenge) {
                    const semesterLabel = semesterDefinition?.title || `Semester ${semesterId}`;
                    setSubject({ id: 'all', name: `${semesterLabel} Subjects`, materials: [] });

                    const [semRes, subjectRows] = await Promise.all([
                        supabase.from('semesters').select('*').eq('id', semesterId).single(),
                        Promise.resolve(semesterDefinition?.subjects || [])
                    ]);

                    if (semRes.data) setSemester(semRes.data);
                    else if (semesterDefinition) setSemester(semesterDefinition);

                    const subjectIds = subjectRows.map((subject: any) => subject.id).filter(Boolean);

                    if (challengeId) {
                        setChallengeLoading(true);
                        if (subjectIds.length > 0) {
                            const { data: challengeQuizzes, error: challengeQuizError } = await supabase
                                .from('quizzes')
                                .select('id')
                                .in('subject_id', subjectIds)
                                .eq('is_published', true)
                                .or('is_private.is.null,is_private.eq.false');

                            if (challengeQuizError) {
                                throw challengeQuizError;
                            }

                            const challengeQuizIds = (challengeQuizzes || []).map((quiz: any) => quiz.id);
                            if (challengeQuizIds.length > 0) {
                                const { data: rawChallengeQuestions, error: challengeQuestionsError } = await supabase
                                    .from('questions')
                                    .select('*')
                                    .in('quiz_id', challengeQuizIds)
                                    .order('order', { ascending: true });

                                if (challengeQuestionsError) {
                                    throw challengeQuestionsError;
                                }

                                const normalizedChallengeQuestions = (rawChallengeQuestions || [])
                                    .map((question: any) => normalizeQuizQuestion(question, 'challenge'))
                                    .filter(Boolean)
                                    .map((question: any) => ({ ...question, category: 'challenge' }));

                                setChallengeQuestions(normalizedChallengeQuestions);
                            } else {
                                setChallengeQuestions([]);
                            }
                        } else {
                            setChallengeQuestions([]);
                        }
                    } else {
                        setChallengeQuestions([]);
                    }

                    setFallbackQuizCategory(null);
                    return;
                }

                if (!isUUID(subjectId)) {
                    let { data: sub } = await supabase.from('subjects').select('id, name').eq('id', subjectId).maybeSingle();

                    if (!sub) {
                        const { data: subByName } = await supabase.from('subjects').select('id, name').eq('name', subjectId).maybeSingle();
                        sub = subByName;
                    }
                    
                    if (!sub) {
                        const { data: subIdCase } = await supabase.from('subjects').select('id, name').ilike('id', subjectId).limit(1).maybeSingle();
                        sub = subIdCase;
                    }

                    if (!sub) {
                        const { data: subCase } = await supabase.from('subjects').select('id, name').ilike('name', subjectId).limit(1).maybeSingle();
                        sub = subCase;
                    }

                    if (!sub) {
                        const { data: subPartial } = await supabase.from('subjects').select('id, name').ilike('name', `%${subjectId}%`).limit(1).maybeSingle();
                        sub = subPartial;
                    }

                    if (!sub) {
                        const { data: allSubjects } = await supabase.from('subjects').select('id, name');
                        const fuzzyMatch = (allSubjects || []).find((candidate: any) => subjectMatches(subjectId, candidate.id, candidate.name));
                        if (fuzzyMatch) sub = fuzzyMatch;
                    }

                    if (sub) {
                        resolvedSubjectId = sub.id;
                    } else {
                        import('../data/semesters').then(({ SEMESTERS }) => {
                            for (const sem of SEMESTERS) {
                                const foundSub = sem.subjects.find(s => s.id === subjectId);
                                if (foundSub) {
                                    setSubject(foundSub);
                                    setSemester(sem);
                                    break;
                                }
                            }
                            setSubjectLoading(false);
                        });
                        return;
                    }
                }

                const [subRes, semRes] = await Promise.all([
                    supabase.from('subjects').select('*, materials(*)').eq('id', resolvedSubjectId).single(),
                    supabase.from('semesters').select('*').eq('id', semesterId).single()
                ]);

                if (subRes.data) setSubject(subRes.data);
                if (semRes.data) setSemester(semRes.data);

                if (challengeId && !challengeChallengerId) {
                    const { data } = await supabase.from('challenges').select('challenger_id').eq('id', challengeId).single();
                    if (data) setChallengeChallengerId(data.challenger_id);
                }

                if (challengeId) {
                    setChallengeLoading(true);
                    const { data: challengeQuizzes, error: challengeQuizError } = await supabase
                        .from('quizzes')
                        .select('id')
                        .eq('subject_id', resolvedSubjectId)
                        .eq('is_published', true)
                        .or('is_private.is.null,is_private.eq.false');

                    if (challengeQuizError) {
                        throw challengeQuizError;
                    }

                    const challengeQuizIds = (challengeQuizzes || []).map((quiz: any) => quiz.id);
                    if (challengeQuizIds.length > 0) {
                        const { data: rawChallengeQuestions, error: challengeQuestionsError } = await supabase
                            .from('questions')
                            .select('*')
                            .in('quiz_id', challengeQuizIds)
                            .order('order', { ascending: true });

                        if (challengeQuestionsError) {
                            throw challengeQuestionsError;
                        }

                        const normalizedChallengeQuestions = (rawChallengeQuestions || [])
                            .map((question: any) => normalizeQuizQuestion(question, 'challenge'))
                            .filter(Boolean)
                            .map((question: any) => ({ ...question, category: 'challenge' }));

                        setChallengeQuestions(normalizedChallengeQuestions);
                    } else {
                        setChallengeQuestions([]);
                    }
                } else {
                    setChallengeQuestions([]);
                }

                if (quizId && !isGeneratedQuiz) {
                    const { data: quizData } = await supabase
                        .from('quizzes')
                        .select('id, title, description, time_limit, shuffle_questions, shuffle_options')
                        .eq('id', quizId)
                        .maybeSingle();

                    if (quizData) {
                        setFallbackQuizCategory({
                            id: quizData.id,
                            label: quizData.title,
                            description: quizData.description || '',
                            timeLimit: quizData.time_limit,
                            shuffleQuestions: quizData.shuffle_questions !== false,
                            shuffleOptions: quizData.shuffle_options !== false
                        });
                    } else {
                        setFallbackQuizCategory(null);
                    }
                } else {
                    setFallbackQuizCategory(null);
                }
            } catch (err) {
                console.error('Failed to load subject quiz data:', err);
            } finally {
                setChallengeLoading(false);
                setSubjectLoading(false);
            }
        };
        fetchData();
    }, [subjectId, semesterId, challengeId, quizId]);

    if (quizLoading || subjectLoading || challengeLoading) return <PageLoader />;

    if (isSystemMaintenance) {
        return <MaintenancePage scope="system" />;
    }

    if (isQuizzesHidden) {
        return <MaintenancePage scope="quizzes" />;
    }

    if (!semester || !subject) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Subject Not Found</h1>
                    <Link to="/" className="text-purple-400 hover:text-purple-300">Return Home</Link>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center text-red-500">
                    <h1 className="text-2xl font-bold mb-4">
                        {isOffline ? 'No Connection' : 'Error Loading Quiz'}
                    </h1>
                    <p>{isOffline ? 'You are offline. Cached content will be used if available.' : (error as any).message || "Failed to load"}</p>
                    {!isOffline && <button onClick={() => window.location.reload()} className="mt-4 text-white underline">Retry</button>}
                </div>
            </div>
        );
    }

    const files = subject.materials 
        ? subject.materials
            .filter((m: any) => m.category === 'exam')
            .map((m: any) => ({ label: m.title, url: m.url, type: m.type }))
        : [];

    const resolvedCategories = challengeId
        ? [{
            id: 'challenge',
            label: `${subject.name} Challenge`,
            description: '10 random questions � 5 minutes',
            timeLimit: 5,
            shuffleQuestions: true,
            shuffleOptions: true
        }]
        : isGeneratedQuiz
            ? [{
                id: 'general',
                label: `${subject.name} Questions`,
                description: `Generated Quiz from ${subject.name} Question Bank`,
                timeLimit: undefined,
                shuffleQuestions: true,
                shuffleOptions: true
            }]
            : categories.length > 0
                ? categories
                : fallbackQuizCategory
                    ? [fallbackQuizCategory]
                    : [];

    return (
        <QuizPage
            title={subject.name.toUpperCase()}
            subtitle={challengeId ? `${semester.title} Challenge` : isGeneratedQuiz ? `${semester.title} Generated Quiz` : `${semester.title} Quiz Bank`}
            questions={challengeId ? challengeQuestions : questions}
            storageKey={`quiz_${semesterId}_${subjectId}_v2`}
            categories={resolvedCategories}
            files={files}
            fetchQuestions={fetchQuestionsForQuiz}
            loadingQuestions={loadingQuestions}
            subjectTitle={subject.name}
            initialCategory={challengeId ? 'challenge' : (isGeneratedQuiz ? 'general' : quizId || undefined)}
            autoStart={!challengeId}
            challengeId={challengeId}
            challengeChallengerId={challengeChallengerId}
            questionLimit={challengeId ? 10 : generatedQuestionLimit}
            timeLimit={challengeId ? 5 : generatedTimeLimit}
        />
    );
}
