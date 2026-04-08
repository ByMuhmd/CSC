

export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

const DISPOSABLE_EMAIL_PATTERNS = [
    /mailinator/i,
    /tempmail/i,
    /10minutemail/i,
    /yopmail/i,
    /guerrillamail/i,
    /trashmail/i,
    /dispostable/i,
    /fakeinbox/i,
    /mintemail/i,
    /getnada/i,
    /moakt/i,
    /maildrop/i,
    /mailnesia/i,
    /emailondeck/i,
    /sharklasers/i,
    /throwawaymail/i,
    /mytemp/i,
    /tmail/i
];

export function isDisposableEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const normalized = email.trim().toLowerCase();
    const domain = normalized.split('@')[1] || '';

    return DISPOSABLE_EMAIL_PATTERNS.some(pattern => pattern.test(normalized) || pattern.test(domain));
}

const COMMON_PASSWORDS = new Set([
    'password', 'password123', '12345678', '123456789', 'qwerty123', 'letmein123',
    'welcome123', 'admin123', 'iloveyou', 'abc12345', 'qwertyuiop', '123qweasdzxc'
]);

export function getPasswordPolicyIssues(password: string, email?: string, fullName?: string): string[] {
    const issues: string[] = [];
    const normalizedPassword = String(password || '');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const emailLocalPart = normalizedEmail.split('@')[0] || '';
    const nameTokens = String(fullName || '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map(token => token.replace(/[^a-z0-9]/g, ''));

    if (normalizedPassword.length < 12) {
        issues.push('Password must be at least 12 characters long.');
    }

    if (!/[a-z]/.test(normalizedPassword)) issues.push('Password must include a lowercase letter.');
    if (!/[A-Z]/.test(normalizedPassword)) issues.push('Password must include an uppercase letter.');
    if (!/[0-9]/.test(normalizedPassword)) issues.push('Password must include a number.');
    if (!/[^A-Za-z0-9]/.test(normalizedPassword)) issues.push('Password must include a special character.');

    if (COMMON_PASSWORDS.has(normalizedPassword.toLowerCase())) {
        issues.push('Password is too common.');
    }

    if (emailLocalPart && normalizedPassword.toLowerCase().includes(emailLocalPart)) {
        issues.push('Password should not contain your email name.');
    }

    if (nameTokens.some(token => token && normalizedPassword.toLowerCase().includes(token))) {
        issues.push('Password should not contain your name.');
    }

    return issues;
}

export function isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone.trim()) && phone.replace(/\D/g, '').length >= 7;
}

export function sanitizeString(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input.trim().slice(0, maxLength);

    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
}

export function sanitizeNumber(
    value: any,
    min: number = 0,
    max: number = Number.MAX_SAFE_INTEGER
): number {
    const num = Number(value);

    if (isNaN(num) || !isFinite(num)) {
        return min;
    }

    return Math.max(min, Math.min(max, Math.floor(num)));
}

export function isPositiveInteger(value: any): boolean {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
}

export function safeJsonParse<T>(jsonString: string, fallback: T): T {
    try {
        const parsed = JSON.parse(jsonString);
        return parsed !== null && typeof parsed === 'object' ? parsed : fallback;
    } catch {
        return fallback;
    }
}

export function isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
        return false;
    }
}

export function containsSuspiciousPatterns(input: string): boolean {
    if (!input || typeof input !== 'string') return false;

    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /expression\s*\(/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
}

function toSafeStorageKey(prefix: string, key: string): string {
    const normalized = String(key || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9:_-]/g, '_')
        .slice(0, 120);
    return `${prefix}${normalized || 'default'}`;
}

export function checkRateLimit(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
): boolean {
    const storageKey = toSafeStorageKey('ratelimit_', key);
    const now = Date.now();

    try {
        const stored = localStorage.getItem(storageKey);
        const data = stored ? JSON.parse(stored) : { count: 0, resetAt: now + windowMs };

        if (now > data.resetAt) {
            data.count = 0;
            data.resetAt = now + windowMs;
        }

        if (data.count >= maxAttempts) {
            return false;
        }

        data.count++;
        localStorage.setItem(storageKey, JSON.stringify(data));

        return true;
    } catch {

        return true;
    }
}

