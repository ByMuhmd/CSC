import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
    id: string;
    title: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (title: string, message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((title: string, message: string, type: ToastType = 'info', duration = 5000) => {
        const id = crypto.randomUUID();
        const newToast = { id, title, message, type, duration };

        setToasts(prev => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getTypeStyles = (type: ToastType) => {
        switch (type) {
            case 'success': return 'bg-green-500/10 border-green-500/50 text-green-400';
            case 'warning': return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
            case 'error': return 'bg-red-500/10 border-red-500/50 text-red-400';
            default: return 'bg-purple-500/10 border-purple-500/50 text-purple-400';
        }
    };

    const getTypeIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />;
            case 'warning': return <AlertTriangle size={20} />;
            case 'error': return <XCircle size={20} />;
            default: return <Info size={20} />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none p-4 sm:p-0">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto
                            flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl
                            transform transition-all duration-300 animate-in slide-in-from-right-full fade-in
                            ${getTypeStyles(toast.type)} bg-gray-900/90
                        `}
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            {getTypeIcon(toast.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-white mb-0.5">{toast.title}</h3>
                            <p className="text-sm text-gray-300 leading-snug">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
