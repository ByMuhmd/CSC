
import React, { useEffect, useState } from 'react';
import { Search, Save, Plus, Trash2, Award, Upload, X, RefreshCw, Trophy, Loader2, Calendar, Medal, Zap, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useGamification } from '../../hooks/useGamification';
import { Rank } from '../../utils/gamification';
import { Avatar as UserAvatar } from '../../components/UIComponents';

const AVAILABLE_COLORS = [
    { label: 'Gray', value: 'text-gray-400' },
    { label: 'Green', value: 'text-green-400' },
    { label: 'Blue', value: 'text-blue-400' },
    { label: 'Purple', value: 'text-purple-400' },
    { label: 'Red', value: 'text-red-400' },
    { label: 'Yellow', value: 'text-yellow-400' },
    { label: 'Pink', value: 'text-pink-400' },
    { label: 'Orange', value: 'text-orange-400' },
    { label: 'Cyan', value: 'text-cyan-400' },
    { label: 'Indigo', value: 'text-indigo-400' },
];

interface Badge {
    id: string;
    name: string;
    description: string;
    image_url: string;
    xp_req: number;
    condition_type: string;
    condition_value: string;
    created_at: string;
}

export default function AdminGamification() {
    const [activeTab, setActiveTab] = useState<'levels' | 'badges' | 'certificates'>('levels');

    return (
        <div className="space-y-4 font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 mb-2">
                        Gamification
                    </h1>
                    <p className="text-gray-400 font-medium tracking-wide">
                        Manage all engagement features: XP, Levels, Badges, and Certificates.
                    </p>
                </div>
            </div>

            <div className="flex space-x-2 border-b border-white/10 mb-8 relative z-10 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('levels')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'levels'
                        ? 'border-purple-500 text-purple-400 bg-white/5 rounded-t-lg'
                        : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Zap size={18} />
                    <span>Levels & XP</span>
                </button>
                <button
                    onClick={() => setActiveTab('badges')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'badges'
                        ? 'border-purple-500 text-purple-400 bg-white/5 rounded-t-lg'
                        : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Award size={18} />
                    <span>Badges</span>
                </button>
                <button
                    onClick={() => setActiveTab('certificates')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'certificates'
                        ? 'border-purple-500 text-purple-400 bg-white/5 rounded-t-lg'
                        : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Medal size={18} />
                    <span>Certificates</span>
                </button>
            </div>

            <div className="relative z-10 min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'levels' && <AdminLevelsTab />}
                {activeTab === 'badges' && <AdminBadgesTab />}
                {activeTab === 'certificates' && <AdminCertificatesTab />}
            </div>
        </div>
    );
}

function AdminLevelsTab() {
    const { config, updateConfig, fetchConfig } = useGamification();
    const [localConfig, setLocalConfig] = useState(config);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    const handleSave = async () => {
        setSaving(true);
        await updateConfig(localConfig);
        setSaving(false);
        setIsDirty(false);
    };

    const handleRankChange = (index: number, field: keyof Rank, value: any) => {
        const newRanks = [...localConfig.ranks];
        newRanks[index] = { ...newRanks[index], [field]: value };
        setLocalConfig({ ...localConfig, ranks: newRanks });
        setIsDirty(true);
    };

    const addRank = () => {
        const newRank: Rank = {
            id: Date.now().toString(),
            label: 'New Rank',
            minLevel: 0,
            color: 'text-gray-400'
        };
        setLocalConfig({ ...localConfig, ranks: [...localConfig.ranks, newRank] });
        setIsDirty(true);
    };

    const removeRank = (index: number) => {
        const newRanks = localConfig.ranks.filter((_, i) => i !== index);
        setLocalConfig({ ...localConfig, ranks: newRanks });
        setIsDirty(true);
    };

    const [recalculating, setRecalculating] = useState(false);

    const handleRecalculate = async () => {
        if (!window.confirm("This will scan ALL users and update their Level based on their current XP using the standard formula: Level = floor(sqrt(XP/100)) + 1. Continue?")) return;

        setRecalculating(true);
        try {
            const { data: profiles, error } = await import('../../lib/supabase').then(m => m.supabase.from('profiles').select('id, xp, level'));
            if (error) throw error;
            if (!profiles) return;

            let updatedCount = 0;
            const updates = [];

            for (const user of profiles) {
                const xp = user.xp || 0;
                const correctLevel = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;

                if (user.level !== correctLevel) {
                    updates.push(
                        import('../../lib/supabase').then(m => m.supabase.from('profiles').update({ level: correctLevel }).eq('id', user.id))
                    );
                    updatedCount++;
                }
            }

            await Promise.all(updates);

            alert(`Recalculation complete!\n\nScanned: ${profiles.length} users\nUpdated: ${updatedCount} users`);
        } catch (err: any) {
            console.error("Recalculation failed", err);
            alert("Error: " + err.message);
        } finally {
            setRecalculating(false);
        }
    };

    return (
        <div className="space-y-8 pb-12 relative font-sans">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 flex items-center gap-3">
                        Gamification Logic
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20 font-bold uppercase tracking-widest relative overflow-hidden">
                            <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
                            Config
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium tracking-wide">Manage XP rewards, leveling curves, and rank definitions.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className={`group flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all relative overflow-hidden ${isDirty
                        ? 'bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {isDirty && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />}
                    {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} className={isDirty ? 'text-purple-600' : ''} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                <div className="space-y-6">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap size={100} />
                        </div>

                        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4 relative z-10">
                            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-lg shadow-yellow-500/5">
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <h2 className="text-xl font-bold text-white">XP Reward Rates</h2>
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Quiz Completion</label>
                                <div className="group/input relative">
                                    <input
                                        type="number"
                                        value={localConfig.xpPerQuiz}
                                        onChange={(e) => {
                                            setLocalConfig({ ...localConfig, xpPerQuiz: parseInt(e.target.value) || 0 });
                                            setIsDirty(true);
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-purple-500 focus:bg-white/10 outline-none transition-all pl-12"
                                    />
                                    <span className="absolute left-4 top-3.5 text-gray-500 font-mono text-sm">XP</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1.5 font-medium">XP awarded for finishing a quiz.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Correct Answer</label>
                                <div className="group/input relative">
                                    <input
                                        type="number"
                                        value={localConfig.xpPerCorrect}
                                        onChange={(e) => {
                                            setLocalConfig({ ...localConfig, xpPerCorrect: parseInt(e.target.value) || 0 });
                                            setIsDirty(true);
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-purple-500 focus:bg-white/10 outline-none transition-all pl-12"
                                    />
                                    <span className="absolute left-4 top-3.5 text-gray-500 font-mono text-sm">+</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1.5 font-medium">Bonus XP per correct answer.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Essay Pass</label>
                                <div className="group/input relative">
                                    <input
                                        type="number"
                                        value={localConfig.xpPerEssay}
                                        onChange={(e) => {
                                            setLocalConfig({ ...localConfig, xpPerEssay: parseInt(e.target.value) || 0 });
                                            setIsDirty(true);
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-purple-500 focus:bg-white/10 outline-none transition-all pl-12"
                                    />
                                    <span className="absolute left-4 top-3.5 text-gray-500 font-mono text-sm">+</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1.5 font-medium">XP for passing an essay question.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                                    <Award size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Rank Definitions</h2>
                            </div>
                            <button
                                onClick={addRank}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-white/5 hover:border-white/20"
                            >
                                <Plus size={14} /> Add Rank
                            </button>
                        </div>

                        <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                            {localConfig.ranks.sort((a, b) => b.minLevel - a.minLevel).map((rank, idx) => (
                                <div key={rank.id || idx} className="flex flex-col md:flex-row gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group hover:bg-white/10 hover:shadow-lg hover:shadow-purple-900/5 hover:-translate-y-0.5">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 border-white/10 shadow-lg group-hover:scale-110 transition-transform ${rank.color.replace('text-', 'bg-').replace('400', '500/20')} ${rank.color}`}>
                                            <Award size={24} />
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-500 block">Rank Name</label>
                                                    <input
                                                        type="text"
                                                        value={rank.label}
                                                        onChange={(e) => handleRankChange(idx, 'label', e.target.value)}
                                                        className="w-full bg-transparent border-b border-white/10 focus:border-purple-500 py-1 text-white font-bold text-lg outline-none transition-colors"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-500 block">Min Level</label>
                                                    <div className="relative">
                                                        <span className="absolute left-0 top-1.5 text-gray-600 font-mono text-xs">Lvl</span>
                                                        <input
                                                            type="number"
                                                            value={rank.minLevel}
                                                            onChange={(e) => handleRankChange(idx, 'minLevel', parseInt(e.target.value) || 0)}
                                                            className="w-full bg-transparent border-b border-white/10 focus:border-purple-500 py-1 text-white font-mono text-lg outline-none pl-6"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-4">
                                        <div className="flex-1 md:w-32">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Color Theme</label>
                                            <select
                                                value={rank.color}
                                                onChange={(e) => handleRankChange(idx, 'color', e.target.value)}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none hover:bg-black/50 transition-colors"
                                            >
                                                {AVAILABLE_COLORS.map(c => (
                                                    <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => removeRank(idx)}
                                            className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all mt-4 md:mt-0 opacity-0 group-hover:opacity-100"
                                            title="Remove Rank"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {localConfig.ranks.length === 0 && (
                                <div className="p-12 text-center text-gray-500 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <AlertCircle className="opacity-50" size={32} />
                                    </div>
                                    <p className="font-bold">No ranks defined</p>
                                    <p className="text-sm opacity-50 mt-1">Users will fall back to 'Unknown' rank.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-8 relative z-10">
                <div className="bg-red-500/5 backdrop-blur-sm border border-red-500/10 rounded-3xl p-8 transition-all hover:bg-red-500/10 hover:border-red-500/20">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Maintenance Operations</h2>
                            <p className="text-red-400/70 text-sm font-medium mt-1">Advanced controls for data consistency</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-black/20 rounded-2xl p-6 border border-red-500/10">
                        <div className="max-w-xl">
                            <h3 className="font-bold text-gray-200 mb-1">Recalculate User Levels</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">
                                This will scan ALL users and update their Level based on their current XP using the standard formula: <code className="bg-white/10 px-1 py-0.5 rounded text-gray-300">Level = floor(sqrt(XP/100)) + 1</code>.
                                Use this if you changed the XP formula or suspect data desynchronization.
                            </p>
                        </div>

                        <button
                            onClick={handleRecalculate}
                            disabled={recalculating}
                            className="flex items-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-red-900/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {recalculating ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                            {recalculating ? 'Processing...' : 'Recalculate Now'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AdminBadgesTab() {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        xp_req: 100,
        condition_type: 'manual',
        condition_value: '0',
        image_file: null as File | null,
        image_preview: ''
    });

    const CONDITION_TYPES = [
        { value: 'manual', label: 'Manual Award Only' },
        { value: 'quiz_score_percent', label: 'Quiz Score % Reached (Any Quiz)' },
        { value: 'quizzes_completed', label: 'Total Quizzes Completed' },
        { value: 'materials_completed', label: 'Total Materials Completed' },
        { value: 'modules_completed', label: 'Modules Completed' },
        { value: 'perfect_quizzes', label: 'Perfect Score Quizzes (100%)' },
        { value: 'courses_completed', label: 'Courses Completed' },
    ];

    const DEFAULT_BADGES = [
        { name: 'First Step', icon: '🦶', description: 'Complete your first material', xp: 50, type: 'materials_completed', val: '1' },
        { name: 'Bookworm', icon: '📚', description: 'Complete 10 materials', xp: 200, type: 'materials_completed', val: '10' },
        { name: 'Quiz Whiz', icon: '🎯', description: 'Score 100% on a quiz', xp: 100, type: 'quiz_score_percent', val: '100' },
        { name: 'Test Pilot', icon: '🛫', description: 'Complete 5 quizzes', xp: 150, type: 'quizzes_completed', val: '5' },
        { name: 'Perfectionist', icon: '👑', description: 'Get 3 perfect quiz scores', xp: 500, type: 'perfect_quizzes', val: '3' },
        { name: 'Scholar', icon: '🎓', description: 'Complete 20 materials', xp: 400, type: 'materials_completed', val: '20' },
        { name: 'Mastermind', icon: '🧠', description: 'Complete 3 modules', xp: 600, type: 'modules_completed', val: '3' },
        { name: 'Polymath', icon: '🌟', description: 'Complete 1 course', xp: 1000, type: 'courses_completed', val: '1' },
    ];

    const fetchBadges = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('badges')
                .select('*')
                .order('xp_req', { ascending: true });

            if (error) throw error;
            setBadges(data || []);
        } catch (err) {
            console.error('Error fetching badges:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBadges();
    }, []);

    const handleSeedDefaults = async () => {
        if (!window.confirm('This will add the 8 default badges to the database. Continue?')) return;
        setLoading(true);
        try {
            const badgesToInsert = DEFAULT_BADGES.map(b => ({
                name: b.name,
                description: b.description,
                image_url: b.icon,
                xp_req: b.xp,
                condition_type: b.type,
                condition_value: b.val
            }));

            const { error } = await supabase.from('badges').insert(badgesToInsert);
            if (error) throw error;

            alert('Default badges added!');
            fetchBadges();
        } catch (err: any) {
            console.error('Error seeding badges:', err);
            alert('Failed to seed badges: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setForm({
                ...form,
                image_file: file,
                image_preview: URL.createObjectURL(file)
            });
        }
    };

    const openEditModal = (badge: Badge) => {
        setEditingId(badge.id);
        setForm({
            name: badge.name,
            description: badge.description || '',
            xp_req: badge.xp_req,
            condition_type: badge.condition_type || 'manual',
            condition_value: badge.condition_value || '0',
            image_file: null,
            image_preview: badge.image_url
        });
        setShowModal(true);
    };

    const handleSaveBadge = async () => {
        if (!form.name || !form.xp_req) {
            alert('Please fill in required fields (Name, XP).');
            return;
        }

        setUploading(true);
        try {
            let imageUrl = form.image_preview;

            if (form.image_file) {
                const fileExt = form.image_file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('badges')
                    .upload(fileName, form.image_file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('badges').getPublicUrl(fileName);
                imageUrl = data.publicUrl;
            }

            const payload = {
                name: form.name,
                description: form.description,
                xp_req: form.xp_req,
                image_url: imageUrl,
                condition_type: form.condition_type,
                condition_value: form.condition_value
            };

            if (editingId) {
                const { error } = await supabase
                    .from('badges')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
                alert('Badge updated!');
            } else {
                if (!form.image_file && !imageUrl) {
                    alert('Please upload an icon.');
                    setUploading(false);
                    return;
                }
                const { error } = await supabase
                    .from('badges')
                    .insert([payload]);
                if (error) throw error;
                alert('Badge created!');
            }

            setShowModal(false);
            setEditingId(null);
            setForm({ name: '', description: '', xp_req: 100, condition_type: 'manual', condition_value: '0', image_file: null, image_preview: '' });
            fetchBadges();
        } catch (err: any) {
            console.error('Error saving badge:', err);
            alert(`Failed to save badge: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this badge?')) return;

        setDeleting(id);
        try {
            const { error } = await supabase
                .from('badges')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBadges(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            console.error('Error deleting badge:', err);
            alert('Failed to delete badge.');
        } finally {
            setDeleting(null);
        }
    };

    const filteredBadges = badges.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase())
    );

    const isEmoji = (str: string) => {
        return str && !str.startsWith('http');
    };

    return (
        <div className="space-y-8 pb-10 relative font-sans">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 mb-2">
                        Badge Management
                    </h1>
                    <p className="text-gray-400 font-medium tracking-wide flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        Create and manage gamification achievements
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSeedDefaults}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-all hover:scale-105 active:scale-95"
                        title="Seed Default Badges"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setForm({ name: '', description: '', xp_req: 100, condition_type: 'manual', condition_value: '0', image_file: null, image_preview: '' });
                            setShowModal(true);
                        }}
                        className="group relative px-6 py-3 bg-white text-black rounded-xl font-bold text-sm uppercase tracking-wider hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 flex items-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <Plus size={18} strokeWidth={3} />
                        <span>Create Badge</span>
                    </button>
                </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-8">
                <div className="mb-8 relative max-w-md">
                    <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search badges..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-purple-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-purple-500 w-10 h-10" />
                    </div>
                ) : filteredBadges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Award className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="font-medium">No badges found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredBadges.map(badge => (
                            <div
                                key={badge.id}
                                onClick={() => openEditModal(badge)}
                                className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-900/10 cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all"
                                        onClick={(e) => handleDelete(badge.id, e)}
                                    >
                                        {deleting === badge.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 overflow-hidden mb-4 flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 transition-transform duration-500 relative">
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {isEmoji(badge.image_url) ? (
                                            <span>{badge.image_url}</span>
                                        ) : (
                                            <img src={badge.image_url} alt={badge.name} className="w-full h-full object-cover" />
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">{badge.name}</h3>

                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold uppercase tracking-wider mb-3">
                                        <Trophy size={10} />
                                        <span>{badge.xp_req} XP</span>
                                    </div>

                                    <p className="text-xs text-gray-400 line-clamp-2 px-2 h-8">{badge.description}</p>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <span>Condition</span>
                                    <span className="text-purple-400">{badge.condition_type.replace(/_/g, ' ')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

                        <div className="p-6 border-b border-white/10 flex justify-between items-center relative z-10 bg-white/5 backdrop-blur-xl">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                    <Award size={20} />
                                </div>
                                {editingId ? 'Edit Badge' : 'New Achievement'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto relative z-10 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Badge Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                                        placeholder="e.g. Speed Demon"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600 h-24 resize-none"
                                        placeholder="Briefly describe how to earn this badge..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">XP Requirement</label>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                                            <Trophy size={20} className="text-yellow-500" />
                                        </div>
                                        <input
                                            type="number"
                                            value={form.xp_req}
                                            onChange={e => setForm({ ...form, xp_req: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:bg-white/10 outline-none transition-all font-mono text-lg"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Award Condition</label>
                                        <select
                                            value={form.condition_type}
                                            onChange={e => setForm({ ...form, condition_type: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:bg-white/10 outline-none appearance-none transition-all"
                                        >
                                            {CONDITION_TYPES.map(type => (
                                                <option key={type.value} value={type.value} className="bg-gray-900">{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Threshold Value</label>
                                        <input
                                            type="text"
                                            value={form.condition_value}
                                            onChange={e => setForm({ ...form, condition_value: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:bg-white/10 outline-none transition-all font-mono"
                                            placeholder="e.g. 7"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Badge Visual</label>
                                    <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:bg-white/5 hover:border-purple-500/30 transition-all cursor-pointer relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        {form.image_preview ? (
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/20 mb-3 flex items-center justify-center bg-black/50 shadow-lg">
                                                    {isEmoji(form.image_preview) ? (
                                                        <span className="text-5xl">{form.image_preview}</span>
                                                    ) : (
                                                        <img src={form.image_preview} alt="Preview" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <span className="text-xs text-green-400 font-bold bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">Image Selected</span>
                                            </div>
                                        ) : (
                                            <div className="py-4 text-gray-500 flex flex-col items-center">
                                                <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                                    <Upload className="w-6 h-6 opacity-50" />
                                                </div>
                                                <span className="text-sm font-medium">Click to upload icon</span>
                                                <p className="text-[10px] mt-1 opacity-50 uppercase tracking-wider">SVG or PNG recommended</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5 backdrop-blur-xl relative z-10">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveBadge}
                                disabled={uploading}
                                className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {uploading ? 'Saving...' : (editingId ? 'Update Badge' : 'Save Badge')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminCertificatesTab() {
    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userSearch, setUserSearch] = useState('');
    const [, setUserLocating] = useState(false);
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        issue_date: new Date().toISOString().split('T')[0],
        issuer_name: 'The Cohort',
        theme_color: 'gold',
        show_signature: true,
        sub_title: 'Certificate of Completion',
        intro_text: 'This is to certify that',
        achievement_text: 'has successfully completed the course requirements for',
        date_label: 'Date Issued',
        verify_label: 'Verify ID'
    });
    const [issuing, setIssuing] = useState(false);

    useEffect(() => {
        fetchCertificates();
    }, []);

    useEffect(() => {
        if (userSearch.length > 2) searchUsers();
        else setFoundUsers([]);
    }, [userSearch]);

    const fetchCertificates = async () => {
        try {
            const { data, error } = await supabase
                .from('user_certifications')
                .select('*, profiles(full_name, avatar_url, email)')
                .order('issue_date', { ascending: false });

            if (error) throw error;
            setCertificates(data || []);
        } catch (error) {
            console.error('Error fetching certificates:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async () => {
        setUserLocating(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .ilike('full_name', `%${userSearch}%`)
                .limit(5);
            setFoundUsers(data || []);
        } finally {
            setUserLocating(false);
        }
    };

    const handleIssueCertificate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return alert('Please select a user');

        setIssuing(true);
        try {
            const { error } = await supabase.from('user_certifications').insert({
                user_id: selectedUser.id,
                title: formData.title,
                description: formData.description,
                image_url: formData.image_url,
                issue_date: formData.issue_date,
                metadata: {
                    issuer_name: formData.issuer_name,
                    theme_color: formData.theme_color,
                    show_signature: formData.show_signature,
                    signature_name: (formData as any).signature_name,
                    signature_title: (formData as any).signature_title,
                    sub_title: (formData as any).sub_title,
                    intro_text: (formData as any).intro_text,
                    achievement_text: (formData as any).achievement_text,
                    date_label: (formData as any).date_label,
                    verify_label: (formData as any).verify_label
                }
            });

            if (error) throw error;

            alert('Certificate Issued!');
            setIsModalOpen(false);
            setFormData({
                title: '',
                description: '',
                image_url: '',
                issue_date: new Date().toISOString().split('T')[0],
                issuer_name: 'The Cohort',
                theme_color: 'gold',
                show_signature: true,
                sub_title: 'Certificate of Completion',
                intro_text: 'This is to certify that',
                achievement_text: 'has successfully completed the course requirements for',
                date_label: 'Date Issued',
                verify_label: 'Verify ID'
            });
            setSelectedUser(null);
            setUserSearch('');
            fetchCertificates();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIssuing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to revoke this certificate?')) return;
        try {
            const { error } = await supabase.from('user_certifications').delete().eq('id', id);
            if (error) throw error;
            setCertificates(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const filteredCerts = certificates.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.profiles?.full_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Award className="text-yellow-500" size={32} /> Certificates Manager
                    </h1>
                    <p className="text-gray-400 mt-1">Issue and manage user certifications</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20"
                >
                    <Plus size={20} /> Issue Certificate
                </button>
            </div>

            <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search certificates..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none placeholder:text-gray-600 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Recipient</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Certificate Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Issue Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading certificates...</td></tr>
                            ) : filteredCerts.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No certificates found.</td></tr>
                            ) : (
                                filteredCerts.map((cert) => (
                                    <tr key={cert.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar url={cert.profiles?.avatar_url} name={cert.profiles?.full_name} size={40} />
                                                <div>
                                                    <div className="font-bold text-white">{cert.profiles?.full_name || 'Unknown User'}</div>
                                                    <div className="text-xs text-gray-500">{cert.profiles?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <img src={cert.image_url} className="w-16 h-10 object-cover rounded bg-white/5 border border-white/10" alt="Preview" />
                                                <div>
                                                    <div className="font-bold text-gray-200">{cert.title}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{cert.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
                                                <Calendar size={14} />
                                                {new Date(cert.issue_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(cert.id)}
                                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Revoke Certificate"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0F1115] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Medal className="text-yellow-500" /> Issue New Certificate
                            </h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-gray-500 hover:text-white" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Select Recipient</label>
                                {selectedUser ? (
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar url={selectedUser.avatar_url} name={selectedUser.full_name} size={32} />
                                            <span className="font-bold text-white">{selectedUser.full_name}</span>
                                        </div>
                                        <button onClick={() => setSelectedUser(null)}><X size={16} className="text-gray-500 hover:text-white" /></button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search user by name..."
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-yellow-500 outline-none"
                                        />
                                        {foundUsers.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                                                {foundUsers.map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => setSelectedUser(u)}
                                                        className="w-full p-3 flex items-center gap-3 hover:bg-white/5 text-left border-b border-white/5 last:border-0"
                                                    >
                                                        <UserAvatar url={u.avatar_url} name={u.full_name} size={24} />
                                                        <div className="flex-1">
                                                            <div className="text-sm font-bold text-white">{u.full_name}</div>
                                                            <div className="text-xs text-gray-500">{u.email}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleIssueCertificate} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Certificate Title</label>
                                    <input
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none"
                                        placeholder="e.g. Advanced Network Security"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none"
                                        placeholder="Awarded for excellence in..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Certificate Visuals</label>
                                    <div className="flex items-center gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            id="autoGen"
                                            checked={formData.image_url === 'generated:default'}
                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.checked ? 'generated:default' : '' })}
                                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-yellow-500 focus:ring-offset-black"
                                        />
                                        <label htmlFor="autoGen" className="text-sm text-gray-300 select-none cursor-pointer">Auto-Generate Certificate Image</label>
                                    </div>

                                    {formData.image_url === 'generated:default' && (
                                        <div className="pl-6 border-l-2 border-white/10 space-y-4 mb-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Issuer Name</label>
                                                <input
                                                    value={formData.issuer_name}
                                                    onChange={e => setFormData({ ...formData, issuer_name: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                    placeholder="e.g. The Cohort Academy"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Signature Name</label>
                                                    <input
                                                        value={(formData as any).signature_name || ''}
                                                        onChange={e => setFormData({ ...formData, signature_name: e.target.value } as any)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                        placeholder="e.g. John Doe"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Signature Title</label>
                                                    <input
                                                        value={(formData as any).signature_title || ''}
                                                        onChange={e => setFormData({ ...formData, signature_title: e.target.value } as any)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                        placeholder="e.g. Director"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-white/10">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-3">Certificate Text</div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-[10px] text-gray-600 mb-1">Subtitle (e.g. Certificate of Completion)</label>
                                                        <input
                                                            value={(formData as any).sub_title}
                                                            onChange={e => setFormData({ ...formData, sub_title: e.target.value } as any)}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] text-gray-600 mb-1">Intro Text</label>
                                                            <input
                                                                value={(formData as any).intro_text}
                                                                onChange={e => setFormData({ ...formData, intro_text: e.target.value } as any)}
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] text-gray-600 mb-1">Achievement Text</label>
                                                            <input
                                                                value={(formData as any).achievement_text}
                                                                onChange={e => setFormData({ ...formData, achievement_text: e.target.value } as any)}
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] text-gray-600 mb-1">Date Label</label>
                                                            <input
                                                                value={(formData as any).date_label}
                                                                onChange={e => setFormData({ ...formData, date_label: e.target.value } as any)}
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] text-gray-600 mb-1">Verify Label</label>
                                                            <input
                                                                value={(formData as any).verify_label}
                                                                onChange={e => setFormData({ ...formData, verify_label: e.target.value } as any)}
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Theme</label>
                                                    <select
                                                        value={formData.theme_color}
                                                        onChange={e => setFormData({ ...formData, theme_color: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                    >
                                                        <option value="gold">Gold (Default)</option>
                                                        <option value="silver">Silver</option>
                                                        <option value="bronze">Bronze</option>
                                                        <option value="blue">Blue</option>
                                                        <option value="purple">Purple</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center pt-5">
                                                    <input
                                                        type="checkbox"
                                                        id="sigToggle"
                                                        checked={formData.show_signature}
                                                        onChange={(e) => setFormData({ ...formData, show_signature: e.target.checked })}
                                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-yellow-500 mr-2"
                                                    />
                                                    <label htmlFor="sigToggle" className="text-xs text-gray-400 select-none cursor-pointer">Show Signature</label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {formData.image_url !== 'generated:default' && (
                                        <input
                                            required
                                            type="url"
                                            value={formData.image_url}
                                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none font-mono text-sm"
                                            placeholder="https://..."
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Issue Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.issue_date}
                                        onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={issuing || !selectedUser}
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl mt-4 transition-all"
                                >
                                    {issuing ? 'Issuing...' : 'Confirm Issue Certificate'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
