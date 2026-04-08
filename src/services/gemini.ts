
import { supabase } from '../lib/supabase';

export interface GeminiResponse {
    explanation: string;
    error?: string;
}

const MODELS = [
    'gemma-3-27b-it',
];

const LIMITS = {
    shortText: 500,
    mediumText: 2500,
    longText: 10000,
    chatHistoryItems: 12,
    quizCountMin: 1,
    quizCountMax: 20,
};

const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function sanitizeInputText(value: string | undefined | null, maxLength: number): string {
    if (!value) return '';
    return value
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function getPublicErrorMessage(_error: unknown, fallback: string): string {
    return fallback;
}

function normalizeGeneratedQuestions(raw: any): GeneratedQuestion[] {
    if (!Array.isArray(raw)) return [];

    return raw
        .map((q: any): GeneratedQuestion | null => {
            const question = sanitizeInputText(String(q?.question || ''), LIMITS.mediumText);
            const type = q?.type === 'essay' ? 'essay' : 'mcq';
            const answer = sanitizeInputText(String(q?.answer || ''), LIMITS.mediumText);

            if (!question || !answer) return null;

            const options = type === 'mcq' && Array.isArray(q?.options)
                ? q.options.map((o: any) => sanitizeInputText(String(o || ''), LIMITS.shortText)).filter(Boolean).slice(0, 4)
                : undefined;

            if (type === 'mcq' && (!options || options.length < 2)) return null;

            return {
                question,
                type,
                options,
                answer,
                isValid: true
            };
        })
        .filter((q): q is GeneratedQuestion => !!q);
}

async function fetchWithFallback(apiKey: string, body: any): Promise<any> {
    void apiKey;
    const errors: string[] = [];
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';

    for (const model of MODELS) {
        try {
            console.log(`Attempting to use AI model: ${model}`);
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({
                    body
                })
            });

            if (response.ok) {
                console.log(`Success with model: ${model}`);
                return await response.json();
            }

            const errorData = await response.json().catch(() => ({}));
            const msg = `Model ${model} failed (${response.status}): ${errorData.details || errorData.error || 'Unknown error'}`;
            console.warn(msg);
            errors.push(msg);
        } catch (error) {
            const msg = `Model ${model} network error: ${error instanceof Error ? error.message : "Unknown"}`;
            console.warn(msg);
            errors.push(msg);
        }
    }

    console.warn('AI generation failed across models:', errors[0] || 'Unknown');
    throw new Error('AI service is temporarily unavailable.');
}

export const generateExplanation = async (
    apiKey: string,
    question: string,
    options: string[],
    correctAnswer: string,
    userAnswer: string | undefined
): Promise<GeminiResponse> => {
    const safeQuestion = sanitizeInputText(question, LIMITS.mediumText);
    const safeOptions = (Array.isArray(options) ? options : [])
        .map(opt => sanitizeInputText(String(opt), LIMITS.shortText))
        .filter(Boolean)
        .slice(0, 8);
    const safeCorrectAnswer = sanitizeInputText(correctAnswer, LIMITS.shortText);
    const safeUserAnswer = sanitizeInputText(userAnswer, LIMITS.shortText);

    if (!safeQuestion || !safeCorrectAnswer) {
        return { explanation: '', error: 'Missing required question data.' };
    }

    const prompt = `
You are a helpful computer science tutor.
Question: "${safeQuestion}"
Options: ${JSON.stringify(safeOptions)}
Correct Answer: "${safeCorrectAnswer}"
User Answer: "${safeUserAnswer || "No answer provided"}"

Please provide a concise explanation (max 3-4 sentences) STRICTLY in Egyptian Arabic (Masri).
- ABSOLUTELY NO ENGLISH TEXT.
- Do NOT use phrases like "Okay, let’s break this down".
- Do NOT translate technical terms if they are commonly used in English, but write them in Arabic script if possible or keep them minimal.
- Structure your answer clearly.
- Explain why the correct answer is correct.
- If the user answered incorrectly, briefly explain why their answer was wrong.
    `.trim();

    try {
        const data = await fetchWithFallback(apiKey, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        });

        const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!explanation) {
            return { explanation: "", error: "No explanation generated." };
        }

        return { explanation: sanitizeInputText(explanation, LIMITS.mediumText) };
    } catch (error) {
        return { explanation: '', error: getPublicErrorMessage(error, 'Failed to generate explanation right now.') };
    }
};

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const chatWithGemini = async (
    apiKey: string,
    history: ChatMessage[],
    message: string
): Promise<{ text: string; error?: string }> => {
    const boundedHistory = (Array.isArray(history) ? history : [])
        .slice(-LIMITS.chatHistoryItems)
        .map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            text: sanitizeInputText(msg.text, LIMITS.mediumText)
        }))
        .filter(msg => !!msg.text);

    const safeMessage = sanitizeInputText(message, LIMITS.mediumText);
    if (!safeMessage) return { text: '', error: 'Message cannot be empty.' };

    const contents = boundedHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    contents.push({
        role: 'user',
        parts: [{ text: safeMessage }]
    });

    const systemInstruction = {
        role: 'user' as const,
        parts: [{ text: "You are a helpful assistant. Answer STRICTLY in Egyptian Arabic (Masri). ABSOLUTELY NO ENGLISH TEXT allowed in the response. Do NOT provide English translations. Structure your answer clearly using Markdown." }]
    };

    let finalContents = contents;
    if (boundedHistory.length === 0) {
        finalContents = [systemInstruction, ...contents];
    }

    try {
        const data = await fetchWithFallback(apiKey, {
            contents: finalContents
        });

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return { text: "", error: "No response generated." };
        }

        return { text: sanitizeInputText(text, LIMITS.longText) };
    } catch (error) {
        return { text: '', error: getPublicErrorMessage(error, 'AI chat is unavailable right now.') };
    }
};

