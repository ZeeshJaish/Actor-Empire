export const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
        const millions = amount / 1000000;
        return `$${millions >= 10 ? millions.toFixed(1) : millions.toFixed(2)}M`.replace('.00', '').replace('.0', '');
    }
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
    return `$${amount}`;
};

export const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
