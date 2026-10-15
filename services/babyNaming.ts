export type BabySurnameChoice = { id: 'PLAYER' | 'PARTNER' | 'BOTH'; value: string };

const getKnownSurname = (name: string): string => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    const normalizedName = parts.join(' ').toLowerCase();
    if (['your partner', 'new player', 'rising star'].includes(normalizedName)) return '';
    return parts.length > 1 ? parts[parts.length - 1] : '';
};

export const getBabySurnameChoices = (playerName: string, partnerName: string): BabySurnameChoice[] => {
    const playerSurname = getKnownSurname(playerName);
    const partnerSurname = getKnownSurname(partnerName);
    const choices: BabySurnameChoice[] = [
        { id: 'PLAYER', value: playerSurname },
        { id: 'PARTNER', value: partnerSurname },
        { id: 'BOTH', value: playerSurname && partnerSurname && playerSurname !== partnerSurname ? `${playerSurname}-${partnerSurname}` : '' },
    ];
    return choices.filter((choice, index) => choice.value && choices.findIndex(other => other.value === choice.value) === index);
};

export const buildAbandonedBabyName = (firstName: string, partnerName: string, playerName: string): string =>
    `${firstName.trim()} ${getKnownSurname(partnerName) || getKnownSurname(playerName)}`.trim();
