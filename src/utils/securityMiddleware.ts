

const SESSION_TIMEOUT = 30 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

let lastActivity = Date.now();
let timeoutWarningShown = false;
let middlewareInitialized = false;
let sessionCheckIntervalId: number | null = null;

export function initSecurityMiddleware() {
    if (middlewareInitialized) return;
    middlewareInitialized = true;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    activityEvents.forEach(event => {
        document.addEventListener(event, () => {
            lastActivity = Date.now();
            timeoutWarningShown = false;
        }, { passive: true });
    });

    preventClickjacking();

    if (import.meta.env.PROD) {
        disableRightClickOnSensitiveElements();
    }

    window.addEventListener('beforeunload', clearSensitiveData);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkSessionTimeout();
        }
    });

    detectXSSInURL();
    startSessionTimeoutMonitor();

    enforceSecureCookies();
    protectGlobalState();
}

function protectGlobalState() {
    const forbiddenKeys = ['__ZUSTAND_STORE__', 'store', 'state', 'auth_token', 'session'];
    
    if (import.meta.env.PROD) {
        forbiddenKeys.forEach(key => {
            if ((window as any)[key]) {
                console.warn(`Security Warning: Potential sensitive global key "${key}" detected. Clearing it.`);
                delete (window as any)[key];
            }
            
            Object.defineProperty(window, key, {
                set: () => {
                    console.error(`Security Error: Assignment to global "${key}" is blocked in production.`);
                },
                get: () => undefined,
                configurable: true
            });
        });
    }
}

function startSessionTimeoutMonitor() {
    if (sessionCheckIntervalId !== null) return;
    sessionCheckIntervalId = window.setInterval(checkSessionTimeout, SESSION_CHECK_INTERVAL_MS);
}

function checkSessionTimeout() {
    const timeSinceActivity = Date.now() - lastActivity;

    if (timeSinceActivity > SESSION_TIMEOUT) {
        handleSessionTimeout();
    } else if (timeSinceActivity > SESSION_TIMEOUT - 5 * 60 * 1000 && !timeoutWarningShown) {

        warnSessionTimeout();
        timeoutWarningShown = true;
    }
}

function handleSessionTimeout() {

    const currentPath = window.location.pathname;
    if (currentPath !== '/signin' && currentPath !== '/signup') {
        clearSensitiveData();
        sessionStorage.setItem('session_timeout', 'true');
        window.location.href = '/signin';
    }
}

function warnSessionTimeout() {
    console.warn('Session will expire in 5 minutes due to inactivity');

    window.dispatchEvent(new CustomEvent('session-timeout-warning'));
}

function preventClickjacking() {
    if (window.self !== window.top) {
        console.warn('Clickjacking attempt detected - running in iframe');
        try {
            if (window.top) {
                window.top.location.href = window.location.href;
            }
        } catch {
            window.location.replace('/signin');
        }
    }
}

function disableRightClickOnSensitiveElements() {
    document.addEventListener('contextmenu', (e) => {
        const target = e.target as HTMLElement;

        if (target.tagName === 'IMG' ||
            target.closest('[data-sensitive="true"]')) {
            e.preventDefault();
        }
    });
}

function clearSensitiveData() {

    try {
        sessionStorage.removeItem('temp_token');
        sessionStorage.removeItem('api_cache');
    } catch (e) {
        console.error('Failed to clear session data');
    }
}

function detectXSSInURL() {
    const url = window.location.href;
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\(/i,
        /<iframe/i
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
            console.error('Potential XSS attempt detected in URL');
            window.history.replaceState({}, document.title, window.location.pathname);
            break;
        }
    }
}

function enforceSecureCookies() {

    if (import.meta.env.DEV) {
        console.info('Security: Ensure cookies use Secure, HttpOnly, and SameSite attributes');
    }
}

export function sanitizeBeforeSubmit(input: string): string {
    if (!input) return '';

    let sanitized = input.replace(/\0/g, '');

    sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    return sanitized.trim();
}

export function validateNavigationURL(url: string): boolean {
    try {
        const urlObj = new URL(url, window.location.origin);

        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            console.error('Invalid protocol detected:', urlObj.protocol);
            return false;
        }

        if (urlObj.href.includes('javascript:') ||
            urlObj.href.includes('data:') ||
            urlObj.href.includes('<script')) {
            console.error('Suspicious URL pattern detected');
            return false;
        }

        if (urlObj.origin !== window.location.origin) {
            console.error('Cross-origin navigation blocked');
            return false;
        }

        if (urlObj.username || urlObj.password) {
            console.error('Credentialed URL blocked');
            return false;
        }

        return true;
    } catch (e) {
        console.error('Invalid URL');
        return false;
    }
}

export function monitorSuspiciousActivity() {

    let formSubmissionCount = 0;
    let lastSubmissionTime = Date.now();

    return function onFormSubmit() {
        const now = Date.now();
        const timeDiff = now - lastSubmissionTime;

        if (timeDiff < 1000) {
            formSubmissionCount++;

            if (formSubmissionCount > 3) {
                console.error('Suspicious activity: Rapid form submissions detected');
                return false;
            }
        } else {
            formSubmissionCount = 0;
        }

        lastSubmissionTime = now;
        return true;
    };
}

export function generateCSRFToken(): string {
    const token = crypto.randomUUID();
    sessionStorage.setItem('csrf_token', token);
    return token;
}

export function validateCSRFToken(token: string): boolean {
    const storedToken = sessionStorage.getItem('csrf_token');
    return token === storedToken;
}

export function securityLog(event: string, details?: Record<string, any>) {
    if (import.meta.env.DEV) {
        console.info(`[Security] ${event}`, details);
    }

}
