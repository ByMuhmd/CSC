import { supabase } from '../lib/supabase';

export interface UserNote {
    id: string;
    user_id: string;
    context_type: 'material' | 'quiz' | 'general';
    context_id?: string;
    context_label?: string;
    content: string;
    created_at: string;
    updated_at: string;
}

const GUEST_NOTES_KEY = 'guest_notes';

function getGuestNotes(): UserNote[] {
    try {
        return JSON.parse(localStorage.getItem(GUEST_NOTES_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveGuestNotes(notes: UserNote[]) {
    localStorage.setItem(GUEST_NOTES_KEY, JSON.stringify(notes));
}

export const notesService = {

    async getNotes(userId: string | null): Promise<UserNote[]> {
        if (!userId) {
            return getGuestNotes();
        }
        const { data, error } = await supabase
            .from('user_notes')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });
        if (error) throw error;
        return (data || []) as UserNote[];
    },

    async getNotesByContext(userId: string | null, contextType: string, contextId?: string): Promise<UserNote[]> {
        if (!userId) {
            const notes = getGuestNotes();
            return notes.filter(n => n.context_type === contextType && (!contextId || n.context_id === contextId));
        }
        let query = supabase
            .from('user_notes')
            .select('*')
            .eq('user_id', userId)
            .eq('context_type', contextType);
        if (contextId) query = query.eq('context_id', contextId);
        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) throw error;
        return (data || []) as UserNote[];
    },

    async saveNote(
        userId: string | null,
        note: Pick<UserNote, 'content' | 'context_type'> & { context_id?: string; context_label?: string; id?: string }
    ): Promise<UserNote> {
        const now = new Date().toISOString();

        if (!userId) {
            const notes = getGuestNotes();
            if (note.id) {
                const idx = notes.findIndex(n => n.id === note.id);
                if (idx !== -1) {
                    notes[idx] = { ...notes[idx], ...note, updated_at: now };
                    saveGuestNotes(notes);
                    return notes[idx];
                }
            }
            const newNote: UserNote = {
                id: crypto.randomUUID(),
                user_id: 'guest',
                content: note.content,
                context_type: note.context_type,
                context_id: note.context_id,
                context_label: note.context_label,
                created_at: now,
                updated_at: now,
            };
            saveGuestNotes([newNote, ...notes]);
            return newNote;
        }

        if (note.id) {
            const { data, error } = await supabase
                .from('user_notes')
                .update({ content: note.content, updated_at: now })
                .eq('id', note.id)
                .eq('user_id', userId)
                .select()
                .single();
            if (error) throw error;
            return data as UserNote;
        }

        const { data, error } = await supabase
            .from('user_notes')
            .insert({
                user_id: userId,
                content: note.content,
                context_type: note.context_type,
                context_id: note.context_id,
                context_label: note.context_label,
                created_at: now,
                updated_at: now,
            })
            .select()
            .single();
        if (error) throw error;
        return data as UserNote;
    },

    async deleteNote(userId: string | null, noteId: string): Promise<void> {
        if (!userId) {
            const notes = getGuestNotes().filter(n => n.id !== noteId);
            saveGuestNotes(notes);
            return;
        }
        const { error } = await supabase
            .from('user_notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', userId);
        if (error) throw error;
    },
};
