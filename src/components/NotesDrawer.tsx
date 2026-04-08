import React, { useState, useEffect, useRef } from 'react';
import { StickyNote, X, Plus, Trash2, Check, Loader2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { notesService, UserNote } from '../services/notesService';
import { useAuth } from '../context/AuthContext';

interface NotesDrawerProps {
    contextType: 'material' | 'quiz' | 'general';
    contextId?: string;
    contextLabel?: string;
    inline?: boolean;
}

export default function NotesDrawer({ contextType, contextId, contextLabel, inline = false }: NotesDrawerProps) {
    const { user } = useAuth();
    const userId = user?.id || null;

    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState<UserNote[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen || inline) fetchNotes();
    }, [isOpen, inline, userId, contextId]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const data = await notesService.getNotesByContext(userId, contextType, contextId);
            setNotes(data);
        } catch (e) {
            console.error('Failed to fetch notes', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newContent.trim()) return;
        setSaving(true);
        try {
            const saved = await notesService.saveNote(userId, {
                content: newContent.trim(),
                context_type: contextType,
                context_id: contextId,
                context_label: contextLabel,
            });
            setNotes(prev => [saved, ...prev]);
            setNewContent('');
        } catch (e) {
            console.error('Failed to save note', e);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async (noteId: string) => {
        if (!editContent.trim()) return;
        setSaving(true);
        try {
            const saved = await notesService.saveNote(userId, {
                id: noteId,
                content: editContent.trim(),
                context_type: contextType,
            });
            setNotes(prev => prev.map(n => n.id === noteId ? saved : n));
            setEditingId(null);
        } catch (e) {
            console.error('Failed to update note', e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        try {
            await notesService.deleteNote(userId, noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (e) {
            console.error('Failed to delete note', e);
        }
    };

    const NotesList = () => (
        <div className="flex flex-col gap-3">
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent text-sm text-white placeholder-yellow-200/30 resize-none outline-none min-h-[60px] leading-relaxed"
                    placeholder="Add a note..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAdd(); }}
                />
                {newContent.trim() && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-yellow-500/10">
                        <span className="text-[10px] text-yellow-500/50 font-mono">⌘+Enter to save</span>
                        <button
                            onClick={handleAdd}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            Save
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-yellow-500/50" />
                </div>
            ) : notes.length === 0 ? (
                <p className="text-center text-xs text-gray-600 py-4">No notes yet. Write something above!</p>
            ) : (
                notes.map(note => (
                    <div key={note.id} className="group bg-white/[0.03] border border-white/5 rounded-xl p-3 hover:border-white/10 transition-all">
                        {editingId === note.id ? (
                            <div>
                                <textarea
                                    className="w-full bg-transparent text-sm text-white resize-none outline-none min-h-[60px] leading-relaxed"
                                    value={editContent}
                                    onChange={e => setEditContent(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => handleEdit(note.id)} disabled={saving} className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold transition-colors">
                                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-white/5 text-gray-400 rounded-lg text-xs transition-colors hover:text-white">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] text-gray-600 font-mono">
                                        {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditingId(note.id); setEditContent(note.content); }} className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                                            <Edit3 size={12} />
                                        </button>
                                        <button onClick={() => handleDelete(note.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))
            )}
        </div>
    );

    if (inline) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                    <StickyNote size={14} className="text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-yellow-400/80">My Notes</span>
                    <span className="text-[10px] text-gray-600 ml-auto">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
                </div>
                <NotesList />
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 z-40 flex items-center gap-2 px-3 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 rounded-2xl shadow-lg transition-all hover:scale-105 group backdrop-blur-sm"
                title="My Notes"
            >
                <StickyNote size={18} />
                {notes.length > 0 && (
                    <span className="text-xs font-bold bg-yellow-500/20 px-1.5 py-0.5 rounded-full">{notes.length}</span>
                )}
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[90] flex items-stretch md:items-end md:justify-end md:p-6 p-0" onClick={e => { if (e.target === e.currentTarget) setIsOpen(false); }}>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none" onClick={() => setIsOpen(false)} />
                    <div className="relative z-[91] w-full md:w-96 max-h-[85vh] bg-[#0A0C10] border border-white/10 md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-yellow-500/5 shrink-0">
                            <div className="flex items-center gap-2">
                                <StickyNote size={18} className="text-yellow-400" />
                                <div>
                                    <h3 className="font-bold text-white text-sm">My Notes</h3>
                                    {contextLabel && <p className="text-[10px] text-yellow-400/60 font-mono truncate max-w-[200px]">{contextLabel}</p>}
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <NotesList />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
