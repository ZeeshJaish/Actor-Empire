export const formatMoney = (val: number) => {
    if (isNaN(val)) return '$0';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    let formatted = '';
    if (absVal >= 1_000_000_000_000) formatted = `${(absVal/1_000_000_000_000).toFixed(1)}T`;
    else if (absVal >= 1_000_000_000) formatted = `${(absVal/1_000_000_000).toFixed(1)}B`;
    else if (absVal >= 1_000_000) formatted = `${(absVal/1_000_000).toFixed(1)}M`;
    else if (absVal >= 1_000) formatted = `${(absVal/1_000).toFixed(0)}k`;
    else formatted = absVal.toLocaleString();
    return `${sign}$${formatted}`;
};
