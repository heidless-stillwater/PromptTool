
const isGrouped = true;
const isGroupedByUser = false;
const viewMode = 'grid';

const entries = [
    { id: '1', promptSetID: 'batch-A', originalUserId: 'user-1' },
    { id: '2', promptSetID: 'batch-A', originalUserId: 'user-1' },
    { id: '3', promptSetID: 'batch-B', originalUserId: 'user-2' },
    { id: '4', promptSetID: 'batch-A', originalUserId: 'user-1' },
];

function process(entries, isGrouped, isGroupedByUser, viewMode) {
    if (viewMode === 'creators') return entries;
    if (!isGrouped && !isGroupedByUser) return entries;

    const groups = {};
    const standalone = [];

    entries.forEach(entry => {
        const groupKey = isGroupedByUser
            ? entry.originalUserId
            : (isGrouped ? entry.promptSetID : null);

        if (groupKey) {
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(entry);
        } else {
            standalone.push(entry);
        }
    });

    const stacked = [];
    Object.values(groups).forEach(group => {
        if (group.length > 1) {
            const first = group[0];
            stacked.push({
                ...first,
                isStack: true,
                stackSize: group.length,
            });
        } else {
            standalone.push(group[0]);
        }
    });

    return [...stacked, ...standalone].flat().sort((a, b) => {
        const indexA = entries.findIndex(e => e.id === a.id);
        const indexB = entries.findIndex(e => e.id === b.id);
        return indexA - indexB;
    });
}

const result = process(entries, isGrouped, isGroupedByUser, viewMode);
console.log(JSON.stringify(result, null, 2));
