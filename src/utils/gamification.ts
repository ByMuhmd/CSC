

export interface Rank {
    id: string;
    label: string;
    minLevel: number;
    color: string;
}

export interface GamificationConfig {
    xpPerQuiz: number;
    xpPerCorrect: number;
    xpPerEssay: number;
    ranks: Rank[];
}

export const DEFAULT_RANKS: Rank[] = [
    { id: '1', label: 'Legend', minLevel: 50, color: 'text-yellow-400' },
    { id: '2', label: 'Grandmaster', minLevel: 30, color: 'text-purple-400' },
    { id: '3', label: 'Master', minLevel: 20, color: 'text-red-400' },
    { id: '4', label: 'Expert', minLevel: 10, color: 'text-blue-400' },
    { id: '5', label: 'Intermediate', minLevel: 5, color: 'text-green-400' },
    { id: '6', label: 'Novice', minLevel: 0, color: 'text-gray-400' }
];

export const XP_PER_QUIZ_COMPLETE = 100;
export const XP_PER_CORRECT_ANSWER = 10;
export const XP_PER_ESSAY_PASS = 50;

export const calculateLevel = (xp: number): number => {
    if (xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const xpForNextLevel = (currentLevel: number): number => {
    return Math.pow(currentLevel, 2) * 100;
};

export const calculateLevelProgress = (xp: number): number => {
    const level = calculateLevel(xp);
    const currentLevelXp = Math.pow(level - 1, 2) * 100;
    const nextLevelXp = Math.pow(level, 2) * 100;

    const xpIntoLevel = xp - currentLevelXp;
    const xpNeededForLevel = nextLevelXp - currentLevelXp;

    return Math.min(100, Math.max(0, (xpIntoLevel / xpNeededForLevel) * 100));
};

export const getRankBadge = (level: number, customRanks?: Rank[]): { label: string; color: string } => {
    const ranks = customRanks && customRanks.length > 0 ? customRanks : DEFAULT_RANKS;

    const sortedRanks = [...ranks].sort((a, b) => b.minLevel - a.minLevel);

    const rank = sortedRanks.find(r => level >= r.minLevel);
    return rank ? { label: rank.label, color: rank.color } : { label: 'Unknown', color: 'text-gray-400' };
};
