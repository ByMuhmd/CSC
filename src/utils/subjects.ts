const normalizeSubjectValue = (value: string): string => {
    return value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/differentional/g, 'differential')
        .replace(/stractures/g, 'structures')
        .replace(/stracture/g, 'structure')
        .replace(/mathematics/g, 'maths')
        .replace(/introduction/g, 'intro')
        .replace(/[^a-z0-9]/g, '');
};

const expandSubjectAliases = (value: string): string[] => {
    const normalized = normalizeSubjectValue(value);
    const variants = new Set<string>([normalized]);

    if (normalized.includes('datastructures')) variants.add(normalized.replace('datastructures', 'datastructure'));
    if (normalized.includes('datastructure')) variants.add(normalized.replace('datastructure', 'datastructures'));

    if (normalized.includes('introtocs')) variants.add(normalized.replace('introtocs', 'introcs'));
    if (normalized.includes('introcs')) variants.add(normalized.replace('introcs', 'introtocs'));

    if (normalized.includes('introtois')) variants.add(normalized.replace('introtois', 'introis'));
    if (normalized.includes('introis')) variants.add(normalized.replace('introis', 'introtois'));

    if (normalized.includes('introtoprogramming')) variants.add(normalized.replace('introtoprogramming', 'programming'));
    if (normalized === 'programming') variants.add('introtoprogramming');

    if (normalized.includes('webdevelopment')) variants.add(normalized.replace('webdevelopment', 'webdev'));
    if (normalized.includes('webdev')) variants.add(normalized.replace('webdev', 'webdevelopment'));

    if (normalized.includes('introtodb')) variants.add(normalized.replace('introtodb', 'introdb'));
    if (normalized.includes('introdb')) variants.add(normalized.replace('introdb', 'introtodb'));

    if (normalized.includes('softwaredevelopment')) variants.add(normalized.replace('softwaredevelopment', 'softwareengineering'));
    if (normalized.includes('softwareengineering')) variants.add(normalized.replace('softwareengineering', 'softwaredevelopment'));

    if (normalized.includes('computerarchitecture')) variants.add(normalized.replace('computerarchitecture', 'computerarch'));
    if (normalized.includes('computerarch')) variants.add(normalized.replace('computerarch', 'computerarchitecture'));

    return [...variants];
};

export const subjectMatches = (requested: string, candidateId?: string | null, candidateName?: string | null): boolean => {
    const requestedKeys = expandSubjectAliases(requested);
    const candidateKeys = new Set<string>();

    if (candidateId) {
        expandSubjectAliases(candidateId).forEach(key => candidateKeys.add(key));
    }

    if (candidateName) {
        expandSubjectAliases(candidateName).forEach(key => candidateKeys.add(key));
    }

    return requestedKeys.some(key => candidateKeys.has(key));
};
