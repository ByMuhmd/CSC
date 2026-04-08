import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, CheckCircle, ShieldAlert, ChevronLeft, Lightbulb, Bug, Mail, Loader2, Send, MessageSquare, Bell, Calendar, ChevronRight, MapPin, BookOpen, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { useToast } from '../context/ToastContext';
import { eventService, CalendarEvent } from '../services/eventService';
import { useGamification } from '../hooks/useGamification';
import { shouldDeliverNotification } from '../utils/notifications';
import { useSmartSchedule } from '../hooks/useSmartSchedule';

interface LoadingLogoProps {
    className?: string;
}

export function Loading({ className = "w-10 h-10" }: LoadingLogoProps) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 375 375"
                className="w-full h-full animate-pulse-fast drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <clipPath id="715ad5cd25">
                        <path d="M 52.242188 70.503906 L 322.992188 70.503906 L 322.992188 304.503906 L 52.242188 304.503906 Z M 52.242188 70.503906 " clipRule="nonzero" />
                    </clipPath>
                </defs>

                <g clipPath="url(#715ad5cd25)">
                    <path
                        fill="currentColor"
                        d="M 203.386719 218.449219 L 187.480469 245.898438 L 103.019531 99.921875 L 154.015625 99.921875 L 153.011719 119.378906 L 181.410156 70.636719 L 52.242188 70.636719 L 187.503906 304.355469 L 220.304688 247.65625 Z M 293.96875 120.363281 L 197.640625 120.363281 L 209.46875 99.921875 L 271.988281 99.921875 L 265.070312 111.835938 L 298.898438 111.835938 L 322.769531 70.636719 L 192.613281 70.636719 C 192.445312 70.636719 162.457031 122.664062 159.648438 127.511719 L 171.40625 147.875 L 244.230469 147.875 L 225.804688 179.773438 L 212.207031 156.261719 L 157.921875 156.261719 L 186.851562 170.785156 L 225.804688 238.230469 Z M 293.96875 120.363281 "
                        fillRule="evenodd"
                    />
                </g>
            </svg>
        </div>
    );
}

interface UserAvatarProps {
    url?: string | null;
    name?: string;
    size?: number | string;
    className?: string;
    variant?: 'marble' | 'beam' | 'pixel' | 'sunset' | 'ring' | 'bauhaus';
    colors?: string[];
}

const DEFAULT_COLORS = ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];

export function Avatar({
    url,
    name = "User",
    size = 40,
    className = "",
    variant = "beam",
    colors = DEFAULT_COLORS
}: UserAvatarProps) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [url]);

    const isLegacy = url && (url.includes('dicebear.com') || url.startsWith('boring:'));
    const finalUrl = isLegacy ? '/avatars/8.svg' : url;
    const avatarStyle = {
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
    } as React.CSSProperties;

    const seed = encodeURIComponent(name || 'User');
    const avatarVariant = variant || 'beam';
    const colorParam = colors?.length ? `&backgroundColor=${colors.map(c => c.replace('#', '')).join(',')}` : '';
    const generatedUrl = `https://api.dicebear.com/7.x/${avatarVariant}/svg?seed=${seed}${colorParam}`;

    if (finalUrl && !imgError) {
        return (
            <img
                src={finalUrl}
                alt={name}
                className={className}
                style={avatarStyle}
                onError={() => setImgError(true)}
            />
        );
    }

    return (
        <img
            src={generatedUrl}
            alt={name}
            className={className}
            style={avatarStyle}
            onError={() => setImgError(true)}
        />
    );
}

