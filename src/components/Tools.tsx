import React, { useState, useEffect, useRef } from 'react';
import { Timer, Pause, Play, RotateCcw, X, Minimize2, Settings, Coffee, Zap, Volume2, VolumeX, Sparkles, Loader2, Globe } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useGamification } from '../hooks/useGamification';
import { translateText } from '../services/gemini';
import { Loading } from './UIComponents';

const playNotificationSound = () => {
    try {
        const audio = new Audio('/sound.mp3');
        audio.play().catch(e => console.error("Audio play failed", e));
    } catch (e) {
        console.error("Audio init failed", e);
    }
};

export function Pomodoro({ embedded = false }: { embedded?: boolean }) {
    const location = useLocation();
    const { addXP, addStudySession, timerSettings, updateTimerSettings } = useGamification();
    const [isOpen, setIsOpen] = useState(embedded);

    const { workTime, breakTime, soundEnabled } = timerSettings;
    const setWorkTime = (val: number) => updateTimerSettings({ workTime: val });
    const setBreakTime = (val: number) => updateTimerSettings({ breakTime: val });
    const setSoundEnabled = (val: boolean) => updateTimerSettings({ soundEnabled: val });

    const [showSettings, setShowSettings] = useState(false);

    const getInitialState = () => {
        try {
            const savedState = localStorage.getItem('pomo_state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                if (parsed.isActive && parsed.targetTime) {
                    const now = Date.now();
                    const remaining = Math.ceil((parsed.targetTime - now) / 1000);
                    if (remaining > 0) {
                        return {
                            timeLeft: remaining,
                            isActive: true,
                            isBreak: parsed.isBreak,
                            targetTime: parsed.targetTime
                        };
                    }
                }
                return {
                    timeLeft: parsed.timeLeft || (parsed.isBreak ? breakTime * 60 : workTime * 60),
                    isActive: false,
                    isBreak: parsed.isBreak || false,
                    targetTime: null
                };
            }
        } catch (e) { console.error(e); }

        return {
            timeLeft: workTime * 60,
            isActive: false,
            isBreak: false,
            targetTime: null
        };
    };

    const initState = getInitialState();

    const [timeLeft, setTimeLeft] = useState(initState.timeLeft);
    const [isActive, setIsActive] = useState(initState.isActive);
    const [isBreak, setIsBreak] = useState(initState.isBreak);
    const [isMinimized, setIsMinimized] = useState(false);

    const targetTimeRef = useRef<number | null>(initState.targetTime);

    const saveSession = (duration: number) => {
        try {
            const session = { date: new Date().toISOString(), duration, type: 'focus' };
            addStudySession(session);
        } catch (e) {
            console.error("Failed to save session", e);
        }
    };

    useEffect(() => {
        let interval: any = null;

        if (isActive) {
            if (!targetTimeRef.current) {
                targetTimeRef.current = Date.now() + timeLeft * 1000;
            }

            localStorage.setItem('pomo_state', JSON.stringify({
                isActive: true,
                isBreak,
                targetTime: targetTimeRef.current,
                timeLeft
            }));

            interval = setInterval(() => {
                const now = Date.now();
                if (!targetTimeRef.current) return;

                const remaining = Math.ceil((targetTimeRef.current - now) / 1000);

                if (remaining <= 0) {
                    setTimeLeft(0);
                    setIsActive(false);
                    targetTimeRef.current = null;

                    const newModeIsBreak = !isBreak;

                    localStorage.removeItem('pomo_state');

                    if (soundEnabled) playNotificationSound();

                    if (!isBreak) {
                        addXP(50);
                        saveSession(workTime);
                    }
                } else {
                    setTimeLeft(remaining);
                }
            }, 1000);
        } else {
            targetTimeRef.current = null;
            localStorage.setItem('pomo_state', JSON.stringify({
                isActive: false,
                isBreak,
                targetTime: null,
                timeLeft
            }));
        }

        return () => clearInterval(interval);
    }, [isActive, isBreak, workTime]);

    if (!embedded) {
        const hiddenPaths = ['/quizzes', '/materials', '/admin', '/ethics', '/differential-equations', '/mobile-apps', '/networks', '/modeling', '/topics', '/gpa'];
        if (hiddenPaths.some(path => location.pathname.startsWith(path))) return null;
    }

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        targetTimeRef.current = null;
        const newTime = (isBreak ? breakTime : workTime) * 60;
        setTimeLeft(newTime);
        localStorage.setItem('pomo_state', JSON.stringify({
            isActive: false,
            isBreak,
            targetTime: null,
            timeLeft: newTime
        }));
    };

    const switchMode = () => {
        setIsActive(false);
        const nextIsBreak = !isBreak;
        setIsBreak(nextIsBreak);
        targetTimeRef.current = null;
        const newTime = (nextIsBreak ? breakTime : workTime) * 60;
        setTimeLeft(newTime);
        localStorage.setItem('pomo_state', JSON.stringify({
            isActive: false,
            isBreak: nextIsBreak,
            targetTime: null,
            timeLeft: newTime
        }));
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const totalTime = (isBreak ? breakTime : workTime) * 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    if ((!isOpen || isMinimized) && !embedded) {
        return (
            <button
                onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                className={`fixed bottom-6 left-6 z-50 flex items-center justify-center md:justify-start md:gap-3 p-2 md:pl-2 md:pr-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 group border backdrop-blur-md overflow-hidden ${isActive
                    ? 'bg-black/80 border-purple-500/50 shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                    : 'bg-black/60 border-white/10 hover:bg-black/80'
                    }`}
            >
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={isActive ? (isBreak ? '#14b8a6' : '#9333ea') : '#333'}
                            strokeWidth="3"
                            strokeDasharray={`${progress}, 100`}
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        {isBreak ? (
                            <Coffee size={14} className={isActive ? "text-teal-400" : "text-gray-400"} />
                        ) : (
                            <Zap size={14} className={isActive ? "text-purple-400" : "text-gray-400"} />
                        )}
                    </div>
                </div>

                <div className="hidden md:flex flex-col items-start mr-1">
                    <span className={`font-mono font-bold text-lg leading-none ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {formatTime(timeLeft)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-500 leading-none mt-1">
                        {isBreak ? 'Relaxing' : 'Focusing'}
                    </span>
                </div>
            </button>
        );
    }

    return (
        <div className={`${embedded ? 'w-full relative bg-white/5 border border-white/5 rounded-2xl' : 'fixed bottom-6 left-6 z-50 w-80 bg-[#0A0C10]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl'} overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500`}>

            <div className={`absolute inset-0 opacity-20 transition-colors duration-1000 ${isBreak ? 'bg-gradient-to-tr from-teal-500 via-transparent to-transparent' : 'bg-gradient-to-tr from-purple-600 via-transparent to-transparent'}`} />

            <div className={`relative z-10 ${embedded ? 'p-4' : 'p-6'} flex flex-col items-center`}>
                <div className="w-full flex justify-between items-center mb-6 text-gray-400">
                    <button onClick={switchMode} className="hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        {isBreak ? <Coffee size={14} /> : <Zap size={14} />}
                        {isBreak ? 'Rest' : 'Focus'}
                    </button>
                    <div className="flex gap-3">
                        <button onClick={() => setShowSettings(!showSettings)} className={`hover:text-white transition-colors ${showSettings ? 'text-purple-400' : ''}`}>
                            <Settings size={16} />
                        </button>
                        {!embedded && (
                            <>
                                <button onClick={() => setIsMinimized(true)} className="hover:text-white transition-colors">
                                    <Minimize2 size={16} />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {showSettings ? (
                    <div className="w-full space-y-4 mb-4 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Values (minutes)</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-gray-400 block mb-1">Focus</span>
                                    <input
                                        type="number"
                                        value={workTime}
                                        onChange={(e) => setWorkTime(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400 block mb-1">Break</span>
                                    <input
                                        type="number"
                                        value={breakTime}
                                        onChange={(e) => setBreakTime(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Sound</span>
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500'}`}
                            >
                                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="relative mb-8">
                            <div className={`text-6xl font-thin tracking-wider font-mono tabular-nums transition-colors duration-500 ${isBreak ? 'text-teal-400' : 'text-white'}`}>
                                {formatTime(timeLeft)}
                            </div>
                            <div className={`absolute -inset-4 rounded-full border border-dashed transition-all duration-1000 opacity-20 ${isActive ? 'rotate-180 scale-110' : 'scale-100'} ${isBreak ? 'border-teal-500' : 'border-purple-500'}`} />
                        </div>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={resetTimer}
                                className="p-3 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            >
                                <RotateCcw size={20} />
                            </button>

                            <button
                                onClick={toggleTimer}
                                className={`p-5 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${isBreak
                                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-black shadow-teal-500/20'
                                    : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-purple-500/30'
                                    }`}
                            >
                                {isActive ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
                            </button>

                            <div className="w-11 h-11" />
                        </div>
                    </>
                )}
            </div>

            <div className="h-1 w-full bg-white/5 mt-auto">
                <div
                    className={`h-full transition-all duration-1000 ease-linear ${isBreak ? 'bg-teal-500' : 'bg-purple-500'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

interface TextTranslatorProps {
    apiKey: string;
}

export function Translation({ apiKey }: TextTranslatorProps) {
    const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
    const [translation, setTranslation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleSelection = () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || !sel.toString().trim()) {
                if (!translation && !loading) {
                    setSelection(null);
                }
                return;
            }

            const text = sel.toString().trim();
            if (text.length < 2) return;

            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            setSelection({
                text,
                x: rect.left + rect.width / 2,
                y: rect.top - 10
            });
        };

        document.addEventListener('mouseup', handleSelection);

        const handleMouseDown = (e: MouseEvent) => {
            if (containerRef.current && containerRef.current.contains(e.target as Node)) {
                return;
            }
            setSelection(null);
            setTranslation(null);
            setError(null);
        };

        document.addEventListener('mousedown', handleMouseDown);

        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [translation, loading]);

    const handleTranslate = async () => {
        if (!selection) return;

        setLoading(true);
        setError(null);

        try {
            const result = await translateText(apiKey, selection.text);
            if (result.error) {
                setError(result.error);
            } else {
                setTranslation(result.translation);
            }
        } catch (e) {
            setError("Failed to connect to translation service.");
        } finally {
            setLoading(false);
        }
    };

    const closeTranslation = () => {
        setTranslation(null);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    };

    if (!selection) return null;

    return (
        <div
            ref={containerRef}
            className="fixed z-50 pointer-events-auto"
            style={{
                left: selection.x,
                top: selection.y,
                transform: 'translate(-50%, -100%)'
            }}
        >
            {!translation && !loading && !error && (
                <button
                    onClick={handleTranslate}
                    className="flex items-center gap-2 bg-black/90 text-white px-3 py-1.5 rounded-full shadow-xl border border-white/10 hover:scale-105 transition-all animate-in zoom-in duration-200 cursor-pointer hover:bg-black"
                >
                    <Globe size={14} className="text-purple-400" />
                    <span className="text-xs font-bold whitespace-nowrap">Translate</span>
                </button>
            )}

            {(loading || translation || error) && (
                <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl w-64 md:w-80 animate-in zoom-in fade-in duration-200 mb-2">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-400" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Arabic Translation</span>
                        </div>
                        <button onClick={closeTranslation} className="text-gray-500 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loading className="w-8 h-8 text-purple-500" />
                        </div>
                    ) : error ? (
                        <p className="text-red-400 text-sm">{error}</p>
                    ) : (
                        <div className="text-right">
                            <p className="text-white text-lg font-bold leading-relaxed font-arabic" dir="rtl">
                                {translation}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
