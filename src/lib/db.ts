
import { get, set, del } from 'idb-keyval';

const CACHE_PREFIX = 'thecohort:v1:';
const MAX_KEY_LENGTH = 120;
const MAX_CACHE_ITEM_BYTES = 250_000;

const toScopedKey = (key: string) => {
    const normalizedKey = key?.trim();
    if (!normalizedKey) {
        throw new Error('Cache key is required.');
    }

    if (normalizedKey.length > MAX_KEY_LENGTH) {
        throw new Error(`Cache key exceeds ${MAX_KEY_LENGTH} characters.`);
    }

    if (!/^[a-z0-9:_-]+$/i.test(normalizedKey)) {
        throw new Error('Cache key contains invalid characters.');
    }

    return `${CACHE_PREFIX}${normalizedKey}`;
};

const estimatePayloadBytes = (value: unknown) => {
    try {
        const serialized = JSON.stringify(value);
        return serialized ? new Blob([serialized]).size : 0;
    } catch {
        return Number.POSITIVE_INFINITY;
    }
};

export const CACHE_KEYS = {
    COURSE_CONTENT: (subjectId: string) => `course-content-${subjectId}`,
    USER_PROFILE: (userId: string) => `user-profile-${userId}`,
    LESSON_CONTENT: (lessonId: string) => `lesson-content-${lessonId}`,
};

export const db = {
    async get<T>(key: string): Promise<T | undefined> {
        return await get<T>(toScopedKey(key));
    },

    async set<T>(key: string, value: T): Promise<void> {
        const bytes = estimatePayloadBytes(value);
        if (bytes > MAX_CACHE_ITEM_BYTES) {
            throw new Error(`Cache payload too large (${bytes} bytes).`);
        }

        return await set(toScopedKey(key), value);
    },

    async delete(key: string): Promise<void> {
        return await del(toScopedKey(key));
    }
};
