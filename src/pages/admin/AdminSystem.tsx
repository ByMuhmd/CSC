import React, { useState, useEffect } from 'react';
import { Shield, Database, Server, HardDrive, Download, ToggleLeft, ToggleRight, Settings, FileText, AlertTriangle, RefreshCcw, Wifi, Activity, Terminal, MessageCircle, ChevronRight, Bell, Send, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminSystem() {
    const [storageStats, setStorageStats] = useState<any>({});
    const [connectionInfo, setConnectionInfo] = useState<any>({ type: 'unknown', rtt: 0, downlink: 0 });

    const [settings, setSettings] = useState<any>({});
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [dispatchingReminders, setDispatchingReminders] = useState(false);

    useEffect(() => {
        let total = 0;
        for (let x in localStorage) {
            if (localStorage.hasOwnProperty(x)) total += (localStorage[x].length + x.length) * 2;
        }
        setStorageStats({ used: (total / 1024).toFixed(2), items: localStorage.length });

        if ((navigator as any).connection) {
            const conn = (navigator as any).connection;
            setConnectionInfo({ type: conn.effectiveType, rtt: conn.rtt, downlink: conn.downlink });
        }

        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setSettingsLoading(true);
        try {
            const { data, error } = await supabase.from('app_settings').select('*');
            if (error) throw error;

            const settingsMap = (data || []).reduce((acc: any, curr: any) => {
                acc[curr.setting_key] = curr.setting_value;
                return acc;
            }, {});
            setSettings(settingsMap);
        } catch (e) {
            console.error("Failed to load settings:", e);
        } finally {
            setSettingsLoading(false);
        }
    };

    const toggleSetting = async (key: string, currentVal: any) => {
        const newVal = { ...currentVal, enabled: !currentVal.enabled };
        setSettings(prev => ({ ...prev, [key]: newVal }));

        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ setting_key: key, setting_value: newVal }, { onConflict: 'setting_key' });

            if (error) throw error;
        } catch (e: any) {
            console.error("Update failed:", e);
            alert(`Failed to update setting: ${e.message || 'Unknown error'}. Reverting...`);
            setSettings(prev => ({ ...prev, [key]: currentVal }));
        }
    };

    const updateSetting = async (key: string, newVal: any) => {
        setSettings((prev: any) => ({ ...prev, [key]: newVal }));

        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ setting_key: key, setting_value: newVal }, { onConflict: 'setting_key' });

            if (error) throw error;
        } catch (e: any) {
            console.error("Update failed:", e);
            alert(`Failed to update: ${e.message || 'Unknown error'}`);
            fetchSettings();
        }
    };

    const runReminderDispatch = async () => {
        setDispatchingReminders(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (!token) {
                alert('Unable to authorize reminder dispatch. Please sign in again.');
                return;
            }

            const response = await fetch('/api/reminder-dispatch', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const contentType = response.headers.get('content-type') || '';
            const responseBody = contentType.includes('application/json')
                ? await response.json()
                : { success: false, message: await response.text() };

            if (!response.ok) {
                const fallbackMessage = response.status === 404
                    ? 'Reminder dispatch endpoint is not available in the current dev server. Run it on Vercel preview or deploy first.'
                    : response.status === 500
                        ? 'Server error while dispatching reminders.'
                        : 'Dispatch failed';

                throw new Error(responseBody?.message || fallbackMessage);
            }

            alert(`Reminder dispatch complete. Inserted: ${responseBody.inserted || 0}`);
        } catch (error: any) {
            alert(`Reminder dispatch failed: ${error?.message || 'Unknown error'}`);
        } finally {
            setDispatchingReminders(false);
        }
    };

    const exportData = async (table: string, filename: string) => {
        try {
            const { data, error } = await supabase.from(table).select('*');
            if (error) throw error;

            if (!data || data.length === 0) {
                alert("No data to export.");
                return;
            }

            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => Object.values(row).map(v =>
                typeof v === 'object' ? `"${JSON.stringify(v).replace(/"/g, '""')}"` : `"${v}"`
            ).join(','));
            const csvContent = [headers, ...rows].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('Export failed:', e);
            alert("Export failed.");
        }
    };

    const handleWipeQuestions = async () => {
        const confirmText = prompt("Type 'DELETE' to confirm total question wipe:");
        if (confirmText === 'DELETE') {
            try {
                const { error } = await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) throw error;
                alert("Wipe successful.");
            } catch (e) {
                alert("Wipe failed.");
            }
        }
    };

    const handleResetLeaderboard = async () => {
        const confirmText = prompt("Type 'RESET' to zero out scores:");
        if (confirmText === 'RESET') {
            try {
                await supabase.from('profiles').update({ total_score: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
                await supabase.from('guest_scores').update({ total_score: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
                alert("Reset successful.");
            } catch (e) {
                alert("Reset failed.");
            }
        }
    };

    const SystemSection = ({ title, icon: Icon, children, color = "purple" }) => {
        const colorClasses = {
            purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
            red: "text-red-400 bg-red-500/10 border-red-500/20",
            blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
            emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        };

        return (
            <div className="bg-[#0A0C10]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-all duration-300 shadow-2xl relative group overflow-hidden">
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-10 pointer-events-none transition-colors duration-500 ${color === 'red' ? 'bg-red-600' : color === 'blue' ? 'bg-blue-600' : 'bg-purple-600'}`} />
                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className={`p-3 rounded-2xl border ${colorClasses[color]}`}>
                        <Icon size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
                </div>
                <div className="relative z-10">{children}</div>
            </div>
        );
    };

    const InfoRow = ({ label, value, mono = false, secret = false }) => (
        <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-4 rounded-xl transition-colors group">
            <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">{label}</span>
            <div className="text-right">
                {secret ? (
                    <span className="text-gray-700 text-xs tracking-widest group-hover:text-gray-600 transition-colors">••••••••••••••••</span>
                ) : (
                    <span className={`${mono ? 'font-mono text-xs bg-black/50 px-2 py-1 rounded text-purple-300 border border-white/5' : 'text-white text-sm font-black tracking-tight'}`}>
                        {value}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                            Command Center
                        </div>
                        <div className="h-px w-10 bg-gradient-to-r from-white/20 to-transparent" />
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            Status: {settingsLoading ? 'SYNCING...' : 'ONLINE'}
                        </span>
                    </div>
                    <h1 className="text-6xl font-black text-white tracking-tighter leading-none">
                        System <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-500 drop-shadow-sm">Pulse</span>
                    </h1>
                    <p className="text-gray-400 mt-4 font-medium text-lg max-w-2xl">
                        Orchestrate global platform behavior, toggle feature visibility, and monitor engine diagnostics from a centralized hub.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black border bg-white/5 border-white/10 text-gray-400">
                        <Shield size={18} />
                        SECRETS MASKED
                    </div>
                    <button
                        onClick={fetchSettings}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:rotate-180 duration-500"
                        title="Force Sync"
                    >
                        <RefreshCcw size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-8">
                    <SystemSection title="Operational Logic" icon={Settings} color="purple">
                        {settingsLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                                <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Accessing DB...</span>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { key: 'maintenance_mode', label: 'System', desc: 'Whole platform maintenance', color: 'red' },
                                        { key: 'quizzes_hidden', label: 'Quizzes', desc: 'Quiz section maintenance', color: 'indigo' },
                                        { key: 'materials_hidden', label: 'Materials', desc: 'Materials section maintenance', color: 'pink' },
                                    ].map((item) => {
                                        const enabled = settings[item.key]?.enabled;
                                        return (
                                            <button
                                                key={item.key}
                                                onClick={() => toggleSetting(item.key, settings[item.key] || { enabled: false })}
                                                className={`group rounded-3xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99] ${
                                                    enabled
                                                        ? 'bg-white/10 border-white/20 shadow-lg'
                                                        : 'bg-white/5 border-white/5 hover:border-white/15'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className={`text-xs font-black uppercase tracking-widest ${enabled ? 'text-white' : 'text-gray-500'}`}>
                                                            {item.label} Under Maintenance
                                                        </div>
                                                        <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 opacity-75">
                                                            {item.desc}
                                                        </div>
                                                    </div>
                                                    <div className={`transition-transform duration-300 ${enabled ? 'text-white' : 'text-gray-700 group-hover:text-gray-400'}`}>
                                                        {enabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                                                    </div>
                                                </div>
                                                <div className={`mt-5 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                                                    enabled
                                                        ? 'border-red-400/30 bg-red-500/10 text-red-300'
                                                        : 'border-white/10 bg-black/20 text-gray-400'
                                                }`}>
                                                    {enabled ? 'Active' : 'Off'}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[
                                        { key: 'xp_frozen', label: 'Freeze XP', desc: 'Stop rank progression', color: 'blue' },
                                        { key: 'blind_hour', label: 'Blind Hour', desc: 'Hide scoreboard ranks', color: 'purple' },
                                        { key: 'leaderboard_locked', label: 'Lock Ranks', desc: 'Disable leaderboard sync', color: 'amber' }
                                    ].map((item) => (
                                        <div key={item.key} className={`p-5 rounded-2xl border transition-all duration-300 ${
                                            settings[item.key]?.enabled 
                                            ? `bg-white/10 border-white/20 shadow-lg` 
                                            : 'bg-white/5 border-white/5'
                                        }`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`text-xs font-black uppercase tracking-widest ${settings[item.key]?.enabled ? `text-white` : 'text-gray-500'}`}>
                                                    {item.label}
                                                </div>
                                                <button
                                                    onClick={() => toggleSetting(item.key, settings[item.key] || { enabled: false })}
                                                    className={`transition-all transform active:scale-90 ${settings[item.key]?.enabled ? `text-white` : 'text-gray-700'}`}
                                                >
                                                    {settings[item.key]?.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight opacity-60">
                                                {item.desc}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Bell size={16} className="text-blue-400" />
                                            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-300">Reminder Timing</p>
                                        </div>
                                        <button
                                            onClick={() => toggleSetting('notification_reminder_settings', settings.notification_reminder_settings || { enabled: true })}
                                            className={`transition-all ${settings.notification_reminder_settings?.enabled !== false ? 'text-blue-300' : 'text-gray-600'}`}
                                        >
                                            {settings.notification_reminder_settings?.enabled !== false ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Exam Hours Before</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={settings.notification_reminder_settings?.exam_hours_before ?? 24}
                                                onChange={(e) => updateSetting('notification_reminder_settings', {
                                                    ...(settings.notification_reminder_settings || {}),
                                                    enabled: settings.notification_reminder_settings?.enabled !== false,
                                                    exam_hours_before: parseInt(e.target.value || '24', 10)
                                                })}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Assignment Hours Before</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={settings.notification_reminder_settings?.assignment_hours_before ?? 24}
                                                onChange={(e) => updateSetting('notification_reminder_settings', {
                                                    ...(settings.notification_reminder_settings || {}),
                                                    enabled: settings.notification_reminder_settings?.enabled !== false,
                                                    assignment_hours_before: parseInt(e.target.value || '24', 10)
                                                })}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Lecture Minutes Before</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={settings.notification_reminder_settings?.lecture_minutes_before ?? 5}
                                                onChange={(e) => updateSetting('notification_reminder_settings', {
                                                    ...(settings.notification_reminder_settings || {}),
                                                    enabled: settings.notification_reminder_settings?.enabled !== false,
                                                    lecture_minutes_before: parseInt(e.target.value || '5', 10)
                                                })}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-400">Server-side push runs daily by cron on Hobby plans. Use Dispatch Now for extra runs when needed.</p>
                                            <label className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notification_reminder_settings?.client_fallback_enabled === true}
                                                    onChange={(e) => updateSetting('notification_reminder_settings', {
                                                        ...(settings.notification_reminder_settings || {}),
                                                        enabled: settings.notification_reminder_settings?.enabled !== false,
                                                        client_fallback_enabled: e.target.checked
                                                    })}
                                                    className="h-4 w-4 rounded border-white/20 bg-black/40"
                                                />
                                                Enable client fallback reminders
                                            </label>
                                        </div>
                                        <button
                                            onClick={runReminderDispatch}
                                            disabled={dispatchingReminders}
                                            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200 hover:bg-blue-500/20 disabled:opacity-60"
                                        >
                                            <Send size={12} />
                                            {dispatchingReminders ? 'Dispatching...' : 'Dispatch Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </SystemSection>

                    <SystemSection title="Global Messaging" icon={MessageCircle} color="emerald">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 outline outline-1 outline-white/5 -outline-offset-8">
                            <div className="flex items-center gap-3 text-emerald-400 mb-2">
                                <div className="p-2 bg-emerald-500/20 rounded-xl">
                                    <Terminal size={18} />
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Landing Page Override</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 ml-1">Main Greeting</label>
                                    <input
                                        type="text"
                                        defaultValue={settings.current_theme?.customConfig?.greeting || ''}
                                        onBlur={(e) => updateSetting('current_theme', {
                                            ...settings.current_theme,
                                            customConfig: { ...settings.current_theme?.customConfig, greeting: e.target.value }
                                        })}
                                        className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-black tracking-tight focus:border-emerald-500 outline-none transition-all placeholder:text-gray-800"
                                        placeholder="WELCOME BACK"
                                    />
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest px-2">Primary header on home screen</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 ml-1">Sub-Status Text</label>
                                    <input
                                        type="text"
                                        defaultValue={settings.current_theme?.customConfig?.subGreeting || ''}
                                        onBlur={(e) => updateSetting('current_theme', {
                                            ...settings.current_theme,
                                            customConfig: { ...settings.current_theme?.customConfig, subGreeting: e.target.value }
                                        })}
                                        className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-medium focus:border-emerald-500 outline-none transition-all placeholder:text-gray-800"
                                        placeholder="Level Up Your Coding"
                                    />
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest px-2">Dynamic status subtitle</p>
                                </div>
                            </div>
                        </div>
                    </SystemSection>
                </div>

                <div className="lg:col-span-5 space-y-8">
                    <SystemSection title="Visibility Matrix" icon={Eye} color="blue">
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { key: 'leaderboard_hidden', label: 'Leaderboard', icon: 'L', color: 'amber' },
                                { key: 'study_groups_hidden', label: 'Study Groups', icon: 'S', color: 'blue' },
                                { key: 'challenges_hidden', label: 'PvP Challenges', icon: 'C', color: 'purple' }
                            ].map((item) => {
                                const isHidden = settings[item.key]?.enabled;
                                return (
                                    <div key={item.key} className={`flex items-center justify-between p-5 rounded-3xl border transition-all duration-500 group ${
                                        !isHidden 
                                        ? 'bg-white/5 border-white/10 hover:border-white/20' 
                                        : 'bg-red-500/5 border-red-500/20 shadow-inner'
                                    }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all duration-500 shadow-lg ${
                                                !isHidden 
                                                ? `bg-indigo-500/20 text-indigo-400 group-hover:scale-110` 
                                                : 'bg-gray-800 text-gray-600 grayscale'
                                            }`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <div className={`text-base font-black tracking-tight transition-colors ${!isHidden ? 'text-white' : 'text-gray-500 line-through'}`}>
                                                    {item.label}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${!isHidden ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'bg-red-500'}`} />
                                                    <div className={`text-[10px] font-black uppercase tracking-[0.15em] border px-2 py-0.5 rounded ${
                                                        !isHidden 
                                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                                        : 'text-red-400 bg-red-500/10 border-red-500/20'
                                                    }`}>
                                                        {isHidden ? 'Hidden' : 'Visible'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleSetting(item.key, settings[item.key] || { enabled: false })}
                                            className={`transition-all transform active:scale-95 ${!isHidden ? 'text-purple-400' : 'text-gray-700'}`}
                                        >
                                            {!isHidden ? <ToggleRight size={40} className="fill-current" /> : <ToggleLeft size={40} />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </SystemSection>

                    <SystemSection title="Engine Status" icon={Activity} color="emerald">
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-black/40 rounded-3xl border border-white/5 text-center group transition-colors hover:border-emerald-500/30">
                                    <div className="text-[10px] text-gray-600 uppercase font-bold tracking-[0.2em] mb-2">Round-Trip</div>
                                    <div className="text-3xl font-black text-white font-mono tracking-tighter group-hover:text-emerald-400 transition-colors">
                                        {connectionInfo.rtt}<span className="text-xs text-gray-600 ml-1">ms</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-black/40 rounded-3xl border border-white/5 text-center group transition-colors hover:border-emerald-500/30">
                                    <div className="text-[10px] text-gray-600 uppercase font-bold tracking-[0.2em] mb-2">Capacity</div>
                                    <div className="text-3xl font-black text-white font-mono tracking-tighter group-hover:text-emerald-400 transition-colors">
                                        {connectionInfo.downlink}<span className="text-xs text-gray-600 ml-1">mb</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                <div className="flex justify-between items-center text-xs font-medium">
                                    <span className="text-gray-500">Core Engine</span>
                                    <span className="text-emerald-400 font-mono">v{import.meta.env.VITE_APP_VERSION || '1.0.4'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-medium">
                                    <span className="text-gray-500">Local Cache</span>
                                    <span className="text-white font-mono">{storageStats.used} KB</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (window.confirm('Wipe engine cache? This requires session re-auth.')) {
                                        localStorage.clear();
                                        window.location.reload();
                                    }
                                }}
                                className="w-full py-4 bg-white/5 hover:bg-red-500 text-gray-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 hover:border-red-500 shadow-xl"
                            >
                                Force Cache Flush
                            </button>
                        </div>
                    </SystemSection>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
                <SystemSection title="Infrastructure" icon={Server} color="blue">
                    <div className="space-y-1 bg-black/40 p-4 rounded-2xl border border-white/5">
                        <InfoRow label="Supabase URL" value={import.meta.env.VITE_SUPABASE_URL} mono secret />
                        <InfoRow label="Protocol" value={connectionInfo.type.toUpperCase() || 'HTTP/3'} mono />
                    </div>
                </SystemSection>

                <SystemSection title="Export Matrix" icon={Download} color="blue">
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { label: 'Export Results', table: 'quiz_results', file: 'results', color: 'emerald' },
                            { label: 'Export Profiles', table: 'profiles', file: 'profiles', color: 'purple' }
                        ].map((btn) => (
                            <button
                                key={btn.table}
                                onClick={() => exportData(btn.table, `${btn.file}_export`)}
                                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 bg-white/10 text-white rounded-lg group-hover:bg-white group-hover:text-black transition-all`}>
                                        <FileText size={16} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">{btn.label}</span>
                                </div>
                                <ChevronRight size={14} className="text-gray-700 group-hover:text-white transition-colors" />
                            </button>
                        ))}
                    </div>
                </SystemSection>

                <SystemSection title="Safety Matrix" icon={AlertTriangle} color="red">
                    <div className="space-y-3">
                        <button
                            onClick={handleWipeQuestions}
                            className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                        >
                            <AlertTriangle size={14} className="animate-pulse" />
                            Wipe Database
                        </button>
                        <button
                            onClick={handleResetLeaderboard}
                            className="w-full py-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-2xl text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCcw size={14} />
                            Reset Scores
                        </button>
                    </div>
                </SystemSection>
            </div>
        </div>
    );
}
