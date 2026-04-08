export interface NotificationTargetContext {
    profileId?: string | null;
    profileRole?: string | null;
    guestId?: string | null;
    hasProfile?: boolean;
    hasGuest?: boolean;
    academicYear?: string | null;
}

export const shouldDeliverNotification = (
    targetAudience: string | null | undefined,
    context: NotificationTargetContext
) => {
    if (!targetAudience) return false;

    if (targetAudience.startsWith('year:')) {
        const targetYear = targetAudience.replace('year:', '').trim();
        return !!context.academicYear && String(context.academicYear) === targetYear;
    }

    if (targetAudience === 'all') return true;
    if (targetAudience === 'user') return !!context.hasProfile;
    if (targetAudience === 'guest') return !!context.hasGuest;
    if (context.profileRole && targetAudience === context.profileRole) return true;
    if (context.profileId && targetAudience === context.profileId) return true;
    if (context.guestId && targetAudience === context.guestId) return true;

    return false;
};
