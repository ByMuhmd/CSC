import { useCallback, useEffect, useState } from 'react';
import { db } from '../lib/db';
import { eventService, CalendarEvent } from '../services/eventService';
import { buildSmartNotificationFeed, SmartNotificationFeed } from '../utils/smartNotifications';

interface CachedSmartSchedule {
    events: CalendarEvent[];
    syncedAt: string;
}

const getCacheKey = (academicYear?: string | null) => `smart-schedule-${academicYear || 'all'}`;

const emptyFeed = (): SmartNotificationFeed => ({
    items: [],
    focusMode: false,
    focusReason: null,
    nextExam: null,
    nextAssignment: null,
    nextLecture: null,
    suppressedLectures: 0
});

export function useSmartSchedule(academicYear?: string | null) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [feed, setFeed] = useState<SmartNotificationFeed>(emptyFeed);
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

    const loadSchedule = useCallback(async (forceNetwork = false) => {
        const cacheKey = getCacheKey(academicYear);

        try {
            if (!forceNetwork) {
                const cached = await db.get<CachedSmartSchedule>(cacheKey);
                if (cached?.events?.length) {
                    setEvents(cached.events);
                    setFeed(buildSmartNotificationFeed(cached.events));
                    setLastSyncedAt(cached.syncedAt || null);
                    setLoading(false);
                }
            }

            if (!navigator.onLine) {
                setIsOffline(true);
                return;
            }

            const upcomingEvents = await eventService.getUpcomingEvents(academicYear);
            const validEvents = upcomingEvents.filter((event) => !Number.isNaN(new Date(event.date).getTime()));
            const syncedAt = new Date().toISOString();

            setEvents(validEvents);
            setFeed(buildSmartNotificationFeed(validEvents));
            setLastSyncedAt(syncedAt);
            setIsOffline(false);
            await db.set(cacheKey, { events: validEvents, syncedAt });
        } catch (error) {
            console.error('Failed to load smart schedule', error);

            const cached = await db.get<CachedSmartSchedule>(cacheKey);
            if (cached?.events?.length) {
                setEvents(cached.events);
                setFeed(buildSmartNotificationFeed(cached.events));
                setLastSyncedAt(cached.syncedAt || null);
                setIsOffline(true);
            }
        } finally {
            setLoading(false);
        }
    }, [academicYear]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            loadSchedule(true);
        };

        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadSchedule]);

    return {
        events,
        feed,
        loading,
        isOffline,
        lastSyncedAt,
        refresh: () => loadSchedule(true)
    };
}