import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">

            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-900/20 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                    <div className="p-6 bg-red-500/10 rounded-full border border-red-500/20 animate-pulse">
                        <AlertTriangle className="w-16 h-16 text-red-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                        404
                    </h1>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Page Not Found</h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Oops! The page you are looking for seems to have wandered off into the digital void.
                    </p>
                </div>
            </div>
        </div>
    );
}
