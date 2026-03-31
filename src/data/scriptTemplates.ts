import { Genre } from '../../types';

export interface ScriptQuestion {
    id: string;
    question: string;
    options: {
        id: string;
        text: string;
        reviewSnippet: string;
        newsHeadline: string;
    }[];
}

export const SCRIPT_TEMPLATES: Record<Genre, ScriptQuestion[]> = {
    ACTION: [
        {
            id: 'protagonist',
            question: 'Who is our protagonist?',
            options: [
                { id: 'ex-special-forces', text: 'Ex-Special Forces', reviewSnippet: 'a gritty, battle-hardened hero', newsHeadline: 'Audiences love the tactical realism of the lead character!' },
                { id: 'ordinary-guy', text: 'Ordinary Guy in Wrong Place', reviewSnippet: 'a relatable everyman pushed to the limit', newsHeadline: 'The "everyman" hero is resonating with viewers everywhere.' },
                { id: 'rogue-cop', text: 'Rogue Cop', reviewSnippet: 'a loose cannon who plays by their own rules', newsHeadline: 'Critics divided on the controversial rogue cop protagonist.' },
                { id: 'retired-assassin', text: 'Retired Assassin', reviewSnippet: 'forced back into the game for one last job', newsHeadline: 'A classic and effective take on the retired killer trope.' },
                { id: 'undercover-agent', text: 'Undercover Agent', reviewSnippet: 'living a double life in a dangerous world', newsHeadline: 'The tension of the undercover mission is palpable.' }
            ]
        },
        {
            id: 'inciting-incident',
            question: 'What kicks off the plot?',
            options: [
                { id: 'kidnapped-family', text: 'Family Kidnapped', reviewSnippet: 'driven by a deeply personal rescue mission', newsHeadline: 'The emotional stakes of the kidnapping plot have audiences hooked.' },
                { id: 'stolen-secrets', text: 'Stolen Government Secrets', reviewSnippet: 'caught in a web of global espionage', newsHeadline: 'Spy thriller elements add a layer of intrigue to the action.' },
                { id: 'framed', text: 'Framed for Murder', reviewSnippet: 'on the run to clear their name', newsHeadline: 'The "wrong man" trope is executed perfectly.' },
                { id: 'bank-heist', text: 'Bank Heist Gone Wrong', reviewSnippet: 'a high-stakes robbery that spirals out of control', newsHeadline: 'The opening heist sequence is a masterclass in tension.' }
            ]
        },
        {
            id: 'sidekick',
            question: 'Who is the sidekick?',
            options: [
                { id: 'comic-hacker', text: 'Comic Relief Hacker', reviewSnippet: 'with hilarious tech-support banter', newsHeadline: 'The hacker sidekick is the breakout star of the film!' },
                { id: 'gritty-mentor', text: 'Gritty Veteran Mentor', reviewSnippet: 'guided by a grizzled veteran', newsHeadline: 'The mentor-student dynamic brings unexpected heart.' },
                { id: 'rival-agent', text: 'Reluctant Rival Agent', reviewSnippet: 'featuring a tense buddy-cop dynamic', newsHeadline: 'The chemistry between the leads is electric.' }
            ]
        },
        {
            id: 'set-piece',
            question: 'What is the big set-piece?',
            options: [
                { id: 'mid-air-hijack', text: 'Mid-Air Plane Hijacking', reviewSnippet: 'a breathtaking mid-air sequence', newsHeadline: 'The plane hijacking scene is being called the action sequence of the year!' },
                { id: 'highway-chase', text: 'High-Speed Highway Chase', reviewSnippet: 'a visceral, high-octane car chase', newsHeadline: 'Audiences are raving about the breathtaking high-speed highway chase!' },
                { id: 'skyscraper-assault', text: 'Skyscraper Assault', reviewSnippet: 'a claustrophobic vertical battle', newsHeadline: 'The skyscraper assault sequence is a masterclass in tension.' },
                { id: 'boat-chase', text: 'Speedboat Chase through Canals', reviewSnippet: 'a fast and fluid aquatic pursuit', newsHeadline: 'The boat chase is visually stunning and incredibly exciting.' }
            ]
        },
        {
            id: 'villain-motivation',
            question: 'What drives the villain?',
            options: [
                { id: 'pure-greed', text: 'Pure Greed', reviewSnippet: 'facing a ruthlessly capitalistic villain', newsHeadline: 'The villain is a perfect reflection of modern corporate greed.' },
                { id: 'twisted-justice', text: 'Twisted Sense of Justice', reviewSnippet: 'against an antagonist who thinks they are right', newsHeadline: 'Critics praise the complex, morally grey villain.' },
                { id: 'revenge', text: 'Personal Revenge', reviewSnippet: 'locked in a deeply personal vendetta', newsHeadline: 'The villain\'s tragic backstory makes them surprisingly sympathetic.' }
            ]
        },
        {
            id: 'climax-location',
            question: 'Where does the climax take place?',
            options: [
                { id: 'abandoned-warehouse', text: 'Abandoned Warehouse', reviewSnippet: 'culminating in a gritty warehouse brawl', newsHeadline: 'The final fight is brutal, grounded, and unforgettable.' },
                { id: 'rainy-rooftop', text: 'Top of a Skyscraper in the Rain', reviewSnippet: 'ending with a cinematic rooftop showdown', newsHeadline: 'The rainy rooftop climax is visually stunning.' },
                { id: 'moving-train', text: 'On Top of a Moving Train', reviewSnippet: 'featuring a death-defying train sequence', newsHeadline: 'The moving train finale had audiences on the edge of their seats!' }
            ]
        },
        {
            id: 'ending',
            question: 'How does it end?',
            options: [
                { id: 'hero-sacrifice', text: 'Hero Sacrifices Themselves', reviewSnippet: 'with a tragic but memorable conclusion', newsHeadline: 'The shocking ending has left audiences in tears.' },
                { id: 'ride-into-sunset', text: 'Hero Rides into the Sunset', reviewSnippet: 'delivering a satisfying, crowd-pleasing finale', newsHeadline: 'A perfect, feel-good ending to a wild ride.' },
                { id: 'cliffhanger', text: 'Ambiguous Cliffhanger', reviewSnippet: 'leaving the door wide open for a sequel', newsHeadline: 'The ambiguous ending has sparked massive online debate!' }
            ]
        }
    ],
    HORROR: [
        {
            id: 'threat',
            question: 'What is the main threat?',
            options: [
                { id: 'supernatural-entity', text: 'Supernatural Entity', reviewSnippet: 'a truly terrifying ghostly presence', newsHeadline: 'The supernatural scares are keeping audiences up at night.' },
                { id: 'masked-killer', text: 'Masked Slasher', reviewSnippet: 'a relentless, iconic new slasher', newsHeadline: 'Is this the birth of the next great horror icon?' },
                { id: 'psychological', text: 'Psychological Descent', reviewSnippet: 'a chilling descent into madness', newsHeadline: 'The psychological horror is deeply unsettling.' },
                { id: 'cosmic-horror', text: 'Cosmic Horror', reviewSnippet: 'an incomprehensible ancient evil', newsHeadline: 'Critics are calling it a Lovecraftian masterpiece.' },
                { id: 'techno-horror', text: 'Technological Virus', reviewSnippet: 'terror through our screens', newsHeadline: 'A terrifying look at our digital dependence.' }
            ]
        },
        {
            id: 'setting',
            question: 'Where does it take place?',
            options: [
                { id: 'isolated-cabin', text: 'Isolated Cabin in the Woods', reviewSnippet: 'set in a claustrophobic, remote cabin', newsHeadline: 'The isolated setting amplifies the terror.' },
                { id: 'suburban-home', text: 'Quiet Suburban Home', reviewSnippet: 'bringing terror to a familiar suburban setting', newsHeadline: 'It makes you afraid to be in your own house.' },
                { id: 'abandoned-asylum', text: 'Abandoned Asylum', reviewSnippet: 'utilizing a deeply creepy asylum backdrop', newsHeadline: 'The asylum setting is a character in itself.' },
                { id: 'underwater-base', text: 'Underwater Research Base', reviewSnippet: 'the crushing pressure of the deep', newsHeadline: 'Deep-sea horror at its finest.' },
                { id: 'space-station', text: 'Derelict Space Station', reviewSnippet: 'no one can hear you scream', newsHeadline: 'Sci-fi horror that actually delivers.' }
            ]
        },
        {
            id: 'victim-type',
            question: 'Who are the victims?',
            options: [
                { id: 'teen-group', text: 'Group of Teenagers', reviewSnippet: 'classic slasher fodder', newsHeadline: 'A nostalgic throwback to 80s horror.' },
                { id: 'investigative-team', text: 'Investigative Team', reviewSnippet: 'professionals out of their depth', newsHeadline: 'The procedural elements add a unique layer.' },
                { id: 'lone-survivor', text: 'Lone Survivor', reviewSnippet: 'a personal struggle for life', newsHeadline: 'A tour-de-force performance in isolation.' }
            ]
        },
        {
            id: 'twist',
            question: 'What is the big twist?',
            options: [
                { id: 'all-in-head', text: 'It Was All in Their Head', reviewSnippet: 'featuring a mind-bending psychological twist', newsHeadline: 'The twist ending changes everything you just watched.' },
                { id: 'trusted-friend', text: 'The Trusted Friend Did It', reviewSnippet: 'with a shocking betrayal in the third act', newsHeadline: 'Audiences are gasping at the final reveal!' },
                { id: 'never-left', text: 'They Never Escaped', reviewSnippet: 'ending on a bleak, hopeless realization', newsHeadline: 'One of the darkest endings in recent horror history.' },
                { id: 'cycle-continues', text: 'The Cycle Continues', reviewSnippet: 'evil cannot be defeated', newsHeadline: 'A chilling reminder that some things never end.' }
            ]
        }
    ],
    SCI_FI: [
        {
            id: 'concept',
            question: 'What is the core sci-fi concept?',
            options: [
                { id: 'ai-uprising', text: 'Rogue AI Uprising', reviewSnippet: 'exploring the terrifying potential of artificial intelligence', newsHeadline: 'A timely warning about the dangers of AI.' },
                { id: 'alien-contact', text: 'First Contact', reviewSnippet: 'a thought-provoking look at alien contact', newsHeadline: 'The alien designs are truly out of this world.' },
                { id: 'time-travel', text: 'Time Travel Paradox', reviewSnippet: 'a clever, mind-bending time travel narrative', newsHeadline: 'The time travel logic actually holds up!' },
                { id: 'multiverse', text: 'Multiverse Collapse', reviewSnippet: 'infinite realities colliding', newsHeadline: 'A mind-expanding journey through the multiverse.' },
                { id: 'genetic-engineering', text: 'Genetic Engineering', reviewSnippet: 'the ethics of playing God', newsHeadline: 'A provocative look at the future of humanity.' }
            ]
        },
        {
            id: 'setting',
            question: 'Where is it set?',
            options: [
                { id: 'dystopian-earth', text: 'Dystopian Future Earth', reviewSnippet: 'set in a bleak, beautifully realized dystopia', newsHeadline: 'The world-building is absolutely phenomenal.' },
                { id: 'deep-space', text: 'Deep Space Vessel', reviewSnippet: 'capturing the isolation of deep space', newsHeadline: 'The claustrophobia of the spaceship is palpable.' },
                { id: 'cyberpunk-city', text: 'Neon Cyberpunk City', reviewSnippet: 'immersed in a stunning cyberpunk aesthetic', newsHeadline: 'Visually, it is a neon-drenched masterpiece.' },
                { id: 'alien-planet', text: 'Exotic Alien Planet', reviewSnippet: 'a vibrant, alien ecosystem', newsHeadline: 'The visual effects bring a whole new world to life.' }
            ]
        },
        {
            id: 'tech-level',
            question: 'What is the level of technology?',
            options: [
                { id: 'near-future', text: 'Near Future', reviewSnippet: 'grounded and recognizable', newsHeadline: 'It feels like a future that is just around the corner.' },
                { id: 'high-tech', text: 'High-Tech / Space Age', reviewSnippet: 'sleek, advanced, and futuristic', newsHeadline: 'The production design is a vision of the future.' },
                { id: 'low-tech', text: 'Post-Apocalyptic / Low-Tech', reviewSnippet: 'gritty, scavenged, and raw', newsHeadline: 'A visceral look at a world after the fall.' }
            ]
        }
    ],
    COMEDY: [
        {
            id: 'premise',
            question: 'What is the comedic premise?',
            options: [
                { id: 'body-swap', text: 'Body Swap', reviewSnippet: 'breathing new life into the body-swap trope', newsHeadline: 'The lead actors have hilarious chemistry.' },
                { id: 'road-trip', text: 'Disastrous Road Trip', reviewSnippet: 'a chaotic, laugh-a-minute road trip', newsHeadline: 'The road trip antics are endlessly entertaining.' },
                { id: 'wedding-crasher', text: 'Wedding Gone Wrong', reviewSnippet: 'escalating wedding day disasters perfectly', newsHeadline: 'The wedding reception scene is an instant classic.' },
                { id: 'fake-relationship', text: 'Fake Relationship', reviewSnippet: 'the classic fake-dating scenario', newsHeadline: 'A charming and funny take on a beloved trope.' },
                { id: 'fish-out-of-water', text: 'Fish Out of Water', reviewSnippet: 'hilarious cultural misunderstandings', newsHeadline: 'The protagonist\'s confusion is comedy gold.' }
            ]
        },
        {
            id: 'humor-style',
            question: 'What is the style of humor?',
            options: [
                { id: 'slapstick', text: 'Physical Slapstick', reviewSnippet: 'featuring brilliant physical comedy', newsHeadline: 'The physical gags had the theater roaring.' },
                { id: 'witty-banter', text: 'Witty, Fast-Paced Banter', reviewSnippet: 'driven by sharp, rapid-fire dialogue', newsHeadline: 'The script is incredibly sharp and witty.' },
                { id: 'cringe', text: 'Awkward Cringe Comedy', reviewSnippet: 'mastering the art of uncomfortable humor', newsHeadline: 'It is so awkward you cannot look away.' },
                { id: 'satire', text: 'Sharp Social Satire', reviewSnippet: 'biting commentary on modern life', newsHeadline: 'A brilliant and timely satire.' },
                { id: 'absurdist', text: 'Absurdist / Surreal', reviewSnippet: 'wonderfully weird and unpredictable', newsHeadline: 'You have never seen anything quite like this.' }
            ]
        },
        {
            id: 'comedic-duo',
            question: 'Who is the comedic duo?',
            options: [
                { id: 'odd-couple', text: 'The Odd Couple', reviewSnippet: 'opposites attract in the funniest way', newsHeadline: 'The chemistry between the leads is undeniable.' },
                { id: 'buddy-cops', text: 'Buddy Cops', reviewSnippet: 'a hilarious take on law enforcement', newsHeadline: 'The best buddy-cop movie in years.' },
                { id: 'best-friends', text: 'Lifelong Best Friends', reviewSnippet: 'relatable and heartwarming friendship', newsHeadline: 'A celebration of friendship and laughter.' }
            ]
        }
    ],
    DRAMA: [
        {
            id: 'conflict',
            question: 'What is the central conflict?',
            options: [
                { id: 'family-feud', text: 'Bitter Family Feud', reviewSnippet: 'a searing portrait of a fractured family', newsHeadline: 'The family dynamics are heartbreakingly real.' },
                { id: 'legal-battle', text: 'High-Stakes Legal Battle', reviewSnippet: 'a tense, gripping courtroom drama', newsHeadline: 'The courtroom scenes are electrifying.' },
                { id: 'addiction', text: 'Struggle with Addiction', reviewSnippet: 'an unflinching look at personal demons', newsHeadline: 'A raw, powerful performance anchors the film.' },
                { id: 'political-scandal', text: 'Political Scandal', reviewSnippet: 'the dark underbelly of power', newsHeadline: 'A gripping look at corruption and ambition.' },
                { id: 'forbidden-love', text: 'Forbidden Love', reviewSnippet: 'a tragic and beautiful romance', newsHeadline: 'A timeless story of love against the odds.' }
            ]
        },
        {
            id: 'tone',
            question: 'What is the overall tone?',
            options: [
                { id: 'gritty', text: 'Gritty and Realistic', reviewSnippet: 'unflinching and raw', newsHeadline: 'A powerful and grounded drama.' },
                { id: 'melancholic', text: 'Melancholic and Reflective', reviewSnippet: 'a quiet, introspective journey', newsHeadline: 'A beautiful and moving piece of cinema.' },
                { id: 'intense', text: 'Intense and Emotional', reviewSnippet: 'a roller-coaster of feelings', newsHeadline: 'An emotionally exhausting but rewarding experience.' }
            ]
        },
        {
            id: 'resolution',
            question: 'How does it resolve?',
            options: [
                { id: 'redemption', text: 'Hard-Fought Redemption', reviewSnippet: 'ending on a note of hard-earned hope', newsHeadline: 'An uplifting ending that feels earned.' },
                { id: 'tragedy', text: 'Inevitable Tragedy', reviewSnippet: 'a devastating, unforgettable conclusion', newsHeadline: 'The tragic ending will stay with you for days.' },
                { id: 'bittersweet', text: 'Bittersweet Acceptance', reviewSnippet: 'finding beauty in a messy resolution', newsHeadline: 'A perfectly nuanced, bittersweet finale.' }
            ]
        }
    ],
    ROMANCE: [
        {
            id: 'meet-cute',
            question: 'How do they meet?',
            options: [
                { id: 'enemies-to-lovers', text: 'Bitter Rivals', reviewSnippet: 'nailing the enemies-to-lovers dynamic', newsHeadline: 'The tension between the leads is palpable.' },
                { id: 'childhood-friends', text: 'Childhood Friends', reviewSnippet: 'a sweet, nostalgic friends-to-lovers arc', newsHeadline: 'A heartwarming take on a classic trope.' },
                { id: 'chance-encounter', text: 'Chance Encounter in Rain', reviewSnippet: 'featuring a beautifully cinematic meet-cute', newsHeadline: 'The most romantic movie of the year.' },
                { id: 'online-dating', text: 'Online Dating Mishap', reviewSnippet: 'a modern and relatable meet-cute', newsHeadline: 'A charming look at love in the digital age.' },
                { id: 'workplace-romance', text: 'Workplace Romance', reviewSnippet: 'the sparks fly at the office', newsHeadline: 'A fun and flirty workplace comedy.' }
            ]
        },
        {
            id: 'obstacle',
            question: 'What is the main obstacle?',
            options: [
                { id: 'distance', text: 'Long Distance', reviewSnippet: 'the struggle of being apart', newsHeadline: 'A moving look at love across the miles.' },
                { id: 'family-disapproval', text: 'Family Disapproval', reviewSnippet: 'love against the family wishes', newsHeadline: 'A classic story of star-crossed lovers.' },
                { id: 'career-ambition', text: 'Career Ambition', reviewSnippet: 'choosing between love and success', newsHeadline: 'A relatable look at modern priorities.' }
            ]
        }
    ],
    THRILLER: [
        {
            id: 'mystery',
            question: 'What is the core mystery?',
            options: [
                { id: 'missing-person', text: 'Missing Person', reviewSnippet: 'a gripping, twisty missing person case', newsHeadline: 'You will never guess where the story goes.' },
                { id: 'serial-killer', text: 'Cat-and-Mouse with Killer', reviewSnippet: 'a tense psychological duel', newsHeadline: 'A masterclass in building suspense.' },
                { id: 'conspiracy', text: 'Massive Conspiracy', reviewSnippet: 'unraveling a paranoid, sprawling conspiracy', newsHeadline: 'A thriller that keeps you guessing until the very end.' },
                { id: 'heist', text: 'The Perfect Heist', reviewSnippet: 'a high-stakes, intricate robbery', newsHeadline: 'A masterclass in heist movie tension.' },
                { id: 'espionage', text: 'International Espionage', reviewSnippet: 'a web of lies and betrayal', newsHeadline: 'A gripping and realistic spy thriller.' }
            ]
        },
        {
            id: 'pacing',
            question: 'What is the pacing?',
            options: [
                { id: 'slow-burn', text: 'Slow-Burn Suspense', reviewSnippet: 'building tension masterfully', newsHeadline: 'A thriller that takes its time and rewards the viewer.' },
                { id: 'breakneck', text: 'Breakneck Action', reviewSnippet: 'never lets up for a second', newsHeadline: 'A non-stop adrenaline ride.' },
                { id: 'psychological', text: 'Psychological Tension', reviewSnippet: 'it gets under your skin', newsHeadline: 'A deeply unsettling and effective thriller.' }
            ]
        }
    ],
    ADVENTURE: [
        {
            id: 'goal',
            question: 'What is the ultimate goal?',
            options: [
                { id: 'lost-city', text: 'Find a Lost City', reviewSnippet: 'a sweeping, old-school jungle adventure', newsHeadline: 'A thrilling throwback to classic adventure films.' },
                { id: 'ancient-artifact', text: 'Recover an Artifact', reviewSnippet: 'a globe-trotting treasure hunt', newsHeadline: 'The action set-pieces are incredibly inventive.' },
                { id: 'survival', text: 'Survive the Wilderness', reviewSnippet: 'a harrowing tale of survival against nature', newsHeadline: 'A visceral, intense survival story.' },
                { id: 'mythical-creature', text: 'Hunt a Mythical Creature', reviewSnippet: 'a journey into legend', newsHeadline: 'The creature designs are truly awe-inspiring.' },
                { id: 'rescue-mission', text: 'Rescue Mission', reviewSnippet: 'a race against time in a hostile land', newsHeadline: 'A high-stakes adventure with real heart.' }
            ]
        },
        {
            id: 'location',
            question: 'Where does the adventure take place?',
            options: [
                { id: 'jungle', text: 'Dense Jungle', reviewSnippet: 'lush and dangerous', newsHeadline: 'The jungle setting is beautifully realized.' },
                { id: 'desert', text: 'Arid Desert', reviewSnippet: 'a vast and unforgiving landscape', newsHeadline: 'The desert cinematography is stunning.' },
                { id: 'mountains', text: 'Snowy Mountains', reviewSnippet: 'the heights of danger', newsHeadline: 'A breathtaking mountain adventure.' }
            ]
        }
    ],
    SUPERHERO: [
        {
            id: 'origin',
            question: 'What is the hero\'s origin?',
            options: [
                { id: 'lab-accident', text: 'Lab Accident', reviewSnippet: 'a fun, classic comic book origin story', newsHeadline: 'A fresh take on the superhero origin.' },
                { id: 'alien-tech', text: 'Discovered Alien Tech', reviewSnippet: 'blending sci-fi elements with superhero action', newsHeadline: 'The visual effects are absolutely stunning.' },
                { id: 'training', text: 'Years of Brutal Training', reviewSnippet: 'a grounded, gritty take on vigilantism', newsHeadline: 'A darker, more realistic superhero film.' },
                { id: 'mythical-heritage', text: 'Mythical Heritage', reviewSnippet: 'a hero born of legend', newsHeadline: 'A grand and epic superhero story.' },
                { id: 'tech-genius', text: 'Self-Made Tech Genius', reviewSnippet: 'intelligence is the ultimate superpower', newsHeadline: 'A smart and inventive superhero film.' }
            ]
        },
        {
            id: 'villain-type',
            question: 'What kind of villain do they face?',
            options: [
                { id: 'dark-mirror', text: 'Dark Mirror of the Hero', reviewSnippet: 'the hero\'s greatest fears realized', newsHeadline: 'The villain is a perfect foil for the hero.' },
                { id: 'cosmic-threat', text: 'Cosmic Threat', reviewSnippet: 'the fate of the world hangs in the balance', newsHeadline: 'An epic battle for the future of humanity.' },
                { id: 'street-level', text: 'Street-Level Crime Lord', reviewSnippet: 'a grounded and personal conflict', newsHeadline: 'A gritty and realistic take on superheroics.' }
            ]
        }
    ]
};
