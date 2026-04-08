import { supabase } from '../lib/supabase';

export type AuditAction =
    | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'PROMOTE_USER' | 'DEMOTE_USER'
    | 'SETTINGS_UPDATE' | 'EXPORT_DATA' | 'WIPE_DATA';

export type EntityType =
    | 'user' | 'material' | 'quiz' | 'system' | 'badge' | 'event' | 'subject';

interface LogEntry {
    action: AuditAction;
    entityType: EntityType;
    entityId?: string;
    details?: any;
}

export const logAudit = async (entry: LogEntry) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const payload = {
            admin_id: user.id,
            action: entry.action,
            entity_type: entry.entityType,
            entity_id: entry.entityId,
            details: entry.details,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase.from('audit_logs').insert(payload);

        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('Error in audit logging:', err);
    }
};
