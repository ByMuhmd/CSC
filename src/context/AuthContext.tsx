import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { dataService } from '../services/dataSync';
import { useGamification } from '../hooks/useGamification';
import { recordAccessContext } from '../utils/security';
import { isAllowedEmailDomain } from '../utils/emailPolicy';
import { isDisposableEmail } from '../utils/security';

export interface GuestProfile {
    id: string;
    full_name: string;
    avatar_url: string;
    xp: number;
    level: number;
    academic_level?: string;
    badges: any[];
    is_guest: boolean;
    banned_until?: string | null;
}

export interface UserProfile {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    xp: number;
    level: number;
    total_score: number;
    quizzes_completed: number;
    academic_level: string | null;
    streak: number;
    role: 'super_admin' | 'admin' | 'moderator' | 'user';
    badges?: any[];
    banned_until?: string | null;
    created_at: string;
    updated_at: string | null;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    guest: GuestProfile | null;
    isAnonymous: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
    loginAsGuest: (name: string, avatar: string) => Promise<void>;
    updateGuest: (updates: Partial<GuestProfile>) => void;
    isAdmin: boolean;
    role: string | null;
    permission: {
        canManageTeam: boolean;
        canDelete: boolean;
        canViewLogs: boolean;
    };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [guest, setGuest] = useState<GuestProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const enforceEmailPolicy = async (currentUser: User | null) => {
        const currentEmail = currentUser?.email?.trim().toLowerCase() || '';

        if (!currentEmail) return true;

        if (isDisposableEmail(currentEmail) || !isAllowedEmailDomain(currentEmail)) {
            sessionStorage.setItem('auth_email_blocked', JSON.stringify({
                email: currentEmail,
                reason: 'Email domain is not allowed on this platform.'
            }));

            await supabase.auth.signOut({ scope: 'global' });
            setSession(null);
            setUser(null);
            setProfile(null);
            useGamification.getState().setUserId(null);
            return false;
        }

        return true;
    };

