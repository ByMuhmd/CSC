import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, ArrowLeft, ShieldAlert, BookOpen, Layers, Wrench } from 'lucide-react';

type MaintenanceScope = 'system' | 'quizzes' | 'materials' | 'course';

interface Props {
    scope?: MaintenanceScope;
    title?: string;
    message?: string;
}

const copyByScope: Record<MaintenanceScope, { title: string; message: string; icon: React.ReactNode; badge: string }> = {
    system: {
        title: 'System Maintenance',
        message: 'The platform is temporarily offline while we apply updates and stabilize services.',
        icon: <ShieldAlert className="h-8 w-8 text-red-300" />,
        badge: 'All Access Paused',
    },
    quizzes: {
        title: 'Quizzes Under Maintenance',
        message: 'The quizzes section is temporarily unavailable while we are updating quiz content and access rules.',
        icon: <BookOpen className="h-8 w-8 text-blue-300" />,
        badge: 'Quiz Section Locked',
    },
    materials: {
        title: 'Materials Under Maintenance',
        message: 'The materials section is temporarily unavailable while we refresh course assets and lessons.',
        icon: <Layers className="h-8 w-8 text-emerald-300" />,
        badge: 'Materials Section Locked',
    },
    course: {
        title: 'Course Content Under Maintenance',
        message: 'This course area is temporarily unavailable while we update lessons and resources.',
        icon: <Wrench className="h-8 w-8 text-cyan-300" />,
        badge: 'Course Content Locked',
    },
};

export default function MaintenancePage({ scope = 'system', title, message }: Props) {
    const navigate = useNavigate();
    const fallback = copyByScope[scope];
    const pageTitle = title || fallback.title;
    const pageMessage = message || fallback.message;

    return (
        <div className="min-h-screen overflow-hidden bg-[#030406] text-white selection:bg-white/20">
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
                <div className="absolute left-[-10%] top-[-10%] h-[20rem] w-[20rem] rounded-full bg-white/5 blur-[120px] sm:h-[36rem] sm:w-[36rem] sm:blur-[140px]" />
                <div className="absolute bottom-[-12%] right-[-8%] h-[18rem] w-[18rem] rounded-full bg-cyan-500/10 blur-[120px] sm:h-[30rem] sm:w-[30rem] sm:blur-[140px]" />
            </div>

            <div className="relative mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 sm:py-16">
                <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:rounded-[36px] sm:p-8 md:p-10">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-300 sm:px-4">
                        <Clock3 size={12} className="text-white/70" />
                        {fallback.badge}
                    </div>

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 sm:h-16 sm:w-16">
                            {fallback.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">{pageTitle}</h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base md:text-lg">{pageMessage}</p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-4 sm:p-5">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.65)]" />
                            <div className="text-xs font-black uppercase tracking-[0.24em] text-red-300 sm:text-sm">Temporarily Unavailable</div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-gray-400">
                            <p>Maintenance mode can be toggled from the admin system panel.</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <ArrowLeft size={16} />
                            Go Back
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition-colors hover:bg-gray-200"
                        >
                            Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}