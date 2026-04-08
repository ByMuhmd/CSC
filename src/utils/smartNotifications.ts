import { CalendarEvent } from '../services/eventService';

export type SmartNotificationKind = 'exam' | 'assignment' | 'lecture';

export interface SmartNotificationItem {
    id: string;
    kind: SmartNotificationKind;
    title: string;
    message: string;
    timestamp: number;
    priority: number;
    event: CalendarEvent;
}

export interface SmartNotificationFeed {
    items: SmartNotificationItem[];
    focusMode: boolean;
    focusReason: string | null;
    nextExam: CalendarEvent | null;
    nextAssignment: CalendarEvent | null;
    nextLecture: CalendarEvent | null;
    suppressedLectures: number;
}

const EXAM_FOCUS_WINDOW_HOURS = 72;
const ASSIGNMENT_WINDOW_HOURS = 168;
const LECTURE_WINDOW_HOURS = 48;

const getEventTimestamp = (event: CalendarEvent) => {
    const timestamp = new Date(event.date).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
};

const formatRelativeTime = (diffInHours: number) => {
    if (diffInHours <= 0) return 'due now';
    if (diffInHours < 24) return `${Math.max(1, Math.round(diffInHours))}h away`;
    return `${Math.max(1, Math.ceil(diffInHours / 24))}d away`;
};

const toReminderText = (kind: SmartNotificationKind, diffInHours: number) => {
    const label = formatRelativeTime(diffInHours);

    if (kind === 'exam') return `Exam ${label}`;
    if (kind === 'assignment') return `Assignment ${label}`;
    return `Lecture ${label}`;
};

export function buildSmartNotificationFeed(events: CalendarEvent[], now = new Date()): SmartNotificationFeed {
    const nowTimestamp = now.getTime();
    const upcoming = events
        .map((event) => {
            const timestamp = getEventTimestamp(event);
            return timestamp === null ? null : { event, timestamp };
        })
        .filter((item): item is { event: CalendarEvent; timestamp: number } => !!item)
        .filter(({ timestamp }) => timestamp >= nowTimestamp)
        .sort((a, b) => a.timestamp - b.timestamp);

    const exams = upcoming.filter(({ event }) => event.type === 'exam');
    const assignments = upcoming.filter(({ event }) => event.type === 'assignment');
    const lectures = upcoming.filter(({ event }) => event.type === 'lecture' || event.type === 'lab' || event.type === 'event');

    const nextExam = exams[0]?.event || null;
    const nextAssignment = assignments[0]?.event || null;
    const nextLecture = lectures[0]?.event || null;
    const examFocusDiffHours = nextExam ? (getEventTimestamp(nextExam)! - nowTimestamp) / (1000 * 60 * 60) : Infinity;
    const focusMode = Number.isFinite(examFocusDiffHours) && examFocusDiffHours <= EXAM_FOCUS_WINDOW_HOURS;

    const reminders: SmartNotificationItem[] = [];

    exams.slice(0, focusMode ? 3 : 2).forEach(({ event, timestamp }) => {
        const diffHours = (timestamp - nowTimestamp) / (1000 * 60 * 60);
        reminders.push({
            id: `smart-exam-${event.id}`,
            kind: 'exam',
            title: event.title,
            message: toReminderText('exam', diffHours),
            timestamp,
            priority: 100 - Math.min(40, Math.max(0, diffHours)),
            event
        });
    });

    assignments
        .filter(({ timestamp }) => timestamp - nowTimestamp <= ASSIGNMENT_WINDOW_HOURS * 60 * 60 * 1000)
        .slice(0, 3)
        .forEach(({ event, timestamp }) => {
            const diffHours = (timestamp - nowTimestamp) / (1000 * 60 * 60);
            reminders.push({
                id: `smart-assignment-${event.id}`,
                kind: 'assignment',
                title: event.title,
                message: toReminderText('assignment', diffHours),
                timestamp,
                priority: 70 - Math.min(20, Math.max(-24, diffHours)),
                event
            });
        });

    if (!focusMode) {
        lectures
            .filter(({ timestamp }) => timestamp - nowTimestamp <= LECTURE_WINDOW_HOURS * 60 * 60 * 1000)
            .slice(0, 2)
            .forEach(({ event, timestamp }) => {
                const diffHours = (timestamp - nowTimestamp) / (1000 * 60 * 60);
                reminders.push({
                    id: `smart-lecture-${event.id}`,
                    kind: 'lecture',
                    title: event.title,
                    message: toReminderText('lecture', diffHours),
                    timestamp,
                    priority: 20 - Math.min(10, Math.max(0, diffHours)),
                    event
                });
            });
    }

    reminders.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

    return {
        items: reminders,
        focusMode,
        focusReason: focusMode && nextExam ? `Lecture reminders paused until ${new Date(nextExam.date).toLocaleString()}.` : null,
        nextExam,
        nextAssignment,
        nextLecture,
        suppressedLectures: focusMode ? lectures.length : 0
    };
}