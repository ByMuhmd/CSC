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

type ProfileLite = {
    id: string;
    full_name: string;
    avatar_url: string;
};

const mapProfilesById = (profiles: ProfileLite[] | null) =>
    Object.fromEntries((profiles || []).map((p) => [p.id, p]));

const notifyAdminTeam = async (title: string, message: string) => {
    try {
        await supabase.from('notifications').insert([
            { title, message, type: 'info', target_audience: 'super_admin' },
            { title, message, type: 'info', target_audience: 'admin' },
            { title, message, type: 'info', target_audience: 'moderator' }
        ]);
    } catch (err) {
        console.error('Failed to notify admin team:', err);
    }
};

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

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        const senderName = profile?.full_name || 'A student';
        notifyAdminTeam(
            'New Support Inquiry',
            `${senderName} started a new ticket: "${subject}"`
        );

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
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tickets = (data || []) as SupportTicket[];
        const userIds = [...new Set(tickets.map((t) => t.user_id).filter(Boolean))];
        if (userIds.length === 0) return tickets;

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

        const profileMap = mapProfilesById((profiles || []) as ProfileLite[]);
        return tickets.map((ticket) => ({
            ...ticket,
            user: profileMap[ticket.user_id]
                ? {
                    full_name: profileMap[ticket.user_id].full_name,
                    avatar_url: profileMap[ticket.user_id].avatar_url
                }
                : undefined
        }));
    },

    async getMessages(ticketId: string): Promise<SupportMessage[]> {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const messages = (data || []) as SupportMessage[];
        const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))];
        if (senderIds.length === 0) return messages;

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds);

        const profileMap = mapProfilesById((profiles || []) as ProfileLite[]);
        return messages.map((message) => ({
            ...message,
            sender: profileMap[message.sender_id]
                ? {
                    full_name: profileMap[message.sender_id].full_name,
                    avatar_url: profileMap[message.sender_id].avatar_url
                }
                : undefined
        }));
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

        if (!isAdminReply) {
            const senderName = profile?.full_name || 'A student';
            notifyAdminTeam(
                'New Support Message',
                `${senderName}: "${content.length > 50 ? content.substring(0, 47) + '...' : content}"`
            );
        }

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
