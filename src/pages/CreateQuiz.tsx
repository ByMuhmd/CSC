import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import UserQuizCreatorModal from '../components/UserQuizCreatorModal';

export default function CreateQuiz() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-sans relative overflow-hidden selection:bg-cyan-500/20">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
                <div className="absolute -top-24 left-8 h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-[130px]" />
                <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[120px]" />
            </div>

            <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-10 md:px-6 md:pt-14">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <Link
                        to="/quizzes"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Quizzes
                    </Link>

                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/90">
                        <Sparkles size={12} />
                        Quiz Builder
                    </span>
                </div>

                <UserQuizCreatorModal
                    mode="page"
                    onClose={() => navigate('/quizzes')}
                    onSuccess={() => navigate('/quizzes')}
                />
            </div>
        </div>
    );
}