    const isAnonymousUser = (currentUser: User | null) => {
        if (!currentUser) return false;
        const candidate = currentUser as any;
        return candidate?.is_anonymous === true || currentUser.app_metadata?.provider === 'anonymous';
    };

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                setProfile(data as UserProfile);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
        }
    };

    const syncUserProfile = async (currentUser: User) => {
        try {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            const metadata = currentUser.user_metadata;
            const updates: any = {};

            if (!profileData?.username) {
                let baseName = metadata.full_name || currentUser.email?.split('@')[0] || 'User';
                let cleanName = baseName.replace(/[^a-zA-Z0-9]/g, '');

                if (cleanName.length < 3) {
                    cleanName = (cleanName + '123').slice(0, Math.max(3, cleanName.length + 3));
                }
                updates.username = cleanName;
            }

            if (!profileData?.full_name && metadata.full_name) updates.full_name = metadata.full_name;
            if (!profileData?.avatar_url && metadata.avatar_url) updates.avatar_url = metadata.avatar_url;
            if (!profileData?.academic_level && metadata.academic_level) updates.academic_level = String(metadata.academic_level);
            if (!profileData?.email && currentUser.email) updates.email = currentUser.email;

            updates.last_login_date = new Date().toISOString();
            updates.updated_at = new Date().toISOString();

            if (Object.keys(updates).length > 0) {
                await supabase.from('profiles').upsert({ id: currentUser.id, ...updates }, { onConflict: 'id' });
                fetchProfile(currentUser.id);
            } else if (profileData) {
                setProfile(profileData as UserProfile);
            } else {
                await supabase.from('profiles').upsert({ 
                    id: currentUser.id, 
                    email: currentUser.email,
                    username: currentUser.email?.split('@')[0] || 'User',
                    full_name: metadata.full_name || null,
                    avatar_url: metadata.avatar_url || null,
                    academic_level: metadata.academic_level ? String(metadata.academic_level) : null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
                fetchProfile(currentUser.id);
            }
        } catch (err) {
            console.error("Profile sync error:", err);
        }
    };

    const checkGuest = () => {
        const stored = localStorage.getItem('guest_profile');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object' && parsed.id && parsed.full_name) {
                    setGuest({
                        id: String(parsed.id),
                        full_name: String(parsed.full_name).slice(0, 100),
                        avatar_url: String(parsed.avatar_url),
                        xp: typeof parsed.xp === 'number' ? Math.max(0, parsed.xp) : 0,
                        level: typeof parsed.level === 'number' ? Math.max(1, parsed.level) : 1,
                        academic_level: parsed.academic_level ? String(parsed.academic_level) : '1',
                        badges: Array.isArray(parsed.badges) ? parsed.badges : [],
                        is_guest: true,
                        banned_until: parsed.banned_until || null
                    });
                    
                    supabase.from('guest_scores').update({ updated_at: new Date().toISOString() }).eq('id', parsed.id).then(({ error }) => {
                        if (error) console.error("Failed to mark guest active:", error);
                    });
                }
            } catch (e) {
                console.error("Failed to parse guest profile");
                localStorage.removeItem('guest_profile');
            }
        }
    };

    useEffect(() => {
        checkGuest();

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                enforceEmailPolicy(session.user).then((allowed) => {
                    if (!allowed) {
                        setLoading(false);
                        return;
                    }

                    setGuest(null);
                    localStorage.removeItem('guest_profile');
                    dataService.syncLocalToCloud(session.user.id);
                    syncUserProfile(session.user);
                    useGamification.getState().setUserId(session.user.id);
                    recordAccessContext(session.user.id).then(result => {
                        if (result.suspicious) {
                            sessionStorage.setItem('security_anomaly', JSON.stringify(result));
                        }
                    }).catch(() => undefined);
                    setLoading(false);
                }).catch(() => {
                    setLoading(false);
                });
            } else {
                setProfile(null);
                useGamification.getState().setUserId(null);
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                enforceEmailPolicy(session.user).then((allowed) => {
                    if (!allowed) {
                        setLoading(false);
                        return;
                    }

                    setGuest(null);
                    localStorage.removeItem('guest_profile');
                    dataService.syncLocalToCloud(session.user.id);
                    syncUserProfile(session.user);
                    useGamification.getState().setUserId(session.user.id);
                    recordAccessContext(session.user.id).then(result => {
                        if (result.suspicious) {
                            sessionStorage.setItem('security_anomaly', JSON.stringify(result));
                        }
                    }).catch(() => undefined);
                    setLoading(false);
                }).catch(() => {
                    setLoading(false);
                });
            } else {
                setProfile(null);
                useGamification.getState().setUserId(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut({ scope: 'global' });
        setProfile(null);
    };

    const loginAsGuest = async (name: string, avatar: string) => {
        const sanitizedName = String(name).trim().slice(0, 100);
        const sanitizedAvatar = String(avatar).trim();

        if (!sanitizedName || sanitizedName.length < 1) {
            console.error("Invalid guest name");
            return;
        }

        try {
            const { error } = await supabase.auth.signInAnonymously({
                options: {
                    data: {
                        full_name: sanitizedName,
                        avatar_url: sanitizedAvatar,
                        academic_level: '1',
                        is_guest: true
                    }
                }
            });

            if (error) {
                throw error;
            }

            return;
        } catch (anonymousError) {
            console.error('Anonymous sign-in failed, falling back to local guest mode:', anonymousError);
        }

        const newGuest: GuestProfile = {
            id: crypto.randomUUID(),
            full_name: sanitizedName,
            avatar_url: sanitizedAvatar,
            xp: 0,
            level: 1,
            academic_level: '1',
            badges: [],
            is_guest: true
        };
        localStorage.setItem('guest_profile', JSON.stringify(newGuest));
        setGuest(newGuest);

        supabase.from('guest_scores').upsert({
            id: newGuest.id,
            full_name: newGuest.full_name,
            avatar_url: newGuest.avatar_url,
            xp: 0,
            total_score: 0,
            academic_level: '1',
            updated_at: new Date().toISOString()
        }).then(({ error }) => {
            if (error) console.error("Failed to create guest leaderboard entry");
        });
    };

    const updateGuest = (updates: Partial<GuestProfile>) => {
        setGuest(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...updates };
            localStorage.setItem('guest_profile', JSON.stringify(updated));

            if (updates.academic_level || updates.full_name || updates.avatar_url) {
                supabase.from('guest_scores').update({
                    ...(updates.academic_level && { academic_level: updates.academic_level }),
                    ...(updates.full_name && { full_name: updates.full_name }),
                    ...(updates.avatar_url && { avatar_url: updates.avatar_url }),
                    updated_at: new Date().toISOString()
                }).eq('id', prev.id).then(({ error }) => {
                    if (error) console.error("Failed to sync guest updates");
                });
            }

            return updated;
        });
    };

    const role = profile?.role || 'user';
    const isAdmin = role === 'super_admin' || role === 'admin' || role === 'moderator';
    const isAnonymous = isAnonymousUser(user);

    const permission = {
        canManageTeam: role === 'super_admin',
        canDelete: role === 'super_admin' || role === 'admin',
        canViewLogs: role === 'super_admin' || role === 'admin'
    };

    const value = {
        session,
        user,
        profile,
        guest,
        isAnonymous,
        loading,
        isAdmin,
        role,
        permission,
        signOut,
        loginAsGuest,
        updateGuest
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function useOptionalAuth() {
    return useContext(AuthContext) || null;
}
