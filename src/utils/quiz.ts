export interface NormalizedQuizQuestion {
    id: string;
    category: string;
    type: string;
    question: string;
    options: string[];
    answer: string | null;
    modelAnswer: string | null;
    image: string | null;
    order: number;
}

const LETTER_TO_INDEX: Record<string, number> = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    e: 4,
    f: 5,
};

const sanitizeText = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
};

export const normalizeQuestionOptions = (rawOptions: unknown): string[] => {
    if (Array.isArray(rawOptions)) {
        return rawOptions
            .map(option => sanitizeText(option))
            .filter(Boolean);
    }

    if (typeof rawOptions === 'string') {
        const trimmed = rawOptions.trim();
        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map(option => sanitizeText(option))
                    .filter(Boolean);
            }
        } catch {
        }

        return trimmed
            .split(/[\n;|]/)
            .map(option => option.trim())
            .filter(Boolean);
    }

    return [];
};

export const normalizeCorrectAnswer = (rawQuestion: any, options: string[]): string | null => {
    const rawAnswer = rawQuestion?.answer ?? rawQuestion?.correct_answer ?? rawQuestion?.correctAnswer ?? null;

    if (rawAnswer === null || rawAnswer === undefined) {
        return null;
    }

    if (typeof rawAnswer === 'number' && options[rawAnswer] !== undefined) {
        return options[rawAnswer];
    }

    const answerText = sanitizeText(rawAnswer);
    if (!answerText) return null;

    const numericIndex = Number(answerText);
    if (!Number.isNaN(numericIndex) && options[numericIndex] !== undefined) {
        return options[numericIndex];
    }

    const letterIndex = LETTER_TO_INDEX[answerText.toLowerCase()];
    if (letterIndex !== undefined && options[letterIndex] !== undefined) {
        return options[letterIndex];
    }

    const matchedOption = options.find(
        option => option.trim().toLowerCase() === answerText.trim().toLowerCase()
    );

    return matchedOption || answerText;
};

export const normalizeQuizQuestion = (rawQuestion: any, category: string): NormalizedQuizQuestion | null => {
    const questionText = sanitizeText(rawQuestion?.question ?? rawQuestion?.text);
    if (!questionText) return null;

    const normalizedType = sanitizeText(rawQuestion?.type || 'mcq').toLowerCase() || 'mcq';
    const options = normalizedType === 'essay' ? [] : normalizeQuestionOptions(rawQuestion?.options);
    const answer = normalizedType === 'essay' ? null : normalizeCorrectAnswer(rawQuestion, options);

    return {
        id: sanitizeText(rawQuestion?.id) || `${category}-${questionText}`,
        category,
        type: normalizedType,
        question: questionText,
        options,
        answer,
        modelAnswer: sanitizeText(rawQuestion?.model_answer ?? rawQuestion?.modelAnswer) || null,
        image: sanitizeText(rawQuestion?.image_url ?? rawQuestion?.image) || null,
        order: typeof rawQuestion?.order === 'number' ? rawQuestion.order : 0,
    };
};
