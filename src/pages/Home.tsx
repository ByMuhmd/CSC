import { useState, useRef } from 'react';
import { BookOpen, Youtube, Send, HardDrive, User, Trophy, LifeBuoy, Swords, Github, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMaintenance } from '../hooks/useMaintenance';
import logo from '../assets/logo3.png';
import { Notifications as NotificationBell, Events as ExamCountdown, WelcomeModal as GuestWelcomeModal } from '../components/UIComponents';
import { createPortal } from 'react-dom';
import { usePWAControl } from '../hooks/usePWAControl';
import { supabase } from '../lib/supabase';

export default function Home() {
    const { user, guest, profile } = useAuth();
    const { isQuizzesHidden, isMaterialsHidden, isLeaderboardHidden, isChallengesHidden, currentTheme } = useMaintenance();
    const { isPWA, isOffline, config: pwaConfig } = usePWAControl();
    const [isEditingYear, setIsEditingYear] = useState(false);
    const yearButtonRef = useRef<HTMLButtonElement>(null);
    const { updateGuest } = useAuth();

    const handleUpdateLevel = async (newLevel: number) => {
        const levelStr = String(newLevel);
        try {
            if (user) {
                const [{ error: profileError }, { error: metadataError }] = await Promise.all([
                    supabase.from('profiles').update({ academic_level: levelStr, updated_at: new Date().toISOString() }).eq('id', user.id),
                    supabase.auth.updateUser({
                        data: {
                            ...user.user_metadata,
                            academic_level: levelStr
                        }
                    })
                ]);
                if (profileError) throw profileError;
                if (metadataError) throw metadataError;
                window.location.reload();
            } else if (guest) {
                updateGuest({ academic_level: levelStr });
                setIsEditingYear(false);
            }
        } catch (err) {
            console.error("Failed to update academic level", err);
            alert("Failed to update academic level");
        }
    };

    const themes: any = {
        default: {
            bgGradients: ['from-purple-900/20', 'to-blue-900/20'],
            logoGradient: 'from-purple-600 to-blue-600',
            textGradient: 'from-white to-gray-400',
            accent: 'purple',
            greeting: 'CS COHORT \'23',
            subGreeting: 'Our Tech, Your Mind.',
            showSnow: false
        },
        winter: {
            bgGradients: ['from-cyan-900/20', 'to-blue-900/20'],
            logoGradient: 'from-cyan-500 to-blue-600',
            textGradient: 'from-cyan-100 via-white to-blue-200',
            accent: 'cyan',
            greeting: 'HAPPY WINTER VACATION',
            subGreeting: 'Relax. Recharge. Return Stronger.',
            showSnow: true
        },
        new_year: {
            bgGradients: ['from-yellow-900/20', 'to-purple-900/20'],
            logoGradient: 'from-yellow-400 to-purple-600',
            textGradient: 'from-yellow-200 via-white to-purple-300',
            accent: 'yellow',
            greeting: 'HAPPY NEW YEAR',
            subGreeting: 'New Beginnings, Endless Possibilities.',
            showSnow: false
        },
        ramadan: {
            bgGradients: ['from-[#0F172A]', 'to-[#312E81]'],
            logoGradient: 'from-amber-400 to-yellow-600',
            textGradient: 'from-amber-200 via-white to-yellow-100',
            accent: 'amber',
            greeting: 'RAMADAN KAREEM',
            subGreeting: 'May this month bring peace and joy.',
            showSnow: false
        },
        eid: {
            bgGradients: ['from-[#2e1065]', 'to-[#4c1d95]'],
            logoGradient: 'from-pink-400 to-purple-600',
            textGradient: 'from-pink-200 via-white to-purple-200',
            accent: 'pink',
            greeting: 'EID MUBARAK',
            subGreeting: 'Celebrating with joy and gratitude.',
            showSnow: false
        },
        summer: {
            bgGradients: ['from-orange-900/20', 'to-teal-900/20'],
            logoGradient: 'from-orange-500 to-teal-500',
            textGradient: 'from-orange-200 via-white to-teal-200',
            accent: 'orange',
            greeting: 'HAPPY SUMMER VACATION',
            subGreeting: 'Enjoy the sun and waves!',
            showSnow: false
        }
    };

    let activeTheme = themes.default;

    const effectiveTheme = (isPWA && pwaConfig) ? pwaConfig : currentTheme;

    if (effectiveTheme?.theme === 'custom' && effectiveTheme?.customTheme) {
        const { greeting, subGreeting, accentColor } = effectiveTheme.customTheme;
        const safeAccent = (accentColor === 'white' || !accentColor) ? 'slate' : accentColor;

        activeTheme = {
            bgGradients: [`from-${safeAccent}-900/40`, `to-${safeAccent}-900/10`],
            logoGradient: `from-${safeAccent}-500 to-${safeAccent}-300`,
            textGradient: 'from-white via-slate-200 to-slate-300',
            accent: safeAccent,
            greeting: greeting || 'CS COHORT \'23',
            subGreeting: subGreeting || 'Native App Experience',
            showSnow: false,
        };
    } else if (effectiveTheme?.theme && themes[effectiveTheme.theme]) {
        activeTheme = themes[effectiveTheme.theme];
    } else if (effectiveTheme?.mode === 'custom' && effectiveTheme?.customConfig) {
        const { greeting, subGreeting, accentColor, showSnow } = effectiveTheme.customConfig;
        const safeAccent = accentColor === 'white' ? 'slate' : accentColor;

        activeTheme = {
            bgGradients: [`from-${safeAccent}-900/40`, `to-${safeAccent}-900/10`],
            logoGradient: `from-${safeAccent}-500 to-${safeAccent}-300`,
            textGradient: 'from-white via-slate-200 to-slate-300',
            accent: safeAccent,
            greeting: greeting || 'CS COHORT \'23',
            subGreeting: subGreeting || 'Our Tech, Your Mind.',
            showSnow: showSnow
        };
    } else if (effectiveTheme?.value && themes[effectiveTheme.value]) {
        activeTheme = themes[effectiveTheme.value];
    } else if (typeof effectiveTheme === 'string' && themes[effectiveTheme]) {
        activeTheme = themes[effectiveTheme];
    }

    return (
        <div className={`min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-4 py-8 md:py-16 pb-32 relative overflow-x-hidden selection:bg-${activeTheme.accent}-500/30`}>
            <GuestWelcomeModal />

            {isOffline && (
                <div className="relative z-10 mb-4 w-full max-w-5xl rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-md">
                    Offline mode is active. Cached materials, exams, and reminders will stay available until you reconnect.
                </div>
            )}

            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className={`absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-${activeTheme.accent}-900/20 rounded-full blur-[120px]`} />
                <div className={`absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] ${activeTheme.bgGradients[1].replace('to-', 'bg-')}`} />

                {activeTheme.showSnow && Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-white rounded-full animate-snowfall"
                        style={{
                            width: Math.random() * 4 + 2 + 'px',
                            height: Math.random() * 4 + 2 + 'px',
                            left: Math.random() * 100 + '%',
                            animationDelay: Math.random() * 5 + 's',
                            animationDuration: Math.random() * 10 + 10 + 's',
                            opacity: Math.random() * 0.5 + 0.1
                        }}
                    />
                ))}

            </div>

            <div className="max-w-5xl w-full z-10 animate-in fade-in zoom-in-95 duration-1000">
                <div className="grid grid-cols-1 justify-center md:grid-cols-4 gap-4 sm:gap-6 auto-rows-auto">

                    <div className="col-span-1 md:col-span-4 bg-[#0a0c10]/40 border border-white/10 rounded-[32px] p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-[#0a0c10]/60 transition-colors duration-500 shadow-xl backdrop-blur-md">
                        <div className={`absolute -inset-1 bg-gradient-to-r ${activeTheme.logoGradient} rounded-full blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-500`}></div>

                        <div className="relative group/logo">
                            <div className={`absolute -inset-4 bg-gradient-to-r ${activeTheme.logoGradient} rounded-full blur-[30px] opacity-20 group-hover/logo:opacity-50 transition duration-500`}></div>
                            <img
                                src={logo}
                                alt="Owl Logo"
                                className="relative w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl brightness-110 group-hover/logo:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>

                        <div className="text-center mt-6 space-y-2 z-10">
                            <h1 className={`text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${activeTheme.textGradient} drop-shadow-xl`}>
                                {activeTheme.greeting}
                            </h1>
                            <p className={`text-sm md:text-lg text-${activeTheme.accent}-200/80 font-medium tracking-wide`}>
                                {activeTheme.subGreeting}
                            </p>
                        </div>
                    </div>

                    <a href="/materials" className={`col-span-1 md:col-span-2 md:row-span-2 group relative block p-8 md:p-10 bg-[#0a0c10]/40 border border-white/10 hover:border-${activeTheme.accent}-500/50 rounded-[32px] transition-all duration-300 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] overflow-hidden hover:-translate-y-1 backdrop-blur-md flex flex-col justify-between h-full min-h-[280px] md:min-h-0`}>
                        <div className={`absolute inset-0 bg-gradient-to-br from-${activeTheme.accent}-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                        <div className={`absolute right-0 bottom-0 w-64 h-64 bg-${activeTheme.accent}-500/10 blur-[100px] rounded-full group-hover:bg-${activeTheme.accent}-500/30 transition-colors pointer-events-none`} />

                        <div className="relative z-10 flex flex-col items-start space-y-6">
                            <div className={`p-5 bg-${activeTheme.accent}-500/10 rounded-2xl group-hover:bg-${activeTheme.accent}-500/20 transition-all duration-500 shadow-lg border border-${activeTheme.accent}-500/20 group-hover:border-${activeTheme.accent}-500/40 group-hover:scale-110 group-hover:rotate-3`}>
                                <BookOpen className={`w-10 h-10 text-${activeTheme.accent}-400`} />
                            </div>
                            <div>
                                <h2 className={`mb-3 text-4xl font-black text-white group-hover:text-${activeTheme.accent}-300 transition-colors tracking-tight`}>Materials</h2>
                                <p className="text-base text-gray-400 group-hover:text-gray-300 transition-colors font-medium leading-relaxed max-w-[200px]">
                                    Access study resources and lecture notes
                                </p>
                            </div>
                        </div>
                        
                        <div className="relative z-10 mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
                            Explore Repository <Send size={12} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </a>

                    <a href="/quizzes" className="col-span-1 md:col-span-2 group relative block p-8 md:p-10 bg-[#0a0c10]/40 border border-white/10 hover:border-blue-500/50 rounded-[32px] transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] overflow-hidden hover:-translate-y-1 backdrop-blur-md h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute right-0 bottom-0 w-48 h-48 bg-blue-500/20 blur-[80px] rounded-full group-hover:bg-blue-500/40 transition-colors pointer-events-none" />

                        <div className="relative z-10 flex flex-row items-center gap-6">
                            <div className="p-4 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-all duration-300 shadow-lg border border-blue-500/20 group-hover:border-blue-500/40 group-hover:scale-110">
                                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="mb-1 text-2xl md:text-3xl font-black text-white group-hover:text-blue-300 transition-colors tracking-tight">Quizzes</h2>
                                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors font-medium leading-snug">
                                    Practice with interactive quizzes
                                </p>
                            </div>
                        </div>
                    </a>

                    <a href="/gpa" className="col-span-1 md:col-span-2 group relative block p-8 md:p-10 bg-[#0a0c10]/40 border border-white/10 hover:border-cyan-500/50 rounded-[32px] transition-all duration-300 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] overflow-hidden hover:-translate-y-1 backdrop-blur-md h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute right-0 bottom-0 w-48 h-48 bg-cyan-500/20 blur-[80px] rounded-full group-hover:bg-cyan-500/40 transition-colors pointer-events-none" />

                        <div className="relative z-10 flex flex-row items-center gap-6">
                            <div className="p-4 bg-cyan-500/10 rounded-2xl group-hover:bg-cyan-500/20 transition-all duration-300 shadow-lg border border-cyan-500/20 group-hover:border-cyan-500/40 group-hover:scale-110">
                                <Calculator className="w-8 h-8 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="mb-1 text-2xl md:text-3xl font-black text-white group-hover:text-cyan-300 transition-colors tracking-tight">GPA & Rules</h2>
                                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors font-medium leading-snug">
                                    Calculate GPA and review rules
                                </p>
                            </div>
                        </div>
                    </a>



                    {!isChallengesHidden && (
                        <div className="col-span-1 md:col-span-4 relative group">
                            <a href="/challenges" className="block p-8 md:p-10 bg-[#0a0c10]/40 border border-white/10 hover:border-emerald-500/50 rounded-[32px] transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] overflow-hidden hover:-translate-y-1 backdrop-blur-md">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/30 transition-colors pointer-events-none" />

                                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-all duration-500 shadow-lg border border-emerald-500/20 group-hover:border-emerald-500/40 group-hover:scale-110 group-hover:-rotate-3">
                                            <Swords className="w-10 h-10 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-white group-hover:text-emerald-300 transition-colors mb-2 tracking-tight">PvP Challenges</h2>
                                            <p className="text-base text-gray-400 group-hover:text-gray-300 transition-colors font-medium leading-snug max-w-md">Challenge friends, compete in real-time, and climb the global ranks.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-10 h-10 rounded-full border-2 border-emerald-500/30 bg-emerald-900/50 flex items-center justify-center text-[10px] font-black text-emerald-300 backdrop-blur-sm shadow-xl">
                                                    U{i}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="h-10 w-px bg-white/10 mx-2" />
                                        <span className="px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                            Play Now
                                        </span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    )}

                    {(user || guest) && (
                        <div className="col-span-1 md:col-span-1 bg-[#0a0c10]/40 border border-white/10 rounded-[32px] p-6 flex flex-col justify-center relative hover:bg-[#0a0c10]/60 transition-colors backdrop-blur-md">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 text-center">Academic Year</p>
                            <div className="flex justify-center w-full">
                                <button
                                    ref={yearButtonRef}
                                    onClick={() => setIsEditingYear(!isEditingYear)}
                                    className={`px-4 py-3 rounded-2xl border bg-white/5 border-white/10 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 text-${activeTheme.accent}-300 hover:bg-white/10 transition-colors cursor-pointer w-full group overflow-hidden`}
                                >
                                    <BookOpen size={14} className="group-hover:scale-110 transition-transform flex-shrink-0" />
                                    <span className="truncate">Year {profile?.academic_level || guest?.academic_level || 1}</span>
                                </button>

                                {isEditingYear && yearButtonRef.current && createPortal(
                                    <>
                                        <div
                                            className="fixed inset-0 z-[9998]"
                                            onClick={() => setIsEditingYear(false)}
                                        />
                                        <div
                                            className="fixed z-[9999] bg-[#0A0C10] border border-white/20 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-[120px] border-t-[4px] border-t-purple-500 animate-in slide-in-from-top-2"
                                            style={{
                                                top: yearButtonRef.current.getBoundingClientRect().bottom + 8,
                                                left: yearButtonRef.current.getBoundingClientRect().left + yearButtonRef.current.getBoundingClientRect().width / 2 - 60,
                                            }}
                                        >
                                            {[1, 2, 3, 4].map((year) => (
                                                <button
                                                    key={year}
                                                    onClick={() => handleUpdateLevel(year)}
                                                    className={`px-4 py-3 text-center text-sm font-bold rounded-xl transition-colors ${String(year) === (profile?.academic_level || guest?.academic_level)
                                                        ? `bg-${activeTheme.accent}-500/20 text-${activeTheme.accent}-300 shadow-lg border border-${activeTheme.accent}-500/30`
                                                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                                                        }`}
                                                >
                                                    Y{year}
                                                </button>
                                            ))}
                                        </div>
                                    </>,
                                    document.body
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`col-span-1 ${user || guest ? 'md:col-span-2' : 'md:col-span-3'} bg-[#0a0c10]/40 border border-white/10 rounded-[32px] p-6 flex flex-col justify-center hover:bg-[#0a0c10]/60 transition-colors backdrop-blur-md overflow-hidden relative group/auth`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${activeTheme.accent}-500/10 blur-[50px] rounded-full group-hover/auth:bg-${activeTheme.accent}-500/20 transition-colors pointer-events-none`} />
                        {(user || guest) ? (
                            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-full overflow-hidden border-2 border-${activeTheme.accent}-500/50 shadow-[0_0_15px_rgba(255,255,255,0.15)] flex-shrink-0`}>
                                        {(user?.user_metadata?.avatar_url || guest?.avatar_url) ? (
                                            <img src={user?.user_metadata?.avatar_url || guest?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={`w-full h-full bg-${activeTheme.accent}-900 flex items-center justify-center`}>
                                                <User size={24} className={`text-${activeTheme.accent}-200`} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Welcome back</p>
                                        <span className="font-bold text-white text-lg tracking-tight line-clamp-1">
                                            {(user?.user_metadata?.full_name || guest?.full_name)?.split(' ')[0] || 'Student'}
                                        </span>
                                    </div>
                                </div>
                                <a href="/profile" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-bold text-sm text-gray-300 hover:text-white transition-colors w-full sm:w-auto text-center shadow-lg">
                                    View Profile
                                </a>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center justify-center w-full gap-4 relative z-10 h-full">
                                <a href="/signin" className="px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-bold hover:bg-white/10 hover:text-white transition-colors w-full sm:w-auto text-center">
                                    Sign In
                                </a>
                                <a href="/signup" className={`px-8 py-3.5 rounded-2xl bg-${activeTheme.accent}-600 border border-${activeTheme.accent}-500 text-white font-bold hover:bg-${activeTheme.accent}-500 transition-colors shadow-lg shadow-${activeTheme.accent}-500/20 w-full sm:w-auto text-center`}>
                                    Join the Cohort
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="col-span-1 md:col-span-1 bg-[#0a0c10]/40 border border-white/10 rounded-[32px] p-6 flex flex-col justify-center items-center gap-3 hover:bg-[#0a0c10]/60 transition-colors backdrop-blur-md">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center mb-1 w-full">Quick Tools</p>
                        <div className="flex justify-center gap-4 w-full">
                            <div className="relative group/tool flex items-center justify-center bg-white/5 rounded-full relative">
                                <NotificationBell align="left" />
                            </div>
                            {!isLeaderboardHidden && (
                                <div className="relative group/tool">
                                    <a href="/leaderboard" className="block p-2 rounded-full bg-white/5 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 border border-transparent hover:border-yellow-500/50 transition-colors shadow-[0_0_15px_rgba(250,204,21,0.05)] hover:shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                                        <Trophy size={20} />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
            <div className="w-full max-w-5xl z-10 mt-6 px-4 pb-12">
                <div className="w-full bg-[#0a0c10]/80 border border-white/10 rounded-[32px] p-6 lg:px-10 flex flex-col lg:flex-row items-center justify-between gap-6 backdrop-blur-md">
                    <div className="flex items-center justify-center gap-4">
                        <a href="https://www.youtube.com/@HIMITCS23" target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all duration-300 hover:scale-110 border border-transparent hover:border-red-500/50 shadow-sm">
                            <Youtube size={16} className="md:w-5 md:h-5" />
                        </a>
                        <a href="https://t.me/HIMITCSBOT" target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-blue-500/20 hover:text-blue-400 text-gray-400 transition-all duration-300 hover:scale-110 border border-transparent hover:border-blue-500/50 shadow-sm">
                            <Send size={16} className="md:w-5 md:h-5" />
                        </a>
                        <a href="https://drive.google.com/drive/folders/18GHSgj22RZ-YykL0oj2OnNigpAcDdbyr?usp=drive_link" target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-green-500/20 hover:text-green-400 text-gray-400 transition-all duration-300 hover:scale-110 border border-transparent hover:border-green-500/50 shadow-sm">
                            <HardDrive size={16} className="md:w-5 md:h-5" />
                        </a>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                        <a
                            href="https://github.com/ByMuhmd/CSC/blob/main/CONTRIBUTING.md"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <Github size={16} className="text-slate-300" />
                            Contribute
                        </a>
                        <a
                            href="/support"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <LifeBuoy size={16} className="text-cyan-400" />
                            Support
                        </a>
                        <a href="https://muhmdsamy.vercel.app/" target="_blank" rel="noreferrer" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] md:text-xs text-gray-400 font-bold tracking-widest uppercase">Powered By</span>
                            <img src="/logo(4).png" alt="Powered By Logo" className="h-6 md:h-7 object-contain drop-shadow-lg" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
