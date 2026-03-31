
import { SocialEventOption } from '../types';

export const SOCIAL_EVENTS_DB: Record<string, { title: string, desc: string, options: SocialEventOption[] }[]> = {
    'DATE': [
        {
            title: "Movie Night",
            desc: "You arrive at the cinema. It's time to pick a movie. What's the vibe tonight?",
            options: [
                { label: "The RomCom", impact: { happiness: 5, relationship: 2 }, logMessage: "You both laughed until you cried." },
                { label: "The Horror", impact: { relationship: 5, happiness: -2 }, logMessage: "They held your hand during the scary parts." },
                { label: "The Art Film", impact: { relationship: -2, experience: 2 }, logMessage: "It was boring, but you analyzed the acting." }
            ]
        },
        {
            title: "Dinner Check",
            desc: "The waiter brings the check. It's expensive.",
            options: [
                { label: "Pay the Bill", impact: { money: -150, relationship: 5 }, logMessage: "You treated them to a lovely meal." },
                { label: "Split It", impact: { money: -75 }, logMessage: "You went dutch. Fair is fair." }
            ]
        }
    ],
    'CLUBBING': [
        {
            title: "Round of Shots",
            desc: "The DJ plays your favorite song and the energy is high. Do you order shots?",
            options: [
                { label: "Hell Yeah!", impact: { health: -5, happiness: 10, relationship: 5, money: -50 }, logMessage: "Shots! Shots! Shots! A wild night." },
                { label: "Stick to Water", impact: { health: 2, happiness: -2 }, logMessage: "You stayed sober and danced responsibly." }
            ]
        },
        {
            title: "VIP Section",
            desc: "A promoter invites you to the VIP table.",
            options: [
                { label: "Join VIP", impact: { fame: 2, money: -200 }, logMessage: "You rubbed elbows with the elite." },
                { label: "Stay on Floor", impact: { relationship: 2 }, logMessage: "You kept dancing with your partner." }
            ]
        }
    ],
    'HANGOUT': [
        {
            title: "Coffee Talk",
            desc: "The conversation gets deep.",
            options: [
                { label: "Share Secrets", impact: { relationship: 8 }, logMessage: "You bonded over shared secrets." },
                { label: "Keep it Light", impact: { happiness: 3 }, logMessage: "A pleasant, breezy conversation." }
            ]
        }
    ]
};

export const FLAVOR_TEXTS: Record<string, string[]> = {
    'DATE': ["Shared a bucket of popcorn.", "Held hands during the walk.", "Had a great conversation over dinner.", "Watched a beautiful sunset.", "Laughed at terrible jokes."],
    'CLUBBING': ["Danced until your feet hurt.", " The music was incredible.", "Met some interesting people.", "Lost your voice singing along.", "Took some blurry selfies."],
    'HANGOUT': ["Grabbed a quick coffee.", "Just chilled at home.", "Walked around the park.", "Gossiped about the industry.", "Played video games."]
};
