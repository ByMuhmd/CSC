
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo3.png';
import { isAllowedEmailDomain, EMAIL_DOMAIN_POLICY_MESSAGE } from '../utils/emailPolicy';
import { isDisposableEmail, checkRateLimit, getAuthLockoutState, recordAuthFailure, clearAuthFailures, recordAccessContext } from '../utils/security';

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const sanitizedEmail = email.trim().toLowerCase();
        const lockoutState = getAuthLockoutState(`signin:${sanitizedEmail}`);
        if (lockoutState.locked) {
            const minutesLeft = Math.max(1, Math.ceil(lockoutState.remainingMs / 60000));
            setError(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
            setLoading(false);
            return;
        }

        if (isDisposableEmail(sanitizedEmail)) {
            setError('Disposable email addresses are not allowed.');
            setLoading(false);
            return;
        }

        if (!isAllowedEmailDomain(sanitizedEmail)) {
            setError(EMAIL_DOMAIN_POLICY_MESSAGE);
            setLoading(false);
            return;
        }

        if (!checkRateLimit(`signin:${sanitizedEmail}`, 6, 10 * 60 * 1000)) {
            setError('Too many sign in attempts. Please wait a few minutes and try again.');
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: sanitizedEmail,
            password,
        });

        if (error) {
            setError(error.message);
            const failure = recordAuthFailure(`signin:${sanitizedEmail}`, 5, 15 * 60 * 1000);
            if (failure.locked) {
                setError('Account locked for 15 minutes after too many failed attempts.');
            }
            setLoading(false);
        } else {
            clearAuthFailures(`signin:${sanitizedEmail}`);
            if (data?.user?.id) {
                recordAccessContext(data.user.id).catch(() => undefined);
            }
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-[440px] z-10"
            >
                <div className="glass-card p-10 md:p-12 rounded-[32px] relative group overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] group-hover:bg-purple-500/20 transition-colors duration-1000" />
                    
                    <div className="text-center mb-10 relative">
                        <div className="flex justify-center mb-6">
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                className="relative"
                            >
                                <div className="absolute -inset-4 bg-purple-500/20 rounded-xl blur-xl" />
                                <img src={logo} alt="CS Cohort" className="w-16 h-16 object-contain relative drop-shadow-2xl" />
                            </motion.div>
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-white">Welcome Back</h2>
                        <p className="text-gray-500 text-sm mt-3 font-medium uppercase tracking-[0.2em]">Sign in to continue your journey</p>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-8 text-xs font-bold uppercase tracking-widest flex items-center gap-3"
                            >
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSignIn} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group/input">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="auth-input"
                                    placeholder="you@cohort.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Password</label>
                                <span className="text-[9px] font-black text-purple-500/60 uppercase tracking-widest">Secure Access</span>
                            </div>
                            <div className="relative group/input">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="auth-input"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-purple-900/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                            Sign In
                        </button>

                        <div className="flex items-center gap-4 py-2">
                            <div className="h-px flex-1 bg-white/5" />
                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Or continue with</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>

                        <button
                            type="button"
                            onClick={async () => {
                                const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: window.location.origin + '/profile'
                                    }
                                });
                                if (error) setError(error.message);
                            }}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 font-black text-xs text-gray-400 hover:text-white uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                            New to the Cohort?{' '}
                            <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-black ml-1 border-b border-purple-500/20 hover:border-purple-400 transition-colors pb-0.5">
                                Create Account
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
