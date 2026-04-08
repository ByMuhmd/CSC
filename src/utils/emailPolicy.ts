const ALLOWED_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com'
]);

const EDUCATIONAL_DOMAIN_PATTERNS = [
    /(^|\.)edu$/i,
    /(^|\.)edu\.[a-z]{2,}($|\.)/i,
    /(^|\.)ac\.[a-z]{2,}($|\.)/i
];

export const isAllowedEmailDomain = (email: string): boolean => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const atIndex = normalizedEmail.lastIndexOf('@');

    if (atIndex <= 0 || atIndex === normalizedEmail.length - 1) {
        return false;
    }

    const domain = normalizedEmail.slice(atIndex + 1);

    if (ALLOWED_EMAIL_DOMAINS.has(domain)) {
        return true;
    }

    return EDUCATIONAL_DOMAIN_PATTERNS.some(pattern => pattern.test(domain));
};

export const EMAIL_DOMAIN_POLICY_MESSAGE = 'Use a valid email from: @gmail.com, @yahoo.com, @outlook.com, @hotmail.com, or an educational domain like .edu, .edu.eg, or .ac.uk.';