export interface EssayEvaluation {
    correct: boolean;
    feedback: string;
    error?: string;
}

export const evaluateEssay = async (
    apiKey: string,
    question: string,
    modelAnswer: string,
    userAnswer: string
): Promise<EssayEvaluation> => {
    const safeQuestion = sanitizeInputText(question, LIMITS.mediumText);
    const safeModelAnswer = sanitizeInputText(modelAnswer, LIMITS.longText);
    const safeUserAnswer = sanitizeInputText(userAnswer, LIMITS.longText);

    if (!safeQuestion || !safeModelAnswer || !safeUserAnswer) {
        return { correct: false, feedback: 'Invalid essay input.', error: 'Invalid essay input.' };
    }

    const prompt = `
You are a fair computer science professor grading an exam.
Question: ${JSON.stringify(safeQuestion)}
Model Answer: ${JSON.stringify(safeModelAnswer)}
Student Answer: ${JSON.stringify(safeUserAnswer)}

Compare the student's answer to the model answer.
1. Determine if the student's answer is essentially correct (captures the core concept).
2. Formulate feedback STRICTLY in Egyptian Arabic (Masri):
   - ABSOLUTELY NO ENGLISH TEXT.
   - **IF CORRECT**: The feedback MUST be very short (e.g., "إجابة صحيحة", "تمام", "الله ينور"). Do NOT provide an explanation.
   - **IF WRONG**: Explain clearly why it is wrong and what is the correct answer.
3. Return the result as a STRICT JSON object:
{
  "correct": boolean,
  "feedback": "string"
}
Output ONLY the JSON. No other text.
`.trim();

    try {
        const data = await fetchWithFallback(apiKey, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        });

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return { correct: false, feedback: "No response generated from AI.", error: "No response generated." };
        }

        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;
            const result = JSON.parse(jsonStr);

            return {
                correct: result.correct === true || String(result.correct).toLowerCase() === 'true',
                feedback: sanitizeInputText(String(result.feedback || ''), LIMITS.mediumText) || 'No evaluation feedback generated.'
            };
        } catch (e) {
            console.error("Failed to parse JSON:", text);
            return {
                correct: false,
                feedback: 'Unable to evaluate answer right now. Please try again.',
                error: "Failed to parse AI response."
            };
        }

    } catch (error) {
        return {
            correct: false,
            feedback: 'Unable to evaluate answer right now. Please try again.',
            error: getPublicErrorMessage(error, 'Essay evaluation failed.')
        };
    }
};

export const translateText = async (
    apiKey: string,
    text: string
): Promise<{ translation: string; error?: string }> => {
    const safeText = sanitizeInputText(text, LIMITS.longText);
    if (!safeText) {
        return { translation: '', error: 'Text cannot be empty.' };
    }

    const prompt = `
You are a professional translator.
Translate the following text into Egyptian Arabic (Masri) or clear Arabic suitable for a student.
Text: "${safeText}"

Provide ONLY the translation. ABSOLUTELY NO ENGLISH TEXT. No introductory text.
`.trim();

    try {
        const data = await fetchWithFallback(apiKey, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        });

        const translation = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!translation) {
            return { translation: "", error: "No translation generated." };
        }

        return { translation: sanitizeInputText(translation, LIMITS.longText) };
    } catch (error) {
        return { translation: '', error: getPublicErrorMessage(error, 'Translation failed right now.') };
    }
};

