import { supabase } from '../lib/supabase';

export interface SupportTicket {
    id: string;
    user_id: string;
    subject: string;
    status: 'open' | 'resolved' | 'closed';
    created_at: string;
    user?: { full_name: string; avatar_url: string };
    last_message?: SupportMessage;
}

export interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string;
    content: string;
    is_admin_reply: boolean;
    created_at: string;
    sender?: { full_name: string; avatar_url: string };
}

export const supportService = {
    async createTicket(subject: string, initialContent?: string): Promise<SupportTicket> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({ user_id: user.id, subject, status: 'open' })
            .select()
            .single();

        if (ticketError) {
            console.error('Failed to create ticket:', ticketError);
            throw ticketError;
        }

        if (initialContent) {
            const { error: msgError } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: ticket.id,
                    sender_id: user.id,
                    content: initialContent,
                    is_admin_reply: false
                });
            
            if (msgError) {
                console.error('Failed to create initial message:', msgError);
                await supabase.from('support_tickets').delete().eq('id', ticket.id);
                throw new Error('Failed to create support ticket message. Please try again.');
            }
        }

        return ticket as SupportTicket;
    },

    async getMyTickets(): Promise<SupportTicket[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as SupportTicket[];
    },

    async getAllTickets(): Promise<SupportTicket[]> {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, user:profiles(full_name, avatar_url)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as SupportTicket[];
    },

    async getMessages(ticketId: string): Promise<SupportMessage[]> {
        const { data, error } = await supabase
            .from('support_messages')
            .select(`
                *,
                sender:profiles(full_name, avatar_url)
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as SupportMessage[];
    },

    async sendMessage(ticketId: string, content: string, isAdmin: boolean = false): Promise<SupportMessage> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, full_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError) throw profileError;

        const role = profile?.role;
        const canReplyAsAdmin = role === 'super_admin' || role === 'admin' || role === 'moderator';
        if (isAdmin && !canReplyAsAdmin) {
            throw new Error('Unauthorized admin reply attempt.');
        }

        const isAdminReply = isAdmin && canReplyAsAdmin;

        const { data, error } = await supabase
            .from('support_messages')
            .insert({
                ticket_id: ticketId,
                sender_id: user.id,
                content,
                is_admin_reply: isAdminReply
            })
            .select()
            .single();

        if (error) throw error;

        await supabase.from('support_tickets').update({ status: 'open' }).eq('id', ticketId);

        return { ...data, sender: profile || undefined } as SupportMessage;
    },

    async updateTicketStatus(ticketId: string, status: 'open' | 'resolved' | 'closed'): Promise<void> {
        const { error } = await supabase
            .from('support_tickets')
            .update({ status })
            .eq('id', ticketId);
        if (error) throw error;
    },

    subscribeToMessages(ticketId: string, onMessage: (msg: SupportMessage) => void) {
        return supabase
            .channel(`support_${ticketId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'support_messages', 
                filter: `ticket_id=eq.${ticketId}` 
            }, async (payload) => {
                const row = payload.new as any;
                const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', row.sender_id).maybeSingle();
                onMessage({ ...row, sender: profile || undefined } as SupportMessage);
            })
            .subscribe();
    }
};
