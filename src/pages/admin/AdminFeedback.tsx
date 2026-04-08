import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { feedbackService, FeedbackItem } from '../../services/feedbackService';
import { Inbox, CheckCircle, XCircle, AlertCircle, MessageSquare, Trash2, User } from 'lucide-react';
import { Avatar } from '../../components/UIComponents';

export default function AdminFeedback() {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await feedbackService.getAllFeedback();
            setFeedback(data || []);
        } catch (error: any) {
            console.error(error);
            setError(error.message || 'Failed to load feedback');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: 'open' | 'resolved' | 'ignored') => {
        try {
            await feedbackService.updateStatus(id, status);
            setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f));
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this feedback?')) return;
        try {
            await feedbackService.deleteFeedback(id);
            setFeedback(prev => prev.filter(f => f.id !== id));
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const filteredFeedback = feedback.filter(f => filter === 'all' || f.status === filter);

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">
                        User Feedback
                    </h1>
                    <p className="text-gray-400 mt-2">Manage bug reports, suggestions, and messages.</p>
                </div>
                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${filter === 'all' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('open')}
                        className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${filter === 'open' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Open
                    </button>
                    <button
                        onClick={() => setFilter('resolved')}
                        className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${filter === 'resolved' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Resolved
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-gray-500">Loading feedback...</div>
            ) : error ? (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-center">
                    <p className="font-bold">Error loading feedback</p>
                    <p className="text-sm mt-1">{error}</p>
                    <button onClick={loadFeedback} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-bold transition-colors">
                        Retry
                    </button>
                </div>
            ) : filteredFeedback.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
                    <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4 text-gray-500">
                        <Inbox size={32} />
                    </div>
                    <p className="font-bold text-gray-400">No feedback found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredFeedback.map((item) => (
                        <div key={item.id} className={`p-6 rounded-2xl border transition-all ${item.status === 'open' ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5 opacity-70'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${item.type === 'bug' ? 'bg-red-500/10 text-red-500' :
                                    item.type === 'suggestion' ? 'bg-green-500/10 text-green-500' :
                                        'bg-blue-500/10 text-blue-500'
                                    }`}>
                                    {item.type === 'bug' ? <AlertCircle size={24} /> : <MessageSquare size={24} />}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${item.type === 'bug' ? 'border-red-500/30 text-red-400' : 'border-blue-500/30 text-blue-400'
                                                }`}>
                                                {item.type}
                                            </span>
                                            <span className="text-gray-500 text-xs font-mono">{new Date(item.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.status === 'open' && (
                                                <button onClick={() => handleUpdateStatus(item.id, 'resolved')} className="p-2 hover:bg-green-500/10 text-gray-400 hover:text-green-500 rounded-lg" title="Mark Resolved">
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
                                            {item.status === 'resolved' && (
                                                <button onClick={() => handleUpdateStatus(item.id, 'open')} className="p-2 hover:bg-yellow-500/10 text-gray-400 hover:text-yellow-500 rounded-lg" title="Reopen">
                                                    <AlertCircle size={18} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 font-mono text-sm overflow-x-auto">
                                        <pre className="text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">{item.message}</pre>
                                    </div>

                                    <div className="flex items-center gap-4 pt-2 mt-2 border-t border-white/5">
                                        {item.user ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800">
                                                    <Avatar url={item.user.avatar_url} name={item.user.full_name} size="100%" />
                                                </div>
                                                <span className="text-sm text-gray-400">{item.user.full_name}</span>
                                                {item.user.username && <span className="text-xs text-gray-600">@{item.user.username}</span>}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <User size={16} /> Anonymous
                                            </div>
                                        )}
                                        {item.contact_info && (
                                            <div className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                                                {item.contact_info}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