export interface GeneratedQuestion {
    question: string;
    type: 'mcq' | 'essay' | 'true_false';
    options?: string[];
    answer: string;
    isValid: boolean;
}

function tryParseJSON(jsonString: string): any {
    try {
        return JSON.parse(jsonString);
    } catch (e) {

        const repaired = jsonString.replace(/\\(?![/u"bfnrt\\])/g, '\\\\');
        try {
            return JSON.parse(repaired);
        } catch (e2) {
            console.error("Failed to parse JSON even after repair attempt:", e2);
            console.error("Original:", jsonString);
            console.error("Repaired:", repaired);
            throw e;
        }
    }
}

export const generateQuizFromTopic = async (
    apiKey: string,
    topic: string,
    count: number = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<{ questions: GeneratedQuestion[]; error?: string }> => {
    const safeTopic = sanitizeInputText(topic, LIMITS.shortText);
    const safeDifficulty = ALLOWED_DIFFICULTIES.has(difficulty) ? difficulty : 'medium';
    const safeCount = Math.min(LIMITS.quizCountMax, Math.max(LIMITS.quizCountMin, Math.floor(count || LIMITS.quizCountMin)));

    if (!safeTopic) {
        return { questions: [], error: 'Topic is required.' };
    }

    const prompt = `
You are an expert exam creator.
Create a quiz about "${safeTopic}".
Difficulty: ${safeDifficulty}.
Count: ${safeCount} questions.

Rules:
- For MCQ, provide exactly 4 options.
- Identify math expressions and format them using LaTeX wrapped in '$' (inline) or '$$' (block).
- IMPORTANT: You are outputting a JSON string. You MUST double-escape all backslashes used in LaTeX or other contexts. For example, write "\\\\frac" instead of "\\frac", and "\\\\alpha" instead of "\\alpha".
- Output strictly as a JSON array of objects.
- Do NOT wrap in markdown code blocks like \`\`\`json. Just raw JSON.

Schema:
[
  {
    "question": "Question text here?",
    "type": "mcq" | "essay",
    "options": ["Option A", "Option B", "Option C", "Option D"] (only for mcq),
    "answer": "Correct Option Text" (must match one of the options exactly) OR "Model answer text" (for essay)
  }
]
`.trim();

    try {
        const data = await fetchWithFallback(apiKey, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("No response from AI");

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/```json|```/g, '').trim();

        const rawQuestions = tryParseJSON(jsonStr);
        const questions = normalizeGeneratedQuestions(rawQuestions);

        return { questions };

    } catch (error: any) {
        console.error("AI Generation Failed:", error);
        return { questions: [], error: getPublicErrorMessage(error, 'Quiz generation failed right now.') };
    }
};

export const parseQuizFromText = async (
    apiKey: string,
    rawText: string
): Promise<{ questions: GeneratedQuestion[]; error?: string }> => {
    const safeRawText = sanitizeInputText(rawText, LIMITS.longText);
    if (!safeRawText) {
        return { questions: [], error: 'Input text is empty.' };
    }

    const prompt = `
You are a data extraction specialist.
I have pasted some raw text that contains exam questions. 
Please parse it into a structured JSON format.

Raw Text:
"""
${safeRawText.substring(0, LIMITS.longText)}
"""

Rules:
- Extract as many valid questions as possible.
- Identify type (MCQ or Essay).
- If MCQ, try to find 4 options. If answer is not marked, make an educated guess but prefer extracted answer key.
- Identify math expressions and format them using LaTeX wrapped in '$' (inline) or '$$' (block).
- IMPORTANT: You are outputting a JSON string. You MUST double-escape all backslashes used in LaTeX or other contexts. For example, write "\\\\frac" instead of "\\frac", and "\\\\alpha" instead of "\\alpha".
- Output strictly as a JSON array of objects.
- Do NOT wrap in markdown code blocks.

Schema:
[
  {
    "question": "Question text?",
    "type": "mcq" | "essay",
    "options": ["A", "B", "C", "D"],
    "answer": "Correct Answer"
  }
]
`.trim();

    try {
        const data = await fetchWithFallback(apiKey, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("No response from AI");

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/```json|```/g, '').trim();

        const rawQuestions = tryParseJSON(jsonStr);
        const questions = normalizeGeneratedQuestions(rawQuestions);

        return { questions };

    } catch (error: any) {
        console.error("Smart Paste Failed:", error);
        return { questions: [], error: getPublicErrorMessage(error, 'Failed to parse quiz text right now.') };
    }
};
