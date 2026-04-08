import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface PWAConfig {
    theme: string;
    customTheme?: {
        greeting?: string;
        accentColor?: string;
    };
    logoUrl?: string;
    splashUrl?: string;
    showInstallPrompt?: boolean;
}

interface InstallStrategy {
    mode: 'smart' | 'immediate' | 'manual';
    delay: number;
    customTitle?: string;
    customBody?: string;
    perks?: string[];
}

export function usePWAControl() {
    const { user } = useAuth();
    const [isPWA, setIsPWA] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [platform, setPlatform] = useState<'mobile' | 'desktop' | 'web'>('web');
    const [config, setConfig] = useState<PWAConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [installStrategy, setInstallStrategy] = useState<InstallStrategy | null>(null);

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsPWA(!!isStandalone);

        const ua = navigator.userAgent;
        if (/android|iphone|ipad|ipod/i.test(ua)) {
            setPlatform(isStandalone ? 'mobile' : 'web');
        } else {
            setPlatform(isStandalone ? 'desktop' : 'web');
        }
    }, []);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            console.log("PWA Install Prompt intercepted");
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await supabase
                    .from('app_settings')
                    .select('*')
                    .in('setting_key', ['pwa_mobile_config', 'pwa_desktop_config', 'pwa_install_strategy']);

                if (data) {
                    const mobile = data.find(i => i.setting_key === 'pwa_mobile_config')?.setting_value;
                    const desktop = data.find(i => i.setting_key === 'pwa_desktop_config')?.setting_value;
                    const strategy = data.find(i => i.setting_key === 'pwa_install_strategy')?.setting_value;

                    if (strategy) setInstallStrategy(strategy);

                    if (platform === 'mobile' && mobile) {
                        setConfig(mobile);
                    } else if (platform === 'desktop' && desktop) {
                        setConfig(desktop);
                    } else {


                        if (mobile) setConfig(mobile);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch PWA config", e);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, [platform]);

    useEffect(() => {
        if (!deferredPrompt || !installStrategy || isPWA) return;

        if (installStrategy.mode === 'immediate') {
            setShowInstallModal(true);
        } else if (installStrategy.mode === 'smart') {
            const timer = setTimeout(() => {
                setShowInstallModal(true);
            }, installStrategy.delay || 5000);
            return () => clearTimeout(timer);
        }
    }, [deferredPrompt, installStrategy, isPWA]);

    useEffect(() => {
        if (isPWA && !loading) {
            const logLaunch = async () => {
                const alreadyLogged = sessionStorage.getItem('pwa_launch_logged');
                if (alreadyLogged) return;

                try {
                    await supabase.from('pwa_analytics').insert({
                        event_type: platform === 'mobile' ? 'launch_mobile' : 'launch_desktop',
                        user_agent: navigator.userAgent,
                        user_id: user?.id
                    });
                    sessionStorage.setItem('pwa_launch_logged', 'true');
                } catch (e) {
                    console.error("Failed to log PWA launch", e);
                }
            };
            logLaunch();
        }
    }, [isPWA, loading, platform, user]);

    const installPWA = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallModal(false);

            await supabase.from('pwa_analytics').insert({
                event_type: 'install_accepted',
                user_id: user?.id
            });
        }
        setDeferredPrompt(null);
    };

    const dismissInstall = () => {
        setShowInstallModal(false);

    };

    return {
        isPWA,
        isOffline,
        platform,
        config,
        loading,
        showInstallModal,
        installStrategy,
        installPWA,
        dismissInstall
    };
}
