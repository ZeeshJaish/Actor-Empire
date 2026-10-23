import type { Genre } from '../../types';
import type { ScriptChoice } from './scriptTemplates';

/** New answers to existing questions. DNA trade-offs avoid a universal best choice. */
export const SCRIPT_VARIATIONS: Record<Genre, Record<string, ScriptChoice[]>> = {
    ADVENTURE: {
        goal: [
            { id: 'cursed-treasure', text: 'Seek Cursed Pirate Treasure', premise: 'a pirate crew seeks cursed treasure', dna: { plot: 5, dialogue: -5 }, compass: { worldRule: 'SUPERNATURAL', perspective: 'ENSEMBLE', castShape: 'ENSEMBLE', conflictSource: 'ANTAGONIST' }, reviewSnippet: 'a pirate treasure hunt haunted by a dangerous curse', newsHeadline: 'The cursed pirate treasure gives the adventure a supernatural hook.' },
            { id: 'break-sea-curse', text: 'Break a Sea Curse', premise: 'a sailor must break an ancient sea curse', dna: { originality: 5, pacing: -5 }, compass: { worldRule: 'SUPERNATURAL', conflictSource: 'MYSTERY' }, reviewSnippet: 'a voyage to uncover and undo an ancient curse', newsHeadline: 'The sea-curse mystery gives the voyage a clear purpose.' },
            { id: 'rescue-pirate-crew', text: 'Rescue a Captured Crew', premise: 'a rogue captain races to rescue a captured crew', dna: { characters: 5, originality: -5 }, compass: { conflictSource: 'ANTAGONIST', tone: 'MORALLY_GREY' }, reviewSnippet: 'a rogue captain choosing loyalty over treasure', newsHeadline: 'The crew rescue brings personal stakes to the adventure.' },
            { id: 'rival-expedition', text: 'Outrace a Rival Expedition', premise: 'two expeditions race for a lost discovery', dna: { pacing: 5, dialogue: -5 }, compass: { conflictSource: 'RIVAL' }, reviewSnippet: 'a race between rival explorers with competing loyalties', newsHeadline: 'The rival expeditions turn discovery into a tense race.' },
        ],
        location: [
            { id: 'high-seas', text: 'High Seas & Pirate Ports', premise: 'across the high seas and pirate ports', dna: { action: 5, characters: -5 }, reviewSnippet: 'ship battles and uneasy bargains in pirate ports', newsHeadline: 'The high-seas setting brings naval spectacle to the adventure.' },
            { id: 'island-chain', text: 'Uncharted Island Chain', premise: 'among uncharted islands', dna: { originality: 5, dialogue: -5 }, reviewSnippet: 'island hopping through an unpredictable frontier', newsHeadline: 'The uncharted islands make each discovery feel dangerous.' },
            { id: 'sunken-kingdom', text: 'Sunken Kingdom', premise: 'in the ruins of a sunken kingdom', dna: { plot: 5, pacing: -5 }, reviewSnippet: 'a submerged civilization with secrets worth protecting', newsHeadline: 'The sunken kingdom gives the expedition a striking setting.' },
            { id: 'polar-frontier', text: 'Frozen Polar Frontier', premise: 'on an unforgiving polar frontier', dna: { action: 5, dialogue: -5 }, compass: { conflictSource: 'NATURE' }, reviewSnippet: 'an expedition tested by ice, isolation, and endurance', newsHeadline: 'The polar expedition puts survival at the centre of the journey.' },
        ],
    },
    ACTION: {
        protagonist: [
            { id: 'rogue-captain', text: 'Rogue Ship Captain', premise: 'a rogue ship captain fights for freedom', dna: { characters: 5, plot: -5 }, compass: { tone: 'MORALLY_GREY' }, reviewSnippet: 'a resourceful captain with shifting loyalties', newsHeadline: 'The rogue captain gives the action a rebellious streak.' },
            { id: 'martial-artist', text: 'Disgraced Martial Artist', premise: 'a disgraced martial artist returns to the fight', dna: { action: 5, dialogue: -5 }, reviewSnippet: 'a fighter rebuilding purpose through discipline', newsHeadline: 'The martial-arts lead brings physical precision to the action.' },
        ],
        'inciting-incident': [
            { id: 'crew-mutiny', text: 'A Crew Mutiny', premise: 'a mutiny turns trusted allies into enemies', dna: { characters: 5, originality: -5 }, compass: { conflictSource: 'ANTAGONIST' }, reviewSnippet: 'betrayal inside the crew makes every alliance uncertain', newsHeadline: 'The mutiny puts loyalty under pressure from the opening act.' },
        ],
        sidekick: [
            { id: 'rival-swordsman', text: 'Reluctant Rival Swordsman', premise: 'rival swordsmen must work together', dna: { dialogue: 5, pacing: -5 }, compass: { perspective: 'DUAL' }, reviewSnippet: 'swordplay sharpened by a reluctant partnership', newsHeadline: 'The rival swordsmen turn banter into a weapon.' },
        ],
        'set-piece': [
            { id: 'naval-battle', text: 'Naval Battle & Ship Boarding', premise: 'a naval battle becomes a desperate boarding fight', dna: { action: 5, dialogue: -5 }, reviewSnippet: 'cannon fire giving way to close-quarters ship combat', newsHeadline: 'The ship-boarding sequence anchors the naval spectacle.' },
            { id: 'sword-duel', text: 'Clifftop Sword Duel', premise: 'a sword duel unfolds above a sheer drop', dna: { action: 5, plot: -5 }, reviewSnippet: 'precise swordplay with nowhere safe to retreat', newsHeadline: 'The clifftop duel gives the action a memorable centrepiece.' },
        ],
        'villain-motivation': [
            { id: 'imperial-control', text: 'Control of the Trade Routes', premise: 'an antagonist seeks control of the trade routes', dna: { plot: 5, action: -5 }, compass: { conflictSource: 'ANTAGONIST' }, reviewSnippet: 'power built by controlling who can sail and trade', newsHeadline: 'The battle over trade routes gives the villain a concrete ambition.' },
        ],
        'climax-location': [
            { id: 'burning-flagship', text: 'A Burning Flagship', premise: 'the final confrontation engulfs a burning flagship', dna: { action: 5, originality: -5 }, reviewSnippet: 'a shipboard finale collapsing around the combatants', newsHeadline: 'The burning flagship turns the finale into a fight for escape.' },
        ],
        ending: [
            { id: 'earned-freedom', text: 'Freedom at a Personal Cost', premise: 'freedom is won at a personal cost', dna: { characters: 5, pacing: -5 }, compass: { tone: 'MORALLY_GREY' }, reviewSnippet: 'victory that leaves the hero changed', newsHeadline: 'The costly escape gives the action an emotional aftertaste.' },
        ],
    },
    HORROR: {
        threat: [
            { id: 'folk-ritual', text: 'Ancient Folk Ritual', premise: 'a community hides a deadly ritual', dna: { originality: 5, action: -5 }, reviewSnippet: 'familiar traditions concealing a chilling purpose', newsHeadline: 'The folk-horror ritual gives ordinary customs an unsettling edge.' },
            { id: 'sea-monster', text: 'Deep-Sea Monster', premise: 'a crew confronts a deep-sea monster', dna: { action: 5, dialogue: -5 }, compass: { conflictSource: 'ANTAGONIST' }, reviewSnippet: 'an unseen creature making the open water feel confined', newsHeadline: 'The deep-sea threat turns every glimpse below the surface into suspense.' },
        ],
        setting: [
            { id: 'ghost-ship', text: 'Ghost Ship at Sea', premise: 'aboard a ghost ship at sea', dna: { plot: 5, pacing: -5 }, compass: { worldRule: 'SUPERNATURAL' }, reviewSnippet: 'a haunted vessel with no easy way ashore', newsHeadline: 'The ghost ship makes escape as frightening as staying aboard.' },
        ],
        'victim-type': [
            { id: 'salvage-crew', text: 'Stranded Salvage Crew', premise: 'a salvage crew is stranded beyond help', dna: { characters: 5, originality: -5 }, compass: { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }, reviewSnippet: 'working relationships fraying as rescue slips away', newsHeadline: 'The stranded crew gives the horror a tense group dynamic.' },
        ],
        twist: [
            { id: 'curse-bargain', text: 'Survival Passes on the Curse', premise: 'survival requires passing the curse to someone else', dna: { plot: 5, action: -5 }, compass: { worldRule: 'SUPERNATURAL', tone: 'MORALLY_GREY' }, reviewSnippet: 'a final bargain that makes survival morally unsettling', newsHeadline: 'The curse bargain leaves viewers debating the survivors.' },
        ],
    },
    SCI_FI: {
        concept: [
            { id: 'space-salvage', text: 'Space Salvage & Smugglers', premise: 'space smugglers salvage something they cannot safely sell', dna: { characters: 5, plot: -5 }, reviewSnippet: 'a scrappy crew caught between survival and profit', newsHeadline: 'The space-salvage crew brings human stakes to the technology.' },
            { id: 'first-colony', text: 'First Human Colony', premise: 'the first human colony faces an impossible decision', dna: { originality: 5, action: -5 }, compass: { conflictSource: 'SOCIETY' }, reviewSnippet: 'a new society built under unfamiliar pressures', newsHeadline: 'The colony concept asks what humanity carries into a new world.' },
        ],
        setting: [
            { id: 'orbital-city', text: 'Orbital Frontier City', premise: 'in a crowded orbital frontier city', dna: { plot: 5, pacing: -5 }, reviewSnippet: 'an orbital city divided by wealth and access', newsHeadline: 'The orbital frontier gives the sci-fi an inhabited, everyday texture.' },
        ],
        'tech-level': [
            { id: 'retrofuture', text: 'Retrofuturistic Machines', premise: 'with unreliable retrofuturistic machines', dna: { originality: 5, action: -5 }, reviewSnippet: 'a future assembled from tactile, imperfect machinery', newsHeadline: 'The retrofuturistic technology gives the film a distinctive identity.' },
        ],
    },
    COMEDY: {
        premise: [
            { id: 'mistaken-identity', text: 'Mistaken Identity Caper', premise: 'a mistaken identity pulls an innocent into a caper', dna: { plot: 5, action: -5 }, reviewSnippet: 'one misunderstanding multiplying into a chain of disasters', newsHeadline: 'The mistaken-identity caper builds its laughs on escalating consequences.' },
            { id: 'workplace-chaos', text: 'Workplace in Chaos', premise: 'an ordinary workplace faces an extraordinary disaster', dna: { characters: 5, originality: -5 }, reviewSnippet: 'recognizable colleagues revealing their worst instincts under pressure', newsHeadline: 'The workplace ensemble finds comedy in familiar frustrations.' },
        ],
        'humor-style': [
            { id: 'deadpan', text: 'Dry Deadpan', premise: 'played with dry deadpan humour', dna: { dialogue: 5, pacing: -5 }, reviewSnippet: 'absurd situations delivered with a straight face', newsHeadline: 'The deadpan delivery lets the audience discover the jokes.' },
        ],
        'comedic-duo': [
            { id: 'rival-captains', text: 'Two Rival Captains', premise: 'two rival captains compete for the same prize', dna: { dialogue: 5, action: -5 }, compass: { perspective: 'DUAL', conflictSource: 'RIVAL' }, reviewSnippet: 'competing egos trying to outwit each other', newsHeadline: 'The rival captains give the comedy a lively battle of wills.' },
        ],
    },
    DRAMA: {
        conflict: [
            { id: 'migration-family', text: 'A Family Starting Over Abroad', premise: 'a family tries to rebuild its life in a new country', dna: { characters: 5, action: -5 }, compass: { conflictSource: 'SOCIETY' }, reviewSnippet: 'a family negotiating belonging across generations', newsHeadline: 'The migration story finds drama in the details of starting over.' },
            { id: 'labour-dispute', text: 'Workers Against a Powerful Employer', premise: 'workers challenge a powerful employer', dna: { plot: 5, pacing: -5 }, compass: { conflictSource: 'SOCIETY', perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }, reviewSnippet: 'a collective struggle tested by individual needs', newsHeadline: 'The labour dispute gives the ensemble a shared struggle.' },
        ],
        tone: [
            { id: 'hopeful', text: 'Quietly Hopeful', premise: 'told with quiet hope', dna: { characters: 5, action: -5 }, compass: { tone: 'HEROIC' }, reviewSnippet: 'finding hope without simplifying hardship', newsHeadline: 'The restrained optimism gives the drama room to breathe.' },
        ],
        resolution: [
            { id: 'reconciliation', text: 'An Uneasy Reconciliation', premise: 'ending in an uneasy reconciliation', dna: { dialogue: 5, pacing: -5 }, reviewSnippet: 'repair beginning without every wound being healed', newsHeadline: 'The reconciliation leaves space for unresolved feelings.' },
        ],
    },
    ROMANCE: {
        'meet-cute': [
            { id: 'second-chance', text: 'Former Lovers Reunited', premise: 'former lovers meet again after years apart', dna: { characters: 5, originality: -5 }, compass: { perspective: 'DUAL' }, reviewSnippet: 'old affection complicated by who they have become', newsHeadline: 'The reunion gives the romance a shared history to reckon with.' },
            { id: 'adventure-partners', text: 'Partners on a Dangerous Journey', premise: 'two reluctant partners fall in love on a dangerous journey', dna: { action: 5, dialogue: -5 }, compass: { perspective: 'DUAL' }, reviewSnippet: 'trust growing while the journey tests both leads', newsHeadline: 'The shared adventure gives the romance an active emotional journey.' },
        ],
        obstacle: [
            { id: 'opposing-loyalties', text: 'Loyalty to Opposing Sides', premise: 'while loyalty to opposing sides threatens their bond', dna: { plot: 5, pacing: -5 }, reviewSnippet: 'love tested by commitments neither can easily abandon', newsHeadline: 'The opposing loyalties give the central relationship difficult choices.' },
        ],
    },
    THRILLER: {
        mystery: [
            { id: 'hostage-negotiation', text: 'Hostage Negotiation', premise: 'a negotiator races to end a hostage crisis', dna: { dialogue: 5, action: -5 }, compass: { conflictSource: 'ANTAGONIST' }, reviewSnippet: 'a battle of information and nerve', newsHeadline: 'The negotiation makes every exchanged word carry risk.' },
            { id: 'maritime-conspiracy', text: 'Conspiracy on a Cargo Ship', premise: 'a cargo ship crew uncovers a maritime conspiracy', dna: { plot: 5, action: -5 }, compass: { conflictSource: 'MYSTERY' }, reviewSnippet: 'a conspiracy with nowhere to hide at sea', newsHeadline: 'The cargo-ship mystery turns isolation into pressure.' },
        ],
        pacing: [
            { id: 'real-time', text: 'Real-Time Countdown', premise: 'unfolding against a real-time deadline', dna: { pacing: 5, originality: -5 }, reviewSnippet: 'a deadline felt in each passing scene', newsHeadline: 'The real-time structure puts the audience under the same clock.' },
        ],
    },
    MYSTERY: {
        'mystery-engine': [
            { id: 'missing-ship', text: 'A Ship Returns Without Its Crew', premise: 'a ship returns without its crew and with no explanation', dna: { plot: 5, action: -5 }, compass: { conflictSource: 'MYSTERY' }, reviewSnippet: 'an empty vessel concealing the fate of its crew', newsHeadline: 'The missing-crew puzzle gives the mystery a haunting starting point.' },
            { id: 'archaeological-cipher', text: 'An Archaeological Cipher', premise: 'an ancient cipher draws investigators into a forgotten secret', dna: { originality: 5, pacing: -5 }, compass: { conflictSource: 'MYSTERY' }, reviewSnippet: 'historical clues that reward careful attention', newsHeadline: 'The archaeological cipher turns discovery into deduction.' },
        ],
        'mystery-reveal': [
            { id: 'staged-disappearance', text: 'A Carefully Staged Disappearance', premise: 'building toward a deliberately staged disappearance', dna: { plot: 5, dialogue: -5 }, reviewSnippet: 'a reveal that reinterprets the absence at the centre of the case', newsHeadline: 'The staged-disappearance reveal asks viewers to revisit the clues.' },
        ],
    },
    SUPERHERO: {
        origin: [
            { id: 'inherited-mantle', text: 'An Inherited Mantle', premise: 'a reluctant successor inherits a heroic mantle', dna: { characters: 5, originality: -5 }, reviewSnippet: 'a new hero struggling with the weight of a legacy', newsHeadline: 'The inherited mantle makes heroism a question of responsibility.' },
            { id: 'ocean-guardian', text: 'Guardian of an Ocean Kingdom', premise: 'an ocean guardian must protect a divided kingdom', dna: { originality: 5, dialogue: -5 }, reviewSnippet: 'heroism shaped by an undersea civilization', newsHeadline: 'The ocean guardian expands the superhero world beneath the waves.' },
        ],
        'villain-type': [
            { id: 'fallen-mentor', text: 'A Fallen Mentor', premise: 'against a former mentor who has abandoned their ideals', dna: { characters: 5, action: -5 }, compass: { conflictSource: 'ANTAGONIST' }, reviewSnippet: 'the teacher becoming the hero\'s hardest test', newsHeadline: 'The fallen mentor makes the superhero conflict deeply personal.' },
        ],
    },
    MUSICAL: {
        'music-style': [
            { id: 'folk-voyage', text: 'Folk Songs & Sea Shanties', premise: 'a voyage told through folk songs and sea shanties', dna: { dialogue: 5, action: -5 }, reviewSnippet: 'working songs carrying the hopes of a travelling crew', newsHeadline: 'The sea-shanty musical finds its rhythm in shared work and adventure.' },
            { id: 'dance-battle', text: 'Street-Dance Musical', premise: 'street dancers compete to keep their community together', dna: { action: 5, plot: -5 }, reviewSnippet: 'movement telling the story as much as the songs', newsHeadline: 'The street-dance sequences give the musical a physical pulse.' },
        ],
        'emotional-core': [
            { id: 'homecoming', text: 'Finding a Way Home', premise: 'driven by the longing to find a way home', dna: { characters: 5, pacing: -5 }, reviewSnippet: 'music turning distance from home into a shared feeling', newsHeadline: 'The homecoming theme gives the songs an emotional destination.' },
        ],
    },
    BIOPIC: {
        'subject-angle': [
            { id: 'pivotal-week', text: 'One Pivotal Week', premise: 'one pivotal week that changes the subject\'s life', dna: { pacing: 5, originality: -5 }, reviewSnippet: 'a focused period revealing a larger life', newsHeadline: 'The pivotal-week structure keeps the biopic tightly focused.' },
            { id: 'hidden-work', text: 'The Work Behind the Legacy', premise: 'the unseen work behind a public legacy', dna: { characters: 5, action: -5 }, reviewSnippet: 'process and persistence beneath the celebrated achievement', newsHeadline: 'The biopic looks beyond fame to the work that built the legacy.' },
        ],
        access: [
            { id: 'letters-diaries', text: 'Personal Letters & Diaries', premise: 'seen through personal letters and diaries', dna: { dialogue: 5, pacing: -5 }, reviewSnippet: 'private writing complicating the public record', newsHeadline: 'The personal archives give the biography an intimate perspective.' },
        ],
    },
    SPORTS: {
        'sports-arc': [
            { id: 'endurance-race', text: 'An Impossible Endurance Race', premise: 'a competitor enters an apparently impossible endurance race', dna: { action: 5, dialogue: -5 }, compass: { conflictSource: 'NATURE' }, reviewSnippet: 'endurance exposing the limits of ambition', newsHeadline: 'The endurance race makes finishing as meaningful as winning.' },
            { id: 'team-rebuild', text: 'Rebuild a Broken Team', premise: 'a divided team must learn to compete together', dna: { characters: 5, originality: -5 }, compass: { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }, reviewSnippet: 'trust rebuilt through practice, setbacks, and shared responsibility', newsHeadline: 'The team rebuild gives every player a part in the sporting journey.' },
        ],
        arena: [
            { id: 'qualifying-round', text: 'A Make-or-Break Qualifier', premise: 'at a make-or-break qualifying event', dna: { pacing: 5, plot: -5 }, compass: { conflictSource: 'RIVAL' }, reviewSnippet: 'an early hurdle carrying the weight of a whole career', newsHeadline: 'The qualifier turns a first step into a decisive sporting moment.' },
        ],
    },
    ANIMATION: {
        'animation-world': [
            { id: 'sky-islands', text: 'Floating Sky Islands', premise: 'an adventure across floating sky islands', dna: { originality: 5, plot: -5 }, compass: { worldRule: 'MAGIC' }, reviewSnippet: 'a skyborne world built around discovery and distance', newsHeadline: 'The floating islands give the animation a playful sense of scale.' },
            { id: 'undersea-city', text: 'An Undersea Civilization', premise: 'a hidden civilization beneath the sea', dna: { characters: 5, pacing: -5 }, reviewSnippet: 'a lived-in community beneath a familiar surface', newsHeadline: 'The undersea city gives the animation a rich social world.' },
            { id: 'clockwork-world', text: 'A Clockwork World', premise: 'an adventure in a world of clockwork machines', dna: { plot: 5, dialogue: -5 }, compass: { worldRule: 'TECHNOLOGY' }, reviewSnippet: 'mechanical wonders with human consequences', newsHeadline: 'The clockwork world gives the animation a tactile visual identity.' },
        ],
    },
    FANTASY: {
        myth: [
            { id: 'cursed-pirate-captain', text: 'Cursed Pirate Captain', premise: 'a cursed pirate captain bargains for freedom', dna: { characters: 5, action: -5 }, compass: { worldRule: 'SUPERNATURAL', tone: 'MORALLY_GREY', conflictSource: 'ANTAGONIST' }, reviewSnippet: 'a captain whose supernatural bargain demands a personal price', newsHeadline: 'The cursed captain brings seafaring adventure into the fantasy realm.' },
            { id: 'dragon-bond', text: 'A Bond with a Dragon', premise: 'an unlikely rider forms a bond with a dragon', dna: { characters: 5, plot: -5 }, compass: { worldRule: 'MAGIC' }, reviewSnippet: 'trust between human and dragon carrying the fantasy', newsHeadline: 'The dragon bond gives the spectacle an emotional relationship.' },
            { id: 'portal-quest', text: 'Quest Through a Hidden Portal', premise: 'travellers enter a hidden realm through a portal', dna: { originality: 5, dialogue: -5 }, compass: { worldRule: 'MAGIC' }, reviewSnippet: 'a familiar world opening into an unfamiliar realm', newsHeadline: 'The portal quest gives the fantasy a clear journey of discovery.' },
            { id: 'mythic-sea-beast', text: 'Pact with a Mythic Sea Beast', premise: 'a coastal kingdom makes a pact with a mythic sea beast', dna: { plot: 5, pacing: -5 }, compass: { worldRule: 'MAGIC', conflictSource: 'ANTAGONIST' }, reviewSnippet: 'a bargain between a kingdom and the power beneath its waters', newsHeadline: 'The sea-beast pact makes the fantasy a story of consequences.' },
        ],
    },
    CRIME: {
        'crime-focus': [
            { id: 'smuggling-network', text: 'Port-City Smuggling Network', premise: 'a port-city smuggling network threatens to unravel', dna: { plot: 5, action: -5 }, compass: { tone: 'MORALLY_GREY' }, reviewSnippet: 'a criminal economy held together by fragile loyalties', newsHeadline: 'The smuggling network gives the crime story a distinctive coastal setting.' },
            { id: 'con-artists', text: 'A Crew of Con Artists', premise: 'a crew of con artists attempts a dangerous deception', dna: { dialogue: 5, action: -5 }, compass: { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }, reviewSnippet: 'a criminal crew whose greatest risk is trusting each other', newsHeadline: 'The con-artist ensemble makes deception the story\'s central weapon.' },
            { id: 'prison-escape', text: 'An Inside-Out Prison Escape', premise: 'prisoners build an escape plan under constant surveillance', dna: { pacing: 5, originality: -5 }, compass: { conflictSource: 'SOCIETY' }, reviewSnippet: 'a tightly planned escape tested by institutional pressure', newsHeadline: 'The prison escape turns small choices into high-stakes risks.' },
        ],
    },
    DOCUMENTARY: {
        'doc-approach': [
            { id: 'expedition-record', text: 'Follow an Expedition', premise: 'a documentary following an expedition into unfamiliar terrain', dna: { action: 5, dialogue: -5 }, compass: { conflictSource: 'NATURE' }, reviewSnippet: 'discovery recorded alongside the risks of getting there', newsHeadline: 'The expedition documentary puts the process of discovery on screen.' },
            { id: 'oral-history', text: 'A Community\'s Oral History', premise: 'a community reconstructs its history through shared memories', dna: { characters: 5, pacing: -5 }, compass: { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }, reviewSnippet: 'individual memories building a complex collective account', newsHeadline: 'The oral history lets contrasting memories share the same frame.' },
        ],
        'source-access': [
            { id: 'field-records', text: 'Recovered Field Records', premise: 'using recovered field records', dna: { plot: 5, action: -5 }, reviewSnippet: 'field notes and recordings tracing events as they unfolded', newsHeadline: 'The recovered records give the documentary a detailed evidence trail.' },
        ],
    },
};
