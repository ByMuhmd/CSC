import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useActivityTracker() {
    const { user, profile, guest } = useAuth();
    const lastUpdate = useRef<number>(0);

    useEffect(() => {
        if (!user && !guest) return;

        const updateActivity = async () => {
            const now = Date.now();
            if (now - lastUpdate.current < 60000) return;
            
            try {
                const userId = user?.id || guest?.id;
                const table = user ? 'profiles' : 'guest_scores';
                
                if (!userId) return;

                const { error } = await supabase
                    .from(table)
                    .update({ 
                        last_login_date: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (!error) {
                    lastUpdate.current = now;
                }
            } catch (err) {
                console.warn("Activity heartbeat failed:", err);
            }
        };

        updateActivity();

        const interval = setInterval(updateActivity, 60000);
        return () => clearInterval(interval);
    }, [user?.id, guest?.id]);
}
