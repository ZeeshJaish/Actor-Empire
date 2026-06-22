import { getProjectReleaseLabel, getProjectReleaseSortValue, getProjectReleaseTiming } from '../services/releaseTiming';

const assertEqual = (actual: unknown, expected: unknown, label: string) => {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
    }
};

const activeStreamingRelease = {
    releaseYear: 28,
    releaseWeek: 14,
    weekNum: 9
};

const legacyArchivedRelease = {
    year: 31
};

const absoluteOnlyRelease = {
    releasedAtAbsoluteWeek: (34 - 1) * 52 + (22 - 1)
};

assertEqual(getProjectReleaseLabel(activeStreamingRelease, { currentAge: 29, currentWeek: 3 }), 'Age 28', 'active release should keep original release year');
assertEqual(getProjectReleaseLabel(activeStreamingRelease, { currentAge: 29, currentWeek: 3 }, { includeWeek: true }), 'Age 28, Week 14', 'detailed label should include stored release week');
assertEqual(getProjectReleaseTiming(activeStreamingRelease, { currentAge: 29, currentWeek: 3 }).releaseWeek, 14, 'weekNum must not be treated as release week');
assertEqual(getProjectReleaseLabel(legacyArchivedRelease, { currentAge: 35, currentWeek: 10 }), 'Age 31', 'legacy archive should fall back to archived year');
assertEqual(getProjectReleaseLabel(absoluteOnlyRelease, { currentAge: 35, currentWeek: 10 }, { includeWeek: true }), 'Age 34, Week 22', 'absolute week should produce detailed timing');

const newer = getProjectReleaseSortValue({ releaseYear: 30, releaseWeek: 2 });
const older = getProjectReleaseSortValue({ releaseYear: 29, releaseWeek: 52 });
if (newer <= older) {
    throw new Error('sort value should place later career years after earlier career years');
}

console.log('release timing audit passed');
