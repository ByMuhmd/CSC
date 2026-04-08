import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Search, Send, MessageSquare, User, Clock, 
    CheckCircle, AlertCircle, RefreshCw, ChevronRight, 
    Inbox, Mail, ShieldCheck, Loader2, X 
} from 'lucide-react';
import { Avatar } from '../../components/UIComponents';
import { supportService, SupportTicket, SupportMessage } from '../../services/supportService';

export default function AdminSupport() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        const ch = supabase
            .channel('admin_support_tickets')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => {
                fetchTickets();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, () => {
                fetchTickets();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => {
                fetchTickets();
            })
            .subscribe();

        return () => {
            ch.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            fetchTickets();
        }, 10000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        if (!selectedTicket) return;
        loadMessages(selectedTicket.id);
        const ch = supportService.subscribeToMessages(selectedTicket.id, (msg) => {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        });
        const timer = window.setInterval(() => {
            loadMessages(selectedTicket.id);
        }, 5000);

        return () => {
            ch.unsubscribe();
            window.clearInterval(timer);
        };
    }, [selectedTicket?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await supportService.getAllTickets();
            setTickets(data || []);
        } catch (err) {
            console.error("Error fetching tickets:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (id: string) => {
        try {
            const data = await supportService.getMessages(id);
            setMessages(data);
        } catch (err) {
            console.error('Failed to load messages', err);
        }
    };

    const handleSendReply = async () => {
        if (!selectedTicket || !reply.trim()) return;
        setSending(true);
        const content = reply.trim();
        setReply('');
        try {
            await supportService.sendMessage(selectedTicket.id, content, true);
            loadMessages(selectedTicket.id);
        } catch (err: any) {
            alert(err?.message || "Failed to send reply.");
        } finally {
            setSending(false);
        }
    };

    const handleUpdateStatus = async (status: 'open' | 'resolved' | 'closed') => {
        if (!selectedTicket) return;
        try {
            await supportService.updateTicketStatus(selectedTicket.id, status);
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status } : t));
            setSelectedTicket(prev => prev ? { ...prev, status } : null);
        } catch (err: any) {
            alert(err?.message || "Failed to update status.");
        }
    };

    const filteredTickets = tickets.filter(t => {
        const searchLower = search.toLowerCase();
        const subjectMatch = t.subject?.toLowerCase().includes(searchLower);
        const nameMatch = t.user?.full_name?.toLowerCase().includes(searchLower);
        return subjectMatch || nameMatch;
    });

    return (
        <div className="h-[calc(100vh-160px)] flex flex-col gap-6 font-sans animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400 flex items-center gap-3">
                            <ShieldCheck className="text-purple-500" /> Support Hub
                        </h1>
                        <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Admin Session Active</span>
                        </div>
                    </div>
                    <p className="text-gray-400 mt-2 font-medium">Manage student inquiries and provide secure assistance.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchTickets}
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin text-purple-400" : "text-gray-400"} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                <div className="w-80 md:w-96 flex flex-col bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-12 text-center space-y-4">
                                <Loader2 size={24} className="animate-spin text-purple-500 mx-auto opacity-40" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Syncing Signals...</p>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="p-12 text-center text-gray-600 italic">
                                <Inbox size={32} className="mx-auto mb-4 opacity-20" />
                                No inquiries found.
                            </div>
                        ) : (
                            filteredTickets.map(ticket => (
                                <button
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`w-full p-4 border-b border-white/5 text-left transition-all hover:bg-white/[0.02] group relative ${selectedTicket?.id === ticket.id ? 'bg-purple-500/10 border-r-2 border-r-purple-500' : ''}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-11 h-11 rounded-2xl bg-gray-900 border border-white/5 overflow-hidden shrink-0">
                                            <Avatar url={ticket.user?.avatar_url} name={ticket.user?.full_name} size="100%" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-white text-xs truncate group-hover:text-purple-400 transition-colors">
                                                    {ticket.user?.full_name || 'Anonymous'}
                                                </span>
                                                <span className="text-[10px] text-gray-600 font-mono">
                                                    {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-gray-300 truncate mb-1">{ticket.subject}</p>
                                            <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block ${
                                                ticket.status === 'resolved' ? 'bg-green-500/10 text-green-500 border border-green-500/10' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/10'
                                            }`}>
                                                {ticket.status}
                                            </div>
                                        </div>
                                    </div>
                                    {ticket.status === 'open' && (
                                        <div className="absolute right-2 top-2 w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
                    {!selectedTicket ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-4">
                            <div className="p-8 rounded-[32px] bg-purple-500/5 border border-purple-500/10 animate-bounce" style={{ animationDuration: '3000ms' }}>
                                <MessageSquare size={48} className="text-purple-500/20" />
                            </div>
                            <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest text-center italic">Awaiting Transmission</h2>
                            <p className="text-sm max-w-xs text-center opacity-60">Select an inquiry to establish a secure link with the student.</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-white/10 overflow-hidden">
                                        <Avatar url={selectedTicket.user?.avatar_url} name={selectedTicket.user?.full_name} size="100%" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-lg tracking-tight">{selectedTicket.user?.full_name || 'Anonymous User'}</h3>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${selectedTicket.status === 'resolved' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                                            {selectedTicket.subject} • #{selectedTicket.id.slice(0, 8)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleUpdateStatus(selectedTicket.status === 'resolved' ? 'open' : 'resolved')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                            selectedTicket.status === 'resolved' 
                                            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20' 
                                            : 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20'
                                        }`}
                                    >
                                        Mark as {selectedTicket.status === 'resolved' ? 'Open' : 'Resolved'}
                                    </button>
                                    <button 
                                        onClick={() => setSelectedTicket(null)}
                                        className="p-2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                                {messages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center opacity-20 italic text-sm">
                                        Establishing connection...
                                    </div>
                                ) : (
                                    messages.map((msg, i) => {
                                        const isMe = msg.is_admin_reply;
                                        return (
                                            <div key={msg.id} className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300`}>
                                                {!isMe && (
                                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-lg shrink-0">
                                                        <Avatar 
                                                            url={selectedTicket.user?.avatar_url} 
                                                            name={selectedTicket.user?.full_name} 
                                                            size="100%" 
                                                        />
                                                    </div>
                                                )}
                                                {isMe && (
                                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-purple-500/30 bg-purple-500/10 flex items-center justify-center shrink-0">
                                                        <ShieldCheck size={14} className="text-purple-400" />
                                                    </div>
                                                )}
                                                <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : ''}`}>
                                                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xl transition-all border ${
                                                    isMe 
                                                    ? 'bg-purple-600 text-white rounded-br-none border-purple-500 shadow-purple-900/20' 
                                                    : 'bg-white/5 border-white/5 text-gray-200 rounded-bl-none shadow-black/40'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                                <p className={`text-[9px] font-bold text-gray-600 uppercase tracking-tighter px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                                    {isMe ? 'Admin Response Overlay' : 'Student Incoming Signal'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                                <div className="relative flex items-center gap-4 max-w-4xl mx-auto">
                                    <div className="flex-1 relative">
                                        <textarea
                                            value={reply}
                                            onChange={(e) => setReply(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                            placeholder="Encrypt response..."
                                            rows={1}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all font-medium resize-none leading-relaxed overflow-hidden h-14"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSendReply}
                                        disabled={!reply.trim() || sending}
                                        className="h-14 w-14 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 shrink-0"
                                    >
                                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-600 mt-4 text-center font-bold tracking-widest uppercase opacity-40">
                                    Responses are visible to the student in their Support Command center.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
