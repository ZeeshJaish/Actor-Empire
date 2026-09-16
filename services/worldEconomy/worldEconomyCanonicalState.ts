interface WorldEconomyCanonicalMarker {
    absoluteWeek: number;
    dependencies: readonly object[];
}

const canonicalStates = new WeakMap<object, WorldEconomyCanonicalMarker>();

export const markWorldEconomyStateCanonical = <T extends object>(
    state: T,
    absoluteWeek: number,
    dependencies: readonly object[] = [],
): T => {
    canonicalStates.set(state, { absoluteWeek, dependencies: [...dependencies] });
    return state;
};

export const isWorldEconomyStateCanonical = (
    state: unknown,
    absoluteWeek: number,
    dependencies: readonly object[] = [],
): boolean => {
    if (!state || typeof state !== 'object') return false;
    const marker = canonicalStates.get(state);
    return Boolean(
        marker
        && marker.absoluteWeek === absoluteWeek
        && marker.dependencies.length === dependencies.length
        && marker.dependencies.every((dependency, index) => dependency === dependencies[index]),
    );
};
