import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { GamificationConfig, XP_PER_QUIZ_COMPLETE, XP_PER_CORRECT_ANSWER, XP_PER_ESSAY_PASS, DEFAULT_RANKS } from '../utils/gamification';

interface Badge {
    id: string;
    name: string;
    description: string;
    image_url: string;
    xp_req: number;
    condition_type?: string;
    condition_value?: string;
    unlockedAt?: string;
}

export interface HistoryItem {
    id: string;
    type: 'material' | 'module' | 'course';
    title: string;
    date: string;
    metadata?: any;
}

interface GamificationState {
    userId: string | null;
    xp: number;
    level: number;
    streak: number;
    lastLoginDate: string | null;
    availableBadges: Badge[];
    badges: Badge[];
    quizResults: QuizResult[];
    modulesCompleted: string[];
    historyLog: HistoryItem[];

    config: GamificationConfig;
    fetchConfig: () => Promise<void>;
    updateConfig: (newConfig: GamificationConfig) => Promise<void>;
    updateConfigLocal: (newConfig: GamificationConfig) => void;

    setUserId: (id: string | null) => Promise<void>;
    addXP: (amount: number) => void;
    checkStreak: () => void;
    checkBadges: () => void;
    unlockBadge: (badge: Badge) => void;
    syncToDb: () => Promise<void>;
    addStudySession: (session: any) => void;
    studySessions: any[];
    timerSettings: { workTime: number; breakTime: number; soundEnabled: boolean; completed_courses?: string[] };
    updateTimerSettings: (settings: Partial<{ workTime: number; breakTime: number; soundEnabled: boolean }>) => void;
    materialsCompleted: string[];
    assignmentsCompleted: string[];
    toggleMaterial: (id: string, title?: string) => void;
    toggleAssignmentCompletion: (id: string, title?: string) => void;
    markMaterialComplete: (id: string, title?: string) => void;
    markCourseComplete: (courseId: string, title?: string) => void;
    recordQuizResult: (quizId: string, score: number, passed: boolean) => void;
    markModuleComplete: (moduleId: string, title?: string) => void;
    init: () => void;
    _syncTimer?: any;
}

export const BADGES_DATA: Badge[] = [];

const LOCAL_BADGES: Badge[] = [
    {
        id: 'weekend_warrior',
        name: 'Weekend Warrior',
        description: 'Completed a study session on the weekend (Thursday, Friday, or Saturday)',
        image_url: '🏅',
        xp_req: 150,
        condition_type: 'weekend_study',
        condition_value: '1'
    }
];

export interface QuizResult {
    quizId: string;
    score: number;
    passed: boolean;
    date: string;
}