export function WelcomeModal() {
    const { user, guest, loginAsGuest, loading } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState('/avatars/1.svg');
    const [displayName, setDisplayName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const WELCOME_KEY = 'welcome_modal_processed_session_v1';
    const AVATAR_OPTIONS = [
        '/avatars/1.svg',
        '/avatars/2.svg',
        '/avatars/3.svg',
        '/avatars/4.svg',
        '/avatars/5.svg',
        '/avatars/6.svg',
        '/avatars/7.svg',
        '/avatars/8.svg'
    ];

    useEffect(() => {
        if (loading) return;

        if (user || guest) {
            setIsOpen(false);
            return;
        }

        const processed = sessionStorage.getItem(WELCOME_KEY) === '1';
        const isAuthPage = location.pathname.startsWith('/signin') || location.pathname.startsWith('/signup');

        if (!processed && !isAuthPage) {
            setIsOpen(true);
        }
    }, [loading, user, guest, location.pathname]);

    const markProcessed = () => {
        sessionStorage.setItem(WELCOME_KEY, '1');
    };

    const resolveName = (fallbackName: string) => {
        const sanitized = displayName.trim().slice(0, 60);
        return sanitized || fallbackName;
    };

    const continueAsAnonymous = async (name: string) => {
        setSubmitting(true);
        try {
            await loginAsGuest(resolveName(name), selectedAvatar);
            markProcessed();
            setIsOpen(false);
        } catch (error: any) {
            showToast('Could not continue', error?.message || 'Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGuest = async () => {
        await continueAsAnonymous('Guest User');
    };

    const handleSkip = async () => {
        await continueAsAnonymous('Anonymous User');
    };

    const goTo = (path: '/signin') => {
        setIsOpen(false);
        navigate(path);
    };

    const continueWithGoogle = async () => {
        setSubmitting(true);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/profile'
            }
        });

        if (error) {
            setSubmitting(false);
            showToast('Google Sign-In Failed', error.message, 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0A0C10]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <div className="mb-4 inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
                    Welcome
                </div>

                <h3 className="text-2xl font-black tracking-tight text-white">Before You Start</h3>
                <p className="mt-2 text-sm text-gray-400">
                    Pick your avatar and optional name, then choose how you want to continue.
                </p>

                <div className="mt-5">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Choose Avatar</p>
                    <div className="grid grid-cols-4 gap-2">
                        {AVATAR_OPTIONS.map((avatar) => {
                            const active = avatar === selectedAvatar;
                            return (
                                <button
                                    key={avatar}
                                    type="button"
                                    onClick={() => setSelectedAvatar(avatar)}
                                    className={`relative rounded-xl border p-1 transition-all ${active ? 'border-purple-400 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                    <img src={avatar} alt="avatar option" className="h-12 w-12 rounded-lg object-cover" />
                                    {active && <CheckCircle size={14} className="absolute -right-1 -top-1 text-purple-300" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-5">
                    <label htmlFor="welcome-name" className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Display Name (Optional)
                    </label>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-purple-400/40 focus-within:bg-white/10 transition-colors">
                        <input
                            id="welcome-name"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            maxLength={60}
                            placeholder="Type a name for your account"
                            className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
                        />
                    </div>
                </div>

                <div className="mt-6 grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => goTo('/signin')}
                            disabled={submitting}
                            className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-black transition-colors hover:bg-gray-200 disabled:opacity-60"
                        >
                            Sign In
                        </button>

                        <button
                            onClick={handleGuest}
                            disabled={submitting}
                            className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
                        >
                            {submitting ? 'Please wait...' : 'Guest'}
                        </button>
                    </div>

                    <button
                        onClick={continueWithGoogle}
                        disabled={submitting}
                        className="w-full rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-500/20 to-blue-500/20 px-4 py-3 text-sm font-black text-white transition-all hover:from-purple-500/30 hover:to-blue-500/30 disabled:opacity-60"
                    >
                        Continue with Google
                    </button>

                    <button
                        onClick={handleSkip}
                        disabled={submitting}
                        className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
                    >
                        {submitting ? 'Please wait...' : 'Skip for Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}

type FeedbackType = 'suggest' | 'bug' | 'contact' | null;

interface FeedbackProps {
    hideFloatingButton?: boolean;
    customTrigger?: (openFeedback: (type?: FeedbackType) => void) => React.ReactNode;
}

export function Feedback({ hideFloatingButton = false, customTrigger }: FeedbackProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<FeedbackType>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [contactInfo, setContactInfo] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());

        try {
            await import('../services/feedbackService').then(m => m.feedbackService.submitFeedback({
                type: (type || 'other') as any,
                message: data.message,
                contact_info: data.email || data.name ? `${data.name} (${data.email})` : undefined
            }));

            const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "2cf05237-1622-43ea-aa55-8c1af50b56ae";
            if (accessKey) {
                const web3Data = { ...data, access_key: accessKey, subject: `New ${type} submission`, type: type || 'general' };
                fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(web3Data)
                }).catch(console.warn);
            }

            handleSuccess(e);
        } catch (err: any) {
            console.error("Submission failed:", err);
            setError("Failed to save feedback. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = (e: React.FormEvent<HTMLFormElement>) => {
        setSuccess(true);
        e.currentTarget.reset();
        setTimeout(() => {
            setIsOpen(false);
            resetForm();
        }, 3000);
    };

    const resetForm = () => {
        setType(null);
        setMessage('');
        setName('');
        setContactInfo('');
        setSuccess(false);
        setError('');
    };

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(resetForm, 300);
    };

    const openFeedback = (nextType: FeedbackType = null) => {
        setType(nextType);
        setIsOpen(true);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {customTrigger ? customTrigger(openFeedback) : null}
            <div className={`
                mb-4 overflow-hidden rounded-3xl border border-white/10 bg-[#0A0C10]/92 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-300 origin-bottom-right
                ${isOpen ? 'w-[22rem] opacity-100 scale-100 sm:w-[24rem]' : 'w-0 h-0 opacity-0 scale-95 pointer-events-none'}
            `}>
                <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-purple-900/35 via-indigo-900/25 to-blue-900/35 px-4 py-3.5">
                    <div className="flex items-center gap-2">
                        {type && (
                            <button onClick={() => setType(null)} className="rounded-full p-1.5 hover:bg-white/10 transition-colors">
                                <ChevronLeft size={16} className="text-gray-300" />
                            </button>
                        )}
                        <h3 className="text-sm font-black tracking-wide text-white">
                            {success ? 'Thank You!' : type === 'suggest' ? 'Suggest Feature' : type === 'bug' ? 'Report Bug' : type === 'contact' ? 'Contact Us' : 'Feedback & Support'}
                        </h3>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-3 bg-gradient-to-b from-white/[0.03] to-transparent p-4">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 animate-in fade-in zoom-in">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                <Send className="w-6 h-6 text-green-400" />
                            </div>
                            <p className="text-gray-300 text-sm">Message sent successfully!</p>
                        </div>
                    ) : !type ? (
                        <div className="space-y-2.5">
                            <button onClick={() => setType('suggest')} className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-purple-500/35 hover:bg-white/10">
                                <div className="rounded-xl border border-purple-500/30 bg-purple-500/15 p-2 transition-transform group-hover:scale-110">
                                    <Lightbulb size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-gray-100">Suggest Feature</div>
                                    <div className="text-xs text-gray-500">Have an idea? Let us know!</div>
                                </div>
                            </button>

                            <button onClick={() => setType('bug')} className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-red-500/35 hover:bg-white/10">
                                <div className="rounded-xl border border-red-500/30 bg-red-500/15 p-2 transition-transform group-hover:scale-110">
                                    <Bug size={18} className="text-red-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-gray-100">Report Bug</div>
                                    <div className="text-xs text-gray-500">Something not working?</div>
                                </div>
                            </button>

                            <button onClick={() => setType('contact')} className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-blue-500/35 hover:bg-white/10">
                                <div className="rounded-xl border border-blue-500/30 bg-blue-500/15 p-2 transition-transform group-hover:scale-110">
                                    <Mail size={18} className="text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-gray-100">Contact Us</div>
                                    <div className="text-xs text-gray-500">Get in touch with the team</div>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {type === 'contact' && (
                                <>
                                    <div>
                                        <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Name</label>
                                        <input
                                            required
                                            type="text"
                                            name="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none"
                                            placeholder="Your Name"
                                            maxLength={100}
                                        />
                                    </div>
                                    <div>
                                        <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Email or Phone</label>
                                        <input
                                            required
                                            type="text"
                                            name="email"
                                            value={contactInfo}
                                            onChange={(e) => setContactInfo(e.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none"
                                            placeholder="how to reach you?"
                                            maxLength={100}
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Message</label>
                                <textarea
                                    required
                                    name="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="h-24 w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white transition-colors focus:border-purple-500 focus:outline-none"
                                    placeholder={type === 'bug' ? "Describe the bug..." : type === 'suggest' ? "What's your idea?" : "How can we help?"}
                                    maxLength={1000}
                                />
                                <p className="mt-1 text-right text-xs text-gray-500">{message.length}/1000</p>
                            </div>

                            {error && <p className="text-xs text-red-400">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm font-black text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Send Message
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {!hideFloatingButton && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110
                        ${isOpen ? 'bg-white text-black rotate-90' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'}
                    `}
                >
                    {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                </button>
            )}
        </div>
    );
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    target_audience: string;
    created_at: string;
    image_url?: string;
    link?: string;
    read?: boolean;
}

const NOTIFICATION_CACHE_KEY = 'cached_notifications_v1';

export function Notifications({ align = 'right' }: { align?: 'left' | 'right' }) {
    const { showToast } = useToast();
    const { profile, guest } = useAuth();
    const userLevel = profile?.academic_level || guest?.academic_level;
    const { feed: smartFeed, isOffline: scheduleOffline, lastSyncedAt } = useSmartSchedule(userLevel);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const [position, setPosition] = useState({ top: 0, left: 0 });

    const loadCachedNotifications = () => {
        try {
            const cached = localStorage.getItem(NOTIFICATION_CACHE_KEY);
            if (!cached) return;

            const parsed = JSON.parse(cached) as Notification[];
            const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
            const withReadStatus = parsed.map((notification) => ({
                ...notification,
                read: readIds.includes(notification.id)
            }));

            setNotifications(withReadStatus);
            setUnreadCount(withReadStatus.filter((notification) => !notification.read).length);
        } catch (error) {
            console.error('Failed to load cached notifications', error);
        }
    };

    const shouldShowNotification = (notification: Notification) => shouldDeliverNotification(notification.target_audience, {
        profileId: profile?.id,
        profileRole: profile?.role,
        guestId: guest?.id,
        hasProfile: !!profile,
        hasGuest: !!guest,
        academicYear: profile?.academic_level || guest?.academic_level || null
    });

    useEffect(() => {
        loadCachedNotifications();
        fetchNotifications();

        const channel = supabase
            .channel('public_notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    if (!shouldShowNotification(newNotification)) return;
                    setNotifications(prev => {
                        const next = [newNotification, ...prev];
                        localStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(next));
                        return next;
                    });
                    setUnreadCount(prev => prev + 1);

                    showToast(newNotification.title, newNotification.message, newNotification.type);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, profile?.role, guest?.id]);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const updatePosition = () => {
                const rect = buttonRef.current!.getBoundingClientRect();
                const desktopWidth = window.innerWidth >= 1024 ? 544 : 480;
                const desktopHeight = Math.floor(window.innerHeight * 0.78); 
                const gutter = 12;

                const preferredLeft = align === 'right' ? rect.right - desktopWidth : rect.left;
                const left = Math.max(gutter, Math.min(preferredLeft, window.innerWidth - desktopWidth - gutter));

                const belowTop = rect.bottom + 8;
                const maxTop = window.innerHeight - desktopHeight - gutter;
                const top = belowTop > maxTop
                    ? Math.max(gutter, rect.top - desktopHeight - 8)
                    : Math.max(gutter, belowTop);

                setPosition({
                    top,
                    left
                });
            };

            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
                const withReadStatus = data
                    .filter(shouldShowNotification)
                    .map(n => ({
                    ...n,
                    read: readIds.includes(n.id)
                }));
                setNotifications(withReadStatus);
                setUnreadCount(withReadStatus.filter(n => !n.read).length);
                localStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(withReadStatus));
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
            loadCachedNotifications();
        }
    };

    const handleMarkAllRead = () => {
        const allIds = notifications.map(n => n.id);
        localStorage.setItem('read_notifications', JSON.stringify(allIds));
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-purple-500';
        }
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse"></span>
                )}
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex flex-col items-center sm:block">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
                        onClick={() => setIsOpen(false)}
                    />

                    <div
                        className="relative z-[101] mt-20 sm:mt-0 w-[92vw] max-h-[82vh] bg-[#090B0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 sm:fixed sm:w-[30rem] lg:w-[34rem] sm:max-h-[78vh] sm:rounded-3xl sm:border-white/15 sm:animate-in sm:fade-in sm:slide-in-from-top-2"
                        style={{
                            ...(window.innerWidth >= 640 ? {
                                top: position.top,
                                left: position.left
                            } : {})
                        }}
                    >
                        <div className="border-b border-white/10 bg-gradient-to-r from-white/[0.07] via-white/[0.03] to-transparent px-4 py-3.5 sm:px-5 sm:py-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="font-black tracking-tight text-white text-base sm:text-lg">Notifications</h3>
                                    <p className="text-[11px] sm:text-xs text-gray-500">Live updates, reminders, and important announcements.</p>
                                </div>
                                {(scheduleOffline || !navigator.onLine) && (
                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                                        Offline
                                    </span>
                                )}
                                {unreadCount > 0 && (
                                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20 whitespace-nowrap">
                                        {unreadCount} New
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="max-h-[62vh] sm:max-h-[64vh] overflow-y-auto custom-scrollbar bg-[linear-gradient(to_bottom,rgba(255,255,255,0.015),transparent_20%)]">
                            {smartFeed.items.length > 0 && (
                                <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">Smart schedule</p>
                                            <p className="text-xs text-gray-400 mt-1">Prioritized from exams, assignments, and lectures.</p>
                                        </div>
                                        {smartFeed.focusMode && (
                                            <span className="text-[10px] font-black uppercase tracking-[0.18em] bg-red-500/10 text-red-300 px-2 py-1 rounded-full border border-red-500/20">
                                                Exam focus
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {smartFeed.items.slice(0, 4).map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-white/10 bg-black/35 p-3 sm:p-3.5 hover:bg-black/50 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-xl border ${item.kind === 'exam'
                                                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                                        : item.kind === 'assignment'
                                                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                                                            : 'border-purple-500/30 bg-purple-500/10 text-purple-300'
                                                        }`}>
                                                        {item.kind === 'exam' ? <Calendar size={14} /> : item.kind === 'assignment' ? <BookOpen size={14} /> : <Clock size={14} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-sm font-bold text-white truncate">{item.title}</p>
                                                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">{item.kind}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-0.5">{item.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {smartFeed.focusReason && (
                                        <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{smartFeed.focusReason}</p>
                                    )}

                                    {lastSyncedAt && (
                                        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-gray-600">
                                            Last sync {new Date(lastSyncedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}

                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2 p-2 sm:p-3">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${!notification.read
                                                ? 'bg-purple-500/[0.08] border-purple-500/20'
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="pt-1">
                                                    <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${getTypeColor(notification.type)}`}></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-black text-white leading-tight">{notification.title}</p>
                                                        {!notification.read && <span className="text-[10px] font-black uppercase tracking-[0.14em] text-purple-300">New</span>}
                                                    </div>
                                                    <p className="text-sm text-gray-300 leading-relaxed mt-1">{notification.message}</p>

                                                    {notification.image_url && (
                                                        <div className="rounded-xl overflow-hidden border border-white/10 my-3">
                                                            <img
                                                                src={notification.image_url}
                                                                alt="Notification"
                                                                className="w-full h-auto"
                                                            />
                                                        </div>
                                                    )}

                                                    <p className="text-[11px] text-gray-500 mt-2">
                                                        {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 sm:p-4 border-t border-white/10 bg-white/[0.03]">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <span className="text-[11px] text-gray-500 break-words">Desktop view optimized</span>
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] text-gray-400 hover:text-white transition-colors text-left sm:text-right"
                                >
                                    Mark all as read
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export function Events() {
    const location = useLocation();
    const [pastAssignments, setPastAssignments] = useState<CalendarEvent[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'lectures' | 'assignments' | 'exams'>('lectures');
    const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

    const { profile, guest } = useAuth();
    const userLevel = profile?.academic_level || guest?.academic_level;
    const { events, feed: smartFeed, isOffline: scheduleOffline, lastSyncedAt } = useSmartSchedule(userLevel);
    const { assignmentsCompleted, toggleAssignmentCompletion } = useGamification();
    const getEventTimestamp = (dateValue?: string) => {
        if (!dateValue) return null;
        const timestamp = new Date(dateValue).getTime();
        return Number.isNaN(timestamp) ? null : timestamp;
    };

    useEffect(() => {
        const fetchPastAssignments = async () => {
            try {
                const cacheKey = `past-assignments-${userLevel || 'all'}`;

                if (!navigator.onLine) {
                    const cached = await db.get<CalendarEvent[]>(cacheKey);
                    if (cached) {
                        setPastAssignments(cached);
                        return;
                    }
                }

                const pastAssignmentData = await eventService.getPastAssignments(userLevel);
                setPastAssignments(pastAssignmentData);
                await db.set(cacheKey, pastAssignmentData);
            } catch (error) {
                console.error("Failed to fetch past assignments", error);
                const cacheKey = `past-assignments-${userLevel || 'all'}`;
                const cached = await db.get<CalendarEvent[]>(cacheKey);
                if (cached) {
                    setPastAssignments(cached);
                }
            }
        };

        fetchPastAssignments();
    }, [userLevel]);

    useEffect(() => {
        if (smartFeed.focusMode && activeTab === 'lectures') {
            setActiveTab('exams');
        }
    }, [smartFeed.focusMode, activeTab]);

    const lectureEvents = smartFeed.focusMode ? [] : events.filter(e => e.type === 'lecture' || e.type === 'lab' || e.type === 'event');
    const assignmentEvents = events.filter(e => e.type === 'assignment');
    const examEvents = events.filter(e => e.type === 'exam');
    const displayEvents = activeTab === 'lectures'
        ? lectureEvents
        : activeTab === 'assignments'
            ? assignmentEvents
            : examEvents;
    const currentNextEvent = displayEvents[0];
    const overallNextEvent = examEvents[0] || assignmentEvents[0] || lectureEvents[0] || events[0];

    useEffect(() => {
        if (!currentNextEvent) { setTimeLeft(null); return; }
        const interval = setInterval(() => {
            const eventTimestamp = getEventTimestamp(currentNextEvent.date);
            if (eventTimestamp === null) {
                setTimeLeft(null);
                return;
            }

            const diff = eventTimestamp - Date.now();

            if (diff <= 0) {
                setTimeLeft(null);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ days, hours, minutes, seconds });
        }, 1000);
        return () => clearInterval(interval);
    }, [currentNextEvent]);

    if (location.pathname !== '/') return null;

    const overallTimestamp = overallNextEvent ? getEventTimestamp(overallNextEvent.date) : null;
    const overallDiff = overallTimestamp !== null ? overallTimestamp - Date.now() : -1;
    const isUrgent = overallDiff > 0 && overallDiff <= 1000 * 60 * 60 * 24;

    return (
        <div className={`fixed top-4 right-4 z-50 flex flex-col items-end animate-in slide-in-from-right fade-in duration-700`}>
            <div
                className={`transition-all duration-300 shadow-xl backdrop-blur-md border border-white/10 overflow-hidden
                ${isExpanded
                        ? 'w-80 bg-[#0A0C10]/95 rounded-3xl'
                        : `cursor-pointer rounded-full p-2 flex items-center justify-center hover:scale-110 active:scale-95 ${isUrgent
                            ? 'bg-red-500/20 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                            : 'bg-black/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:bg-black/60'
                        }`
                    }`}
            >
                {isExpanded ? (
                    <div className="flex flex-col max-h-[80vh]">
                        <div className="p-5 bg-gradient-to-b from-purple-900/20 to-transparent border-b border-white/5 relative flex flex-col pt-12">
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                            <div className="absolute top-4 left-4 flex gap-1.5">
                                <button onClick={() => setActiveTab('lectures')} className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'lectures' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Lectures</button>
                                <button onClick={() => setActiveTab('assignments')} className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'assignments' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Assignments</button>
                                <button onClick={() => setActiveTab('exams')} className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'exams' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Exams</button>
                            </div>

                            {(scheduleOffline || !navigator.onLine) && (
                                <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-100">
                                    Offline mode is using the last synced schedule.
                                </div>
                            )}

                            {smartFeed.focusMode && (
                                <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-100">
                                    Exam focus mode is active. Lecture reminders are paused until the nearest exam passes.
                                </div>
                            )}

                            {lastSyncedAt && (
                                <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-gray-600">
                                    Last synced {new Date(lastSyncedAt).toLocaleString()}
                                </p>
                            )}

                            {currentNextEvent && timeLeft ? (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`p-2 rounded-xl ${isUrgent ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Up Next</h3>
                                            <p className="font-bold text-white text-lg leading-none line-clamp-1">{currentNextEvent.title}</p>
                                        </div>
                                    </div>

                                    {currentNextEvent.description && (
                                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-4 bg-white/5 rounded-lg p-3 border border-white/5">{currentNextEvent.description}</p>
                                    )}

                                    <div className="grid grid-cols-4 gap-2 text-center mb-6">
                                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                            <div className="text-xl font-bold text-white leading-none mb-1">{timeLeft.days}</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-bold">Days</div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                            <div className="text-xl font-bold text-white leading-none mb-1">{timeLeft.hours}</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-bold">Hrs</div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                            <div className="text-xl font-bold text-white leading-none mb-1">{timeLeft.minutes}</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-bold">Min</div>
                                        </div>
                                        <div className={`rounded-lg p-2 border ${isUrgent ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/5'}`}>
                                            <div className={`text-xl font-bold leading-none mb-1 ${isUrgent ? 'text-red-400' : 'text-white'}`}>{timeLeft.seconds}</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-bold">Sec</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {currentNextEvent.lecture_time && (
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <Clock size={14} className="text-purple-400" />
                                                <span>{currentNextEvent.lecture_time}</span>
                                            </div>
                                        )}
                                        {currentNextEvent.professor && (
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <User size={14} className="text-blue-400" />
                                                <span>{currentNextEvent.professor}</span>
                                            </div>
                                        )}
                                        {currentNextEvent.location && (
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <MapPin size={14} className="text-green-400" />
                                                <span>{currentNextEvent.location}</span>
                                            </div>
                                        )}
                                        {currentNextEvent.related_assignments && (
                                            <div className="flex items-start gap-2 text-gray-300">
                                                <BookOpen size={14} className="text-yellow-400 mt-0.5" />
                                                <span className="text-xs">{currentNextEvent.related_assignments}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    {activeTab === 'lectures' && smartFeed.focusMode ? (
                                        <p className="font-medium">Lecture reminders are paused during exam focus.</p>
                                    ) : (
                                        <p className="font-medium">No upcoming {activeTab}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {displayEvents.length > 1 && (
                            <div className="overflow-y-auto custom-scrollbar bg-black/20">
                                <div className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5">
                                    Coming Up Later
                                </div>
                                <div className="divide-y divide-white/5">
                                    {displayEvents.slice(1).map(event => {
                                        const isCompleted = assignmentsCompleted.includes(event.id);
                                        const eventTimestamp = getEventTimestamp(event.date);
                                        if (eventTimestamp === null) return null;
                                        const eventDiff = eventTimestamp - Date.now();
                                        const daysLeft = Math.floor(eventDiff / (1000 * 60 * 60 * 24));
                                        const hoursLeft = Math.floor(eventDiff / (1000 * 60 * 60));
                                        const isAssignment = event.type === 'assignment';
                                        const timeUrgency = daysLeft < 1 ? 'red' : daysLeft <= 3 ? 'amber' : 'green';
                                        const timeLabel = eventDiff <= 0 ? 'Overdue' : daysLeft >= 1 ? `${daysLeft}d left` : `${hoursLeft}h left`;
                                        return (
                                        <div key={event.id} className={`p-5 hover:bg-white/5 transition-colors group ${isCompleted ? 'opacity-50' : ''} ${isAssignment ? `border-l-2 ${isCompleted ? 'border-l-green-500/50' : 'border-l-blue-500/50'}` : ''}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    {isAssignment && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleAssignmentCompletion(event.id, event.title); }}
                                                            className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                                                isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            {isCompleted && <CheckCircle size={12} className="text-black" />}
                                                        </button>
                                                    )}
                                                    <h4 className={`font-bold text-white text-sm group-hover:text-purple-300 transition-colors ${isCompleted ? 'line-through decoration-white/50' : ''}`}>{event.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {isAssignment && !isCompleted && eventDiff > 0 && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                            timeUrgency === 'red' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                                                            timeUrgency === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-green-500/20 text-green-400'
                                                        }`}>
                                                            {timeLabel}
                                                        </span>
                                                    )}
                                                    {isAssignment && eventDiff <= 0 && !isCompleted && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-500/20 text-red-400 animate-pulse">Overdue</span>
                                                    )}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase
                                                        ${event.type === 'exam' ? 'bg-red-500/20 text-red-400' :
                                                            isAssignment ? 'bg-blue-500/20 text-blue-400' :
                                                                'bg-green-500/20 text-green-400'}`}>
                                                        {event.type}
                                                    </span>
                                                </div>
                                            </div>

                                            {isAssignment && event.description && (
                                                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-2 ml-8">{event.description}</p>
                                            )}

                                            <div className={`space-y-1.5 ${isAssignment ? 'ml-8' : ''}`}>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Calendar size={12} />
                                                    {new Date(eventTimestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                                                    {new Date(eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>

                                                {event.lecture_time && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Clock size={12} className="text-purple-400/70" />
                                                        {event.lecture_time}
                                                    </div>
                                                )}

                                                {(event.professor || event.location) && (
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        {event.professor && (
                                                            <div className="flex items-center gap-1">
                                                                <User size={12} className="text-blue-400/70" />
                                                                {event.professor}
                                                            </div>
                                                        )}
                                                        {event.location && (
                                                            <div className="flex items-center gap-1">
                                                                <MapPin size={12} className="text-green-400/70" />
                                                                {event.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {(isAssignment || event.type === 'exam') && event.related_assignments && (
                                                    <div className="flex items-start gap-2 text-xs text-gray-500">
                                                        <BookOpen size={12} className="text-yellow-400/70 mt-0.5" />
                                                        <span className="line-clamp-1">{event.related_assignments}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {activeTab === 'assignments' && pastAssignments.length > 0 && (
                            <div className="overflow-y-auto custom-scrollbar bg-black/40 border-t border-white/5 max-h-[300px]">
                                <div className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 flex justify-between items-center">
                                    <span>Past Assignments</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-white/50">{pastAssignments.length}</span>
                                </div>
                                <div className="divide-y divide-white/5 opacity-80">
                                    {pastAssignments.map(event => {
                                        const isCompleted = assignmentsCompleted.includes(event.id);
                                        return (
                                        <div key={event.id} className={`p-5 hover:bg-white/5 transition-colors group flex gap-3 border-l-2 ${isCompleted ? 'border-l-green-500/40' : 'border-l-gray-500/30'}`}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleAssignmentCompletion(event.id, event.title); }}
                                                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                                    isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-gray-300'
                                                }`}
                                            >
                                                {isCompleted && <CheckCircle size={12} className="text-black" />}
                                            </button>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className={`font-bold text-sm transition-colors ${isCompleted ? 'text-gray-500 line-through decoration-white/20' : 'text-gray-300 group-hover:text-blue-300'}`}>{event.title}</h4>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                        {isCompleted ? 'Done' : 'Past'}
                                                    </span>
                                                </div>

                                                {event.description && (
                                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{event.description}</p>
                                                )}

                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Calendar size={12} />
                                                    <span className="text-gray-500">Was due</span>
                                                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                                                    {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                
                                                {(event.professor || event.location) && (
                                                    <div className="flex items-center gap-3 text-xs text-gray-600">
                                                        {event.professor && (
                                                            <div className="flex items-center gap-1">
                                                                <User size={12} /> {event.professor}
                                                            </div>
                                                        )}
                                                        {event.location && (
                                                            <div className="flex items-center gap-1">
                                                                <MapPin size={12} /> {event.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {event.related_assignments && (
                                                    <div className="flex items-start gap-2 text-xs text-gray-600">
                                                        <BookOpen size={12} className="text-yellow-400/50 mt-0.5" />
                                                        <span className="line-clamp-1">{event.related_assignments}</span>
                                                    </div>
                                                )}
                                            </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div onClick={() => setIsExpanded(true)} className={`w-8 h-8 flex items-center justify-center relative`}>
                        <Calendar size={18} className={isUrgent ? 'text-red-400' : 'text-purple-400'} />
                        {isUrgent && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
