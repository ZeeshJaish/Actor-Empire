import type { Genre, ScriptAttributes } from '../../types';
import type { ScriptChoice, ScriptChoiceCompass } from './scriptTemplates';

// Authored answers for the existing questions. Metadata stays in the library,
// while saves keep the same questionId/choiceId pairs.
const choice = (id: string, text: string, premise: string, dna: Partial<ScriptAttributes>, compass: ScriptChoiceCompass = {}): ScriptChoice => ({
    id, text, premise, dna, compass, reviewSnippet: premise, newsHeadline: `Story focus: ${text}`,
});

export const SCRIPT_STORY_VARIATIONS: Record<Genre, Record<string, ScriptChoice[]>> = {
    ACTION: {
        protagonist: [
            choice('professional-thief', 'Professional Thief', 'a professional thief accepts an impossible assignment', { plot: 5, action: -5 }, { tone: 'MORALLY_GREY' }),
            choice('street-racer', 'Street Racer Turned Getaway Driver', 'a street racer becomes a getaway driver', { action: 5, dialogue: -5 }),
            choice('car-dealer', 'Car Dealer Out of Their Depth', 'a car dealer uncovers a dangerous secret', { characters: 5, action: -5 }),
            choice('accidental-time-traveller', 'Accidental Time Traveller', 'an accidental time traveller tries to get home', { originality: 5, dialogue: -5 }, { worldRule: 'TECHNOLOGY' }),
            choice('disgraced-scientist', 'Disgraced Scientist', 'a disgraced scientist gets one chance to make amends', { plot: 5, action: -5 }),
            choice('debt-ridden-mechanic', 'Mechanic Facing Financial Ruin', 'a debt-ridden mechanic risks everything on one job', { characters: 5, originality: -5 }),
        ],
        'inciting-incident': [
            choice('coerced-final-job', 'Forced into One Last Job', 'an old employer forces one last job', { plot: 5, action: -5 }, { conflictSource: 'ANTAGONIST' }),
            choice('dangerous-discovery', 'Evidence Hidden in an Ordinary Purchase', 'an ordinary purchase conceals dangerous evidence', { plot: 5, pacing: -5 }, { conflictSource: 'MYSTERY' }),
            choice('botched-getaway', 'A Getaway Goes Wrong', 'a failed getaway leaves an innocent person in danger', { pacing: 5, originality: -5 }),
            choice('future-warning', 'A Warning from Their Future Self', 'a future self warns of an approaching disaster', { originality: 5, action: -5 }, { worldRule: 'TECHNOLOGY' }),
            choice('family-financial-crisis', 'A Family Financial Crisis', 'a family emergency makes a dangerous offer tempting', { characters: 5, pacing: -5 }, { conflictSource: 'INTERNAL' }),
            choice('witness-needs-escape', 'A Witness Needs a Way Out', 'a witness needs protection before testifying', { pacing: 5, dialogue: -5 }, { conflictSource: 'ANTAGONIST' }),
        ],
        sidekick: [
            choice('specialist-heist-crew', 'Crew of Heist Specialists', 'a specialist crew handles the impossible parts', { plot: 5, characters: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
            choice('found-family-crew', 'A Found-Family Crew', 'a chosen family holds the crew together', { characters: 5, originality: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
            choice('rival-driver', 'A Rival Driver', 'a rival driver becomes a reluctant partner', { dialogue: 5, pacing: -5 }, { perspective: 'DUAL' }),
            choice('scientist-mentor', 'An Unconventional Scientist Mentor', 'an unconventional mentor understands the invention', { dialogue: 5, action: -5 }, { perspective: 'DUAL' }),
            choice('estranged-sibling', 'An Estranged Sibling', 'an estranged sibling returns when trust matters most', { characters: 5, action: -5 }, { perspective: 'DUAL' }),
        ],
        'set-piece': [
            choice('precision-vault-heist', 'Precision Vault Heist', 'a carefully timed vault break-in tests the plan', { plot: 5, action: -5 }),
            choice('convoy-escape', 'Convoy Escape through a Locked-Down City', 'a convoy races through a locked-down city', { action: 5, dialogue: -5 }),
            choice('street-race', 'Underground Street Race', 'an underground race decides who controls the next move', { action: 5, plot: -5 }),
            choice('time-loop-escape', 'Escape That Repeats in a Time Loop', 'each failed escape restarts the same minute', { originality: 5, dialogue: -5 }, { worldRule: 'TECHNOLOGY' }),
            choice('coordinated-city-defense', 'Coordinated Defense of a City', 'separate teams must coordinate a citywide defense', { action: 5, originality: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
        ],
        'villain-motivation': [
            choice('corporate-monopoly', 'Build an Unchallengeable Monopoly', 'an antagonist wants control of an entire industry', { plot: 5, action: -5 }, { conflictSource: 'SOCIETY' }),
            choice('erase-evidence', 'Erase the Evidence', 'an antagonist will kill to erase the evidence', { pacing: 5, dialogue: -5 }, { conflictSource: 'ANTAGONIST' }),
            choice('control-timeline', 'Rewrite the Timeline for Personal Power', 'an antagonist rewrites history for personal power', { originality: 5, action: -5 }, { conflictSource: 'ANTAGONIST', worldRule: 'TECHNOLOGY' }),
            choice('manufactured-crisis', 'Create a Crisis to Sell the Solution', 'an antagonist creates the crisis they promise to solve', { plot: 5, action: -5 }, { conflictSource: 'ANTAGONIST' }),
        ],
        'climax-location': [
            choice('race-circuit', 'A Race Circuit on the Final Lap', 'the confrontation reaches a race circuit', { action: 5, dialogue: -5 }),
            choice('evidence-vault', 'A Sealed Evidence Vault', 'the final confrontation seals everyone inside an evidence vault', { plot: 5, action: -5 }),
            choice('abandoned-dealership', 'An Abandoned Car Dealership', 'the showdown returns to an abandoned dealership', { characters: 5, originality: -5 }),
            choice('research-facility', 'An Experimental Research Facility', 'the final confrontation reaches the research facility', { plot: 5, dialogue: -5 }),
        ],
        ending: [
            choice('truth-at-personal-cost', 'Expose the Truth at a Personal Cost', 'the truth is exposed at a personal cost', { characters: 5, action: -5 }),
            choice('walk-away-from-power', 'Walk Away from Power', 'the protagonist gives up the power they fought to gain', { characters: 5, pacing: -5 }),
            choice('become-antagonist', 'Become the Threat They Once Opposed', 'success turns the protagonist into the next threat', { plot: 5, action: -5 }, { tone: 'MORALLY_GREY' }),
            choice('repair-timeline-at-cost', 'Repair the Timeline with a Sacrifice', 'repairing the timeline demands a personal sacrifice', { originality: 5, pacing: -5 }, { worldRule: 'TECHNOLOGY', tone: 'TRAGIC' }),
            choice('save-crew-lose-prize', 'Save the Crew, Lose the Prize', 'the crew gives up the prize to bring everyone home', { characters: 5, originality: -5 }),
        ],
    },
    CRIME: {
        'crime-focus': [
            choice('criminal-transformation', 'An Ordinary Professional Builds a Criminal Empire', 'a desperate professional builds an empire and loses their conscience', { characters: 5, action: -5 }, { tone: 'MORALLY_GREY', conflictSource: 'INTERNAL' }),
            choice('dealership-front', 'A Car Dealership Becomes a Criminal Front', 'a debt-ridden dealer discovers their investor uses the showroom as a criminal front', { plot: 5, action: -5 }, { tone: 'MORALLY_GREY', conflictSource: 'ANTAGONIST' }),
            choice('precision-heist', 'Specialists Plan an Impossible Heist', 'a specialist crew plans a heist before learning the employer concealed its real purpose', { plot: 5, action: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE', tone: 'MORALLY_GREY' }),
            choice('getaway-network', 'Getaway Drivers with Divided Loyalties', 'a getaway crew must choose between its employer and the people it carries', { action: 5, dialogue: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE', tone: 'MORALLY_GREY' }),
            choice('corporate-insider', 'An Insider Exposes a Corporate Crime', 'an insider risks a career to expose a crime inside their own company', { dialogue: 5, action: -5 }, { conflictSource: 'SOCIETY' }),
            choice('evidence-theft', 'Steal Evidence to Protect an Innocent Person', 'a thief targets an evidence vault to protect an innocent person', { plot: 5, pacing: -5 }, { conflictSource: 'ANTAGONIST' }),
            choice('debt-erasure-heist', 'A Thief Targets a Predatory Debt Ledger', 'a thief steals a debt ledger but must choose whose obligations to erase', { characters: 5, action: -5 }, { conflictSource: 'SOCIETY', tone: 'MORALLY_GREY' }),
        ],
    },
    SCI_FI: {
        concept: [
            choice('time-loop', 'A Repeating Day or Minute', 'a time loop remembers every failed attempt to escape', { plot: 5, pacing: -5 }, { worldRule: 'TECHNOLOGY' }),
            choice('butterfly-effect', 'Changing the Past Changes a Personal Relationship', 'preventing one accident in the past changes a treasured relationship', { characters: 5, action: -5 }, { worldRule: 'TECHNOLOGY', conflictSource: 'INTERNAL' }),
            choice('future-self', 'A Message from a Future Self', 'a future self sends a warning whose instructions create new dangers', { plot: 5, action: -5 }, { worldRule: 'TECHNOLOGY', conflictSource: 'MYSTERY' }),
            choice('memory-theft', 'A Specialist Steals Memories', 'a memory thief finds a secret hidden across several clients', { plot: 5, action: -5 }, { worldRule: 'TECHNOLOGY', conflictSource: 'MYSTERY' }),
            choice('shared-dream-heist', 'A Heist inside a Shared Dream', 'specialists enter a shared dream for a job that tests what they believe is real', { originality: 5, dialogue: -5 }, { worldRule: 'TECHNOLOGY', perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
            choice('memory-fabrication', 'Manufactured Memories and a Missing Identity', 'unrelated people share a manufactured past that includes the investigator', { characters: 5, action: -5 }, { worldRule: 'TECHNOLOGY', conflictSource: 'MYSTERY' }),
        ],
        setting: [
            choice('present-day-workshop', 'An Ordinary Present-Day Workshop', 'inside an ordinary workshop in the present day', { characters: 5, originality: -5 }),
            choice('recent-past-town', 'A Familiar Town in an Earlier Decade', 'in a familiar town decades before the present', { originality: 5, action: -5 }),
            choice('near-future-metropolis', 'A Near-Future Metropolis', 'in a near-future metropolis where identity is traded', { plot: 5, pacing: -5 }),
            choice('shared-dreamscape', 'A Shared Dreamscape', 'within a shared dreamscape shaped by its occupants', { originality: 5, dialogue: -5 }, { worldRule: 'TECHNOLOGY' }),
        ],
        'tech-level': [
            choice('improvised-invention', 'One Improvised Invention in an Ordinary World', 'using one improvised invention with strict limits', { characters: 5, action: -5 }),
            choice('experimental-neurotech', 'Experimental Memory and Dream Technology', 'using unstable memory and dream technology', { originality: 5, pacing: -5 }, { worldRule: 'TECHNOLOGY' }),
        ],
    },
    MYSTERY: {
        'mystery-engine': [
            choice('unreliable-investigator', 'An Investigator Cannot Trust Their Own Memory', 'an investigator with memory gaps follows a case that contradicts their own recollections', { characters: 5, action: -5 }, { conflictSource: 'MYSTERY' }),
            choice('sealed-institution-disappearance', 'A Disappearance inside a Sealed Institution', 'someone vanishes from an institution nobody could have left', { plot: 5, pacing: -5 }, { conflictSource: 'MYSTERY' }),
            choice('contradictory-witnesses', 'Witnesses Remember Different Versions', 'every witness remembers a different version of the same event', { dialogue: 5, action: -5 }, { conflictSource: 'MYSTERY' }),
            choice('compromised-confession', 'A Confession That Cannot Be True', 'a confession conflicts with the evidence and a missing hour', { plot: 5, action: -5 }, { conflictSource: 'MYSTERY' }),
        ],
        'mystery-reveal': [
            choice('false-memories', 'A Crucial Memory Was False', 'a false memory changes the meaning of the evidence', { characters: 5, action: -5 }, { conflictSource: 'MYSTERY' }),
            choice('protagonist-involved', 'The Investigator Helped Cause the Case', 'the investigator discovers their own role in causing the case', { characters: 5, pacing: -5 }, { conflictSource: 'INTERNAL' }),
            choice('fabricated-evidence', 'The Strongest Evidence Was Manufactured', 'the strongest evidence was manufactured to direct suspicion', { plot: 5, action: -5 }),
            choice('truth-protects-someone', 'The Lie Was Protecting Someone Else', 'the central lie protected someone the investigator must now identify', { characters: 5, pacing: -5 }),
        ],
    },
    THRILLER: {
        mystery: [
            choice('unreliable-investigation', 'An Investigation Turns on the Investigator', 'an investigator finds evidence that challenges their own memories', { characters: 5, action: -5 }, { conflictSource: 'MYSTERY' }),
            choice('coerced-heist', 'A Heist under Coercion', 'a coerced thief must finish a heist while discovering who holds the leverage', { pacing: 5, dialogue: -5 }, { conflictSource: 'ANTAGONIST' }),
            choice('corporate-coverup', 'A Company Conceals a Crime', 'an employee uncovers a crime the company is desperate to conceal', { plot: 5, action: -5 }, { conflictSource: 'SOCIETY' }),
            choice('memory-theft-case', 'Stolen Memories Conceal a Crime', 'stolen memories hide a crime whose witnesses no longer remember it', { originality: 5, action: -5 }, { worldRule: 'TECHNOLOGY', conflictSource: 'MYSTERY' }),
        ],
        pacing: [
            choice('looped-countdown', 'A Countdown That Keeps Restarting', 'the same deadline restarts after every failed attempt', { plot: 5, pacing: -5 }, { worldRule: 'TECHNOLOGY' }),
            choice('parallel-deadlines', 'Two Deadlines Converge', 'two separate deadlines converge on the same decision', { pacing: 5, originality: -5 }),
        ],
    },
    SUPERHERO: {
        origin: [
            choice('recruited-hero-team', 'Heroes with Separate Origins Are Recruited Together', 'heroes from separate origins form a reluctant alliance', { characters: 5, action: -5 }, { worldRule: 'SUPERPOWERED', perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
            choice('fractured-hero-team', 'A Broken Hero Team Must Reunite', 'a fractured hero team must rebuild trust before confronting a shared threat', { characters: 5, pacing: -5 }, { worldRule: 'SUPERPOWERED', perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
            choice('power-cancelling-team', 'Heroes Whose Powers Disrupt Each Other', 'heroes whose powers interfere must learn coordinated teamwork', { originality: 5, action: -5 }, { worldRule: 'SUPERPOWERED', perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
            choice('ordinary-team-extraordinary-crisis', 'Ordinary Specialists Become a Hero Team', 'ordinary specialists become heroes through a coordinated response to a crisis', { characters: 5, originality: -5 }, { worldRule: 'GROUNDED', perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
        ],
        'villain-type': [
            choice('engineered-crisis', 'A Protector Secretly Engineers the Crisis', 'a trusted protector secretly engineers the crisis', { plot: 5, action: -5 }, { conflictSource: 'ANTAGONIST' }),
            choice('rogue-protector-ai', 'A Protective AI Turns against Its Creators', 'a protective AI decides people are the threat it must contain', { plot: 5, dialogue: -5 }, { worldRule: 'TECHNOLOGY', conflictSource: 'ANTAGONIST' }),
            choice('rival-hero-coalition', 'A Rival Coalition of Heroes', 'another hero coalition pursues an incompatible idea of justice', { characters: 5, action: -5 }, { conflictSource: 'RIVAL' }),
        ],
    },
    COMEDY: {
        premise: [
            choice('dealership-rivals', 'Rival Car Dealers Chase the Same Big Sale', 'rival car dealers form a disastrous partnership to win one big sale', { dialogue: 5, action: -5 }, { conflictSource: 'RIVAL', tone: 'COMEDIC' }),
            choice('failed-heist-amateurs', 'Amateurs Attempt a Professional Heist', 'amateurs attempt a heist whose plan gets worse with every improvisation', { pacing: 5, plot: -5 }, { tone: 'COMEDIC' }),
            choice('family-business-chaos', 'A Family Business Goes Publicly Wrong', 'a family business becomes a public disaster at its biggest opportunity', { characters: 5, originality: -5 }, { tone: 'COMEDIC' }),
        ],
        'humor-style': [
            choice('bureaucratic-farce', 'Bureaucratic Farce', 'bureaucratic rules turn a small problem into a ridiculous ordeal', { dialogue: 5, action: -5 }, { tone: 'COMEDIC' }),
        ],
        'comedic-duo': [
            choice('rival-business-partners', 'Business Rivals Forced into Partnership', 'business rivals must share credit and responsibility', { dialogue: 5, pacing: -5 }, { perspective: 'DUAL' }),
            choice('estranged-siblings', 'Estranged Siblings Running the Same Business', 'estranged siblings must run the same business', { characters: 5, action: -5 }, { perspective: 'DUAL' }),
        ],
    },
    DRAMA: {
        conflict: [
            choice('provider-moral-descent', 'A Family Provider Crosses an Ethical Line', 'a family provider crosses an ethical line and becomes unwilling to stop', { characters: 5, action: -5 }, { conflictSource: 'INTERNAL', tone: 'MORALLY_GREY' }),
            choice('business-survival', 'Save a Failing Small Business', 'a small business owner must decide what to sacrifice to survive', { characters: 5, originality: -5 }, { conflictSource: 'SOCIETY' }),
            choice('ambition-vs-integrity', 'Career Ambition against Professional Integrity', 'a journalist must correct a celebrated story built on compromised evidence', { dialogue: 5, action: -5 }, { conflictSource: 'INTERNAL' }),
            choice('family-business-control', 'Who Gets to Define the Family Business?', 'estranged siblings rebuild a family restaurant while disagreeing on success', { characters: 5, pacing: -5 }, { perspective: 'DUAL', conflictSource: 'RIVAL' }),
            choice('legal-innocence', 'Defend Someone Nobody Believes', 'a public defender challenges a confession nobody wants questioned', { plot: 5, action: -5 }, { conflictSource: 'SOCIETY' }),
        ],
        tone: [
            choice('morally-grey', 'Morally Grey and Intimate', 'told through morally grey choices with intimate consequences', { characters: 5, action: -5 }, { tone: 'MORALLY_GREY' }),
            choice('warm-grounded', 'Warm and Grounded', 'told with warmth and everyday detail', { characters: 5, originality: -5 }, { tone: 'HEROIC' }),
        ],
        resolution: [
            choice('reject-power', 'Choose to Give Up Power', 'the protagonist chooses to give up power', { characters: 5, pacing: -5 }),
            choice('public-accountability', 'Tell the Truth and Accept the Consequences', 'the protagonist tells the truth and accepts public consequences', { dialogue: 5, action: -5 }),
            choice('business-saved-relationship-lost', 'Save the Business, Lose the Relationship', 'the business survives but a relationship does not', { characters: 5, action: -5 }, { tone: 'TRAGIC' }),
        ],
    },
    SPORTS: {
        'sports-arc': [
            choice('underdog-racing-team', 'An Underdog Racing Team', 'an underfunded racing team challenges a dominant manufacturer', { action: 5, dialogue: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE', conflictSource: 'RIVAL' }),
            choice('driver-engineer-partnership', 'A Driver and Engineer Build One Last Chance', 'a mechanic and an ageing driver build a car while facing a sponsor safety compromise', { characters: 5, originality: -5 }, { perspective: 'DUAL', conflictSource: 'RIVAL' }),
        ],
        arena: [
            choice('final-lap', 'The Final Lap of an Endurance Race', 'the final lap tests the team and its machine', { action: 5, dialogue: -5 }),
            choice('sponsor-safety-hearing', 'A Sponsor Hearing about Safety', 'a sponsor hearing forces a choice between funding and safety', { dialogue: 5, action: -5 }, { conflictSource: 'SOCIETY' }),
        ],
    },
    ROMANCE: {
        'meet-cute': [
            choice('time-displaced-lovers', 'Lovers Meet across Different Times', 'two people meet across different times', { originality: 5, action: -5 }, { perspective: 'DUAL', worldRule: 'TECHNOLOGY' }),
            choice('reunited-business-partners', 'Former Partners Rebuild a Business', 'former partners must rebuild a business together', { characters: 5, originality: -5 }, { perspective: 'DUAL' }),
        ],
        obstacle: [
            choice('changing-timeline', 'Each Timeline Change Alters Their Relationship', 'each change to the timeline alters what they mean to each other', { characters: 5, pacing: -5 }, { worldRule: 'TECHNOLOGY' }),
            choice('love-vs-shared-business', 'Their Shared Dream Needs Different Futures', 'their shared business dream demands incompatible futures', { characters: 5, action: -5 }, { conflictSource: 'INTERNAL' }),
        ],
    },
    ADVENTURE: {
        goal: [
            choice('return-from-wrong-era', 'Find a Way Home from the Wrong Era', 'travellers stranded in the wrong era search for a way home', { originality: 5, dialogue: -5 }, { worldRule: 'TECHNOLOGY' }),
            choice('recover-stolen-prototype', 'Recover a Stolen Prototype', 'an expedition pursues a stolen invention before it can be misused', { plot: 5, action: -5 }, { conflictSource: 'ANTAGONIST' }),
        ],
        location: [
            choice('historic-city', 'A City in an Earlier Century', 'in a city centuries before the present', { originality: 5, dialogue: -5 }),
            choice('industrial-frontier', 'A Rapidly Changing Industrial Frontier', 'across an industrial frontier transformed by new inventions', { plot: 5, pacing: -5 }),
        ],
    },
    HORROR: {
        threat: [
            choice('unreliable-memory', 'Memories That Cannot Be Trusted', 'contradictory memories make a familiar place feel threatening', { characters: 5, action: -5 }, { worldRule: 'GROUNDED', conflictSource: 'MYSTERY' }),
            choice('experiment-without-exit', 'A Human Experiment with No Safe Exit', 'volunteers discover an experiment has no safe way to stop', { plot: 5, action: -5 }, { worldRule: 'TECHNOLOGY', conflictSource: 'ANTAGONIST' }),
        ],
        setting: [
            choice('clinical-research-facility', 'A Clinical Research Facility', 'inside a clinical research facility beyond outside scrutiny', { plot: 5, pacing: -5 }),
        ],
        'victim-type': [
            choice('test-subject-group', 'Volunteers in an Experimental Trial', 'trial volunteers disagree over whom they can trust', { characters: 5, originality: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
        ],
        twist: [
            choice('manufactured-reality', 'Their Reality Was Deliberately Manufactured', 'their apparent reality was deliberately manufactured', { originality: 5, action: -5 }, { worldRule: 'TECHNOLOGY', conflictSource: 'MYSTERY' }),
        ],
    },
    ANIMATION: {
        'animation-world': [
            choice('timekeeper-city', 'A City Governed by Timekeepers', 'a city of timekeepers faces the cost of changing yesterday', { originality: 5, action: -5 }, { worldRule: 'MAGIC' }),
            choice('miniature-machine-town', 'A Tiny Town inside an Ordinary Machine', 'tiny repair crews keep a town inside an ordinary machine alive', { characters: 5, originality: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
        ],
    },
    FANTASY: {
        myth: [
            choice('stolen-memories', 'A Market Where Memories Can Be Stolen', 'a memory thief discovers a stolen past at the heart of a kingdom', { plot: 5, action: -5 }, { worldRule: 'MAGIC', conflictSource: 'MYSTERY' }),
            choice('time-bargain', 'A Bargain That Trades Years of Life', 'a bargain grants another chance at the cost of years from someone else', { characters: 5, action: -5 }, { worldRule: 'MAGIC', tone: 'MORALLY_GREY' }),
        ],
    },
    MUSICAL: {
        'music-style': [
            choice('working-class-revue', 'A Working-Class Revue', 'workers stage a revue to save a community business', { characters: 5, action: -5 }, { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }),
        ],
        'emotional-core': [
            choice('ambition-vs-belonging', 'Ambition against Belonging', 'a performer must choose what success means to their community', { characters: 5, pacing: -5 }, { conflictSource: 'INTERNAL' }),
        ],
    },
    BIOPIC: {
        'subject-angle': [
            choice('ethical-crossroads', 'The Decision That Tested Their Integrity', 'a defining ethical choice changes the subject and their legacy', { characters: 5, action: -5 }, { conflictSource: 'INTERNAL' }),
        ],
        access: [
            choice('conflicting-accounts', 'Conflicting Accounts of the Same Life', 'contradictory accounts challenge the familiar public story', { plot: 5, pacing: -5 }, { conflictSource: 'MYSTERY' }),
        ],
    },
    DOCUMENTARY: {
        'doc-approach': [
            choice('follow-business-rise', 'Follow a Business from Struggle to Success', 'a documentary follows a business as growth changes the people behind it', { characters: 5, action: -5 }),
        ],
        'source-access': [
            choice('court-records', 'Court Records and Financial Documents', 'using court records and financial documents', { plot: 5, action: -5 }, { conflictSource: 'MYSTERY' }),
        ],
    },
};
