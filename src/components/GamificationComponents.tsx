import React, { useRef } from 'react';
import { Award, Trophy, Zap, Flame, CheckCircle, Download, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useGamification } from '../hooks/useGamification';
import { useMaintenance } from '../hooks/useMaintenance';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Badge {
    id: string;
    name: string;
    description: string;
    image_url: string;
    xp_req: number;
    condition_type: string;
    condition_value: string;
}

interface AchievementsProps {
    sessions: any[];
    streak: number;
    profileData: any;
    coursesCompleted: number;
}

export function Achievements({ sessions, streak, profileData, coursesCompleted }: AchievementsProps) {
    const [selectedBadge, setSelectedBadge] = React.useState<string | null>(null);
    const [showAllBadges, setShowAllBadges] = React.useState(false);
    const availableBadges = useGamification(state => state.availableBadges);
    const unlockedBadges = useGamification(state => state.badges);

    const isEmoji = (str: string) => {
        return str && !str.startsWith('http');
    };

    const processedBadges = React.useMemo(() => {
        const unique = new Map<string, Badge>();
        (unlockedBadges || []).forEach((badge: any) => {
            if (badge?.id) unique.set(badge.id, badge);
        });
        return Array.from(unique.values()).sort((a: any, b: any) => {
            const aTime = a?.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
            const bTime = b?.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [unlockedBadges]);

    const unlockedCount = processedBadges.length;
    const totalBadges = availableBadges.length;
    const progressPx = totalBadges > 0 ? (unlockedCount / totalBadges) * 100 : 0;
    const visibleBadges = showAllBadges ? processedBadges : processedBadges.slice(0, 3);

    const containerVar = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVar = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="mb-12">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 flex items-center gap-3">
                        <Award className="text-yellow-400 fill-yellow-400/20" size={28} />
                        Your Trophy Case
                    </h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1 ml-10">
                        {unlockedCount === 0 ? "Start collecting badges!" : "Showcase your achievements"}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black text-white">{unlockedCount}</span>
                    <span className="text-gray-500 text-lg font-bold mx-1">/</span>
                    <span className="text-gray-500 text-lg font-bold">{totalBadges}</span>
                </div>
            </div>

            <div className="relative h-2 bg-[#0A0C10] rounded-full mb-8 overflow-hidden border border-white/5 shadow-inner">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPx}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.5)]"
                >
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 0)', backgroundSize: '6px 6px' }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </motion.div>
            </div>

            {unlockedCount === 0 ? (
                <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-12 text-center group hover:border-white/10 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-50 pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(250,204,21,0.1)] animate-pulse">
                            <Trophy size={40} className="text-yellow-500/50" />
                        </div>
                        <h4 className="text-xl font-bold text-white">No trophies yet</h4>
                        <p className="text-gray-400 max-w-sm mx-auto">
                            Complete courses, maintain streaks, and pass quizzes to fill this shelf with glory!
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <motion.div
                        variants={containerVar}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    >
                        {visibleBadges.map((badge) => (
                            <motion.div
                                key={badge.id}
                                variants={itemVar}
                                className="relative group cursor-pointer perspective-1000"
                                onClick={() => setSelectedBadge(selectedBadge === badge.id ? null : badge.id)}
                                onMouseEnter={() => setSelectedBadge(badge.id)}
                                onMouseLeave={() => setSelectedBadge(null)}
                            >
                                <div className="relative overflow-hidden rounded-2xl border transition-all duration-500 h-full bg-gradient-to-br from-[#1a1d24] to-[#0A0C10] border-yellow-500/30 hover:border-yellow-400/60 hover:shadow-[0_0_40px_rgba(250,204,21,0.2)] hover:-translate-y-1">
                                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />
                                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />

                                    <div className="p-5 flex flex-col items-center text-center h-full relative z-10">
                                        <div className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center text-3xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] transition-transform duration-500 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 group-hover:scale-110 group-hover:rotate-3">
                                            {isEmoji(badge.image_url) ? (
                                                <span className="drop-shadow-2xl filter brightness-125">{badge.image_url}</span>
                                            ) : (
                                                <img src={badge.image_url} alt={badge.name} className="w-full h-full object-cover rounded-xl" />
                                            )}
                                        </div>

                                        <h4 className="font-bold text-sm mb-1 text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                                            {badge.name}
                                        </h4>

                                        <div className="mt-auto pt-3 w-full">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-500 uppercase tracking-wide shadow-[0_0_10px_rgba(250,204,21,0.1)] group-hover:bg-yellow-500/20 group-hover:border-yellow-400/40 transition-all">
                                                <Zap size={10} className="fill-yellow-500" /> Unlocked
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {selectedBadge === badge.id && (
                                            <motion.div
                                                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                                                animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                                                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                                                className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-4 text-center rounded-2xl"
                                            >
                                                <p className="text-xs text-gray-200 font-medium leading-relaxed mb-2">
                                                    {badge.description}
                                                </p>
                                                <div className="px-2 py-1 rounded bg-white/10 text-[10px] font-mono text-yellow-300 border border-white/5">
                                                    +{badge.xp_req} XP
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {!showAllBadges && processedBadges.length > 3 && (
                        <button
                            onClick={() => setShowAllBadges(true)}
                            className="mt-4 w-full md:hidden rounded-xl bg-white/5 px-5 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 group"
                        >
                            Show More
                            <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

interface Activity {
    date: string;
    type?: string;
    count?: number;
}

export const Heatmap = ({ activities }: { activities: Activity[] }) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    const days = Array.from({ length: 365 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return d;
    });

    const getIntensity = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayActivities = activities.filter(a => a.date.startsWith(dateStr));
        const count = dayActivities.length;

        if (count === 0) return 0;
        if (count <= 2) return 1;
        if (count <= 5) return 2;
        if (count <= 9) return 3;
        return 4;
    };

    const colors = [
        'bg-[#1a1d24]',
        'bg-green-900/40',
        'bg-green-700/60',
        'bg-green-500/80',
        'bg-green-400'
    ];

    return (
        <div className="flex flex-col gap-2 h-full justify-between w-full">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Activity Year
                </h3>
                <div className="text-[10px] text-gray-600 flex gap-1 items-center">
                    <span>Less</span>
                    {colors.map((c, i) => <div key={i} className={`w-2 h-2 rounded-[1px] ${c}`} />)}
                    <span>More</span>
                </div>
            </div>

            <div className="flex-1 w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="grid grid-rows-7 grid-flow-col gap-[3px] w-max min-w-full">
                    {days.map((day, i) => {
                        const intensity = getIntensity(day);
                        const dateStr = day.toISOString().split('T')[0];
                        const dayCount = activities.filter(a => a.date.startsWith(dateStr)).length;
                        const dateString = day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

                        return (
                            <div
                                key={i}
                                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[1px] ${colors[intensity]} transition-colors relative group/cell`}
                            >
                                {intensity > 0 && (
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[10px] px-2 py-1 rounded shadow-lg border border-white/10 opacity-0 group-hover/cell:opacity-100 pointer-events-none z-50">
                                        <div className="font-bold">{dateString}</div>
                                        <div>{dayCount} activities</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

interface CertificateRendererProps {
    title: string;
    description: string;
    issueDate: string;
    recipientName: string;
    className?: string;
    metadata?: {
        issuer_name?: string;
        theme_color?: string;
        show_signature?: boolean;
        signature_name?: string;
        signature_title?: string;
        sub_title?: string;
        intro_text?: string;
        achievement_text?: string;
        date_label?: string;
        verify_label?: string;
    };
}

const THEMES: Record<string, { main: string, acc: string, bg: string }> = {
    gold: { main: 'text-yellow-500', acc: 'border-yellow-500/30', bg: 'bg-yellow-500' },
    silver: { main: 'text-gray-300', acc: 'border-gray-400/30', bg: 'bg-gray-400' },
    bronze: { main: 'text-orange-700', acc: 'border-orange-700/30', bg: 'bg-orange-700' },
    blue: { main: 'text-blue-500', acc: 'border-blue-500/30', bg: 'bg-blue-500' },
    purple: { main: 'text-purple-500', acc: 'border-purple-500/30', bg: 'bg-purple-500' },
};

export function Certificates({ title, description, issueDate, recipientName, className = '', metadata }: CertificateRendererProps) {
    const certRef = useRef<HTMLDivElement>(null);
    const theme = THEMES[metadata?.theme_color || 'gold'] || THEMES.gold;
    const issuer = metadata?.issuer_name || 'The Cohort';

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!certRef.current) return;

        try {
            const canvas = await html2canvas(certRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0F1115'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${title.replace(/\s+/g, '_')}_Certificate.pdf`);
        } catch (err) {
            console.error("PDF Fail:", err);
            alert("Failed to generate PDF");
        }
    };

    return (
        <div className={`relative group ${className}`}>
            <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleDownload}
                    className="bg-white text-black p-2 rounded-full shadow-lg hover:bg-gray-200 transition-colors"
                    title="Download PDF"
                >
                    <Download size={16} />
                </button>
            </div>

            <div ref={certRef} className={`relative overflow-hidden rounded-xl border-4 border-double ${theme.acc} bg-[#0F1115] p-8 flex flex-col items-center justify-center text-center aspect-[1.414/1] min-h-[300px]`}>
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className={`absolute top-0 left-0 w-32 h-32 ${theme.bg} rounded-full blur-[80px]`} />
                    <div className={`absolute bottom-0 right-0 w-32 h-32 ${theme.bg} rounded-full blur-[80px]`} />
                    <div className="w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
                </div>

                <div className="relative z-10 flex flex-col items-center h-full justify-between py-2">
                    <div className="flex flex-col items-center">
                        <Award size={48} className={`${theme.main} mb-4`} />
                        <h2 className="text-3xl font-serif text-white uppercase tracking-widest">{issuer}</h2>
                        <p className={`text-xs ${theme.main} font-bold uppercase tracking-[0.3em] mt-1`}>{metadata?.sub_title || 'Certificate of Completion'}</p>
                    </div>

                    <div className="my-6">
                        <p className="text-sm text-gray-400 font-serif italic mb-2">{metadata?.intro_text || 'This is to certify that'}</p>
                        <h3 className="text-4xl font-bold text-white mb-2 font-serif">{recipientName}</h3>
                        <p className="text-sm text-gray-400 font-serif italic mb-4">{metadata?.achievement_text || 'has successfully completed the course requirements for'}</p>
                        <h4 className={`text-2xl font-bold ${theme.main} max-w-md mx-auto leading-tight`}>{title}</h4>
                        <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">{description}</p>
                    </div>

                    <div className="w-full border-t border-white/10 pt-4 flex justify-between items-end px-4">
                        <div className="text-left">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{metadata?.date_label || 'Date Issued'}</div>
                            <div className="text-sm font-mono text-white">{new Date(issueDate).toLocaleDateString()}</div>
                        </div>

                        {metadata?.show_signature !== false && (
                            <div className="text-center">
                                <div className="font-script text-2xl text-white/50 mb-1 px-4 transform -rotate-2 font-serif italic">
                                    {metadata?.signature_name || `${issuer} Team`}
                                </div>
                                <div className="h-px w-32 bg-white/20 mx-auto" />
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{metadata?.signature_title || 'Authorized Signature'}</div>
                            </div>
                        )}

                        <div className="text-right">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{metadata?.verify_label || 'Verify ID'}</div>
                            <div className="text-[10px] font-mono text-white/50 flex items-center justify-end gap-1">
                                <CheckCircle size={10} className="text-green-500" />
                                {Math.random().toString(36).substring(2, 10).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function GamificationHUD() {
    const location = useLocation();
    const { xp, level, streak, checkStreak } = useGamification();
    const { isXpFrozen } = useMaintenance();

    if (location.pathname !== '/' || isXpFrozen) return null;

    return (
        <div className="fixed top-4 left-4 z-50 flex gap-3 animate-in slide-in-from-top fade-in duration-700">
            <div className={`bg-black/40 backdrop-blur-md border border-orange-500/30 rounded-full py-1 px-4 flex items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:bg-black/60 transition-colors select-none ${streak > 0 ? 'opacity-100' : 'opacity-50 grayscale hover:grayscale-0'}`}>
                <Flame size={18} className={`${streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-gray-500'}`} />
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Streak</span>
                    <span className="text-sm font-bold text-white leading-none">{streak} Days</span>
                </div>
            </div>
        </div>
    );
}
