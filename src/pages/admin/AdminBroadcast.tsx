import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Zap, Users, Info, Shield, Filter, Eye, AlertTriangle, Sparkles, CheckCircle, Bell, Trash2, RefreshCw } from 'lucide-react';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    target_audience: string;
    created_at: string;
}

export default function AdminBroadcast() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
    const [targetAudience, setTargetAudience] = useState('all');
    const [sending, setSending] = useState(false);
    const [pulseActive, setPulseActive] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications((data || []) as Notification[]);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        setSending(true);
        setPulseActive(true);
        try {
            const { error } = await supabase.from('notifications').insert({
                title,
                message,
                type,
                target_audience: targetAudience,
                created_at: new Date().toISOString()
            });

            if (error) throw error;

            setTitle('');
            setMessage('');
            await fetchNotifications();
            alert("Broadcast Pulse Transmitted Successfully! ⚡");
            
        } catch (error: any) {
            alert("Signal Transmission Failed: " + error.message);
        } finally {
            setSending(false);
            setTimeout(() => setPulseActive(false), 2000);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this notification from the broadcast log?')) return;

        try {
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) throw error;
            setNotifications(prev => prev.filter(notification => notification.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
            alert('Failed to remove notification.');
        }
    };

    const latestNotification = notifications[0];

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-10 font-sans relative">
            
            <div className={`absolute -top-20 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] transition-all duration-1000 ${pulseActive ? 'scale-150 opacity-40' : 'scale-100 opacity-20'}`} />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-indigo-400 flex items-center gap-4">
                        <Zap className={`text-purple-500 transition-transform duration-500 ${pulseActive ? 'scale-125 rotate-12' : ''}`} /> Broadcast Pulse
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium tracking-wide">Compose announcements, review sent notifications, and manage both from one control surface.</p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Active Relay Node</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#0A0C10]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-purple-500/30">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white">Signal Composer</h2>
                                <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">Broadcasts + notifications unified here</p>
                            </div>
                        </div>

                        <form onSubmit={handleBroadcast} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Header Frequency</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter transmission title..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-600 focus:border-purple-500 focus:bg-purple-500/5 outline-none transition-all font-medium text-lg"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Core Content Payload</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Compose your broadcast signal..."
                                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-6 text-white placeholder-gray-600 focus:border-purple-500 focus:bg-purple-500/5 outline-none transition-all font-medium min-h-[180px] resize-none leading-relaxed"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Sector Target</label>
                                    <div className="relative group">
                                        <select 
                                            value={targetAudience}
                                            onChange={(e) => setTargetAudience(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-purple-500 transition-all cursor-pointer appearance-none font-bold"
                                        >
                                            <option value="all">Global (All Entities)</option>
                                            <option value="user">Registered (Verified Users)</option>
                                            <option value="guest">Anomalies (Guests)</option>
                                            <option value="super_admin">Super Admins Only</option>
                                        </select>
                                        <Filter size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none group-hover:text-purple-400 transition-colors" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Signal Intensity</label>
                                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 h-[58px]">
                                        {['info', 'success', 'warning', 'error'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setType(t as any)}
                                                className={`flex-1 flex items-center justify-center rounded-xl transition-all ${type === t ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}
                                            >
                                                {t === 'info' && <Info size={18} />}
                                                {t === 'success' && <CheckCircle size={18} />}
                                                {t === 'warning' && <AlertTriangle size={18} />}
                                                {t === 'error' && <Shield size={18} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full h-20 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xl rounded-2xl transition-all flex items-center justify-center gap-4 disabled:opacity-30 shadow-[0_10px_40px_rgba(124,58,237,0.3)] hover:shadow-[0_15px_50px_rgba(124,58,237,0.5)] active:scale-[0.98] mt-4 group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                {sending ? (
                                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send size={24} className="group-hover:translate-x-2 transition-transform" /> 
                                        ENGAGE BROADCAST PULSE
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="bg-[#0A0C10]/80 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <Bell size={20} className="text-purple-400" /> Sent History
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Latest notifications and broadcasts are shown below.</p>
                            </div>
                            <button
                                type="button"
                                onClick={fetchNotifications}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-gray-300 transition-all"
                            >
                                <RefreshCw size={16} className={loadingHistory ? 'animate-spin text-purple-400' : 'text-gray-400'} />
                                Refresh Log
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div className="p-12 text-center text-gray-500 italic">Syncing notification log...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 italic">No broadcast history yet.</div>
                        ) : (
                            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
                                {notifications.map((notification) => (
                                    <div key={notification.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-purple-500/20 transition-all group">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg flex-shrink-0 ${notification.type === 'success' ? 'border-green-500/50 bg-green-500/10 text-green-400' : notification.type === 'warning' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' : notification.type === 'error' ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-blue-500/50 bg-blue-500/10 text-blue-400'}`}>
                                                {notification.type === 'success' ? <CheckCircle size={18} /> : notification.type === 'warning' ? <AlertTriangle size={18} /> : notification.type === 'error' ? <Shield size={18} /> : <Info size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                                                    <h4 className="font-bold text-white text-lg truncate">{notification.title}</h4>
                                                    <span className="text-[10px] font-bold text-gray-500 bg-black/50 border border-white/10 px-2 py-0.5 rounded-full font-mono w-fit">
                                                        {new Date(notification.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-relaxed mb-4">{notification.message}</p>
                                                <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                                                    <span className="inline-flex items-center gap-2"><Eye size={12} /> Target <span className={notification.target_audience === 'all' ? 'text-purple-400' : 'text-blue-400'}>{notification.target_audience}</span></span>
                                                    <span className="inline-flex items-center gap-2"><Filter size={12} /> Type <span className="text-gray-300">{notification.type}</span></span>
                                                    <button
                                                        onClick={() => handleDelete(notification.id)}
                                                        className="ml-auto inline-flex items-center gap-2 text-gray-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 size={14} /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#0A0C10]/80 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-xl">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             System Intel
                        </h3>
                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Target Reach</div>
                                <div className="text-3xl font-black text-white">~4.2K <span className="text-xs font-medium text-gray-600 italic">Nodes</span></div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Pulse Response Rating</div>
                                <div className="text-3xl font-black text-emerald-400">92.4%</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Broadcast Log</div>
                                <div className="text-3xl font-black text-white">{notifications.length}</div>
                                <p className="text-xs text-gray-600 mt-1">Latest update: {latestNotification ? new Date(latestNotification.created_at).toLocaleString() : 'No entries yet'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-purple-500/30 rounded-[2rem] p-8 shadow-xl group">
                        <div className="flex items-center gap-3 mb-4">
                            <Info size={16} className="text-purple-400" />
                            <h4 className="text-sm font-bold text-purple-200">Broadcast Protocol</h4>
                        </div>
                        <p className="text-xs text-purple-300/60 leading-relaxed group-hover:text-purple-300 transition-colors">
                            Signals are distributed through secondary relay clusters to minimize latency.
                            Active targets will receive a priority push notification regardless of current application state.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
