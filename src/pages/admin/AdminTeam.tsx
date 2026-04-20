import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
    Shield, UserPlus, Users, X, Loader2, ArrowUpCircle, ArrowDownCircle, Trash2,
    Activity, Calendar, Filter
} from 'lucide-react';
import { logAudit } from '../../services/auditLogger';
import { format } from 'date-fns';

export default function AdminTeam() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'team' | 'logs'>('team');

    const [admins, setAdmins] = useState<any[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(true);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => {
        if (activeTab === 'team') {
            fetchAdmins();
        } else {
            fetchLogs();
        }
    }, [activeTab]);

    const fetchAdmins = async () => {
        setLoadingTeam(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['super_admin', 'admin', 'moderator'])
            .order('created_at');

        if (data) setAdmins(data);
        setLoadingTeam(false);
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        const { data } = await supabase
            .from('audit_logs')
            .select(`
                admin:admin_id (
                    email,
                    full_name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) setLogs(data);
        setLoadingLogs(false);
    };

    const handleSearch = async () => {
        if (!searchEmail) return;
        setSearching(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', `%${searchEmail}%`)
            .in('role', ['user'])
            .limit(5);

        setSearchResults(data || []);
        setSearching(false);
    };

    const updateRole = async (targetUserId: string, newRole: string) => {
        if (!confirm(`Confirm change role to ${newRole}?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', targetUserId);

            if (error) throw error;

            await logAudit({
                action: newRole === 'user' ? 'DEMOTE_USER' : 'PROMOTE_USER',
                entityType: 'user',
                entityId: targetUserId,
                details: { newRole }
            });

            fetchAdmins();
            setSearchResults([]);
            setSearchEmail('');
        } catch (error) {
            console.error('Update role failed:', error);
            alert('Failed to update role. Ensure you have Super Admin privileges.');
        }
    };

    const canEdit = (targetRole: string) => {
        const myRole = profile?.role;
        if (myRole !== 'super_admin') return false;
        if (targetRole === 'super_admin') return false;
        return true;
    };

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'red';
        if (action.includes('UPDATE')) return 'blue';
        if (action.includes('CREATE')) return 'green';
        if (action.includes('PROMOTE')) return 'purple';
        return 'gray';
    };

    const filteredLogs = filterAction === 'all'
        ? logs
        : logs.filter(l => l.action === filterAction);

    return (
        <div className="space-y-8 pb-20">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 flex items-center gap-3">
                        {activeTab === 'team' ? <Users className="text-green-400" /> : <Activity className="text-purple-400" />}
                        {activeTab === 'team' ? 'Admin Team' : 'Security Logs'}
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">
                        {activeTab === 'team' ? 'Manage administrators and moderators.' : 'Tracking all administrative actions.'}
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'team' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Team Members
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Audit Logs
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'team' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {profile?.role === 'super_admin' && (
                        <div className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl space-y-4 shadow-xl">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <UserPlus size={18} className="text-purple-400" />
                                Add Team Member
                            </h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search user by email..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={searching}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
                                >
                                    {searching ? <Loader2 className="animate-spin" /> : 'Find'}
                                </button>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="space-y-2 mt-4">
                                    {searchResults.map(res => (
                                        <div key={res.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                                                    {res.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{res.email}</div>
                                                    <div className="text-xs text-gray-500">{res.full_name || 'No Name'}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateRole(res.id, 'moderator')}
                                                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Moderator
                                                </button>
                                                <button
                                                    onClick={() => updateRole(res.id, 'admin')}
                                                    className="px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Admin
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {loadingTeam ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500 w-10 h-10" /></div>
                    ) : (
                        <div className="grid gap-4">
                            {admins.map(admin => (
                                <div key={admin.id} className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex items-center justify-between hover:border-purple-500/30 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-white/5 
                                            ${admin.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400' :
                                                admin.role === 'admin' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">
                                                {admin.full_name || admin.email}
                                                {admin.id === user?.id && <span className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded text-gray-300">You</span>}
                                            </h3>
                                            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border 
                                                ${admin.role === 'super_admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                                    admin.role === 'admin' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                                {admin.role.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {canEdit(admin.role) && (
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {admin.role === 'moderator' && (
                                                <button onClick={() => updateRole(admin.id, 'admin')} title="Promote to Admin" className="p-2 hover:bg-green-500/10 text-gray-500 hover:text-green-400 rounded-lg transition-colors">
                                                    <ArrowUpCircle size={20} />
                                                </button>
                                            )}
                                            {admin.role === 'admin' && (
                                                <button onClick={() => updateRole(admin.id, 'moderator')} title="Demote to Moderator" className="p-2 hover:bg-yellow-500/10 text-gray-500 hover:text-yellow-400 rounded-lg transition-colors">
                                                    <ArrowDownCircle size={20} />
                                                </button>
                                            )}
                                            <button onClick={() => updateRole(admin.id, 'user')} title="Remove from Team" className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 p-1 rounded-xl w-fit">
                        <button onClick={() => setFilterAction('all')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterAction === 'all' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>All</button>
                        <button onClick={() => setFilterAction('DELETE')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterAction === 'DELETE' ? 'bg-red-500/10 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}>Deletes</button>
                        <button onClick={() => setFilterAction('UPDATE')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterAction === 'UPDATE' ? 'bg-blue-500/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Updates</button>
                    </div>

                    {loadingLogs ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500 w-10 h-10" /></div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLogs.map(log => {
                                const color = getActionColor(log.action);
                                return (
                                    <div key={log.id} className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 p-4 rounded-xl hover:border-white/10 transition-colors group flex items-start gap-4">
                                        <div className={`p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/20 text-${color}-400 mt-1`}>
                                            <Shield size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold uppercase tracking-wider text-${color}-400`}>{log.action}</span>
                                                    <span className="text-xs text-gray-500">•</span>
                                                    <span className="text-sm font-bold text-white">{log.entity_type.toUpperCase()} ({log.entity_id ? log.entity_id.split('-')[0] : '?'})</span>
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono">
                                                    {format(new Date(log.created_at), 'PP p')}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-300 mb-2">
                                                Action by <span className="font-bold text-white">{log.admin?.full_name || log.admin?.email || 'System'}</span>
                                            </div>

                                            {log.details && (
                                                <div className="mt-2 bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                                                    {log.action === 'UPDATE' && log.details.old && log.details.new ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 text-xs font-mono">
                                                            <div className="p-3 bg-red-500/5">
                                                                <div className="text-red-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                                    Before
                                                                </div>
                                                                <pre className="whitespace-pre-wrap text-gray-500 max-h-40 overflow-y-auto custom-scrollbar">
                                                                    {JSON.stringify(log.details.old, null, 2)}
                                                                </pre>
                                                            </div>
                                                            <div className="p-3 bg-green-500/5">
                                                                <div className="text-green-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                                    After
                                                                </div>
                                                                <pre className="whitespace-pre-wrap text-gray-300 max-h-40 overflow-y-auto custom-scrollbar">
                                                                    {JSON.stringify(log.details.new, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3">
                                                            <div className="text-gray-500 font-bold mb-2 uppercase tracking-wider text-[10px]">Details</div>
                                                            <pre className="whitespace-pre-wrap text-[10px] font-mono text-gray-400 max-h-40 overflow-y-auto custom-scrollbar">
                                                                {JSON.stringify(log.details, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredLogs.length === 0 && (
                                <div className="text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-2xl">No logs found.</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
