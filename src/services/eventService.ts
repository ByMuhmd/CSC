import { supabase } from '../lib/supabase';

export interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    type: 'exam' | 'assignment' | 'event' | 'lecture' | 'lab';
    description?: string;
    professor?: string;
    location?: string;
    lecture_time?: string;
    related_assignments?: string;
    is_recurring?: boolean;
    day_of_week?: string;
    time?: string;
    created_at?: string;
    academic_year?: string;
}

const applyAcademicYearFilter = <T extends { or: (filters: string) => T }>(query: T, academicYear?: string | number | null) => {
    if (academicYear === null || academicYear === undefined) return query;
    const normalized = String(academicYear).trim();
    if (!normalized) return query;
    const safeValue = normalized.replace(/[^a-zA-Z0-9 _-]/g, '');
    if (!safeValue) return query;
    return query.or(`academic_year.is.null,academic_year.eq.${safeValue}`);
};

export const eventService = {
    async getUpcomingEvents(academicYear?: string | null) {
        const now = new Date();
        const nowISO = now.toISOString();

        const oneTimeQuery = applyAcademicYearFilter(
            supabase
                .from('events')
                .select('*')
                .or('is_recurring.is.null,is_recurring.eq.false')
                .gte('date', nowISO),
            academicYear
        );

        const { data: oneTimeEvents, error: oneTimeError } = await oneTimeQuery.order('date', { ascending: true });

        if (oneTimeError) throw oneTimeError;

        const recurringQuery = applyAcademicYearFilter(
            supabase
                .from('events')
                .select('*')
                .eq('is_recurring', true),
            academicYear
        );

        const { data: recurringEvents, error: recurringError } = await recurringQuery;

        if (recurringError) throw recurringError;

        const recurringInstances = (recurringEvents || []).map((event: CalendarEvent) => {
            const lectureTime = event.lecture_time || event.time;
            if (!event.day_of_week || !lectureTime) return null;

            const daysMap: Record<string, number> = {
                sunday: 0,
                sun: 0,
                monday: 1,
                mon: 1,
                tuesday: 2,
                tue: 2,
                wednesday: 3,
                wed: 3,
                thursday: 4,
                thu: 4,
                friday: 5,
                fri: 5,
                saturday: 6,
                sat: 6
            };
            const targetDay = daysMap[String(event.day_of_week).trim().toLowerCase()];
            if (targetDay === undefined) return null;

            const [rawHours, rawMinutes] = String(lectureTime).split(':');
            const hours = Number.isFinite(Number(rawHours)) ? Number(rawHours) : 0;
            const minutes = Number.isFinite(Number(rawMinutes)) ? Number(rawMinutes) : 0;

            const nextDate = new Date();
            nextDate.setHours(hours, minutes, 0, 0);

            const currentDay = now.getDay();
            let dayOffset = targetDay - currentDay;

            if (dayOffset < 0 || (dayOffset === 0 && nextDate < now)) {
                dayOffset += 7;
            }

            nextDate.setDate(now.getDate() + dayOffset);

            return {
                ...event,
                date: nextDate.toISOString(),
                original_date: event.date
            };
        }).filter(Boolean) as CalendarEvent[];

        return [...(oneTimeEvents || []), ...recurringInstances].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    },

    async getPastAssignments(academicYear?: string | null) {
        return this.getPastEventsByType('assignment', academicYear);
    },

    async getPastExams(academicYear?: string | null) {
        return this.getPastEventsByType('exam', academicYear);
    },

    async getPastEventsByType(type: CalendarEvent['type'], academicYear?: string | null) {
        const nowISO = new Date().toISOString();
        const query = applyAcademicYearFilter(
            supabase
                .from('events')
                .select('*')
                .eq('type', type)
                .lt('date', nowISO),
            academicYear
        );

        const { data, error } = await query.order('date', { ascending: false }).limit(10);

        if (error) throw error;
        return data as CalendarEvent[];
    },

    async getAllEvents() {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;
        return data as CalendarEvent[];
    },

    async createEvent(event: Omit<CalendarEvent, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('events')
            .insert(event)
            .select()
            .single();

        if (error) throw error;
        return data as CalendarEvent;
    },

    async deleteEvent(id: string) {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateEvent(id: string, updates: Partial<Omit<CalendarEvent, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as CalendarEvent;
    }
};
