export const formatMoney = (val: number) => {
    if (!Number.isFinite(val)) return '$999T+';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    const suffixes = [
        { value: 1_000_000_000_000_000_000_000_000_000_000, label: 'No' },
        { value: 1_000_000_000_000_000_000_000_000_000, label: 'Oc' },
        { value: 1_000_000_000_000_000_000_000_000, label: 'Sp' },
        { value: 1_000_000_000_000_000_000_000, label: 'Sx' },
        { value: 1_000_000_000_000_000_000, label: 'Qi' },
        { value: 1_000_000_000_000_000, label: 'Qa' },
        { value: 1_000_000_000_000, label: 'T' },
        { value: 1_000_000_000, label: 'B' },
        { value: 1_000_000, label: 'M' },
        { value: 1_000, label: 'k' },
    ];
    const tier = suffixes.find(item => absVal >= item.value);
    const formatted = tier
        ? `${(absVal / tier.value).toFixed(tier.value >= 1_000_000 ? 1 : 0)}${tier.label}`
        : absVal.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `${sign}$${formatted}`;
};
