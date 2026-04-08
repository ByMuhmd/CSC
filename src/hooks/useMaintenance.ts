import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MAINTENANCE_CACHE_KEY = 'app_maintenance_settings';

export function useMaintenance() {
    const [isSystemMaintenance, setIsSystemMaintenance] = useState(false);
    const [isLeaderboardLocked, setIsLeaderboardLocked] = useState(false);
    const [isXpFrozen, setIsXpFrozen] = useState(false);
    const [isQuizzesHidden, setIsQuizzesHidden] = useState(false);
    const [isMaterialsHidden, setIsMaterialsHidden] = useState(false);
    const [isLeaderboardHidden, setIsLeaderboardHidden] = useState(false);
    const [isChallengesHidden, setIsChallengesHidden] = useState(false);
    const [isBlindHourActive, setIsBlindHourActive] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<any>({ value: 'default' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cached = localStorage.getItem(MAINTENANCE_CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setIsSystemMaintenance(parsed.isSystemMaintenance || false);
                setIsLeaderboardLocked(parsed.isLeaderboardLocked || false);
                setIsXpFrozen(parsed.isXpFrozen || false);
                setIsQuizzesHidden(parsed.isQuizzesHidden || false);
                setIsMaterialsHidden(parsed.isMaterialsHidden || false);
                setIsLeaderboardHidden(parsed.isLeaderboardHidden || false);
                setIsChallengesHidden(parsed.isChallengesHidden || false);
                setIsBlindHourActive(parsed.isBlindHourActive || false);
                setCurrentTheme(parsed.currentTheme || { value: 'default' });
            } catch (e) {
                console.error("Failed to parse maintenance cache", e);
            }
        }
    }, []);

    useEffect(() => {
        fetchMaintenanceStatus();

        const channel = supabase
            .channel('maintenance_db_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'app_settings'
                },
                (payload: any) => {
                    const newVal = payload.new;
                    if (newVal && newVal.setting_key && newVal.setting_value) {
                        fetchMaintenanceStatus();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchMaintenanceStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('setting_key, setting_value')
                .in('setting_key', [
                    'maintenance_mode',
                    'leaderboard_locked', 
                    'xp_frozen', 
                    'quizzes_hidden', 
                    'materials_hidden', 
                    'leaderboard_hidden', 
                    'challenges_hidden', 
                    'blind_hour', 
                    'current_theme'
                ]);

            if (data) {
                const maintenanceMode = data.find(item => item.setting_key === 'maintenance_mode');
                const leaderboardLocked = data.find(item => item.setting_key === 'leaderboard_locked');
                const xpFrozen = data.find(item => item.setting_key === 'xp_frozen');
                const quizzesHidden = data.find(item => item.setting_key === 'quizzes_hidden');
                const materialsHidden = data.find(item => item.setting_key === 'materials_hidden');
                const leaderboardHidden = data.find(item => item.setting_key === 'leaderboard_hidden');
                const challengesHidden = data.find(item => item.setting_key === 'challenges_hidden');
                const blindHour = data.find(item => item.setting_key === 'blind_hour');
                const theme = data.find(item => item.setting_key === 'current_theme');

                const newState = {
                    isSystemMaintenance: maintenanceMode?.setting_value?.enabled === true,
                    isLeaderboardLocked: leaderboardLocked?.setting_value?.enabled === true,
                    isXpFrozen: xpFrozen?.setting_value?.enabled === true,
                    isQuizzesHidden: quizzesHidden?.setting_value?.enabled === true,
                    isMaterialsHidden: materialsHidden?.setting_value?.enabled === true,
                    isLeaderboardHidden: leaderboardHidden?.setting_value?.enabled === true,
                    isChallengesHidden: challengesHidden?.setting_value?.enabled === true,
                    isBlindHourActive: blindHour?.setting_value?.enabled === true,
                    currentTheme: theme?.setting_value || { value: 'default' }
                };

                setIsSystemMaintenance(newState.isSystemMaintenance);
                setIsLeaderboardLocked(newState.isLeaderboardLocked);
                setIsXpFrozen(newState.isXpFrozen);
                setIsQuizzesHidden(newState.isQuizzesHidden);
                setIsMaterialsHidden(newState.isMaterialsHidden);
                setIsLeaderboardHidden(newState.isLeaderboardHidden);
                setIsChallengesHidden(newState.isChallengesHidden);
                setIsBlindHourActive(newState.isBlindHourActive);
                setCurrentTheme(newState.currentTheme);
                localStorage.setItem(MAINTENANCE_CACHE_KEY, JSON.stringify(newState));
            }
        } catch (e) {
            console.error("Failed to fetch maintenance status", e);
        } finally {
            setLoading(false);
        }
    };

    return { 
        isSystemMaintenance,
        isLeaderboardLocked, 
        isXpFrozen, 
        isQuizzesHidden, 
        isMaterialsHidden, 
        isLeaderboardHidden, 
        isChallengesHidden, 
        isBlindHourActive, 
        currentTheme, 
        loading 
    };
}
