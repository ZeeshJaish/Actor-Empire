const UINT32_RANGE = 4_294_967_296;

export const hashDeterministicSeed = (value: string): number => {
    let hash = 2_166_136_261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16_777_619);
    }
    return hash >>> 0;
};

export const createDeterministicRng = (seed: string | number): (() => number) => {
    let state = typeof seed === 'number' ? seed >>> 0 : hashDeterministicSeed(seed);
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
    };
};

export const createDeterministicId = (namespace: string, ...parts: Array<string | number>): string => {
    const fingerprint = hashDeterministicSeed([namespace, ...parts].join(':'))
        .toString(36)
        .padStart(7, '0');
    return `${namespace}_${fingerprint}`;
};
