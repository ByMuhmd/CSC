export const normalizeQuizLookupValue = (value: string | null | undefined): string => {
    if (!value) return '';

    return value
        .trim()
        .replace(/^#/, '') 
        .replace(/^.*\/quiz\//i, '') 
        .replace(/[\s#]+/g, '') 
        .trim();
};

export const normalizeQuizAccessCode = (value: string | null | undefined): string => {
    return normalizeQuizLookupValue(value).toUpperCase();
};

