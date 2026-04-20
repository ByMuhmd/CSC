import React, { useState } from 'react';
import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { useOptionalAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, FileText, Settings, LogOut, ShieldAlert, FileCode, Bell, ChevronRight, Sparkles, Menu, X, Award, Calendar, Search, BookOpen, Files, Medal, Shield, MessageSquare, Smartphone, ClipboardList, Layers, Zap } from 'lucide-react';
import { Notifications as NotificationBell } from '../../components/UIComponents';

export default function AdminLayout() {
    const auth = useOptionalAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    if (!auth) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="animate-pulse flex flex-col items-center">
                    <ShieldAlert className="w-12 h-12 text-purple-600 mb-4" />
                    <p className="font-mono text-purple-400">Loading authentication context...</p>
                </div>
            </div>
        );
    }

    const { user, profile, role, isAdmin, loading, signOut } = auth;

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="animate-pulse flex flex-col items-center">
                    <ShieldAlert className="w-12 h-12 text-purple-600 mb-4" />
                    <p className="font-mono text-purple-400">Verifying Admin Access...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white p-4">
                <div className="max-w-md w-full bg-[#0A0C10] border border-red-500/20 rounded-2xl p-8 space-y-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                        <p className="text-gray-400 mt-2">You do not have permission to view the Admin Console.</p>
                    </div>

                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-xs space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Email:</span>
                            <span className="text-white">{user.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">User ID:</span>
                            <span className="text-gray-500">{user.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Role:</span>
                            <span className={`font-bold ${user?.user_metadata?.role ? 'text-green-400' : 'text-yellow-400'}`}>
                                {JSON.stringify(profile?.role) || 'undefined'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Is Admin:</span>
                            <span className="text-red-400">false</span>
                        </div>
                    </div>

                    <p className="text-xs text-center text-gray-500">
                        If you believe this is an error, please contact the system owner.
                        <br />
                        Current check: <code>role IN ['super_admin', 'admin', 'moderator']</code>
                    </p>

                    <button
                        onClick={() => signOut()}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                    >
                        Sign Out
                    </button>
                    <NavLink to="/" className="block text-center text-sm text-gray-500 hover:text-white mt-4">
                        Return to Home
                    </NavLink>
                </div>
            </div>
        );
    }

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { path: '/admin/quizzes', icon: FileCode, label: 'Quizzes' },
        { path: '/admin/users', icon: Users, label: 'Users' },
        { path: '/admin/materials', icon: BookOpen, label: 'Materials' },
        { path: '/admin/support', icon: MessageSquare, label: 'Support Chat' },
        { path: '/admin/feedback', icon: ClipboardList, label: 'Feedback' },
        { path: '/admin/broadcast', icon: Zap, label: 'Broadcasts' },

        { path: '/admin/events', icon: Calendar, label: 'Events' },
        { path: '/admin/gamification', icon: Award, label: 'Gamification' },
        { path: '/admin/settings', icon: Settings, label: 'System' },
    ];

    const adminNavItems = [...navItems];
    if (role === 'super_admin') {
        adminNavItems.splice(5, 0, { path: '/admin/team', icon: Users, label: 'Team' });
    }

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row relative overflow-x-hidden">

            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl z-30 sticky top-0 shadow-2xl">
                <div className="flex items-center gap-3">
                    <img src="/favicon.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    <h1 className="font-black text-xl tracking-tight text-white flex flex-col leading-none">
                        <span>Admin</span>
                        <span className="text-[10px] text-purple-400 font-medium tracking-widest uppercase">Console</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <NotificationBell align="right" />
                    <button
                        onClick={toggleSidebar}
                        className="p-2.5 text-gray-400 hover:text-white bg-white/5 active:bg-white/10 rounded-xl border border-white/5 transition-all"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            </div>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`
                ${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-[#08090D] border-r border-white/5 flex flex-col 
                fixed inset-y-0 left-0 z-50 h-screen transition-all duration-300 ease-in-out
                overflow-y-auto overflow-x-hidden custom-scrollbar
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="min-h-full flex flex-col">

                <div className="p-8 border-b border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 opacity-50" />

                    <div className="flex items-center gap-4 mb-2 relative z-10">
                        <div className="group-hover:scale-105 transition-transform duration-500 shrink-0">
                            <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                                <h1 className="font-black text-2xl tracking-tighter text-white flex items-center gap-1 leading-none">
                                    Admin
                                </h1>
                                <span className="text-xs font-bold text-purple-400 tracking-[0.2em] uppercase">Console</span>
                            </div>
                        )}
                    </div>

                    {!isSidebarCollapsed && (
                        <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/5 border border-red-500/10 rounded-lg w-fit group-hover:bg-red-500/10 transition-colors animate-in fade-in zoom-in-95">
                            <ShieldAlert size={12} className="text-red-500" />
                            <span className="text-[10px] uppercase font-bold text-red-400/80 tracking-wider">Restricted Access</span>
                        </div>
                    )}

                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-x-hidden">
                    {!isSidebarCollapsed && <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2 animate-in fade-in">Menu</p>}
                    {adminNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                relative group flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3.5 rounded-xl transition-all duration-300
                                ${isActive
                                    ? 'bg-gradient-to-r from-purple-600/20 via-purple-600/10 to-transparent text-white border border-purple-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={20} className={`shrink-0 transition-colors ${isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                                    {!isSidebarCollapsed && <span className="font-medium tracking-wide truncate animate-in fade-in slide-in-from-left-2">{item.label}</span>}
                                    {isActive && !isSidebarCollapsed && (
                                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5 bg-black/20">
                    {!isSidebarCollapsed && (
                        <div className="bg-white/5 rounded-xl p-4 mb-3 border border-white/5 hover:border-purple-500/30 transition-colors group animate-in fade-in">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 group-hover:text-purple-400 transition-colors">Logged in as</p>
                            <p className="text-sm font-bold text-white truncate font-mono" title={user.email}>{user.email}</p>
                        </div>
                    )}
                    <button
                        onClick={() => signOut()}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center gap-2'} px-4 py-3 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/20 border border-transparent rounded-xl transition-all text-sm font-bold`}
                    >
                        <LogOut size={16} />
                        {!isSidebarCollapsed && <span>Sign Out</span>}
                    </button>
                    
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="hidden md:flex mt-4 w-full items-center justify-center p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <ChevronRight size={16} /> : <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><ChevronRight className="rotate-180" size={14} /> Collapse</div>}
                    </button>
                </div>
                </div>
            </aside>

            <main className={`
                flex-1 flex flex-col min-h-screen transition-all duration-300 bg-[#050505] overflow-x-hidden
                ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}
            `}>

                <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-medium hover:text-gray-300 transition-colors cursor-default">Admin</span>
                        <ChevronRight size={14} className="opacity-50" />
                        <span className="text-white font-bold bg-white/5 px-3 py-1 rounded-full border border-white/5">Console Overview</span>
                    </div>

                    <div className="flex items-center gap-4">

                        <div className="relative group hidden lg:block">
                            <Search className="absolute left-3 top-2.5 text-gray-600 w-4 h-4 group-focus-within:text-purple-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Quick Search..."
                                className="bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none w-64 transition-all"
                            />
                        </div>

                        <div className="h-8 w-px bg-white/5 mx-2" />

                        <NotificationBell align="right" />

                        <div className="flex items-center gap-3 pl-2">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 p-[1px] shadow-lg shadow-purple-500/10">
                                <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
                                    {user?.user_metadata?.avatar_url ? (
                                        <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs font-bold text-white">
                                            {user?.email?.[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="hidden lg:block">
                                <p className="text-sm font-bold text-white leading-tight">Admin User</p>
                                <p className="text-[10px] text-purple-400 font-mono">SUPER_ADMIN</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 relative scroll-smooth">
                    <div className="max-w-7xl mx-auto pb-10">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
