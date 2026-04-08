import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { shouldDeliverNotification } from '../utils/notifications';
import { useSmartSchedule } from './useSmartSchedule';
import { CalendarEvent } from '../services/eventService';

const REMINDER_STORE_KEY = 'sent_event_reminders_v1';
const MINUTE_MS = 60 * 1000;

interface ReminderSettings {
    enabled: boolean;
    exam_hours_before: number;
    assignment_hours_before: number;
    lecture_minutes_before: number;
    dispatch_window_minutes: number;
    client_fallback_enabled: boolean;
}

const DEFAULT_SETTINGS: ReminderSettings = {
    enabled: true,
    exam_hours_before: 24,
    assignment_hours_before: 24,
    lecture_minutes_before: 5,
    dispatch_window_minutes: 10,
    client_fallback_enabled: false
};

type ReminderKind = 'exam_1d' | 'assignment_1d' | 'lecture_5m';

const loadReminderStore = (): Record<string, number> => {
    try {
        const raw = localStorage.getItem(REMINDER_STORE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const saveReminderStore = (store: Record<string, number>) => {
    localStorage.setItem(REMINDER_STORE_KEY, JSON.stringify(store));
};

const getEventTimestamp = (event: CalendarEvent) => {
    const timestamp = new Date(event.date).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
};

const shouldTargetBatch = (event: CalendarEvent, academicYear?: string | null) => {
    if (!academicYear) return false;
    return String(event.academic_year || '') === String(academicYear);
};

const buildReminder = (
    event: CalendarEvent,
    settings: ReminderSettings
): { kind: ReminderKind; fireAt: number; title: string; body: string } | null => {
    const timestamp = getEventTimestamp(event);
    if (timestamp === null) return null;

    if (event.type === 'exam') {
        return {
            kind: 'exam_1d',
            fireAt: timestamp - settings.exam_hours_before * 60 * 60 * 1000,
            title: 'Exam Reminder',
            body: `${event.title} starts in ${settings.exam_hours_before} hours.`
        };
    }

    if (event.type === 'assignment') {
        return {
            kind: 'assignment_1d',
            fireAt: timestamp - settings.assignment_hours_before * 60 * 60 * 1000,
            title: 'Assignment Reminder',
            body: `${event.title} is due in ${settings.assignment_hours_before} hours.`
        };
    }

    if (event.type === 'lecture' || event.type === 'lab' || event.type === 'event') {
        return {
            kind: 'lecture_5m',
            fireAt: timestamp - settings.lecture_minutes_before * MINUTE_MS,
            title: 'Lecture Reminder',
            body: `${event.title} starts in ${settings.lecture_minutes_before} minutes.`
        };
    }

    return null;
};

export function usePushNotifications() {
    const { showToast } = useToast();
    const { profile, guest } = useAuth();
    const academicYear = profile?.academic_level || guest?.academic_level || null;
    const { events, refresh } = useSmartSchedule(academicYear);
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notifications');
            return;
        }
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            showToast('Success', 'Push notifications enabled!', 'success');
        }
    };

    const shouldShowNotification = (notification: any) => shouldDeliverNotification(notification.target_audience, {
        profileId: profile?.id,
        profileRole: profile?.role,
        guestId: guest?.id,
        hasProfile: !!profile,
        hasGuest: !!guest,
        academicYear: profile?.academic_level || guest?.academic_level || null
    });

    useEffect(() => {
        let mounted = true;

        const loadSettings = async () => {
            try {
                const { data } = await supabase
                    .from('app_settings')
                    .select('setting_value')
                    .eq('setting_key', 'notification_reminder_settings')
                    .maybeSingle();

                if (!mounted) return;
                setReminderSettings({
                    ...DEFAULT_SETTINGS,
                    ...(data?.setting_value || {})
                });
            } catch {
                if (!mounted) return;
                setReminderSettings(DEFAULT_SETTINGS);
            }
        };

        loadSettings();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (permission !== 'granted') return;

        const channel = supabase
            .channel('global_push_notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const notification = payload.new;

                    if (shouldShowNotification(notification)) {
                        new Notification(notification.title, {
                            body: notification.message,
                            icon: '/logo.png',
                            tag: notification.id
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [permission, profile?.id, profile?.role, guest?.id]);

    useEffect(() => {
        if (!academicYear || !reminderSettings.enabled || !reminderSettings.client_fallback_enabled) return;

        const checkAndNotify = () => {
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

            const now = Date.now();
            const sent = loadReminderStore();
            let changed = false;

            for (const event of events) {
                if (!shouldTargetBatch(event, academicYear)) continue;

                const timestamp = getEventTimestamp(event);
                if (timestamp === null || timestamp <= now) continue;

                const reminder = buildReminder(event, reminderSettings);
                if (!reminder) continue;

                const reminderId = `${event.id}:${reminder.kind}`;
                const alreadySent = Boolean(sent[reminderId]);
                const windowMs = Math.max(1, reminderSettings.dispatch_window_minutes) * MINUTE_MS;
                const withinWindow = now >= reminder.fireAt && now < reminder.fireAt + windowMs && now < timestamp;

                if (!alreadySent && withinWindow) {
                    new Notification(reminder.title, {
                        body: reminder.body,
                        icon: '/logo.png',
                        tag: reminderId
                    });

                    showToast(reminder.title, reminder.body, event.type === 'exam' ? 'warning' : 'info');
                    sent[reminderId] = now;
                    changed = true;
                }
            }

            if (changed) saveReminderStore(sent);
        };

        checkAndNotify();

        const minuteTimer = window.setInterval(checkAndNotify, MINUTE_MS);
        const refreshTimer = window.setInterval(() => {
            refresh();
        }, 10 * MINUTE_MS);

        return () => {
            window.clearInterval(minuteTimer);
            window.clearInterval(refreshTimer);
        };
    }, [academicYear, events, refresh, reminderSettings, showToast]);

    return { permission, requestPermission };
}
