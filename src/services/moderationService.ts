import { supabase } from '../lib/supabase';

export const moderationService = {
    async toggleUserBan(userId: string, table: 'profiles' | 'guest_scores', durationHours: number | 'perm' | null): Promise<string | null> {
        let bannedUntil: string | null = null;
        if (durationHours === 'perm') {
            bannedUntil = '9999-12-31T23:59:59Z';
        } else if (durationHours !== null) {
            const date = new Date();
            date.setHours(date.getHours() + durationHours);
            bannedUntil = date.toISOString();
        }

        const { error } = await supabase.from(table).update({ banned_until: bannedUntil }).eq('id', userId);
        if (error) throw error;
        return bannedUntil;
    },

    async deleteMessage(messageId: string): Promise<void> {
        const { error } = await supabase.from('group_messages').delete().eq('id', messageId);
        if (error) throw error;
    },

    async updateP2PVisibility(userId: string, p2pHidden: boolean): Promise<void> {
        const { error } = await supabase.from('profiles').update({ p2p_hidden: p2pHidden }).eq('id', userId);
        if (error) throw error;
    },

    async cleanupOldMedia(): Promise<{ deleted: number }> {
        let deletedCount = 0;
        try {
            const { data: folders, error: folderError } = await supabase.storage.from('group-media').list();
            if (folderError) throw folderError;

            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            for (const folder of folders || []) {
                if (folder.name === '.emptyFolderPlaceholder') continue;
                const { data: files, error: fileError } = await supabase.storage.from('group-media').list(folder.name);
                if (fileError) continue;

                const filesToDelete = (files || [])
                    .filter(f => {
                        const createdAt = new Date(f.created_at);
                        return createdAt < oneWeekAgo && f.name !== '.emptyFolderPlaceholder';
                    })
                    .map(f => `${folder.name}/${f.name}`);

                if (filesToDelete.length > 0) {
                    const { error: deleteError } = await supabase.storage.from('group-media').remove(filesToDelete);
                    if (!deleteError) deletedCount += filesToDelete.length;
                }
            }
            return { deleted: deletedCount };
        } catch (e) {
            console.error("Cleanup error:", e);
            return { deleted: 0 };
        }
    }
};