export const useGamification = create<GamificationState>()(
    persist(
        (set, get) => ({
            userId: null,
            xp: 0,
            level: 1,
            streak: 0,
            lastLoginDate: null,
            badges: [],
            availableBadges: [],
            quizResults: [],
            modulesCompleted: [],
            studySessions: [],
            timerSettings: { workTime: 25, breakTime: 5, soundEnabled: true },
            materialsCompleted: [],
            assignmentsCompleted: [],
            historyLog: [],

            config: {
                xpPerQuiz: XP_PER_QUIZ_COMPLETE,
                xpPerCorrect: XP_PER_CORRECT_ANSWER,
                xpPerEssay: XP_PER_ESSAY_PASS,
                ranks: DEFAULT_RANKS
            },

            fetchConfig: async () => {
                try {
                    const { data: settings } = await supabase
                        .from('app_settings')
                        .select('setting_value')
                        .eq('setting_key', 'gamification_config')
                        .single();

                    if (settings && settings.setting_value) {
                        set({ config: settings.setting_value });
                    }

                    const { data: badges } = await supabase
                        .from('badges')
                        .select('*');

                    const dbBadges = badges || [];
                    const allBadges = [...dbBadges, ...LOCAL_BADGES];

                    set({ availableBadges: allBadges });

                } catch (err) {
                    console.error("Failed to fetch gamification config", err);
                    set({ availableBadges: LOCAL_BADGES });
                }
            },

            updateConfig: async (newConfig) => {
                set({ config: newConfig });
                try {
                    await supabase.from('app_settings').upsert({
                        setting_key: 'gamification_config',
                        setting_value: newConfig
                    });
                } catch (err) {
                    console.error("Failed to save gamification config", err);
                }
            },

            updateConfigLocal: (newConfig) => {
                set({ config: newConfig });
            },

            setUserId: async (id) => {
                const localState = get();

                get().fetchConfig();

                if (id && !localState.userId) {
                    try {
                        const { data: remote } = await supabase
                            .from('profiles')
                            .select('streak, settings, badges, assignments_completed')
                            .eq('id', id)
                            .single();

                        if (remote) {
                            const remoteSettings = remote.settings || {};
                            const remoteSessions = Array.isArray(remoteSettings.study_sessions) ? remoteSettings.study_sessions : [];
                            const mergedSessions = [...remoteSessions, ...localState.studySessions];
                            const mergedStreak = Math.max(localState.streak, remote.streak || 0);

                            const mergedSettings = (Object.keys(remoteSettings).length > 0) ? remoteSettings : localState.timerSettings;
                            const remoteHistory = Array.isArray(remoteSettings.history_log) ? remoteSettings.history_log : [];
                            const mergedHistory = [...remoteHistory, ...localState.historyLog];

                            const remoteMaterials = Array.isArray(remoteSettings.materials_completed) ? remoteSettings.materials_completed : [];
                            const mergedMaterials = Array.from(new Set([...remoteMaterials, ...localState.materialsCompleted]));

                            const remoteAssignments = Array.isArray(remote.assignments_completed) ? remote.assignments_completed : [];
                            const mergedAssignments = Array.from(new Set([...remoteAssignments, ...localState.assignmentsCompleted]));

                            const remoteBadges = Array.isArray(remote.badges) ? remote.badges : [];
                            const localBadges = localState.badges || [];
                            const mergedBadgesMap = new Map();
                            [...remoteBadges, ...localBadges].forEach(b => mergedBadgesMap.set(b.id, b));
                            const mergedBadges = Array.from(mergedBadgesMap.values());

                            const remoteQuizzes = Array.isArray(remoteSettings.quiz_results) ? remoteSettings.quiz_results : [];
                            const localQuizzes = localState.quizResults || [];
                            const mergedQuizzes = [...remoteQuizzes, ...localQuizzes.filter(l => !remoteQuizzes.find(r => r.quizId === l.quizId && r.date === l.date))];

                            const remoteModules = Array.isArray(remoteSettings.modules_completed) ? remoteSettings.modules_completed : [];
                            const mergedModules = Array.from(new Set([...remoteModules, ...localState.modulesCompleted]));

                            const finalSettings = {
                                ...mergedSettings,
                                history_log: mergedHistory,
                                materials_completed: mergedMaterials,
                                quiz_results: mergedQuizzes,
                                modules_completed: mergedModules,
                                study_sessions: mergedSessions
                            };

                            await supabase.from('profiles').update({
                                streak: mergedStreak,
                                badges: mergedBadges,
                                settings: finalSettings,
                                assignments_completed: mergedAssignments
                            }).eq('id', id);
                        }
                    } catch (e) {
                        console.error("Merge failed", e);
                    }
                }

                set({ userId: id });
                if (id) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('xp, level, streak, last_login_date, settings, badges, assignments_completed')
                        .eq('id', id)
                        .single();

                    if (data && !error) {
                        const settings = data.settings || {};
                        const historyLog = Array.isArray(settings.history_log) ? settings.history_log : [];

                        set({
                            xp: data.xp || 0,
                            level: data.level || 1,
                            streak: data.streak || 0,
                            lastLoginDate: data.last_login_date,
                            studySessions: Array.isArray(settings.study_sessions) ? settings.study_sessions : [],
                            timerSettings: settings,
                            historyLog: historyLog,
                            materialsCompleted: Array.isArray(settings.materials_completed) ? settings.materials_completed : [],
                            assignmentsCompleted: Array.isArray(data.assignments_completed) ? data.assignments_completed : [],
                            badges: Array.isArray(data.badges) ? data.badges : [],
                            quizResults: Array.isArray(settings.quiz_results) ? settings.quiz_results : [],
                            modulesCompleted: Array.isArray(settings.modules_completed) ? settings.modules_completed : []
                        });
                    }
                }
            },

            syncToDb: async () => {
                const state = get();
                if (!state.userId) return;

                const DEBOUNCE_MS = 2000;

                if (state._syncTimer) clearTimeout(state._syncTimer);

                const timer = setTimeout(async () => {
                    const stateBeforeSync = get(); // Re-get state
                    const settingsToSave = {
                        ...stateBeforeSync.timerSettings,
                        history_log: stateBeforeSync.historyLog,
                        materials_completed: stateBeforeSync.materialsCompleted,
                        quiz_results: stateBeforeSync.quizResults,
                        modules_completed: stateBeforeSync.modulesCompleted,
                        study_sessions: stateBeforeSync.studySessions
                    };

                    const { error } = await supabase.from('profiles').update({
                        xp: stateBeforeSync.xp,
                        level: stateBeforeSync.level,
                        streak: stateBeforeSync.streak,
                        last_login_date: stateBeforeSync.lastLoginDate,
                        settings: settingsToSave,
                        badges: stateBeforeSync.badges,
                        assignments_completed: stateBeforeSync.assignmentsCompleted,
                        total_focus_mins: stateBeforeSync.studySessions.reduce((acc: number, curr: any) => acc + (Number(curr.duration) || 0), 0),
                        weekly_focus_mins: stateBeforeSync.studySessions
                            .filter((s: any) => new Date(s.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                            .reduce((acc: number, curr: any) => acc + (Number(curr.duration) || 0), 0)
                    }).eq('id', state.userId);

                    if (error) console.error("Failed to sync gamification:", error);
                }, DEBOUNCE_MS);

                set({ _syncTimer: timer } as any);
            },

            updateTimerSettings: (settings) => {
                set((state) => ({
                    timerSettings: { ...state.timerSettings, ...settings }
                }));
                get().syncToDb();
            },

            addStudySession: (session) => {
                set((state) => ({
                    studySessions: [...state.studySessions, session]
                }));
                get().checkBadges();
                get().syncToDb();
            },

            addXP: (amount) => {
                set((state) => {
                    const newXP = state.xp + amount;
                    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
                    return { xp: newXP, level: newLevel };
                });
                get().syncToDb();
            },

            toggleMaterial: (id, title) => {
                set((state) => {
                    const exists = state.materialsCompleted.includes(id);
                    let newMaterials;
                    let newHistory = [...state.historyLog];

                    if (exists) {
                        newMaterials = state.materialsCompleted.filter(m => m !== id);
                    } else {
                        newMaterials = [...state.materialsCompleted, id];
                        newHistory.push({
                            id,
                            type: 'material',
                            title: title || id,
                            date: new Date().toISOString()
                        });
                    }
                    return { materialsCompleted: newMaterials, historyLog: newHistory };
                });
                get().syncToDb();
            },

            toggleAssignmentCompletion: (id, title) => {
                set((state) => {
                    const exists = state.assignmentsCompleted.includes(id);
                    let newAssignments;
                    let newHistory = [...state.historyLog];

                    if (exists) {
                        newAssignments = state.assignmentsCompleted.filter(m => m !== id);
                    } else {
                        newAssignments = [...state.assignmentsCompleted, id];
                        newHistory.push({
                            id,
                            type: 'module', // Can reuse module or just arbitrary history
                            title: title || 'Completed Assignment',
                            date: new Date().toISOString()
                        });

                    }
                    return { assignmentsCompleted: newAssignments, historyLog: newHistory };
                });
                get().syncToDb();
            },

            markMaterialComplete: (id, title) => {
                set((state) => {
                    if (state.materialsCompleted.includes(id)) return {};
                    return {
                        materialsCompleted: [...state.materialsCompleted, id],
                        historyLog: [...state.historyLog, { id, type: 'material', title: title || id, date: new Date().toISOString() }]
                    };
                });
                get().checkBadges();
                get().syncToDb();
            },

            markCourseComplete: async (courseId, title) => {
                const state = get();
                const currentSettings = state.timerSettings;
                const completedCourses = currentSettings.completed_courses || [];

                if (!completedCourses.includes(courseId)) {
                    const newSettings = { ...currentSettings, completed_courses: [...completedCourses, courseId] };

                    const newHistory = [...state.historyLog, {
                        id: courseId,
                        type: 'course' as const,
                        title: title || courseId,
                        date: new Date().toISOString()
                    }];

                    set((prev) => ({
                        timerSettings: newSettings,
                        historyLog: newHistory
                    }));

                    if (state.userId) {
                        const { data } = await supabase.from('profiles').select('courses_completed').eq('id', state.userId).single();
                        const currentCount = data?.courses_completed || 0;

                        await supabase.from('profiles').update({
                            courses_completed: currentCount + 1,
                            settings: { ...newSettings, history_log: newHistory }
                        }).eq('id', state.userId);
                    } else {
                        get().syncToDb();
                    }
                    get().checkBadges();
                }
            },

            checkStreak: () => {
                const now = new Date();
                const today = now.toDateString();
                const state = get();

                if (state.lastLoginDate === today) return;

                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);

                let newStreak = state.streak;
                if (state.lastLoginDate === yesterday.toDateString()) {
                    newStreak += 1;
                } else {
                    newStreak = 1;
                }

                set({ streak: newStreak, lastLoginDate: today });
                get().syncToDb();
            },

            checkBadges: () => {
                const state = get();
                const { availableBadges, badges: unlockedBadges } = state;

                availableBadges.forEach(badge => {
                    if (unlockedBadges.find(b => b.id === badge.id)) return;

                    let unlocked = false;
                    const val = parseInt(badge.condition_value || '0');

                    switch (badge.condition_type) {
                        case 'quiz_score_percent':
                            if (state.quizResults.some(q => q.score >= val)) unlocked = true;
                            break;
                        case 'quizzes_completed':
                            if (state.quizResults.length >= val) unlocked = true;
                            break;
                        case 'materials_completed':
                            if (state.materialsCompleted.length >= val) unlocked = true;
                            break;
                        case 'modules_completed':
                            if (state.modulesCompleted.length >= val) unlocked = true;
                            break;
                        case 'perfect_quizzes':
                            const perfectCount = state.quizResults.filter(q => q.score === 100).length;
                            if (perfectCount >= val) unlocked = true;
                            break;
                        case 'courses_completed':
                            const courses = state.timerSettings.completed_courses || [];
                            if (courses.length >= val) unlocked = true;
                            break;
                        case 'streak_days':
                            if (state.streak >= val) unlocked = true;
                            break;
                        case 'weekend_study':
                            const hasWeekendSession = state.studySessions.some(session => {
                                const date = new Date(session.date);
                                const day = date.getDay();
                                return day === 4 || day === 5 || day === 6;
                            });
                            if (hasWeekendSession) unlocked = true;
                            break;
                    }

                    if (unlocked) {
                        get().unlockBadge(badge);
                    }
                });
            },

            unlockBadge: (badge) => {
                const state = get();
                const alreadyUnlocked = state.badges.find(b => b.id === badge.id);
                if (alreadyUnlocked) return;

                const newBadge = { ...badge, unlockedAt: new Date().toISOString() };
                set({
                    badges: [...state.badges, newBadge],
                    xp: state.xp + badge.xp_req
                });
                get().syncToDb();
            },

            recordQuizResult: (quizId, score, passed) => {
                set((state) => ({
                    quizResults: [...state.quizResults, { quizId, score, passed, date: new Date().toISOString() }]
                }));
                get().checkBadges();
                get().syncToDb();
            },

            markModuleComplete: (moduleId, title) => {
                set((state) => {
                    if (state.modulesCompleted.includes(moduleId)) return {};
                    return {
                        modulesCompleted: [...state.modulesCompleted, moduleId],
                        historyLog: [...state.historyLog, { id: moduleId, type: 'module', title: title || moduleId, date: new Date().toISOString() }]
                    };
                });
                get().checkBadges();
                get().syncToDb();
            },

            init: () => {
                window.addEventListener('online', () => {
                    console.log("[Gamification] Back online, syncing...");
                    get().syncToDb();
                });
            }
        }),
        {
            name: 'gamification-storage',
            onRehydrateStorage: () => (state) => {
                state?.fetchConfig();
                const channel = supabase
                    .channel('gamification_config_updates')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'app_settings',
                            filter: 'setting_key=eq.gamification_config'
                        },
                        (payload) => {
                            if (payload.new && (payload.new as any).setting_value) {
                                state?.updateConfigLocal((payload.new as any).setting_value);
                            }
                        }
                    )
                    .subscribe();
            }
        }
    )
);
