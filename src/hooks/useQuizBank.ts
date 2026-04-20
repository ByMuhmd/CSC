import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { normalizeQuizQuestion } from '../utils/quiz';
import { subjectMatches } from '../utils/subjects';

interface UseQuizBankReturn {
    questions: any[];
    categories: any[];
    loading: boolean;
    loadingQuestions: boolean;
    fetchQuestionsForQuiz: (quizId: string) => Promise<any[]>;
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

    if (!navigator.onLine) {
        try {
            const { SEMESTERS } = await import('../data/semesters');
            for (const sem of SEMESTERS) {
                const found = sem.subjects.find((s: any) =>
                    s.id === subjectId || s.name === subjectId ||
                    s.id?.toLowerCase() === subjectId?.toLowerCase() ||
                    s.name?.toLowerCase() === subjectId?.toLowerCase()
                );
                if (found) {
                    resolvesLog[subjectId] = found.id;
                    return found.id;
                }
            }
        } catch (e) {
            console.debug('Could not resolve subject from local data:', e);
        }
        return null;
    }

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
    const [questions, setQuestions] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const cacheVersion = 'v8';

    const loadDefinitions = useCallback(async (forceNetwork = false) => {
        if (!subjectId) {
            setLoading(false);
            return;
        }

        const cacheKeyCategories = `quiz-categories-${cacheVersion}-${semesterId || 'any'}-${subjectId}`;

        try {
            if (!forceNetwork) {
                const cachedCategories = await db.get<any[]>(cacheKeyCategories);
                if (cachedCategories && cachedCategories.length > 0) {
                    setCategories(cachedCategories);
                    setLoading(false);
                }
            }

            if (navigator.onLine) {
                console.log("useQuizBank: Resolving subject:", subjectId);
                const resolvedSubjectId = await resolveSubjectToId(subjectId);
                console.log("useQuizBank: Resolved to UUID:", resolvedSubjectId);

                let resolvedQuizzes: any[] = [];

                if (resolvedSubjectId) {
                    console.log("useQuizBank: Fetching quizzes for subject(s)...");
                    
                    const { data: siblingSubjects } = await supabase
                        .from('subjects')
                        .select('id')
                        .ilike('name', subjectId || '');
                    
                    const subjectIds = Array.from(new Set([
                        resolvedSubjectId, 
                        ...(siblingSubjects?.map(s => s.id) || [])
                    ]));

                    const { data: quizzes, error: quizError } = await supabase
                        .from('quizzes')
                        .select('id, title, description, time_limit, shuffle_questions, shuffle_options, is_published, is_private, subject_id, semester_id')
                        .in('subject_id', subjectIds)
                        .eq('is_published', true)
                        .or('is_private.is.null,is_private.eq.false');

                    if (quizError) {
                        console.error("useQuizBank: Error fetching quizzes:", quizError);
                        throw quizError;
                    }
                    resolvedQuizzes = quizzes || [];
                    console.log(`useQuizBank: Found ${resolvedQuizzes.length} published quizzes for subject IDs:`, subjectIds);
                }

                if (resolvedQuizzes.length === 0) {
                    console.log("useQuizBank: No quizzes found by ID, searching by title/name fallback...");
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

                    const allPossibleQuizzes = fallbackQuizzes || [];
                    
                    resolvedQuizzes = allPossibleQuizzes.filter((quiz: any) => {
                        const quizSubject = Array.isArray(quiz.subjects) ? quiz.subjects[0] : quiz.subjects;
                        const semesterMatches = semesterId
                            ? String(quiz.semester_id ?? quizSubject?.semester_id ?? '') === String(semesterId)
                            : true;

                        const nameMatch = subjectMatches(subjectId || '', quizSubject?.id, quizSubject?.name);
                        const cleanSubjectId = (subjectId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        const titleMatch = quiz.title && cleanSubjectId ? 
                            (quiz.title.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanSubjectId)) : false;

                        return semesterMatches && (nameMatch || titleMatch);
                    });

                    if (resolvedQuizzes.length === 0) {
                        console.log("useQuizBank: No quizzes found with semester filter, trying without it...");
                        resolvedQuizzes = allPossibleQuizzes.filter((quiz: any) => {
                            const quizSubject = Array.isArray(quiz.subjects) ? quiz.subjects[0] : quiz.subjects;
                            const nameMatch = subjectMatches(subjectId || '', quizSubject?.id, quizSubject?.name);
                            const cleanSubjectId = (subjectId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                            const titleMatch = quiz.title && cleanSubjectId ? 
                                (quiz.title.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanSubjectId)) : false;
                            
                            return nameMatch || titleMatch;
                        });
                    }
                    console.log("useQuizBank: Fuzzy fallback found:", resolvedQuizzes.length, "quizzes");
                }

                if (resolvedQuizzes.length === 0) {
                    console.log("useQuizBank: Running final diagnostic check...");
                    const { data: allQuizzes } = await supabase
                        .from('quizzes')
                        .select('id, title, is_published, is_private, subject_id, subjects(name)')
                        .limit(500);
                    
                    const matches = (allQuizzes || []).filter(q => {
                        const quizSubject = Array.isArray(q.subjects) ? q.subjects[0] : q.subjects;
                        const nameMatch = subjectMatches(subjectId || '', q.subject_id, quizSubject?.name);
                        const cleanSubjectId = (subjectId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        const titleMatch = q.title && cleanSubjectId && q.title.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanSubjectId);
                        return nameMatch || titleMatch;
                    });

                    if (matches.length > 0) {
                        const unpublished = matches.filter(m => !m.is_published).length;
                        const privateCount = matches.filter(m => m.is_private).length;
                        console.warn(`[DIAGNOSTIC] Found ${matches.length} total quizzes for "${subjectId}":`);
                        console.warn(`- ${unpublished} are UNPUBLISHED (Draft)`);
                        console.warn(`- ${privateCount} are PRIVATE (Direct link only)`);
                        console.warn(`- ${matches.length - unpublished - privateCount} should be visible but failed filters.`);
                        console.warn("Check Admin Panel to ensure they are marked as PUBLISHED and NOT PRIVATE.");
                    } else {
                        console.log("useQuizBank: Diagnostic found 0 quizzes in DB matching this subject name/title.");
                    }
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
    }, [subjectId, semesterId]);

    const fetchQuestionsForQuiz = useCallback(async (quizId: string) => {
        setLoadingQuestions(true);
        const cacheKeyQuestions = `quiz-questions-${cacheVersion}-${semesterId || 'any'}-${subjectId || 'any'}-${quizId}`;
        let cachedQuestions: any[] | undefined;

        try {
            cachedQuestions = await db.get<any[]>(cacheKeyQuestions);
            if (cachedQuestions) {
                setQuestions(cachedQuestions);
                setLoadingQuestions(false);
                if (!navigator.onLine) return cachedQuestions;
            }

            if (!navigator.onLine) {
                setLoadingQuestions(false);
                return cachedQuestions || [];
            }

            if (navigator.onLine) {
                const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

                let query = supabase.from('questions').select('*');

                if (quizId === 'general') {
                    const resolvedSubId = await resolveSubjectToId(subjectId);
                    if (!resolvedSubId) {
                        setQuestions([]);
                        setLoadingQuestions(false);
                        return cachedQuestions || [];
                    }

                    const { data: subjectQuizzes } = await supabase
                        .from('quizzes')
                        .select('id')
                        .eq('subject_id', resolvedSubId)
                        .eq('is_published', true)
                        .or('is_private.is.null,is_private.eq.false');

                    if (!subjectQuizzes || subjectQuizzes.length === 0) {
                        setQuestions([]);
                        setLoadingQuestions(false);
                        return cachedQuestions || [];
                    }

                    const quizIds = subjectQuizzes.map((q: any) => q.id);
                    query = query.in('quiz_id', quizIds);
                } else if (!isUUID(quizId)) {
                    setQuestions([]);
                    setLoadingQuestions(false);
                    return cachedQuestions || [];
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
                setError(null);
                return mappedQuestions;
            }

            return cachedQuestions || [];
        } catch (err) {
            console.error("Failed to load questions:", err);
            setError(err);
            return cachedQuestions || [];
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
        loadingQuestions,
        fetchQuestionsForQuiz,
        error,
        refresh: () => loadDefinitions(true),
        isOffline
    };
}
