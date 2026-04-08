import { supabase } from '../lib/supabase';

export const interestService = {
    async registerInterest(subjectId: string, email?: string, userId?: string) {

        const normalizedSubjectId = subjectId?.trim();
        const normalizedEmail = email?.trim().toLowerCase();

        if (!normalizedSubjectId) throw new Error('Subject ID is required');
        if (!userId && !normalizedEmail) throw new Error('Email or User ID required');

        const payload = {
            subject_id: normalizedSubjectId,
            user_id: userId || null,
            email: normalizedEmail || null
        };

        const { error } = await supabase
            .from('subject_interests')
            .insert(payload);

        const duplicate = String((error as any)?.message || '').toLowerCase();
        if (error && !(duplicate.includes('duplicate') || duplicate.includes('unique'))) {
            throw error;
        }

        return true;
    },

    async checkInterest(subjectId: string, userId?: string, email?: string) {
        const normalizedSubjectId = subjectId?.trim();
        const normalizedEmail = email?.trim().toLowerCase();

        if (!normalizedSubjectId || (!userId && !normalizedEmail)) return false;

        let query = supabase
            .from('subject_interests')
            .select('id')
            .eq('subject_id', normalizedSubjectId);

        if (userId) {
            query = query.eq('user_id', userId);
        } else if (normalizedEmail) {
            query = query.eq('email', normalizedEmail);
        }

        const { data, error } = await query.maybeSingle();

        if (error && error.code !== 'PGRST116') console.error("Error checking interest:", error);

        return !!data;
    }
};
