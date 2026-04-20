
import { createClient } from '@supabase/supabase-js';

const assertEnv = (name: string, value?: string) => {
    const normalized = value?.trim();
    if (!normalized) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return normalized;
};

const validateSupabaseUrl = (rawUrl: string) => {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error('Invalid VITE_SUPABASE_URL format.');
    }

    const isHttpsSupabaseHost = parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
    const isLocalDev = import.meta.env.DEV && parsed.protocol === 'http:' && parsed.hostname === 'localhost';

    if (!isHttpsSupabaseHost && !isLocalDev) {
        throw new Error('Invalid VITE_SUPABASE_URL. Use your HTTPS Supabase project URL.');
    }

    return parsed.toString().replace(/\/$/, '');
};

const validateAnonKey = (key: string) => {
    if (key.length < 80 || key.split('.').length !== 3) {
        throw new Error('Invalid VITE_SUPABASE_ANON_KEY format.');
    }

    try {
        const payload = JSON.parse(atob(key.split('.')[1]));
        if (payload.role === 'service_role') {
            throw new Error('CRITICAL SECURITY ERROR: SERVICE_ROLE_KEY detected in client-side code! This key provides full database access and must never be exposed to the browser. Use the ANON_KEY instead.');
        }
        if (payload.role !== 'anon') {
            console.warn('Warning: Supabase key role is not "anon". Current role:', payload.role);
        }
    } catch (e: any) {
        if (e.message.includes('CRITICAL SECURITY ERROR')) throw e;
        console.warn('Could not verify Supabase key role:', e.message);
    }

    return key;
};

const supabaseUrl = validateSupabaseUrl(assertEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL));
const supabaseAnonKey = validateAnonKey(assertEnv('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY));

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    }
});
