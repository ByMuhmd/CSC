import { supabase } from '../lib/supabase';

export interface MessageReport {
    id: string;
    reporter_id: string;
    message_id: string;
    group_id: string;
    reason: string;
    details?: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    created_at: string;
    reporter?: { full_name: string; avatar_url: string };
    group?: { name: string };
    message?: { id: string; content: string; user_id: string; group_id: string; author?: { full_name: string; avatar_url: string } };
}

export const reportService = {
    async reportMessage(report: { message_id: string; group_id: string; reason: string; details?: string }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { error } = await supabase
            .from('message_reports')
            .insert({
                ...report,
                reporter_id: user.id,
                status: 'pending'
            });

        if (error) throw error;
    },

    async getAllReports(): Promise<MessageReport[]> {
        const { data, error } = await supabase
            .from('message_reports')
            .select(`
                *,
                reporter:profiles(full_name, avatar_url),
                group:study_groups(name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const reports = data as any[];
        const msgIds = [...new Set(reports.map(r => r.message_id))];
        const { data: messages } = await supabase
            .from('group_messages')
            .select('id, content, user_id, group_id')
            .in('id', msgIds);

        const msgMap = Object.fromEntries((messages || []).map(m => [m.id, m]));

        const authorIds = [...new Set((messages || []).map(m => m.user_id))];
        const { data: authors } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', authorIds);
        const authorMap = Object.fromEntries((authors || []).map(a => [a.id, a]));

        return reports.map(r => ({
            ...r,
            message: msgMap[r.message_id] ? {
                ...msgMap[r.message_id],
                author: authorMap[msgMap[r.message_id].user_id]
            } : undefined
        })) as MessageReport[];
    },

    async updateReportStatus(reportId: string, status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'): Promise<void> {
        const { error } = await supabase
            .from('message_reports')
            .update({ status })
            .eq('id', reportId);
        if (error) throw error;
    }
};
