import { supabase } from '../lib/supabase';
import { dataService } from './dataSync';

export interface Challenge {
    id: string;
    challenger_id: string;
    opponent_id: string | null;
    quiz_category: string;
    quiz_label: string;
    status: 'pending' | 'open' | 'accepted' | 'completed' | 'declined' | 'expired';
    challenger_score: number | null;
    opponent_score: number | null;
    winner_id: string | null;
    created_at: string;
    expires_at: string;
    is_open_link: boolean;
    challenger?: { full_name: string; avatar_url: string; username: string };
    opponent?: { full_name: string; avatar_url: string; username: string };
}

const getProfileLabel = async (userId: string | null | undefined): Promise<string> => {
    if (!userId) return 'A player';
    const { data } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .maybeSingle();

    return data?.full_name || data?.username || 'A player';
};

const sendChallengeNotification = async ({
    targetUserId,
    title,
    message,
    type = 'info'
}: {
    targetUserId?: string | null;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
}) => {
    if (!targetUserId) return;

    const { error } = await supabase.from('notifications').insert({
        title,
        message,
        type,
        target_audience: targetUserId
    });

    if (error) {
        console.error('Failed to send challenge notification:', error);
    }
};

const applyChallengeResultXp = async (winnerId?: string | null, loserId?: string | null) => {
    const updates: Promise<void>[] = [];

    if (winnerId) {
        updates.push(dataService.updateCloudProgress(winnerId, 30, 0, 0, null));
    }

    if (loserId) {
        updates.push(dataService.updateCloudProgress(loserId, -10, 0, 0, null));
    }

    await Promise.all(updates);
};