export function getAuthLockoutState(key: string, lockoutMs: number = 15 * 60 * 1000) {
    void lockoutMs;
    const storageKey = toSafeStorageKey('auth_lockout_', key);

    try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return { locked: false, remainingMs: 0 };

        const parsed = JSON.parse(stored);
        if (!parsed?.lockedUntil) return { locked: false, remainingMs: 0 };

        const remainingMs = Math.max(0, parsed.lockedUntil - Date.now());
        if (remainingMs <= 0) {
            localStorage.removeItem(storageKey);
            return { locked: false, remainingMs: 0 };
        }

        return { locked: true, remainingMs };
    } catch {
        return { locked: false, remainingMs: 0 };
    }
}

export function recordAuthFailure(key: string, maxFailures: number = 5, lockoutMs: number = 15 * 60 * 1000) {
    const storageKey = toSafeStorageKey('auth_failures_', key);
    const lockoutKey = toSafeStorageKey('auth_lockout_', key);
    const now = Date.now();

    try {
        const stored = localStorage.getItem(storageKey);
        const data = stored ? JSON.parse(stored) : { count: 0, resetAt: now + lockoutMs };

        if (now > data.resetAt) {
            data.count = 0;
            data.resetAt = now + lockoutMs;
        }

        data.count += 1;

        if (data.count >= maxFailures) {
            localStorage.setItem(lockoutKey, JSON.stringify({ lockedUntil: now + lockoutMs }));
            localStorage.removeItem(storageKey);
            return { locked: true, remainingMs: lockoutMs };
        }

        localStorage.setItem(storageKey, JSON.stringify(data));
        return { locked: false, remainingMs: 0 };
    } catch {
        return { locked: false, remainingMs: 0 };
    }
}

export function clearAuthFailures(key: string) {
    localStorage.removeItem(toSafeStorageKey('auth_failures_', key));
    localStorage.removeItem(toSafeStorageKey('auth_lockout_', key));
}

export function getDeviceFingerprint(): string {
    const parts = [
        navigator.userAgent,
        navigator.platform,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        `${window.screen.width}x${window.screen.height}`,
        `${window.devicePixelRatio}`
    ];

    const input = parts.join('|');
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

export async function fetchPublicIp(): Promise<string | null> {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalHost) {
        return null;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            cache: 'no-store',
            signal: controller.signal
        });
        if (!response.ok) return null;
        const data = await response.json();
        return typeof data?.ip === 'string' ? data.ip : null;
    } catch {
        return null;
    } finally {
        window.clearTimeout(timeout);
    }
}

export async function recordAccessContext(userId: string) {
    const fingerprint = getDeviceFingerprint();
    const ipAddress = await fetchPublicIp();
    const storageKey = `security_context_${userId}`;

    try {
        const stored = localStorage.getItem(storageKey);
        const previous = stored ? JSON.parse(stored) : null;
        const current = {
            fingerprint,
            ipAddress,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(storageKey, JSON.stringify(current));

        if (!previous) {
            return { suspicious: false, reason: null as string | null };
        }

        const fingerprintChanged = previous.fingerprint && previous.fingerprint !== fingerprint;
        const ipChanged = previous.ipAddress && ipAddress && previous.ipAddress !== ipAddress;

        if (fingerprintChanged || ipChanged) {
            return {
                suspicious: true,
                reason: fingerprintChanged && ipChanged
                    ? 'We detected a new device and a new IP address.'
                    : fingerprintChanged
                        ? 'We detected a new device.'
                        : 'We detected a new IP address.'
            };
        }

        return { suspicious: false, reason: null as string | null };
    } catch {
        return { suspicious: false, reason: null as string | null };
    }
}

export function generateSecureToken(length: number = 32): string {
    const safeLength = sanitizeNumber(length, 16, 128);
    const array = new Uint8Array(safeLength);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
