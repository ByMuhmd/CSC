import { supabase } from '../lib/supabase';

export interface FeedbackItem {
    id: string;
    user_id?: string;
    type: 'bug' | 'suggestion' | 'contact' | 'other';
    message: string;
    contact_info?: string;
    status: 'open' | 'resolved' | 'ignored';
    created_at: string;
    user?: {
        full_name?: string;
        username?: string;
        avatar_url?: string;
    };
}

export const feedbackService = {

    async submitFeedback(feedback: { type: string; message: string; contact_info?: string }) {

        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            ...feedback,
            user_id: user?.id || null,
            status: 'open'
        };

        const { data, error } = await supabase
            .from('feedback')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getAllFeedback() {
        const { data, error } = await supabase
            .from('feedback')
            .select(`
                id,
                user_id,
                type,
                message,
                contact_info,
                status,
                created_at,
                user:profiles(full_name, username, avatar_url)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as FeedbackItem[];
    },

    async updateStatus(id: string, status: 'open' | 'resolved' | 'ignored') {
        const { data, error } = await supabase
            .from('feedback')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteFeedback(id: string) {
        const { error } = await supabase
            .from('feedback')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
