import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const MODELS = ['gemma-3-27b-it'];
const MAX_PAYLOAD_CHARS = 120_000;
const MAX_CONTENT_ITEMS = 20;
const UPSTREAM_TIMEOUT_MS = 20_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const bucket = new Map<string, { count: number; resetAt: number }>();

const toErrorMessage = (value: unknown) => {
    if (value instanceof Error) return value.message;
    return String(value || 'Unknown error');
};

const readPayload = (req: VercelRequest) => {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const payload = body?.body;
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid request payload.');
    }

    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_PAYLOAD_CHARS) {
        throw new Error('Payload too large.');
    }

    if (!Array.isArray((payload as any).contents) || (payload as any).contents.length === 0) {
        throw new Error('Gemini contents are required.');
    }

    if ((payload as any).contents.length > MAX_CONTENT_ITEMS) {
        throw new Error('Too many content items.');
    }

    return payload;
};

const getClientIp = (req: VercelRequest) => {
    const fwd = String(req.headers['x-forwarded-for'] || '');
    if (fwd) return fwd.split(',')[0].trim();
    return req.socket?.remoteAddress || 'unknown';
};

const isRateLimited = (key: string) => {
    const now = Date.now();
    const current = bucket.get(key);

    if (!current || now > current.resetAt) {
        bucket.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    current.count += 1;
    bucket.set(key, current);
    return current.count > RATE_LIMIT_MAX_REQUESTS;
};

const normalizeOrigin = (value: string) => {
    try {
        return new URL(value).origin;
    } catch {
        return '';
    }
};

const buildAllowedOrigins = () => {
    const configured = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((item) => normalizeOrigin(item.trim()))
        .filter(Boolean);

    const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
    const list = [
        normalizeOrigin(vercelOrigin),
        normalizeOrigin(process.env.APP_ORIGIN || ''),
        ...configured
    ].filter(Boolean);

    return new Set(list);
};

const isAllowedRequestOrigin = (req: VercelRequest) => {
    const origin = normalizeOrigin(String(req.headers.origin || ''));
    if (!origin) return true;

    const allowed = buildAllowedOrigins();
    if (allowed.size === 0) return true;
    return allowed.has(origin);
};

const shouldRequireAuth = () => {
    const value = String(process.env.GEMINI_REQUIRE_AUTH || 'true').toLowerCase();
    return value !== 'false';
};

const getBearerToken = (req: VercelRequest) => {
    const authHeader = String(req.headers.authorization || '');
    if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
    return authHeader.slice(7).trim() || null;
};

const verifyUserToken = async (token: string) => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase env for auth verification.');
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user?.id) {
        return null;
    }

    return data.user.id;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!isAllowedRequestOrigin(req)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    if (isRateLimited(getClientIp(req))) {
        return res.status(429).json({ error: 'Too Many Requests' });
    }

    if (shouldRequireAuth()) {
        const token = getBearerToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const userId = await verifyUserToken(token);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
        } catch {
            return res.status(500).json({ error: 'Server auth verification failed.' });
        }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Missing GEMINI_API_KEY on server.' });
    }

    let payload: any;
    try {
        payload = readPayload(req);
    } catch (error) {
        return res.status(400).json({ error: toErrorMessage(error) });
    }

    const errors: string[] = [];

    for (const model of MODELS) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
            const upstream = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                }
            );
            clearTimeout(timer);

            if (upstream.ok) {
                const data = await upstream.json();
                return res.status(200).json(data);
            }

            const failure = await upstream.json().catch(() => ({}));
            errors.push(`Model ${model} failed (${upstream.status}): ${failure?.error?.message || 'Unknown error'}`);
        } catch (error) {
            errors.push(`Model ${model} network error: ${toErrorMessage(error)}`);
        }
    }

    return res.status(502).json({
        error: 'AI generation failed on server.',
        details: 'Upstream provider unavailable.'
    });
}
