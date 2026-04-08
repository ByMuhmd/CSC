import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function PageLoader() {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" />
            </div>

            <div className="relative z-10 flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-purple-500/30 animate-[spin_1.5s_linear_infinite]" />
                    <div className="absolute -inset-2 rounded-full border-r-2 border-b-2 border-blue-500/30 animate-[spin_2s_linear_infinite_reverse]" />

                    <div className="p-8 rounded-full bg-black/20 backdrop-blur-md border border-white/5 shadow-[0_0_60px_rgba(168,85,247,0.2)] relative z-10 group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 blur-xl group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative transform transition-all duration-700 group-hover:scale-110 group-hover:rotate-12">
                            <img
                                src="/favicon.png"
                                alt="Loading..."
                                className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

export function PushNotificationListener() {
    usePushNotifications();
    return null;
}