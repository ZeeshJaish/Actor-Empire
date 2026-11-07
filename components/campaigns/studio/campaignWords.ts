/** How hard a weeks campaign runs, in the builders' words (#155; #158: the launch builder's too). */
export const STRENGTH_WORDS: Record<number, { name: string; line: string }> = {
    1: { name: 'Normal', line: 'What your picks cost a week: the least they run on.' },
    1.5: { name: 'Strong ×1.5', line: 'Half as much again each week: more people, more often.' },
    2: { name: 'All-out ×2', line: 'Twice the least each week. Each extra dollar reaches fewer new people.' },
};
