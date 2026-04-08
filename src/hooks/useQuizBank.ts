import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { normalizeQuizQuestion } from '../utils/quiz';
import { subjectMatches } from '../utils/subjects';

interface UseQuizBankReturn {
    questions: any[];
    categories: any[];
    loading: boolean;
    loadingQuestions: boolean; // Added
    fetchQuestionsForQuiz: (quizId: string) => Promise<void>; // Added
    error: any;
    refresh: () => Promise<void>;
    isOffline: boolean;
}

const resolvesLog: Record<string, string> = {};

const resolveSubjectToId = async (subjectId: string | undefined): Promise<string | null> => {
    if (!subjectId) return null;
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    if (isUUID(subjectId)) return subjectId;
    if (resolvesLog[subjectId]) return resolvesLog[subjectId];

    const { data: exactIdMatch } = await supabase.from('subjects').select('id').eq('id', subjectId).maybeSingle();
    if (exactIdMatch) {
        resolvesLog[subjectId] = exactIdMatch.id;
        return exactIdMatch.id;
    }

    const { data: exactMatch } = await supabase.from('subjects').select('id').eq('name', subjectId).maybeSingle();
    if (exactMatch) {
        resolvesLog[subjectId] = exactMatch.id;
        return exactMatch.id;
    }

    const { data: exactIdCase } = await supabase.from('subjects').select('id').ilike('id', subjectId).limit(1).maybeSingle();
    if (exactIdCase) {
        resolvesLog[subjectId] = exactIdCase.id;
        return exactIdCase.id;
    }

    const { data: exactMatchCase } = await supabase.from('subjects').select('id').ilike('name', subjectId).limit(1).maybeSingle();
    if (exactMatchCase) {
        resolvesLog[subjectId] = exactMatchCase.id;
        return exactMatchCase.id;
    }

    const { data: partialMatch } = await supabase.from('subjects').select('id').ilike('name', `%${subjectId}%`).limit(1).maybeSingle();
    if (partialMatch) {
        resolvesLog[subjectId] = partialMatch.id;
        return partialMatch.id;
    }

    const { data: allSubjects } = await supabase.from('subjects').select('id, name');
    const fuzzyMatch = (allSubjects || []).find((subject: any) => subjectMatches(subjectId, subject.id, subject.name));
    if (fuzzyMatch) {
        resolvesLog[subjectId] = fuzzyMatch.id;
        return fuzzyMatch.id;
    }

    return null;
};

export function useQuizBank(subjectId: string | undefined, semesterId?: string): UseQuizBankReturn {
    const [questions, setQuestions] = useState<any[]>([]); // Current loaded questions
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const cacheVersion = 'v3';
    const loadDefinitions = useCallback(async (forceNetwork = false) => {
        if (!subjectId) {
            setLoading(false);
            return;
        }

        const cacheKeyCategories = `quiz-categories-${cacheVersion}-${semesterId || 'any'}-${subjectId}`;

        try {
            if (!forceNetwork) {
                const cachedCategories = await db.get<any[]>(cacheKeyCategories);
                if (cachedCategories) {
                    setCategories(cachedCategories);
                    setLoading(false);
                }
            }

            if (navigator.onLine) {
                const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                
                let resolvedSubjectId = subjectId;
                
                console.log("useQuizBank: Resolving subject:", subjectId);
                resolvedSubjectId = await resolveSubjectToId(subjectId);
                console.log("useQuizBank: Resolved to UUID:", resolvedSubjectId);

                if (!resolvedSubjectId) {
                    setCategories([]);
                    setLoading(false);
                    return;
                }

                const { data: quizzes, error: quizError } = await supabase
                    .from('quizzes')
                    .select('id, title, description, time_limit, shuffle_questions, shuffle_options, is_published, is_private')
                    .eq('subject_id', resolvedSubjectId)
                    .eq('is_published', true)
                    .or('is_private.is.null,is_private.eq.false');

                console.log("useQuizBank: Fetched quizzes:", quizzes);
                if (quizError) {
                    console.error("useQuizBank: Error fetching quizzes:", quizError);
                    throw quizError;
                }

                let resolvedQuizzes = quizzes || [];

                if (resolvedQuizzes.length === 0) {
                    const { data: fallbackQuizzes, error: fallbackError } = await supabase
                        .from('quizzes')
                        .select(`
                            id,
                            title,
                            description,
                            time_limit,
                            shuffle_questions,
                            shuffle_options,
                            is_published,
                            is_private,
                            semester_id,
                            subjects (
                                id,
                                name,
                                semester_id
                            )
                        `)
                        .eq('is_published', true)
                        .or('is_private.is.null,is_private.eq.false');

                    if (fallbackError) {
                        throw fallbackError;
                    }

                    resolvedQuizzes = (fallbackQuizzes || []).filter((quiz: any) => {
                        const quizSubject = Array.isArray(quiz.subjects) ? quiz.subjects[0] : quiz.subjects;
                        const semesterMatches = semesterId
                            ? String(quiz.semester_id ?? quizSubject?.semester_id ?? '') === String(semesterId)
                            : true;

                        return semesterMatches && subjectMatches(subjectId || '', quizSubject?.id, quizSubject?.name);
                    });
                }

                const newCategories = resolvedQuizzes.map((q: any) => ({
                    id: q.id,
                    label: q.title,
                    description: q.description || '',
                    timeLimit: q.time_limit,
                    shuffleQuestions: q.shuffle_questions !== false,
                    shuffleOptions: q.shuffle_options !== false
                }));

                setCategories(newCategories);
                await db.set(cacheKeyCategories, newCategories);
                setError(null);
            } else {
                setIsOffline(true);
            }

        } catch (err) {
            console.error("Failed to load quiz categories:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [subjectId]);
    const fetchQuestionsForQuiz = useCallback(async (quizId: string) => {
        setLoadingQuestions(true);
        const cacheKeyQuestions = `quiz-questions-${cacheVersion}-${quizId}`;

        try {
            const cachedQuestions = await db.get<any[]>(cacheKeyQuestions);
            if (cachedQuestions) {
                setQuestions(cachedQuestions);
                setLoadingQuestions(false);
                if (!navigator.onLine) return;
            }

            if (navigator.onLine) {
                const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                
                let query = supabase.from('questions').select('*');
                
                if (quizId === 'general') {
                    const resolvedSubId = await resolveSubjectToId(subjectId);
                    if (!resolvedSubId) {
                        setQuestions([]);
                        setLoadingQuestions(false);
                        return;
                    }
                    query = query.eq('subject_id', resolvedSubId);
                } else if (!isUUID(quizId)) {
                    setQuestions([]);
                    setLoadingQuestions(false);
                    return;
                } else {
                    query = query.eq('quiz_id', quizId);
                }

                const { data: rawQuestions, error: qError } = await query.order('order', { ascending: true });

                if (qError) throw qError;

                const mappedQuestions = (rawQuestions || [])
                    .map((q: any) => normalizeQuizQuestion(q, quizId))
                    .filter(Boolean);

                setQuestions(mappedQuestions);
                await db.set(cacheKeyQuestions, mappedQuestions);
            }
        } catch (err) {
            console.error("Failed to load questions:", err);


            setError(err);
        } finally {
            setLoadingQuestions(false);
        }
    }, [subjectId, semesterId]);

    useEffect(() => {
        loadDefinitions();
    }, [loadDefinitions]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            loadDefinitions();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadDefinitions]);

    return {
        questions,
        categories,
        loading,
        loadingQuestions, // New state
        fetchQuestionsForQuiz, // New function
        error,
        refresh: () => loadDefinitions(true),
        isOffline
    };
}
