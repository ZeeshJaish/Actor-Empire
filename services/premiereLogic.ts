
import { RedCarpetInterview } from '../types';

export const RED_CARPET_INTERVIEWS: RedCarpetInterview[] = [
    {
        id: 'rc_1',
        question: "The hype for this movie is insane. How does it feel to finally show it to the world?",
        options: [
            { text: "It's a dream come true. We poured our souls into this.", style: 'PROFESSIONAL', impact: 10 },
            { text: "Honestly? I'm just glad I don't have to see the director's face for a while.", style: 'FUNNY', impact: 15 },
            { text: "The world isn't ready for what we've created. It's going to change cinema.", style: 'CONTROVERSIAL', impact: 25 }
        ]
    },
    {
        id: 'rc_2',
        question: "There were rumors of some tension on set. Anything you want to clear up?",
        options: [
            { text: "We're like a family. Families argue, but the love is real.", style: 'PROFESSIONAL', impact: 5 },
            { text: "Tension? I thought we were filming a comedy!", style: 'FUNNY', impact: 10 },
            { text: "Some people just can't handle a visionary environment.", style: 'CONTROVERSIAL', impact: 20 }
        ]
    },
    {
        id: 'rc_3',
        question: "What's the one thing you want audiences to take away from this film?",
        options: [
            { text: "A sense of hope and a new perspective on life.", style: 'PROFESSIONAL', impact: 8 },
            { text: "Their popcorn buckets. Don't leave a mess, folks.", style: 'FUNNY', impact: 12 },
            { text: "A burning desire to watch it again and again.", style: 'CONTROVERSIAL', impact: 18 }
        ]
    }
];
