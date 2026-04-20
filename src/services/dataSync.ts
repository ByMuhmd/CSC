
import { supabase } from '../lib/supabase';
import { calculateLevel } from '../utils/gamification';
import { useGamification } from '../hooks/useGamification';

const STORAGE_KEY = 'user_quiz_progress';

interface LocalProgress {
    xp: number;
    quizzesCompleted: number;
    totalScore: number;
    lastQuiz?: {
        title: string;
        score: number;
        timestamp: string;
    };

}

export const dataService = {

    getLocalProgress(): LocalProgress {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return { xp: 0, quizzesCompleted: 0, totalScore: 0 };
        }
        try {
            const parsed = JSON.parse(stored);

            if (typeof parsed !== 'object' || parsed === null) {
                console.warn('Invalid progress data structure, resetting');
                return { xp: 0, quizzesCompleted: 0, totalScore: 0 };
            }

            return {
                xp: typeof parsed.xp === 'number' && parsed.xp >= 0 ? parsed.xp : 0,
                quizzesCompleted: typeof parsed.quizzesCompleted === 'number' && parsed.quizzesCompleted >= 0 ? parsed.quizzesCompleted : 0,
                totalScore: typeof parsed.totalScore === 'number' && parsed.totalScore >= 0 ? parsed.totalScore : 0
            };
        } catch (error) {
            console.error('Failed to parse progress data:', error);
            return { xp: 0, quizzesCompleted: 0, totalScore: 0 };
        }
    },

    saveLocalProgress(progress: Partial<LocalProgress>) {
        const current = this.getLocalProgress();

        const sanitizedProgress: Partial<LocalProgress> = {};
        if (typeof progress.xp === 'number' && progress.xp >= 0) {
            sanitizedProgress.xp = Math.floor(progress.xp);
        }
        if (typeof progress.quizzesCompleted === 'number' && progress.quizzesCompleted >= 0) {
            sanitizedProgress.quizzesCompleted = Math.floor(progress.quizzesCompleted);
        }
        if (typeof progress.totalScore === 'number' && progress.totalScore >= 0) {
            sanitizedProgress.totalScore = Math.floor(progress.totalScore);
        }

        const updated = { ...current, ...sanitizedProgress };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        const guestProfileStr = localStorage.getItem('guest_profile');
        if (guestProfileStr) {
            try {
                const guestProfile = JSON.parse(guestProfileStr);

                const newGuestProfile = {
                    ...guestProfile,
                    xp: updated.xp,
                    quizzesCompleted: updated.quizzesCompleted || guestProfile.quizzesCompleted || 0,
                    total_score: updated.totalScore || guestProfile.total_score || 0,
                    last_quiz_activity: updated.lastQuiz || guestProfile.last_quiz_activity
                };
                localStorage.setItem('guest_profile', JSON.stringify(newGuestProfile));

                if (guestProfile.id) {
                    supabase.from('guest_scores').upsert({
                        id: guestProfile.id,
                        full_name: guestProfile.full_name,
                        avatar_url: guestProfile.avatar_url,
                        xp: updated.xp,
                        quizzes_completed: updated.quizzesCompleted || 0,
                        total_score: updated.totalScore || 0,
                        updated_at: new Date().toISOString()
                    }).then(({ error }) => {
                        if (error) console.error("Failed to sync guest score", error);
                    });
                }

                window.dispatchEvent(new Event('guest_updated'));
            } catch (e) {
                console.error("Error syncing guest profile", e);
            }
        }

        return updated;
    },

    addXpLocal(amount: number) {
        const current = this.getLocalProgress();
        const newXp = current.xp + amount;
        return this.saveLocalProgress({ xp: newXp });
    },

    async syncLocalToCloud(userId: string) {
        const local = this.getLocalProgress();
        if (local.xp === 0 && local.quizzesCompleted === 0) return;

        try {

            const { data: cloudData, error } = await supabase
                .from('profiles')
                .select('xp, quizzes_completed, total_score')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching cloud profile:", error);
                return;
            }

            const currentCloud = cloudData || { xp: 0, quizzes_completed: 0, total_score: 0 };

            if (local.xp > 0) {
                await supabase.rpc('add_user_xp', { xp_to_add: local.xp });
            }

            const newQuizzes = (currentCloud.quizzes_completed || 0) + local.quizzesCompleted;
            const newScore = (currentCloud.total_score || 0) + local.totalScore;

            await supabase.from('profiles').update({
                quizzes_completed: newQuizzes,
                total_score: newScore,
                updated_at: new Date().toISOString()
            }).eq('id', userId);

            localStorage.removeItem(STORAGE_KEY);
            console.log("Sync Complete. Guest progress merged.");

        } catch (err) {
            console.error("Sync Failed:", err);
        }
    },

    async updateCloudProgress(userId: string, xpToAdd: number, quizzesToAdd: number = 0, scoreToAdd: number = 0, lastQuiz: { title: string, score: number, timestamp: string } | null = null, quizResultId?: string) {
        try {
            if (quizResultId) {
                await supabase.rpc('secure_claim_xp', { 
                    p_source_type: 'quiz', 
                    p_source_id: quizResultId 
                });
            } else if (xpToAdd > 0) {
                await supabase.rpc('add_user_xp', { xp_to_add: xpToAdd });
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('xp, level, quizzes_completed, total_score')
                .eq('id', userId)
                .single();

            if (profile) {
                await supabase.from('profiles').update({
                    quizzes_completed: (profile.quizzes_completed || 0) + quizzesToAdd,
                    total_score: (profile.total_score || 0) + scoreToAdd,
                    last_quiz_activity: lastQuiz || null,
                    updated_at: new Date().toISOString()
                }).eq('id', userId);

                useGamification.setState({ 
                    xp: profile.xp || 0, 
                    level: profile.level || 1 
                });
            }
            
            useGamification.getState().checkStreak();

        } catch (err) {
            console.error("Cloud Update Error:", err);
        }
    },

    async recordQuizAttempt(attemptData: {
        user_id: string;
        user_name: string;
        quiz_category: string;
        score: number;
        total_questions: number;
        percentage: number;
    }) {
        try {
            const { data, error } = await supabase
                .from('quiz_results')
                .insert({
                    user_id: attemptData.user_id,
                    user_name: attemptData.user_name,
                    quiz_category: attemptData.quiz_category,
                    score: attemptData.score,
                    total_questions: attemptData.total_questions,
                    percentage: attemptData.percentage,
                    created_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (error) {
                console.error("Failed to record quiz attempt:", error);
                return null;
            }
            return data?.id || null;
        } catch (e) {
            console.error("Error recording quiz attempt:", e);
            return null;
        }
    },

    async startQuizSession(quizId?: string, subjectId?: string) {
        try {
            const { data, error } = await supabase.rpc('start_quiz_session', {
                p_quiz_id: quizId || null,
                p_subject_id: subjectId || null
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Failed to start quiz session:", e);
            return null;
        }
    },

    async submitQuizSecurely(sessionId: string, answers: { question_id: string, selected_option: string }[]) {
        try {
            const { data, error } = await supabase.rpc('submit_quiz_securely', {
                p_session_id: sessionId,
                p_answers: answers
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Secure submission failed:", e);
            throw e;
        }
    }
};
