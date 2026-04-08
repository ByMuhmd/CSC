import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Check, Smartphone } from 'lucide-react';

interface SplashProps {
    isVisible: boolean;
    config: any;
}

interface InstallProps {
    show: boolean;
    strategy: any;
    onInstall: () => void;
    onDismiss: () => void;
    platform: string;
}

export function PWASplashScreen({ isVisible, config }: SplashProps) {
    const [show, setShow] = useState(isVisible);

    useEffect(() => {
        if (!isVisible) {
            const timer = setTimeout(() => setShow(false), 1500);
            return () => clearTimeout(timer);
        } else {
            setShow(true);
        }
    }, [isVisible]);

    const accentThemes: any = {
        purple: 'from-fuchsia-500 via-indigo-500 to-sky-400',
        blue: 'from-cyan-500 via-blue-600 to-indigo-500',
        red: 'from-orange-500 via-rose-500 to-red-600',
        emerald: 'from-lime-400 via-emerald-500 to-teal-500',
        default: 'from-slate-800 via-slate-700 to-slate-600'
    };

    const gradientTheme = config?.customTheme?.accentColor
        ? accentThemes[config.customTheme.accentColor] || accentThemes.default
        : accentThemes.default;

    const appName = config?.customName || 'The Cohort';

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${gradientTheme}`}
                >
                    <div className="pointer-events-none absolute -top-28 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-black/20 blur-3xl" />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 1.08, opacity: 0, y: -10 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="relative z-10 w-[min(88vw,24rem)]"
                    >
                        <div className="rounded-3xl border border-white/30 bg-white/10 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                            <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-2xl border border-white/25 bg-black/15">
                                {config?.splashUrl ? (
                                    <img src={config.splashUrl} alt="App Logo" className="h-20 w-20 object-contain drop-shadow-2xl" />
                                ) : config?.logoUrl ? (
                                    <img src={config.logoUrl} alt="App Logo" className="h-20 w-20 object-contain drop-shadow-2xl" />
                                ) : (
                                    <span className="text-4xl font-black tracking-tight text-white">CS</span>
                                )}
                            </div>

                            <h2 className="text-center text-2xl font-black uppercase tracking-[0.14em] text-white sm:text-3xl">
                                {appName}
                            </h2>

                            <div className="mt-6">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                                        className="h-full w-1/2 bg-white/90"
                                    />
                                </div>
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function PWAInstallModal({ show, strategy, onInstall, onDismiss, platform }: InstallProps) {
    if (!show) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onDismiss}
                />

                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-md bg-[#0A0C10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                >
                    <div className="h-32 bg-gradient-to-br from-purple-900/50 to-blue-900/50 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-white/5 opacity-20" />
                        <div className="w-16 h-16 bg-black rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center z-10">
                            <Smartphone size={32} className="text-white" />
                        </div>
                        <button
                            onClick={onDismiss}
                            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-6">
                        <h2 className="text-2xl font-black text-white text-center mb-2">
                            {strategy?.customTitle || 'Install App'}
                        </h2>
                        <p className="text-gray-400 text-center text-sm mb-6 leading-relaxed">
                            {strategy?.customBody || `Install our ${platform === 'desktop' ? 'desktop' : 'mobile'} app for the best experience.`}
                        </p>

                        <div className="space-y-3 mb-8">
                            {(strategy?.perks || ['Offline Access', 'Instant Loading', 'Push Notifications']).map((perk: string, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="p-1 bg-green-500/20 rounded-full">
                                        <Check size={12} className="text-green-400" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-200">{perk}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={onInstall}
                            className="w-full py-4 bg-white text-black font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Download size={18} />
                            Install Now - It's Free
                        </button>

                        <p className="text-center text-[10px] text-gray-600 mt-4">
                            Verified secure • negligible storage usage
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}