export const challengeService = {
    async sendChallenge(challengerId: string, opponentId: string, quizCategory: string, quizLabel: string): Promise<Challenge> {
        const expires = new Date();
        expires.setDate(expires.getDate() + 3);

        const { data, error } = await supabase
            .from('challenges')
            .insert({
                challenger_id: challengerId,
                opponent_id: opponentId || null,
                quiz_category: quizCategory,
                quiz_label: quizLabel,
                status: 'pending',
                is_open_link: false,
                expires_at: expires.toISOString(),
            })
            .select()
            .single();
        if (error) throw error;

        const challengerName = await getProfileLabel(challengerId);
        await Promise.all([
            sendChallengeNotification({
                targetUserId: opponentId,
                title: 'New Challenge',
                message: `${challengerName} challenged you in ${quizLabel}.`,
                type: 'info'
            }),
            sendChallengeNotification({
                targetUserId: challengerId,
                title: 'Challenge Sent',
                message: `Your challenge for ${quizLabel} was sent successfully.`,
                type: 'success'
            })
        ]);

        return data as Challenge;
    },

    async createOpenChallenge(challengerId: string, quizCategory: string, quizLabel: string, isPublic: boolean = true): Promise<Challenge> {
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);

        const { data, error } = await supabase
            .from('challenges')
            .insert({
                challenger_id: challengerId,
                opponent_id: null,
                quiz_category: quizCategory,
                quiz_label: quizLabel,
                status: 'open',
                is_open_link: isPublic,
                expires_at: expires.toISOString(),
            })
            .select()
            .single();
        if (error) throw error;

        await sendChallengeNotification({
            targetUserId: challengerId,
            title: isPublic ? 'Open Challenge Created' : 'Private Challenge Created',
            message: isPublic
                ? `Your public challenge for ${quizLabel} is now ready to share.`
                : `Your private challenge for ${quizLabel} was created successfully.`,
            type: 'success'
        });

        return data as Challenge;
    },

    async acceptOpenChallenge(challengeId: string, userId: string): Promise<Challenge> {
        const { data: existing, error: fetchErr } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', challengeId)
            .eq('is_open_link', true)
            .eq('status', 'open')
            .single();
        if (fetchErr || !existing) throw new Error('Challenge not found or no longer available.');
        if (existing.challenger_id === userId) throw new Error("You can't accept your own challenge.");

        const { data, error } = await supabase
            .from('challenges')
            .update({ opponent_id: userId, status: 'accepted' })
            .eq('id', challengeId)
            .select()
            .single();
        if (error) throw error;

        const opponentName = await getProfileLabel(userId);
        await Promise.all([
            sendChallengeNotification({
                targetUserId: existing.challenger_id,
                title: 'Challenge Accepted',
                message: `${opponentName} accepted your ${existing.quiz_label} challenge. Start your turn now.`,
                type: 'success'
            }),
            sendChallengeNotification({
                targetUserId: userId,
                title: 'Challenge Joined',
                message: `You joined ${existing.quiz_label}. Your challenge is ready to start.`,
                type: 'success'
            })
        ]);

        return data as Challenge;
    },

    async getChallengeById(challengeId: string): Promise<Challenge | null> {
        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', challengeId)
            .single();
        if (error) return null;
        if (data) {
            const ids = [data.challenger_id, data.opponent_id].filter(Boolean);
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', ids);
            const byId = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
            return { ...data, challenger: byId[data.challenger_id], opponent: data.opponent_id ? byId[data.opponent_id] : undefined } as Challenge;
        }
        return null;
    },

    async getMyChallenges(userId: string): Promise<Challenge[]> {
        const [
            personalResult,
            publicOpenResult
        ] = await Promise.all([
            supabase
                .from('challenges')
                .select('*')
                .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
                .order('created_at', { ascending: false }),
            supabase
                .from('challenges')
                .select('*')
                .eq('status', 'open')
                .eq('is_open_link', true)
                .order('created_at', { ascending: false })
        ]);

        if (personalResult.error) throw personalResult.error;
        if (publicOpenResult.error) throw publicOpenResult.error;

        const rowMap = new Map<string, any>();
        [...(personalResult.data || []), ...(publicOpenResult.data || [])].forEach((row: any) => {
            if (row?.id) rowMap.set(row.id, row);
        });

        const rows = Array.from(rowMap.values()).sort((a: any, b: any) => {
            const aTime = new Date(a.created_at).getTime();
            const bTime = new Date(b.created_at).getTime();
            return bTime - aTime;
        });

        const ids = [...new Set(rows.flatMap((c: any) => [c.challenger_id, c.opponent_id].filter(Boolean)))];
        if (ids.length === 0) return rows as Challenge[];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', ids);
        const byId = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
        return rows.map((c: any) => ({
            ...c,
            challenger: byId[c.challenger_id],
            opponent: c.opponent_id ? byId[c.opponent_id] : undefined,
        })) as Challenge[];
    },

    async respondToChallenge(challengeId: string, accept: boolean): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { data: existing, error: fetchError } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', challengeId)
            .single();
        if (fetchError) throw fetchError;
        if (existing.status !== 'pending') throw new Error('Challenge can no longer be responded to.');
        if (!existing.opponent_id) throw new Error('Invalid challenge opponent.');
        if (existing.opponent_id !== user.id) throw new Error('Unauthorized challenge response.');

        const { error } = await supabase
            .from('challenges')
            .update({ status: accept ? 'accepted' : 'declined' })
            .eq('id', challengeId)
            .eq('opponent_id', user.id)
            .eq('status', 'pending');
        if (error) throw error;

        const opponentName = await getProfileLabel(existing.opponent_id);
        await Promise.all([
            sendChallengeNotification({
                targetUserId: existing.challenger_id,
                title: accept ? 'Challenge Accepted' : 'Challenge Declined',
                message: accept
                    ? `${opponentName} accepted your ${existing.quiz_label} challenge. Start your turn now.`
                    : `${opponentName} declined your ${existing.quiz_label} challenge.`,
                type: accept ? 'success' : 'warning'
            }),
            sendChallengeNotification({
                targetUserId: existing.opponent_id,
                title: accept ? 'Challenge Accepted' : 'Challenge Declined',
                message: accept
                    ? `You accepted ${existing.quiz_label}. Your challenge is ready to start.`
                    : `You declined ${existing.quiz_label}.`,
                type: accept ? 'success' : 'info'
            })
        ]);
    },

    async submitScore(challengeId: string, userId: string, score: number, _challengerId: string): Promise<void> {
        if (!Number.isFinite(score) || score < 0) {
            throw new Error('Invalid score value.');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== userId) throw new Error('Unauthorized score submission.');

        const { data: challenge, error: challengeErr } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', challengeId)
            .single();

        if (challengeErr) throw challengeErr;
        if (!challenge || challenge.status !== 'accepted') {
            throw new Error('Only active challenges can accept scores.');
        }

        const isChallenger = userId === challenge.challenger_id;
        const isOpponent = userId === challenge.opponent_id;
        if (!isChallenger && !isOpponent) throw new Error('You are not part of this challenge.');

        const field = isChallenger ? 'challenger_score' : 'opponent_score';

        const { data: updated, error: updateErr } = await supabase
            .from('challenges')
            .update({ [field]: score })
            .eq('id', challengeId)
            .eq('status', 'accepted')
            .is(field, null)
            .select()
            .single();

        if (updateErr) throw updateErr;

        const otherScore = isChallenger ? updated.opponent_score : updated.challenger_score;
        if (otherScore !== null && otherScore !== undefined) {
            let winner_id: string | null = null;
            if (score > otherScore) winner_id = userId;
            else if (otherScore > score) winner_id = isChallenger ? updated.opponent_id : updated.challenger_id;
            const loserId = winner_id
                ? (winner_id === updated.challenger_id ? updated.opponent_id : updated.challenger_id)
                : null;

            const { error: completeErr } = await supabase
                .from('challenges')
                .update({ status: 'completed', winner_id })
                .eq('id', challengeId);
            if (completeErr) throw completeErr;

            await applyChallengeResultXp(winner_id, loserId);

            const [challengerName, opponentName] = await Promise.all([
                getProfileLabel(updated.challenger_id),
                getProfileLabel(updated.opponent_id)
            ]);

            const challengerMessage = winner_id === updated.challenger_id
                ? `You won your ${updated.quiz_label} challenge against ${opponentName}.`
                : winner_id === updated.opponent_id
                    ? `You lost your ${updated.quiz_label} challenge against ${opponentName}.`
                    : `Your ${updated.quiz_label} challenge against ${opponentName} ended in a draw.`;

            const opponentMessage = winner_id === updated.opponent_id
                ? `You won your ${updated.quiz_label} challenge against ${challengerName}.`
                : winner_id === updated.challenger_id
                    ? `You lost your ${updated.quiz_label} challenge against ${challengerName}.`
                    : `Your ${updated.quiz_label} challenge against ${challengerName} ended in a draw.`;

            await Promise.all([
                sendChallengeNotification({
                    targetUserId: updated.challenger_id,
                    title: 'Challenge Completed',
                    message: challengerMessage,
                    type: winner_id === updated.challenger_id ? 'success' : winner_id ? 'warning' : 'info'
                }),
                sendChallengeNotification({
                    targetUserId: updated.opponent_id,
                    title: 'Challenge Completed',
                    message: opponentMessage,
                    type: winner_id === updated.opponent_id ? 'success' : winner_id ? 'warning' : 'info'
                })
            ]);
        } else {
            const actorName = await getProfileLabel(userId);
            const waitingUserId = isChallenger ? updated.opponent_id : updated.challenger_id;
            await sendChallengeNotification({
                targetUserId: waitingUserId,
                title: 'Challenge Update',
                message: `${actorName} finished ${updated.quiz_label} with ${score} points. It's your turn now.`,
                type: 'info'
            });
        }
    },

    async withdrawChallenge(challengeId: string, userId: string): Promise<Challenge> {
        const { data: existing, error: fetchErr } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', challengeId)
            .single();

        if (fetchErr || !existing) throw new Error('Challenge not found.');
        if (existing.status !== 'accepted') throw new Error('Only active challenges can be withdrawn from.');

        const isChallenger = existing.challenger_id === userId;
        const isOpponent = existing.opponent_id === userId;
        if (!isChallenger && !isOpponent) throw new Error('You are not part of this challenge.');

        const winnerId = isChallenger ? existing.opponent_id : existing.challenger_id;
        const loserId = userId;
        const scoreField = isChallenger ? 'challenger_score' : 'opponent_score';

        const { data, error } = await supabase
            .from('challenges')
            .update({
                status: 'completed',
                winner_id: winnerId,
                [scoreField]: 0
            })
            .eq('id', challengeId)
            .select()
            .single();

        if (error) throw error;

        await dataService.updateCloudProgress(loserId, -50, 0, 0, null);
        if (winnerId) {
            await dataService.updateCloudProgress(winnerId, 30, 0, 0, null);
        }

        const [withdrawerName, winnerName] = await Promise.all([
            getProfileLabel(userId),
            getProfileLabel(winnerId)
        ]);

        await Promise.all([
            sendChallengeNotification({
                targetUserId: existing.challenger_id,
                title: 'Challenge Withdrawn',
                message: userId === existing.challenger_id
                    ? `You withdrew from ${existing.quiz_label} and lost 50 XP.`
                    : `${withdrawerName} withdrew from ${existing.quiz_label}. ${winnerName} wins by default.`,
                type: userId === existing.challenger_id ? 'warning' : 'info'
            }),
            sendChallengeNotification({
                targetUserId: existing.opponent_id,
                title: 'Challenge Withdrawn',
                message: userId === existing.opponent_id
                    ? `You withdrew from ${existing.quiz_label} and lost 50 XP.`
                    : `${withdrawerName} withdrew from ${existing.quiz_label}. ${winnerName} wins by default.`,
                type: userId === existing.opponent_id ? 'warning' : 'info'
            })
        ]);

        return data as Challenge;
    },

    async getPendingCount(userId: string): Promise<number> {
        const { count } = await supabase
            .from('challenges')
            .select('*', { count: 'exact', head: true })
            .eq('opponent_id', userId)
            .eq('status', 'pending');
        return count || 0;
    },

    async deleteChallenge(id: string): Promise<void> {
        const { error } = await supabase
            .from('challenges')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    getShareUrl(challengeId: string): string {
        return `${window.location.origin}/challenges/${challengeId}`;
    },
};
