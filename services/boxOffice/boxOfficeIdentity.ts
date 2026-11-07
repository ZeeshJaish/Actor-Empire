import type { CinemaWeekResult } from './boxOfficeTypes';
/** Stable JSON semantics for exact transient source/result comparisons, including reload. */
export const serializeCinemaFacts = (value: unknown): string => {
    if (value === undefined || value === null)
        return 'null';
    if (Array.isArray(value))
        return `[${value.map(serializeCinemaFacts).join(',')}]`;
    if (typeof value === 'object')
        return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${serializeCinemaFacts(v)}`).join(',')}}`;
    return JSON.stringify(value);
};
interface IssuedCinemaFacts { serialized: string; sourceSignature?: string }
const issued = new WeakMap<CinemaWeekResult, IssuedCinemaFacts>();
const factsWithoutSourceString = (result: CinemaWeekResult): string => serializeCinemaFacts({
    ...result, live: { ...result.live, sourceSignature: undefined },
});
const separateSourceString = (result: CinemaWeekResult): string | undefined => {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return undefined;
    const live = Object.getOwnPropertyDescriptor(result, 'live');
    if (!live?.enumerable || !('value' in live) || !live.value || typeof live.value !== 'object' || Array.isArray(live.value)) return undefined;
    const source = Object.getOwnPropertyDescriptor(live.value, 'sourceSignature');
    return source?.enumerable && 'value' in source && typeof source.value === 'string' ? source.value : undefined;
};
/** Only a freshly simulated result may first apply cash. Recovery reruns from the durable prior save. */
export const issueCinemaResult = (result: CinemaWeekResult): CinemaWeekResult => {
    if (result.mode === 'LIVE') {
        const sourceSignature = separateSourceString(result);
        // The exact immutable string is compared separately. Re-encoding it inside
        // both result snapshots duplicated tens of MB without checking another fact.
        issued.set(result, sourceSignature !== undefined
            ? { sourceSignature, serialized: factsWithoutSourceString(result) }
            : { serialized: serializeCinemaFacts(result) });
    }
    return result;
};
export const assertIssuedCinemaResult = (result: CinemaWeekResult): void => {
    const original = issued.get(result);
    if (!original || !original.serialized || (original.sourceSignature !== undefined
        ? original.sourceSignature !== separateSourceString(result) || original.serialized !== factsWithoutSourceString(result)
        : original.serialized !== serializeCinemaFacts(result)))
        throw new Error('Cinema result was not issued by the allocator or changed after simulation');
};
