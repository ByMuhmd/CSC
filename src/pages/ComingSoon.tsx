import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Bell, Sparkles, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { interestService } from '../services/interestService';

interface ComingSoonProps {
    title: string;
    onBack?: () => void;
}

export default function ComingSoon({ title, onBack }: ComingSoonProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [notified, setNotified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [email, setEmail] = useState('');
    const [subjectId, setSubjectId] = useState<string>('');

    useEffect(() => {

        const path = window.location.pathname;
        const parts = path.split('/');
        const id = parts[parts.length - 1];
        setSubjectId(id);

        checkInterest(id);
    }, []);

    const checkInterest = async (id: string) => {
        const hasInterest = await interestService.checkInterest(id, user?.id, user?.email || undefined);
        if (hasInterest) setNotified(true);
    };

    const handleNotifyClick = () => {
        if (notified) return;

        if (user) {
            registerInterest(user.id, user.email);
        } else {
            setShowEmailModal(true);
        }
    };

    const registerInterest = async (userId?: string, userEmail?: string) => {
        if (!userEmail) return;
        setLoading(true);
        try {
            await interestService.registerInterest(subjectId, userEmail, userId);
            setNotified(true);
            setShowEmailModal(false);
        } catch (error) {
            console.error(error);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-white/5 opacity-20 mix-blend-overlay" />
                <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-900/10 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-900/10 rounded-full blur-[150px] animate-pulse-slow delay-1000" />
            </div>
            <div className="relative z-10 max-w-2xl w-full text-center">

                <div className="mb-12 inline-block relative group cursor-default">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-70 transition duration-1000 animate-gradient-xy"></div>
                    <div className="relative px-6 py-2 bg-black rounded-full border border-white/10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                        <Sparkles size={14} className="text-purple-400" />
                        In Development
                    </div>
                </div>

                <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-white drop-shadow-2xl">
                    <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                        Coming
                    </span>
                    <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
                        Soon
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-400 max-w-lg mx-auto leading-relaxed mb-12 font-medium">
                    We're crafting detailed materials for <span className="text-white font-bold">{title}</span>. Get ready for a new learning experience.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <button
                        onClick={onBack || (() => navigate(-1))}
                        className="px-8 py-4 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 group w-full md:w-auto justify-center"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Go Back</span>
                    </button>

                    <button
                        onClick={handleNotifyClick}
                        disabled={notified || loading}
                        className={`px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3 w-full md:w-auto justify-center shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 ${notified
                            ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            }`}
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                            notified ? (
                                <>
                                    <Clock className="w-5 h-5" />
                                    <span>We'll Notify You</span>
                                </>
                            ) : (
                                <>
                                    <Bell className="w-5 h-5" />
                                    <span>Notify Me When Ready</span>
                                </>
                            )
                        )}
                    </button>
                </div>

            </div>
            <div className="absolute bottom-8 text-center w-full text-xs font-mono text-gray-600 uppercase tracking-widest">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <AlertCircle size={12} />
                    <span>Quality takes time</span>
                </div>
                The CSC '23 Platform
            </div>
            {showEmailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEmailModal(false)} />
                    <div className="relative bg-[#0F1115] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <button onClick={() => setShowEmailModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-2">Get Notified</h2>
                        <p className="text-gray-400 text-sm mb-6">Enter your email to receive an update when this content is ready.</p>

                        <div className="space-y-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                                autoFocus
                            />
                            <button
                                onClick={() => registerInterest(undefined, email)}
                                disabled={!email || loading}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={18} />}
                                Subscribe
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
