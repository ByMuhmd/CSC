
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, AlertCircle, ArrowRight, ArrowLeft, Camera, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import logo from '../assets/logo3.png';
import { isAllowedEmailDomain, EMAIL_DOMAIN_POLICY_MESSAGE } from '../utils/emailPolicy';
import { isDisposableEmail, checkRateLimit, getPasswordPolicyIssues } from '../utils/security';
import { handleSecureError } from '../utils/errorHandling';

const AVATAR_OPTIONS = [
    '/avatars/1.svg',
    '/avatars/2.svg',
    '/avatars/3.svg',
    '/avatars/4.svg',
    '/avatars/5.svg',
    '/avatars/6.svg',
    '/avatars/7.svg',
    '/avatars/8.svg',
];

export default function SignUp() {
    const [step, setStep] = useState(1);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [academicLevel, setAcademicLevel] = useState<string>('1');
    const [avatarUrl, setAvatarUrl] = useState(AVATAR_OPTIONS[0]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleGoogleSignUp = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/profile' }
        });
        if (error) setError(handleSecureError(error, "فشل تسجيل الاشتراك عبر Google"));
    };

    const handleFinalSignUp = async () => {
        setLoading(true);
        setError(null);

        const sanitizedFullName = fullName.trim().slice(0, 100);
        const sanitizedEmail = email.trim().toLowerCase();

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

        if (!checkRateLimit(`signup:${sanitizedEmail}`, 3, 10 * 60 * 1000)) {
            setError('Too many sign up attempts. Please wait 10 minutes and try again.');
            setLoading(false);
            return;
        }

        const passwordIssues = getPasswordPolicyIssues(password, sanitizedEmail, sanitizedFullName);
        if (passwordIssues.length > 0) {
            setError(passwordIssues[0]);
            setLoading(false);
            return;
        }

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: sanitizedEmail,
                password,
                options: {
                    data: {
                        full_name: sanitizedFullName,
                        avatar_url: avatarUrl,
                        academic_level: academicLevel,
                        captchaToken: captchaToken || undefined
                    }
                }
            });

            if (signUpError) throw signUpError;
            navigate('/profile');
        } catch (err: any) {
            setError(handleSecureError(err, "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى."));
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => Math.min(5, s + 1));
    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const stepVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0
        })
    };

    const [direction, setDirection] = useState(0);

    const paginate = (newStep: number) => {
        setDirection(newStep > step ? 1 : -1);
        setStep(newStep);
    };

    const passwordPolicyIssues = getPasswordPolicyIssues(password, email.trim().toLowerCase(), fullName.trim().slice(0, 100));

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-blob animation-delay-4000" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[480px] z-10"
            >
                <div className="glass-card rounded-[40px] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                            initial={{ width: '0%' }}
                            animate={{ width: `${(step / 5) * 100}%` }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                    </div>

                    <div className="p-8 md:p-12">
                        <div className="text-center mb-10">
                            <motion.img 
                                src={logo} 
                                alt="Logo" 
                                className="w-12 h-12 mx-auto mb-6 drop-shadow-2xl"
                                whileHover={{ rotate: 10, scale: 1.1 }}
                            />
                            <h2 className="text-3xl font-black tracking-tighter">Create Your Account</h2>
                            <p className="text-gray-500 text-sm mt-3 font-medium uppercase tracking-[0.2em]">Set up your profile in a few quick steps</p>
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <div 
                                        key={s} 
                                        className={`h-1 rounded-full transition-all duration-500 ${s <= step ? 'w-4 bg-purple-500' : 'w-2 bg-white/10'}`} 
                                    />
                                ))}
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-8 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                                >
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative min-h-[300px]">
                            <AnimatePresence initial={false} custom={direction} mode="wait">
                                <motion.div
                                    key={step}
                                    custom={direction}
                                    variants={stepVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.4, ease: "backOut" }}
                                    className="w-full"
                                >
                                    {step === 1 && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Full Name</label>
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        className="auth-input"
                                                        placeholder="Enter your full name"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <button
                                                    onClick={() => paginate(2)}
                                                    disabled={!fullName.trim()}
                                                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-purple-900/20 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                                                >
                                                    Continue <ArrowRight className="w-4 h-4" />
                                                </button>
                                                
                                                <button onClick={handleGoogleSignUp} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 font-black text-xs text-gray-400 hover:text-white uppercase tracking-widest transition-all flex items-center justify-center gap-3">
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                                    Continue with Google
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Email Address</label>
                                                <div className="relative group">
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="auth-input"
                                                        placeholder="you@cohort.com"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => paginate(1)} className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></button>
                                                <button onClick={() => paginate(3)} disabled={!isAllowedEmailDomain(email) || isDisposableEmail(email)} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-purple-900/20 disabled:opacity-30 flex items-center justify-center gap-3">
                                                    Continue <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Password</label>
                                                <div className="relative group">
                                                    <input
                                                        type="password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="auth-input"
                                                        placeholder="Create a strong password"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="space-y-2">
                                                        {[
                                                            { lab: 'Length', ok: password.length >= 8 },
                                                            { lab: 'Upper', ok: /[A-Z]/.test(password) },
                                                            { lab: 'Lower', ok: /[a-z]/.test(password) },
                                                            { lab: 'Number', ok: /[0-9]/.test(password) }
                                                        ].map(v => (
                                                            <div key={v.lab} className="flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${v.ok ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-800'}`} />
                                                                <span className={`text-[9px] font-black uppercase tracking-widest ${v.ok ? 'text-green-400' : 'text-gray-600'}`}>{v.lab}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => paginate(2)} className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></button>
                                                <button
                                                    onClick={() => paginate(4)}
                                                    disabled={passwordPolicyIssues.length > 0}
                                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-purple-900/20 disabled:opacity-30 flex items-center justify-center gap-3"
                                                >
                                                    Continue <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 4 && (
                                        <div className="space-y-8">
                                            <div className="text-center">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-3">Academic Year</label>
                                                <p className="text-sm text-gray-400 mb-6">This selection will control the lectures, assignments, exams, and leaderboard content shown on your account.</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[1, 2, 3, 4].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setAcademicLevel(level.toString())}
                                                className={`group relative p-6 rounded-[24px] border-2 transition-all duration-500 ${academicLevel === level.toString() ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center font-black text-xl mb-3 transition-all duration-500 ${academicLevel === level.toString() ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-gray-500'}`}>
                                                    {level}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${academicLevel === level.toString() ? 'text-white' : 'text-gray-600'}`}>
                                                    Year {level}
                                                </span>
                                                {academicLevel === level.toString() && (
                                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-4 border-[#0F1115]">
                                                        <Check size={10} className="text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => paginate(3)} className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></button>
                                                <button onClick={() => paginate(5)} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-purple-900/20 flex items-center justify-center gap-3">
                                                    Continue <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 5 && (
                                        <div className="space-y-8">
                                            <div className="text-center">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-6">Choose Your Avatar</label>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {AVATAR_OPTIONS.map((url, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setAvatarUrl(url)}
                                                            className={`relative group rounded-2xl p-1 transition-all duration-300 border-2 ${avatarUrl === url ? 'border-purple-500 bg-purple-500/20 scale-110 shadow-lg' : 'border-transparent hover:bg-white/5 hover:scale-105'}`}
                                                        >
                                                            <img src={url} alt={`Avatar ${idx}`} className="w-full h-auto rounded-xl bg-white/5" />
                                                            {avatarUrl === url && (
                                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg transform">
                                                                    <Camera className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {import.meta.env.VITE_HCAPTCHA_SITE_KEY && (
                                                <div className="flex justify-center py-2">
                                                    <HCaptcha
                                                        sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                                                        onVerify={(token) => setCaptchaToken(token)}
                                                        onExpire={() => setCaptchaToken(null)}
                                                        theme="dark"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex gap-4 mt-6">
                                                <button onClick={() => paginate(4)} disabled={loading} className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></button>
                                                <button 
                                                    onClick={handleFinalSignUp} 
                                                    disabled={loading} 
                                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-green-900/20 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                                                >
                                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                                    Create Account
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-12 text-center text-sm">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                Already have an account?{' '}
                                <Link to="/signin" className="text-purple-400 hover:text-purple-300 font-black ml-1 border-b border-purple-500/20 hover:border-purple-400 transition-colors pb-0.5">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </div>
                </div >
            </motion.div >
        </div >
    );
}
