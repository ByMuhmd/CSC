import { useState, useEffect, useCallback } from 'react';
import { courseService } from '../services/courseService';
import { db, CACHE_KEYS } from '../lib/db';

export function useLessonContent(lessonId: string | null) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (!lessonId) {
            setContent(null);
            return;
        }

        const loadContent = async () => {
            setLoading(true);
            const cacheKey = CACHE_KEYS.LESSON_CONTENT(lessonId);

            try {
                const cachedLesson = await db.get<any>(cacheKey);
                if (cachedLesson && cachedLesson.content_html) {
                    setContent(cachedLesson.content_html);
                    setLoading(false);
                }
                if (!cachedLesson) {
                    const lesson = await courseService.getLesson(lessonId);
                    if (lesson) {
                        setContent(lesson.content_html);
                        await db.set(cacheKey, lesson);
                    }
                }
            } catch (err) {
                console.error("Failed to load lesson content", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [lessonId]);

    return { content, loading, error };
}
