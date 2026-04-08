import React, { useState, useEffect } from 'react';
import { ArrowLeft, Folder, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useMaintenance } from '../hooks/useMaintenance';
import { Link } from 'react-router-dom';
import { PageLoader } from '../components/AppShell';
import { supabase } from '../lib/supabase';
import MaintenancePage from './MaintenancePage';



export default function Materials() {
    const { user, guest } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { isSystemMaintenance, isMaterialsHidden } = useMaintenance();
    const [semesters, setSemesters] = useState<any[]>([]);

    useEffect(() => {
        const fetchSemesters = async () => {
            const { data, error } = await supabase
                .from('semesters')
                .select('*, subjects(name)')
                .order('id');

            if (data) {
                setSemesters(data);
            }
            if (error) {
                console.error("Error fetching semesters:", error);
            }
        };

        fetchSemesters();
    }, []);



    if (isSystemMaintenance) {
        return <MaintenancePage scope="system" />;
    }

    if (isMaterialsHidden) {
        return <MaintenancePage scope="materials" />;
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#030303] text-white selection:bg-purple-500/30' : 'bg-gray-50 text-gray-900 selection:bg-purple-200'} font-sans p-4 md:p-8 relative overflow-hidden transition-colors duration-500`}>

            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E&quot;)] opacity-20 mix-blend-overlay" />
                <div className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] ${isDark ? 'bg-purple-900/10' : 'bg-purple-200/40'} rounded-full blur-[150px] animate-pulse-slow`} />
                <div className={`absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] ${isDark ? 'bg-blue-900/10' : 'bg-blue-200/40'} rounded-full blur-[150px] animate-pulse-slow`} />
            </div>

            <Link
                to="/"
                className={`absolute top-6 left-6 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'} backdrop-blur-md transition-all z-50 group shadow-lg`}
            >
                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'} group-hover:-translate-x-1 transition-transform`} />
            </Link>

            <div className="absolute top-6 right-6 z-50 flex items-center gap-4">

                <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'} backdrop-blur-md transition-all shadow-lg`}
                >
                    {isDark ? <Sparkles size={20} className="text-purple-400" /> : <div className="w-5 h-5 rounded-full bg-slate-800" />}
                </button>

                {user || guest ? (
                    <Link to="/profile" className="group relative">
                        <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 ${isDark ? 'border-white/10' : 'border-gray-200'} transition-transform group-hover:scale-105 shadow-xl`}>
                            {(user?.user_metadata?.avatar_url || guest?.avatar_url) ? (
                                <img src={user?.user_metadata?.avatar_url || guest?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                    <User size={18} className="text-white" />
                                </div>
                            )}
                        </div>
                    </Link>
                ) : null}
            </div>

            <div className="max-w-7xl mx-auto relative z-10 pt-32 pb-20 px-6">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className={`text-5xl font-black mb-4 tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'} drop-shadow-xl transition-colors`}>
                        Select Semester
                    </h1>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg font-medium max-w-lg mx-auto leading-relaxed transition-colors`}>
                        Access curated course materials, notes, and resources for your semester.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-4 md:px-0">
                    {semesters.map((semester, index) => (
                        <Link
                            key={semester.id}
                            to={`/materials/${semester.id}`}
                            className={`group relative overflow-hidden rounded-2xl border ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30' : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-lg'} backdrop-blur-xl transition-all duration-500 h-64 flex flex-col justify-between p-6`}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >

                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10 flex justify-between items-start">
                                <div className={`p-3 rounded-xl border transition-transform duration-300 group-hover:scale-110 ${isDark ? 'bg-white/5 border-white/10' : 'bg-purple-50 border-purple-100'}`}>
                                    <Folder className={`w-6 h-6 ${isDark ? 'text-blue-400 group-hover:text-blue-300' : 'text-blue-600 group-hover:text-blue-700'} transition-colors`} />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider border px-2 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-500 group-hover:text-white/60 border-white/5' : 'text-gray-500 group-hover:text-gray-700 border-gray-200'}`}>
                                    SEM {semester.id}
                                </span>
                            </div>

                            <div className="relative z-10">
                                <h3 className={`text-xl md:text-2xl font-bold mb-1 transition-colors ${isDark ? 'text-white group-hover:text-purple-300' : 'text-gray-900 group-hover:text-purple-700'}`}>
                                    {semester.title}
                                </h3>
                                {semester.description && (
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-3 line-clamp-2`}>
                                        {semester.description}
                                    </p>
                                )}

                                {semester.subjects && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {semester.subjects.slice(0, 3).map((subject: any, idx: number) => (
                                            <span key={idx} className={`text-[9px] border px-2 py-0.5 rounded-full ${isDark ? 'text-gray-500 border-white/5 bg-white/5' : 'text-gray-600 border-gray-200 bg-gray-50'}`}>
                                                {subject.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div >
    );
}
