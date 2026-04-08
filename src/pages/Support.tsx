import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MessageCircle, Send, ArrowLeft, Loader2, Plus, 
    CheckCircle2, Clock, X, Layout, ShieldCheck, 
    Sparkles, MessageSquare, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supportService, SupportTicket, SupportMessage } from '../services/supportService';
import { Avatar } from '../components/UIComponents';

export default function Support() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);
    const [newTicketSubject, setNewTicketSubject] = useState('');
    const [newTicketMessage, setNewTicketMessage] = useState('');
    const [creatingTicket, setCreatingTicket] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) loadTickets();
    }, [user]);

    useEffect(() => {
        if (!activeTicket) return;
        loadMessages(activeTicket.id);
        const ch = supportService.subscribeToMessages(activeTicket.id, (msg) => {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        });
        return () => { ch.unsubscribe(); };
    }, [activeTicket?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const data = await supportService.getMyTickets();
            setTickets(data);
            if (data.length > 0 && !activeTicket) setActiveTicket(data[0]);
        } catch (err) {
            console.error('Failed to load tickets', err);
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

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMsg.trim() || !activeTicket || !user) return;

        const content = newMsg.trim();
        setNewMsg('');
        setSending(true);
        try {
            const msg = await supportService.sendMessage(activeTicket.id, content);
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        } catch (err) {
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        const subject = newTicketSubject.trim();
        const message = newTicketMessage.trim();
        if (!subject || !message) return;

        setCreatingTicket(true);
        try {
            const ticket = await supportService.createTicket(subject, message);
            setTickets(prev => [ticket, ...prev]);
            setActiveTicket(ticket);
            setShowNewTicketModal(false);
            setNewTicketSubject('');
            setNewTicketMessage('');
        } catch (err) {
            alert('Failed to create ticket');
        } finally {
            setCreatingTicket(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
                    <p className="text-gray-500 font-medium">Redirecting to sign in...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row h-screen overflow-hidden font-inter">
            
            <aside className={`w-full md:w-80 border-r border-white/5 bg-black/40 flex flex-col shrink-0 transition-all duration-300 ${activeTicket ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <ArrowLeft size={18} className="text-gray-400" />
                        </button>
                        <h1 className="text-xl font-black tracking-tighter">Support</h1>
                    </div>
                    <button 
                        onClick={() => setShowNewTicketModal(true)}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="p-12 text-center space-y-4">
                            <Loader2 size={24} className="animate-spin text-purple-500 mx-auto opacity-40" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Loading Tickets...</p>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="p-12 text-center space-y-4 opacity-40">
                            <MessageCircle size={32} className="mx-auto text-gray-500" />
                            <p className="text-xs font-medium text-gray-400 italic">No support tickets found</p>
                            <button 
                                onClick={() => setShowNewTicketModal(true)}
                                className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300"
                            >
                                Start your first inquiry
                            </button>
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => setActiveTicket(ticket)}
                                className={`w-full p-4 rounded-2xl text-left transition-all duration-300 border ${
                                    activeTicket?.id === ticket.id 
                                    ? 'bg-purple-600/10 border-purple-500/30 shadow-lg' 
                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-sm truncate ${activeTicket?.id === ticket.id ? 'text-white' : 'text-gray-300'}`}>
                                        {ticket.subject}
                                    </h3>
                                    {ticket.status === 'resolved' ? (
                                        <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                                    ) : (
                                        <Clock size={12} className="text-yellow-500 shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest opacity-40">
                                    <span>#{ticket.id.slice(0, 6)}</span>
                                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-purple-500/20 p-0.5">
                            <Avatar url={profile?.avatar_url} name={profile?.full_name} size="100%" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{profile?.full_name}</p>
                            <p className="text-[10px] text-gray-500 font-medium">Student Account</p>
                        </div>
                    </div>
                </div>
            </aside>

            {activeTicket ? (
                <main className="flex-1 flex flex-col min-w-0 bg-[#08090C] relative">
                    <header className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-xl shrink-0 z-20">
                        <div className="flex items-center gap-4 min-w-0">
                            <button onClick={() => setActiveTicket(null)} className="md:hidden p-2 hover:bg-white/5 rounded-xl text-gray-400">
                                <ArrowLeft size={18} />
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
                                <ShieldCheck size={20} className="text-purple-400" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-bold text-sm text-white truncate">{activeTicket.subject}</h2>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${activeTicket.status === 'resolved' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{activeTicket.status}</p>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="flex justify-center py-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    <Sparkles size={12} className="text-purple-400" /> inquiry started on {new Date(activeTicket.created_at).toLocaleString()}
                                </div>
                            </div>

                            {messages.map((msg, i) => {
                                const isMe = msg.sender_id === user.id;
                                return (
                                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-lg shrink-0 mb-1">
                                                {msg.is_admin_reply ? (
                                                    <div className="w-full h-full bg-purple-600/20 flex items-center justify-center">
                                                        <ShieldCheck size={14} className="text-purple-400" />
                                                    </div>
                                                ) : (
                                                    <Avatar 
                                                        url={msg.sender?.avatar_url} 
                                                        name={msg.sender?.full_name} 
                                                        size="100%" 
                                                    />
                                                )}
                                            </div>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                                                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xl border transition-all ${
                                                    isMe 
                                                    ? 'bg-purple-600 text-white rounded-br-none border-purple-500 shadow-purple-900/20' 
                                                    : 'bg-[#1A1C22] border-white/5 text-gray-200 rounded-bl-none shadow-black/40'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                                <p className={`text-[9px] font-black uppercase tracking-widest px-1 opacity-40 ${isMe ? 'text-right' : 'text-left'}`}>
                                                    {msg.is_admin_reply ? 'The Cohort Support' : 'Sent by You'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black/20 shrink-0">
                        <div className="max-w-3xl mx-auto">
                            <form onSubmit={handleSendMessage} className="relative group">
                                <textarea
                                    value={newMsg}
                                    onChange={e => setNewMsg(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder="Type your message..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all resize-none h-14 custom-scrollbar"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMsg.trim() || sending}
                                    className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                                >
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </form>
                            <p className="text-[10px] text-gray-600 mt-3 text-center font-bold tracking-widest uppercase opacity-60">
                                Powered by The Cohort Support System
                            </p>
                        </div>
                    </div>
                </main>
            ) : (
                <main className="flex-1 hidden md:flex items-center justify-center bg-[#08090C] text-center p-12">
                    <div className="max-w-xs space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-purple-600/10 rounded-3xl border border-purple-500/20 flex items-center justify-center mx-auto shadow-2xl">
                            <ShieldCheck size={40} className="text-purple-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-white tracking-tight italic">How can we help?</h2>
                            <p className="text-sm text-gray-500 font-medium">Select a ticket from the sidebar or start a new inquiry to chat with our support team.</p>
                        </div>
                        <button 
                            onClick={() => setShowNewTicketModal(true)}
                            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-900/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Open New Ticket
                        </button>
                    </div>
                </main>
            )}

            {showNewTicketModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowNewTicketModal(false); }}>
                    <div className="w-full max-w-md bg-[#0A0C10] border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-purple-500/5">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Plus size={14} className="text-purple-400" /> New Support Ticket
                            </h3>
                            <button onClick={() => setShowNewTicketModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Subject</label>
                                <input
                                    required
                                    value={newTicketSubject}
                                    onChange={e => setNewTicketSubject(e.target.value)}
                                    placeholder="What do you need help with?"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Message</label>
                                <textarea
                                    required
                                    value={newTicketMessage}
                                    onChange={e => setNewTicketMessage(e.target.value)}
                                    placeholder="Describe your issue in detail..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 h-32 resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newTicketSubject.trim() || !newTicketMessage.trim() || creatingTicket}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                            >
                                {creatingTicket ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                                Create Inquiry
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
