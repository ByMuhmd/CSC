import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

type EventRow = {
    id: string;
    title: string;
    date: string;
    type: 'exam' | 'assignment' | 'event' | 'lecture' | 'lab';
    is_recurring?: boolean | null;
    day_of_week?: string | null;
    time?: string | null;
    academic_year?: string | null;
};

type ReminderSettings = {
    enabled: boolean;
    exam_hours_before: number;
    assignment_hours_before: number;
    lecture_minutes_before: number;
    dispatch_window_minutes: number;
};

const DEFAULT_SETTINGS: ReminderSettings = {
    enabled: true,
    exam_hours_before: 24,
    assignment_hours_before: 24,
    lecture_minutes_before: 5,
    dispatch_window_minutes: 10
};

const isAdminRole = (role: string | null | undefined) =>
    ['admin', 'super_admin', 'moderator'].includes(String(role || '').toLowerCase());

const parseHHMM = (value?: string | null) => {
    if (!value) return { hours: 0, minutes: 0 };
    const [h, m] = value.split(':').map((v) => Number(v));
    return {
        hours: Number.isFinite(h) ? h : 0,
        minutes: Number.isFinite(m) ? m : 0
    };
};

const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
};

const nextRecurringOccurrence = (event: EventRow, now = new Date()) => {
    if (!event.day_of_week) return null;
    const targetDay = dayMap[String(event.day_of_week).toLowerCase()];
    if (targetDay === undefined) return null;

    const { hours, minutes } = parseHHMM(event.time);
    const candidate = new Date(now);
    candidate.setHours(hours, minutes, 0, 0);

    const currentDay = now.getDay();
    let dayOffset = targetDay - currentDay;

    if (dayOffset < 0 || (dayOffset === 0 && candidate.getTime() < now.getTime())) {
        dayOffset += 7;
    }

    candidate.setDate(now.getDate() + dayOffset);
    return candidate;
};

const buildReminderMeta = (event: EventRow, eventTimeMs: number, settings: ReminderSettings) => {
    if (event.type === 'exam') {
        return {
            kind: 'exam_advance',
            fireAt: eventTimeMs - settings.exam_hours_before * 60 * 60 * 1000,
            title: 'Exam Reminder',
            message: `${event.title} starts in ${settings.exam_hours_before} hours.`,
            level: 'warning' as const
        };
    }

    if (event.type === 'assignment') {
        return {
            kind: 'assignment_advance',
            fireAt: eventTimeMs - settings.assignment_hours_before * 60 * 60 * 1000,
            title: 'Assignment Reminder',
            message: `${event.title} is due in ${settings.assignment_hours_before} hours.`,
            level: 'info' as const
        };
    }

    if (event.type === 'lecture' || event.type === 'lab' || event.type === 'event') {
        return {
            kind: 'lecture_advance',
            fireAt: eventTimeMs - settings.lecture_minutes_before * 60 * 1000,
            title: 'Lecture Reminder',
            message: `${event.title} starts in ${settings.lecture_minutes_before} minutes.`,
            level: 'info' as const
        };
    }

    return null;
};

const safeEqual = (left: string, right: string) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
};

