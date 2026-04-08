import { useState, useEffect, useCallback } from 'react';
import { db, CACHE_KEYS } from '../lib/db';
import { courseService, CourseModule } from '../services/courseService';

interface UseCourseDataReturn {
    modules: CourseModule[];
    resources: any[];
    subject: any;
    loading: boolean;
    error: any;
    refresh: () => Promise<void>;
    isOffline: boolean;
}

export function useCourseData(subjectId: string, includeContent: boolean = true): UseCourseDataReturn {
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const [subject, setSubject] = useState<any>(null);

    const loadData = useCallback(async (forceNetwork = false) => {
        if (!subjectId) {
            setModules([]);
            setResources([]);
            setSubject(null);
            setLoading(false);
            return;
        }

        const modulesCacheKey = CACHE_KEYS.COURSE_CONTENT(subjectId) + (includeContent ? '' : '_lite');
        const resourcesCacheKey = `course-resources-${subjectId}`;
        const subjectCacheKey = `subject-details-${subjectId}`;

        try {
            if (!forceNetwork) {
                const [cachedModules, cachedResources, cachedSubject] = await Promise.all([
                    db.get<CourseModule[]>(modulesCacheKey),
                    db.get<any[]>(resourcesCacheKey),
                    db.get<any>(subjectCacheKey)
                ]);

                if (cachedModules) setModules(cachedModules);
                if (cachedResources) setResources(cachedResources);
                if (cachedSubject) setSubject(cachedSubject);

                if (cachedModules || cachedResources) {
                    setLoading(false);
                }
            }

            if (navigator.onLine) {
                const [modulesData, resourcesData, subjectData] = await Promise.all([
                    courseService.getCourseContent(subjectId, includeContent),
                    courseService.getSubjectResources(subjectId),
                    courseService.getSubject(subjectId)
                ]);

                setModules(modulesData || []);
                setResources(resourcesData || []);
                setSubject(subjectData);

                await Promise.all([
                    db.set(modulesCacheKey, modulesData || []),
                    db.set(resourcesCacheKey, resourcesData || []),
                    db.set(subjectCacheKey, subjectData)
                ]);

                setError(null);
            } else {
                setIsOffline(true);
            }

        } catch (err) {
            console.error("Failed to load course data:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [subjectId, includeContent]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            loadData();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadData]);

    return {
        modules,
        resources,
        subject,
        loading,
        error,
        refresh: () => loadData(true),
        isOffline
    };
}