const authorize = async (req: VercelRequest, admin: ReturnType<typeof createClient>) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (req.method === 'GET' && String(req.headers['x-vercel-cron'] || '').toLowerCase() === '1') {
        return { ok: true, source: 'vercel-cron' as const };
    }

    if (req.method === 'GET') {
        return { ok: false, source: 'cron-only' as const };
    }

    const cronSecret = process.env.CRON_SECRET || process.env.REMINDER_DISPATCH_SECRET;
    if (cronSecret && safeEqual(token, cronSecret)) {
        return { ok: true, source: 'cron-secret' as const };
    }

    if (!token) return { ok: false, source: 'missing-token' as const };

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData?.user?.id) {
        return { ok: false, source: 'invalid-user-token' as const };
    }

    const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (!isAdminRole(profile?.role)) {
        return { ok: false, source: 'not-admin' as const };
    }

    return { ok: true, source: 'admin-token' as const };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        return res.status(500).json({ success: false, message: 'Missing server env for Supabase service role' });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const admin = createClient(url, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });

    const auth = await authorize(req, admin);
    if (!auth.ok) {
        if (req.method === 'GET') {
            return res.status(404).json({ success: false, message: 'Not Found' });
        }
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const { data: settingsRow } = await admin
            .from('app_settings')
            .select('setting_value')
            .eq('setting_key', 'notification_reminder_settings')
            .maybeSingle();

        const settings: ReminderSettings = {
            ...DEFAULT_SETTINGS,
            ...(settingsRow?.setting_value || {})
        };

        if (!settings.enabled) {
            return res.status(200).json({ success: true, message: 'Reminder dispatch disabled', inserted: 0 });
        }

        const now = Date.now();
        const dispatchWindowMs = Math.max(1, settings.dispatch_window_minutes) * 60 * 1000;
        const lookaheadMs = Math.max(settings.exam_hours_before, settings.assignment_hours_before) * 60 * 60 * 1000 + dispatchWindowMs;

        const { data: oneTimeEvents, error: oneTimeError } = await admin
            .from('events')
            .select('id,title,date,type,is_recurring,academic_year')
            .is('is_recurring', false)
            .gte('date', new Date(now - dispatchWindowMs).toISOString())
            .lte('date', new Date(now + lookaheadMs).toISOString());

        if (oneTimeError) throw oneTimeError;

        const { data: recurringEvents, error: recurringError } = await admin
            .from('events')
            .select('id,title,type,is_recurring,day_of_week,time,academic_year')
            .eq('is_recurring', true);

        if (recurringError) throw recurringError;

        const normalized: Array<{ event: EventRow; eventTimeMs: number }> = [];

        for (const event of (oneTimeEvents || []) as EventRow[]) {
            const ts = new Date(event.date).getTime();
            if (!Number.isNaN(ts)) normalized.push({ event, eventTimeMs: ts });
        }

        for (const event of (recurringEvents || []) as EventRow[]) {
            const occurrence = nextRecurringOccurrence(event);
            if (!occurrence) continue;
            const ts = occurrence.getTime();
            if (ts >= now - dispatchWindowMs && ts <= now + lookaheadMs) {
                normalized.push({ event, eventTimeMs: ts });
            }
        }

        let inserted = 0;

        for (const item of normalized) {
            const { event, eventTimeMs } = item;

            if (!event.academic_year) {
                continue;
            }

            const reminder = buildReminderMeta(event, eventTimeMs, settings);
            if (!reminder) continue;

            const fireAt = reminder.fireAt;
            const isDue = now >= fireAt && now < fireAt + dispatchWindowMs && now < eventTimeMs;
            if (!isDue) continue;

            const targetAudience = `year:${event.academic_year}`;
            const scheduledForIso = new Date(fireAt).toISOString();

            const { error: reserveError } = await admin.from('reminder_dispatch_log').insert({
                event_id: event.id,
                reminder_kind: reminder.kind,
                scheduled_for: scheduledForIso,
                target_audience: targetAudience,
                notification_id: null
            });

            if (reserveError) {
                const conflictMessage = String((reserveError as any).message || '').toLowerCase();
                if (conflictMessage.includes('duplicate') || conflictMessage.includes('unique') || conflictMessage.includes('already exists')) {
                    continue;
                }
                throw reserveError;
            }

            const { data: notification, error: insertError } = await admin
                .from('notifications')
                .insert({
                    title: reminder.title,
                    message: reminder.message,
                    type: reminder.level,
                    target_audience: targetAudience,
                    created_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (insertError) throw insertError;

            const { error: updateLogError } = await admin
                .from('reminder_dispatch_log')
                .update({ notification_id: notification?.id || null })
                .eq('event_id', event.id)
                .eq('reminder_kind', reminder.kind)
                .eq('scheduled_for', scheduledForIso);

            if (updateLogError) {
                console.error('Failed to finalize reminder dispatch log', updateLogError);
                if (notification?.id) {
                    await admin.from('notifications').delete().eq('id', notification.id);
                }
                await admin
                    .from('reminder_dispatch_log')
                    .delete()
                    .eq('event_id', event.id)
                    .eq('reminder_kind', reminder.kind)
                    .eq('scheduled_for', scheduledForIso);
                continue;
            }

            inserted += 1;
        }

        return res.status(200).json({
            success: true,
            inserted
        });
    } catch (error: any) {
        console.error('Reminder dispatch failed', error);
        return res.status(500).json({ success: false, message: 'Dispatch failed' });
    }
}
