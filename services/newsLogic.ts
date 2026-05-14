
import { GameLanguage, Player, NewsItem, NewsCategory, ActiveRelease, Commitment, ProjectType, BudgetTier } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { STUDIO_CATALOG } from './studioLogic';
import { AWARD_GOSSIP_TEMPLATES, SNUB_TEMPLATES } from './awardLogic'; // Import templates
import { normalizeUniverseMap } from './universeLogic';
import { getPlayerLanguage } from './i18n';

// ... (Keep existing TEMPLATES arrays like INDUSTRY_TEMPLATES, NPC_HEADLINES, etc.)
const INDUSTRY_TEMPLATES = [
    "Studio executives report 'franchise fatigue' among younger audiences.",
    "Indie cinema sees a 15% uptick in ticket sales this quarter.",
    "Streaming wars intensify as platforms bid for exclusive rights.",
    "Union negotiations stall, raising fears of a production halt.",
    "International markets becoming the key driver for blockbusters.",
    "Critics declare the 'Age of the Movie Star' is returning.",
    "Horror genre continues to offer highest ROI for studios.",
    "Romantic Comedies making a surprise comeback this season.",
    "VFX artists protest over tight deadlines on major tentpoles.",
    "Luxury brands increase investment in celebrity-led campaigns.",
    "Studios quietly shift more projects toward mid-budget thrillers.",
    "Executives say test-screening data now drives more endings than ever.",
    "Industry insiders warn that inflated salaries are squeezing production slates.",
    "A wave of first-look deals signals a renewed fight over top talent.",
    "Celebrity-founded production companies are taking a bigger share of the market.",
    "Awards strategists say authenticity is now the most valuable campaign asset.",
    "Analysts credit social chatter for saving several weak opening weekends.",
    "Studios debate whether star power or IP is the safer bet in 2026.",
    "Private equity money continues to reshape independent film financing.",
    "Prestige distributors are paying more for breakout festival titles.",
    "Global streamers are chasing regional hits with crossover potential.",
    "Merchandising revenue is becoming a deciding factor in sequel greenlights."
];

const NPC_HEADLINES = [
    "{Name} attached to star in upcoming biopic.",
    "{Name} exits project project due to 'creative differences'.",
    "{Name} signs first-look deal with Warner Bros.",
    "Rumors swirl around {Name} casting in superhero franchise.",
    "{Name} spotted scouting locations in Italy.",
    "Critics praise {Name}'s transformation in latest role.",
    "{Name} reportedly circling an expensive streaming thriller.",
    "{Name} linked to prestige limited series from major platform.",
    "{Name} sparks awards chatter after private industry screening.",
    "{Name} seen leaving studio offices after 'very long' meeting.",
    "{Name} fuels romance rumors after late-night dinner in West Hollywood.",
    "{Name} quietly assembling a new production banner.",
    "{Name} lands brand deal said to be worth eight figures.",
    "{Name} rumored to be in talks for surprise franchise cameo.",
    "{Name} becomes the subject of intense recasting speculation."
];

const HIT_HEADLINES = [
    "'{Title}' dominates the box office for a second week.",
    "Audiences flock to '{Title}', defying analyst predictions.",
    "'{Title}' becomes a cultural phenomenon.",
    "Global box office ignited by '{Title}'.",
    "'{Title}' set to break quarterly records.",
    "'{Title}' posts monster holds and shocks weekend projections.",
    "'{Title}' turns strong buzz into undeniable box office power.",
    "'{Title}' proves word of mouth still matters in a crowded market.",
    "'{Title}' now looks like the breakout hit studios were waiting for.",
    "'{Title}' pulls in repeat viewers at an unusually high rate."
];

const UNIVERSE_HIT_HEADLINES = [
    "'{Title}' proves the cinematic universe is stronger than ever.",
    "Fans are calling '{Title}' the best entry in the franchise yet.",
    "Box office explodes as '{Title}' expands the universe's lore.",
    "'{Title}' sets up the next major crossover event perfectly."
];

const FLOP_HEADLINES = [
    "'{Title}' stumbles out of the gate with weak opening.",
    "Budget concerns loom as '{Title}' underperforms.",
    "'{Title}' struggles to connect with core demographic.",
    "Marketing misfire blamed for '{Title}' disappointment.",
    "The fall of '{Title}': What went wrong?",
    "'{Title}' posts a soft debut despite aggressive promotion.",
    "Tracking miss: '{Title}' opens below even cautious expectations.",
    "Audience indifference leaves '{Title}' in dangerous territory.",
    "'{Title}' may face a steep second-week drop after shaky debut.",
    "Studio optimism fades as '{Title}' fails to catch fire."
];

const UNIVERSE_FLOP_HEADLINES = [
    "Is franchise fatigue setting in? '{Title}' underperforms.",
    "'{Title}' fails to capture the magic of previous universe entries.",
    "Fans disappointed by '{Title}', questioning the universe's direction.",
    "A rare misstep for the franchise as '{Title}' bombs at the box office."
];

const CRITIC_LOVED_HEADLINES = [
    "Critics hail '{Title}' as a modern masterpiece.",
    "'{Title}' generates early Oscar buzz.",
    "A stunning achievement: '{Title}' wins over skeptics.",
    "'{Title}' is the critical darling of the season.",
    "'{Title}' earns raves for confidence, style, and emotional weight.",
    "Reviewers say '{Title}' overdelivers on nearly every front.",
    "'{Title}' is already being called a breakout awards contender.",
    "Critics praise '{Title}' for giving audiences something rare: surprise.",
    "'{Title}' lands with both reviewers and tastemakers."
];

const UNIVERSE_CRITIC_LOVED_HEADLINES = [
    "Critics praise '{Title}' for elevating the entire franchise.",
    "'{Title}' proves superhero movies can be high art.",
    "A masterclass in world-building: '{Title}' stuns reviewers.",
    "'{Title}' successfully balances fan service with a gripping narrative."
];

const CRITIC_HATED_HEADLINES = [
    "Critics tear apart '{Title}' for weak script.",
    "'{Title}' branded a 'confused mess' by top reviewers.",
    "Style over substance: '{Title}' fails to impress.",
    "Reviewers call '{Title}' a missed opportunity.",
    "'{Title}' gets slammed for tonal chaos and thin characters.",
    "Critical reaction to '{Title}' turns sharply negative.",
    "'{Title}' sparks frustration rather than excitement among reviewers.",
    "Early write-ups suggest '{Title}' never finds its footing.",
    "'{Title}' is being called overproduced, underwritten, and forgettable."
];

const UNIVERSE_CRITIC_HATED_HEADLINES = [
    "Critics pan '{Title}' as a soulless cash grab.",
    "'{Title}' relies too heavily on cameos, ignoring the plot.",
    "A confusing mess of lore: '{Title}' alienates casual viewers.",
    "Reviewers say '{Title}' is a sign the universe has lost its way."
];

// --- NEW SEQUEL / DRAMA HEADLINES ---
const SEQUEL_HYPE_HEADLINES = [
    "Fans demand a sequel to '{Title}' on social media.",
    "Online buzz grows around possible '{Title}' cinematic universe.",
    "Audiences want more from the '{Title}' world.",
    "Is '{Title}' the start of a new franchise? Fans think so.",
    "Hashtag #WeWant{Title}2 trending worldwide.",
    "Speculation mounts over '{Title}' follow-up.",
    "Merch sales and online chatter point to strong sequel potential for '{Title}'.",
    "Studio insiders reportedly studying franchise options for '{Title}'.",
    "The ending of '{Title}' has fans convinced a second chapter is coming.",
    "Trade analysts say '{Title}' is exactly the kind of hit that becomes a series."
];

const SEQUEL_CONFIRMED_HEADLINES = [
    "IT'S OFFICIAL: Studio greenlights '{Title}' sequel.",
    "'{Title} 2' is happening! Pre-production starts soon.",
    "Studio confirms return to the world of '{Title}'.",
    "Franchise alert! '{Title}' sequel officially announced."
];

const SCANDAL_HEADLINES = [
    "BREAKING: {Name} caught in a whirlwind of controversy.",
    "Is this the end for {Name}? New allegations surface.",
    "Social media erupts as {Name}'s past comes to light.",
    "Brands distance themselves from {Name} after recent events.",
    "Exclusive: The shocking truth behind {Name}'s latest scandal.",
    "Public opinion of {Name} takes a sharp dive.",
    "Fans divided as {Name} faces intense scrutiny.",
    "{Name}'s team scrambles to contain a fast-moving PR disaster.",
    "Leaked screenshots thrust {Name} into an ugly online storm.",
    "{Name} loses control of the narrative after a chaotic 24 hours.",
    "The backlash against {Name} is spreading beyond social media.",
    "Insiders say brands are in wait-and-see mode over {Name}."
];

const LEGAL_HEADLINES = [
    "Legal battle looms for {Name} as court date set.",
    "Inside the courtroom: {Name}'s high-stakes legal drama.",
    "Will {Name} settle? Experts weigh in on the ongoing case.",
    "A blow to {Name}'s career as legal troubles mount.",
    "The verdict is in: How {Name}'s case will change everything.",
    "Government audit targets {Name}'s financial dealings.",
    "Underworld connections? Rumors swirl around {Name}'s latest case.",
    "{Name}'s legal team signals an aggressive defense strategy.",
    "Court filings add a dramatic new layer to {Name}'s ongoing dispute.",
    "{Name} may be facing months of expensive legal fallout.",
    "Insiders say the case surrounding {Name} is getting messier by the week."
];

const SEQUEL_CANCELLED_HEADLINES = [
    "Studio confirms '{Title}' will be a standalone film.",
    "No plans for '{Title}' sequel despite fan requests.",
    "'{Title}' universe plans scrapped by studio executives.",
    "The story of '{Title}' ends here, says producer."
];

const NEGOTIATION_FAIL_HEADLINES = [
    "Talks break down for '{Title}' sequel return.",
    "Studio and lead actor fail to agree on terms for '{Title} 2'.",
    "'{Title}' sequel in jeopardy as salary negotiations stall.",
    "Actor reportedly walks away from '{Title}' franchise offer."
];

const FAN_BACKLASH_HEADLINES = [
    "Fans outraged over '{Title}' casting rumors.",
    "Social media campaign demands original star return for '{Title} 2'.",
    "Studio facing backlash after failed '{Title}' negotiations.",
    "Boycott threats loom over '{Title}' sequel without original lead.",
    "Fan forums revolt over the latest '{Title}' sequel rumor.",
    "Recasting chatter around '{Title}' turns toxic online.",
    "The internet has chosen sides in the '{Title}' franchise standoff."
];

// --- TV RENEWAL HEADLINES ---
const TV_RENEWAL_HEADLINES = [
    "'{Title}' renewed for another season!",
    "Network gives green light to '{Title}' Season {Season}.",
    "Fans rejoice: '{Title}' will return.",
    "'{Title}' secures renewal after strong ratings.",
    "'{Title}' survives a crowded slate and earns another year.",
    "Platform doubles down on '{Title}' after strong engagement numbers.",
    "Awards chatter and loyal fans keep '{Title}' alive for Season {Season}."
];

const TV_CANCELLATION_HEADLINES = [
    "'{Title}' cancelled after {Season} season(s).",
    "Network pulls the plug on '{Title}'.",
    "'{Title}' will not return for another season.",
    "Shock cancellation: '{Title}' ends.",
    "Sources say costs climbed too high for '{Title}' to continue.",
    "Despite a loyal fan base, '{Title}' fails to survive lineup cuts.",
    "'{Title}' becomes the latest casualty of the streaming reset."
];

// --- FORBES TEMPLATES ---
const FORBES_RISE_HEADLINES = [
    "{Name} climbs the wealth ladder, now ranked #{Rank}.",
    "Financial upswing: {Name} jumps to #{Rank} on Forbes list.",
    "Smart investments pay off for {Name} (Rank #{Rank}).",
    "{Name}'s net worth surges, overtaking industry veterans."
];

const FORBES_DROP_HEADLINES = [
    "{Name} slips in rankings to #{Rank}.",
    "Stagnant earnings see {Name} drop to #{Rank}.",
    "{Name} falls behind in the race for Hollywood's richest.",
    "Forbes update: {Name} slides down the list."
];

const FORBES_ENTRY_HEADLINES = [
    "Forbes Debut: {Name} enters the list at #{Rank}.",
    "New Money: {Name} is Hollywood's newest rich lister.",
    "Welcome to the club: {Name} makes the Forbes cut."
];

const FORBES_TOP_10_HEADLINES = [
    "ELITE STATUS: {Name} breaks into the Forbes Top 10.",
    "The 1%: {Name} is now one of the 10 richest actors.",
    "Power Move: {Name} joins the Top 10 wealth bracket."
];

const FORBES_NUMBER_ONE_HEADLINES = [
    "THE KING: {Name} is officially the richest actor in the world.",
    "New #1: {Name} tops the Forbes Rich List.",
    "Billion Dollar Baby: {Name} sits on the iron throne of wealth."
];

const FORBES_INDUSTRY_HEADLINES = [
    "Forbes releases annual 'State of Cinema' wealth report.",
    "Tech investments driving actor wealth, says Forbes.",
    "The gap between A-List pay and working actors widens.",
    "Streaming residuals shaking up this year's Rich List.",
    "Forbes says celebrity-owned brands are outperforming traditional endorsements.",
    "Private holdings and equity stakes now separate the rich from the ultra-rich.",
    "Film salaries matter less than ownership, according to the new Forbes report."
];

const UNIVERSE_NEWS_TEMPLATES = [
    "Fans are speculating wildly about the next phase of the {Universe} universe.",
    "Is {Universe} planning a massive crossover event? Insiders say yes.",
    "Merchandise sales for {Universe} hit an all-time high this quarter.",
    "Rumors suggest {Universe} is looking to cast a major A-lister for their next villain.",
    "The internet breaks down the latest Easter eggs found in {Universe} projects.",
    "Studio executives promise the next {Universe} saga will 'change everything'.",
    "Leaked set photos from the upcoming {Universe} project have fans divided.",
    "Can {Universe} maintain its momentum? Analysts weigh in on the franchise's future.",
    "{Universe} fans are convinced a major character return is being teased.",
    "The next {Universe} entry is already inspiring intense theory threads.",
    "{Universe} merchandise strategy hints at bigger long-term plans."
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const usePortuguese = (language: GameLanguage) => language === 'pt-BR';
const pickLocalized = (language: GameLanguage, english: string[], portuguese: string[]) => pick(usePortuguese(language) ? portuguese : english);
const hasPublishedReleaseNews = (rel: ActiveRelease, key: string): boolean =>
    Array.isArray(rel.generatedNewsKeys) && rel.generatedNewsKeys.includes(key);

const INDUSTRY_TEMPLATES_PT = [
    "Executivos de estúdio veem sinais de cansaço com franquias entre o público jovem.",
    "O cinema independente registra alta nas vendas de ingressos neste trimestre.",
    "A guerra do streaming esquenta com plataformas disputando direitos exclusivos.",
    "Negociações sindicais travam e aumentam o medo de pausa nas produções.",
    "Mercados internacionais viram motor decisivo para grandes blockbusters.",
    "Críticos dizem que a era da estrela de cinema está voltando.",
    "O terror segue como o gênero de maior retorno para estúdios.",
    "Comédias românticas ensaiam uma volta surpresa nesta temporada.",
    "Marcas de luxo aumentam investimento em campanhas com celebridades.",
    "Streamers globais buscam sucessos regionais com potencial de crossover."
];

const NPC_HEADLINES_PT = [
    "{Name} deve estrelar uma nova cinebiografia.",
    "{Name} deixa projeto por diferenças criativas.",
    "{Name} fecha acordo de primeira opção com um grande estúdio.",
    "Rumores crescem sobre {Name} em uma franquia de super-heróis.",
    "{Name} é visto procurando locações na Itália.",
    "Críticos elogiam a transformação de {Name} no papel mais recente.",
    "{Name} estaria negociando um thriller caro para streaming.",
    "{Name} entra na mira de uma série limitada de prestígio.",
    "{Name} vira assunto de prêmios após exibição privada.",
    "{Name} alimenta rumores de participação surpresa em franquia."
];

const HIT_HEADLINES_PT = [
    "'{Title}' domina as bilheterias pela segunda semana.",
    "O público lota sessões de '{Title}' e surpreende analistas.",
    "'{Title}' vira fenômeno cultural.",
    "Bilheteria global pega fogo com '{Title}'.",
    "'{Title}' transforma bom boca a boca em força real de mercado.",
    "'{Title}' prova que repetição de público ainda muda tudo.",
    "'{Title}' parece o sucesso que os estúdios esperavam."
];

const UNIVERSE_HIT_HEADLINES_PT = [
    "'{Title}' prova que o universo cinematográfico está mais forte do que nunca.",
    "Fãs chamam '{Title}' de melhor entrada da franquia até agora.",
    "Bilheteria explode enquanto '{Title}' expande a mitologia do universo.",
    "'{Title}' prepara perfeitamente o próximo grande crossover."
];

const FLOP_HEADLINES_PT = [
    "'{Title}' tropeça na estreia com abertura fraca.",
    "Preocupações de orçamento cercam '{Title}' após desempenho abaixo do esperado.",
    "'{Title}' não consegue se conectar com seu público central.",
    "Erro de marketing é apontado no desempenho decepcionante de '{Title}'.",
    "A queda de '{Title}': o que deu errado?",
    "'{Title}' estreia abaixo até das previsões cautelosas."
];

const UNIVERSE_FLOP_HEADLINES_PT = [
    "Cansaço de franquia? '{Title}' fica abaixo do esperado.",
    "'{Title}' não captura a magia das entradas anteriores do universo.",
    "Fãs se decepcionam com '{Title}' e questionam a direção do universo.",
    "Um raro tropeço da franquia: '{Title}' fracassa nas bilheterias."
];

const CRITIC_LOVED_HEADLINES_PT = [
    "Críticos chamam '{Title}' de obra-prima moderna.",
    "'{Title}' gera burburinho inicial de Oscar.",
    "Uma conquista impressionante: '{Title}' conquista até céticos.",
    "'{Title}' vira o queridinho da crítica na temporada.",
    "Críticos dizem que '{Title}' entrega confiança, estilo e emoção.",
    "'{Title}' já é tratado como forte nome para a temporada de prêmios."
];

const UNIVERSE_CRITIC_LOVED_HEADLINES_PT = [
    "Críticos elogiam '{Title}' por elevar toda a franquia.",
    "'{Title}' prova que filmes de super-herói podem buscar arte maior.",
    "A construção de mundo de '{Title}' impressiona críticos.",
    "'{Title}' equilibra serviço aos fãs com uma história forte."
];

const CRITIC_HATED_HEADLINES_PT = [
    "Críticos detonam '{Title}' por roteiro fraco.",
    "'{Title}' é chamado de confusão por grandes resenhistas.",
    "Estilo acima de substância: '{Title}' não convence.",
    "Críticos veem '{Title}' como oportunidade perdida.",
    "'{Title}' recebe críticas duras por caos de tom e personagens rasos.",
    "A reação crítica a '{Title}' fica rapidamente negativa."
];

const UNIVERSE_CRITIC_HATED_HEADLINES_PT = [
    "Críticos veem '{Title}' como produto sem alma.",
    "'{Title}' depende demais de cameos e esquece a trama.",
    "Excesso de lore em '{Title}' afasta espectadores casuais.",
    "Resenhas dizem que '{Title}' mostra um universo perdendo rumo."
];

const SEQUEL_HYPE_HEADLINES_PT = [
    "Fãs pedem sequência de '{Title}' nas redes.",
    "O buzz cresce em torno de um possível universo de '{Title}'.",
    "O público quer ver mais do mundo de '{Title}'.",
    "'{Title}' é o início de uma nova franquia? Fãs acreditam que sim.",
    "Analistas dizem que '{Title}' tem perfil claro de franquia."
];

const SEQUEL_CONFIRMED_HEADLINES_PT = [
    "É OFICIAL: estúdio aprova sequência de '{Title}'.",
    "'{Title} 2' vai acontecer! Pré-produção começa em breve.",
    "Estúdio confirma retorno ao mundo de '{Title}'.",
    "Alerta de franquia: sequência de '{Title}' é anunciada oficialmente."
];

const SCANDAL_HEADLINES_PT = [
    "URGENTE: {Name} entra em nova controvérsia.",
    "É o fim para {Name}? Novas acusações surgem.",
    "Redes sociais explodem após o passado de {Name} voltar à tona.",
    "Marcas se afastam de {Name} depois dos últimos acontecimentos.",
    "Opinião pública sobre {Name} despenca.",
    "Equipe de {Name} corre para conter uma crise de PR."
];

const LEGAL_HEADLINES_PT = [
    "Batalha legal se aproxima para {Name} com data no tribunal marcada.",
    "Por dentro do tribunal: o drama jurídico de {Name}.",
    "{Name} vai fechar acordo? Especialistas analisam o caso.",
    "Problemas legais aumentam a pressão sobre a carreira de {Name}.",
    "Documentos judiciais adicionam nova camada ao caso de {Name}."
];

const FORBES_ENTRY_HEADLINES_PT = [
    "Estreia na Forbes: {Name} entra na lista em #{Rank}.",
    "Novo dinheiro: {Name} entra para a lista dos mais ricos de Hollywood.",
    "Bem-vindo ao clube: {Name} passa no corte da Forbes."
];

const FORBES_RISE_HEADLINES_PT = [
    "{Name} sobe no ranking de fortuna e chega a #{Rank}.",
    "Alta financeira: {Name} salta para #{Rank} na lista Forbes.",
    "Investimentos inteligentes impulsionam {Name} (posição #{Rank})."
];

const FORBES_DROP_HEADLINES_PT = [
    "{Name} cai no ranking para #{Rank}.",
    "Ganhos estagnados fazem {Name} descer para #{Rank}.",
    "Atualização Forbes: {Name} escorrega na lista."
];

const FORBES_TOP_10_HEADLINES_PT = [
    "STATUS ELITE: {Name} entra no Top 10 da Forbes.",
    "{Name} agora está entre os 10 atores mais ricos.",
    "Jogada de poder: {Name} entra na elite financeira."
];

const FORBES_NUMBER_ONE_HEADLINES_PT = [
    "NOVO #1: {Name} lidera a lista dos mais ricos.",
    "O topo é de {Name}: maior fortuna entre atores.",
    "{Name} senta no trono financeiro de Hollywood."
];

const FORBES_INDUSTRY_HEADLINES_PT = [
    "Forbes divulga relatório anual sobre fortuna no cinema.",
    "Investimentos em tecnologia impulsionam riqueza de atores, diz Forbes.",
    "Residuais de streaming mudam a lista dos mais ricos deste ano.",
    "Forbes diz que marcas de celebridades superam endorsos tradicionais."
];

const UNIVERSE_NEWS_TEMPLATES_PT = [
    "Fãs especulam intensamente sobre a próxima fase do universo {Universe}.",
    "{Universe} prepara um grande crossover? Fontes dizem que sim.",
    "Vendas de produtos de {Universe} atingem novo recorde.",
    "Rumores indicam que {Universe} busca um grande nome para o próximo vilão.",
    "A internet destrincha easter eggs dos projetos recentes de {Universe}.",
    "Executivos prometem que a próxima saga de {Universe} vai mudar tudo."
];

// ... (Generate Personal News, Top Stories, Industry News functions remain same)

const generatePersonalNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    player.commitments.forEach(c => {
        if (c.type === 'ACTING_GIG' && c.projectDetails) {
            if (c.projectPhase === 'PRODUCTION' && c.phaseWeeksLeft === c.totalPhaseDuration) {
                const headline = usePortuguese(language) ? `Alerta de elenco: você entra no elenco de '${c.name}'.` : `Casting Alert: You join the cast of '${c.name}'.`;
                const subtext = c.roleType === 'LEAD'
                    ? (usePortuguese(language) ? "Fontes dizem que pode ser um papel decisivo para a carreira." : "Sources say it's a career-defining role.")
                    : (usePortuguese(language) ? "A produção começa imediatamente." : "Production begins immediately.");
                news.push({
                    id: `news_you_sign_${c.id}`, headline, subtext, category: 'YOU', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
    });

    return news;
};

const generateTopStories = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    player.activeReleases.forEach(rel => {
        if (rel.weekNum === 1) {
            const budget = rel.budget;
            const gross = rel.weeklyGross[0];
            
            if (gross > budget * 0.5) {
                const newsKey = `news_bo_hit_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                const headlineArr = isUniverse
                    ? (usePortuguese(language) ? [...HIT_HEADLINES_PT, ...UNIVERSE_HIT_HEADLINES_PT] : [...HIT_HEADLINES, ...UNIVERSE_HIT_HEADLINES])
                    : (usePortuguese(language) ? HIT_HEADLINES_PT : HIT_HEADLINES);
                news.push({
                    id: newsKey,
                    headline: pick(headlineArr).replace('{Title}', rel.name),
                    subtext: usePortuguese(language) ? `Estreia de $${(gross/1000000).toFixed(1)}M impressiona Hollywood.` : `$${(gross/1000000).toFixed(1)}M opening weekend stuns Hollywood.`,
                    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
                });
            } else if (gross < budget * 0.15 && rel.projectDetails.budgetTier !== 'LOW') {
                const newsKey = `news_bo_flop_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                const headlineArr = isUniverse
                    ? (usePortuguese(language) ? [...FLOP_HEADLINES_PT, ...UNIVERSE_FLOP_HEADLINES_PT] : [...FLOP_HEADLINES, ...UNIVERSE_FLOP_HEADLINES])
                    : (usePortuguese(language) ? FLOP_HEADLINES_PT : FLOP_HEADLINES);
                news.push({
                    id: newsKey,
                    headline: pick(headlineArr).replace('{Title}', rel.name),
                    subtext: usePortuguese(language) ? `Abertura fraca de $${(gross/1000000).toFixed(1)}M levanta dúvidas.` : `Disastrous $${(gross/1000000).toFixed(1)}M opening raises questions.`,
                    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
                });
            } else if (rel.projectDetails.budgetTier === 'HIGH') {
                const newsKey = `news_bo_open_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                news.push({
                    id: newsKey,
                    headline: usePortuguese(language) ? `'${rel.name}' estreia em #1.` : `'${rel.name}' opens at #1.`,
                    subtext: usePortuguese(language) ? `Desempenho sólido para o blockbuster de ${rel.projectDetails.genre}.` : `Solid performance for the ${rel.projectDetails.genre} blockbuster.`,
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
        if (rel.weekNum === 2 && rel.imdbRating) {
            if (rel.imdbRating >= 8.5) {
                const newsKey = `news_crit_high_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                const headlineArr = isUniverse
                    ? (usePortuguese(language) ? [...CRITIC_LOVED_HEADLINES_PT, ...UNIVERSE_CRITIC_LOVED_HEADLINES_PT] : [...CRITIC_LOVED_HEADLINES, ...UNIVERSE_CRITIC_LOVED_HEADLINES])
                    : (usePortuguese(language) ? CRITIC_LOVED_HEADLINES_PT : CRITIC_LOVED_HEADLINES);
                news.push({
                    id: newsKey,
                    headline: pick(headlineArr).replace('{Title}', rel.name),
                    subtext: usePortuguese(language) ? `Com nota ${rel.imdbRating}, o boca a boca está forte.` : `With an ${rel.imdbRating} rating, word of mouth is electric.`,
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            } else if (rel.imdbRating <= 4.0) {
                const newsKey = `news_crit_low_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                const headlineArr = isUniverse
                    ? (usePortuguese(language) ? [...CRITIC_HATED_HEADLINES_PT, ...UNIVERSE_CRITIC_HATED_HEADLINES_PT] : [...CRITIC_HATED_HEADLINES, ...UNIVERSE_CRITIC_HATED_HEADLINES])
                    : (usePortuguese(language) ? CRITIC_HATED_HEADLINES_PT : CRITIC_HATED_HEADLINES);
                news.push({
                    id: newsKey,
                    headline: pick(headlineArr).replace('{Title}', rel.name),
                    subtext: usePortuguese(language) ? "As notas do público também são duras." : "Audience scores are equally punishing.",
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
    });

    return news;
};

const generateIndustryNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    if (Math.random() < 0.2) {
        news.push({
            id: `news_ind_trend_${Date.now()}`,
            headline: pickLocalized(language, INDUSTRY_TEMPLATES, INDUSTRY_TEMPLATES_PT),
            category: 'INDUSTRY', week, year, impactLevel: 'LOW'
        });
    }

    if (Math.random() < 0.3) {
        const npc = pick(NPC_DATABASE);
        const headline = pickLocalized(language, NPC_HEADLINES, NPC_HEADLINES_PT).replace('{Name}', npc.name);
        news.push({
            id: `news_ind_npc_${Date.now()}`,
            headline: headline,
            category: 'INDUSTRY', week, year, impactLevel: 'LOW'
        });
    }

    // --- NEW: AWARD GOSSIP INJECTION ---
    const pendingCeremony = player.scheduledEvents.find(e => e.type === 'AWARD_CEREMONY');
    if (pendingCeremony) {
        if (Math.random() < 0.6) { // High chance during season
            const template = Math.random() > 0.3 ? pick(AWARD_GOSSIP_TEMPLATES) : pick(SNUB_TEMPLATES);
            // Replace placeholders
            const rival = pick(NPC_DATABASE);
            const awardName = pendingCeremony.title;
            const headline = template
                .replace('{Player}', player.name)
                .replace('{Rival}', rival.name)
                .replace('{Award}', awardName);
            
            news.push({
                id: `news_gossip_${Date.now()}`,
                headline: headline,
                category: 'INDUSTRY',
                week, year,
                impactLevel: 'MEDIUM',
                subtext: usePortuguese(language) ? "A máquina de rumores está girando conforme a cerimônia se aproxima." : "The rumor mill is spinning as the ceremony approaches."
            });
        }
    }

    if (Math.random() < 0.1) {
        const studio = pick(Object.values(STUDIO_CATALOG));
        news.push({
            id: `news_ind_studio_${Date.now()}`,
            headline: usePortuguese(language) ? `${studio.name} reorganiza sua liderança executiva.` : `${studio.name} reshuffles executive leadership.`,
            category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
        });
    }

    // --- NEW: SCANDAL & LEGAL NEWS ---
    if (player.activeCases && player.activeCases.length > 0) {
        if (Math.random() < 0.7) {
            news.push({
                id: `news_legal_active_${Date.now()}`,
                headline: pickLocalized(language, LEGAL_HEADLINES, LEGAL_HEADLINES_PT).replace('{Name}', player.name),
                category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
            });
        }
    }

    if (player.heat > 30 && Math.random() < (player.heat / 100)) {
        news.push({
            id: `news_scandal_active_${Date.now()}`,
            headline: pickLocalized(language, SCANDAL_HEADLINES, SCANDAL_HEADLINES_PT).replace('{Name}', player.name),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
    }

    return news;
};

// ... (Exported Helpers)
export const generateSequelHypeNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_hype_${Date.now()}`,
    headline: pickLocalized(language, SEQUEL_HYPE_HEADLINES, SEQUEL_HYPE_HEADLINES_PT).replace('{Title}', title),
    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
});
export const generateSequelConfirmedNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_sequel_yes_${Date.now()}`,
    headline: pickLocalized(language, SEQUEL_CONFIRMED_HEADLINES, SEQUEL_CONFIRMED_HEADLINES_PT).replace('{Title}', title),
    subtext: usePortuguese(language) ? "Fontes do estúdio confirmam que um acordo está em andamento." : "Studio insiders confirm a deal is in the works.",
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});
export const generateSequelCancelledNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_sequel_no_${Date.now()}`,
    headline: (usePortuguese(language) ? "Estúdio confirma que '{Title}' seguirá como filme independente." : pick(SEQUEL_CANCELLED_HEADLINES)).replace('{Title}', title),
    category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
});
export const generateNegotiationFailNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_negot_fail_${Date.now()}`,
    headline: (usePortuguese(language) ? "Negociações travam para retorno em sequência de '{Title}'." : pick(NEGOTIATION_FAIL_HEADLINES)).replace('{Title}', title),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});
export const generateFanBacklashNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_backlash_${Date.now()}`,
    headline: (usePortuguese(language) ? "Fãs criticam rumores de elenco em '{Title}'." : pick(FAN_BACKLASH_HEADLINES)).replace('{Title}', title),
    subtext: usePortuguese(language) ? "A internet não gostou das notícias sobre recast." : "The internet is not happy about the recasting news.",
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

// NEW EXPORTS FOR TV
export const generateRenewalNews = (title: string, season: number, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_renew_${Date.now()}`,
    headline: (usePortuguese(language) ? "'{Title}' foi renovada para mais uma temporada!" : pick(TV_RENEWAL_HEADLINES)).replace('{Title}', title).replace('{Season}', season.toString()),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

export const generateCancellationNews = (title: string, season: number, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_cancel_${Date.now()}`,
    headline: (usePortuguese(language) ? "'{Title}' foi cancelada após {Season} temporada(s)." : pick(TV_CANCELLATION_HEADLINES)).replace('{Title}', title).replace('{Season}', season.toString()),
    category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
});

export const generateForbesNews = (player: Player, currentRank: number, prevRank: number | undefined): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    if (prevRank === undefined) {
        if (currentRank <= 100) {
             news.push({
                id: `news_forbes_entry_${Date.now()}`,
                headline: pickLocalized(language, FORBES_ENTRY_HEADLINES, FORBES_ENTRY_HEADLINES_PT).replace('{Name}', player.name).replace('{Rank}', currentRank.toString()),
                subtext: usePortuguese(language) ? "Um sinal de poder crescente na indústria." : "A sign of rising power in the industry.",
                category: 'YOU', week, year, impactLevel: 'HIGH'
            });
        }
        return news;
    }

    const diff = prevRank - currentRank;

    if (currentRank === 1 && prevRank !== 1) {
        news.push({
            id: `news_forbes_one_${Date.now()}`,
            headline: pickLocalized(language, FORBES_NUMBER_ONE_HEADLINES, FORBES_NUMBER_ONE_HEADLINES_PT).replace('{Name}', player.name),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
        return news;
    }

    if (currentRank <= 10 && prevRank > 10) {
        news.push({
            id: `news_forbes_top10_${Date.now()}`,
            headline: pickLocalized(language, FORBES_TOP_10_HEADLINES, FORBES_TOP_10_HEADLINES_PT).replace('{Name}', player.name),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
        return news;
    }

    if (diff >= 5) {
        news.push({
            id: `news_forbes_rise_${Date.now()}`,
            headline: pickLocalized(language, FORBES_RISE_HEADLINES, FORBES_RISE_HEADLINES_PT).replace('{Name}', player.name).replace('{Rank}', currentRank.toString()),
            category: 'YOU', week, year, impactLevel: 'MEDIUM'
        });
    }
    
    if (diff <= -5) {
        news.push({
            id: `news_forbes_drop_${Date.now()}`,
            headline: pickLocalized(language, FORBES_DROP_HEADLINES, FORBES_DROP_HEADLINES_PT).replace('{Name}', player.name).replace('{Rank}', currentRank.toString()),
            category: 'YOU', week, year, impactLevel: 'LOW'
        });
    }

    return news;
};

export const generateForbesIndustryNews = (week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_forbes_ind_${Date.now()}`,
    headline: pickLocalized(language, FORBES_INDUSTRY_HEADLINES, FORBES_INDUSTRY_HEADLINES_PT),
    category: 'INDUSTRY', week, year, impactLevel: 'LOW'
});

export const generateScandalNews = (name: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_scandal_${Date.now()}`,
    headline: pickLocalized(language, SCANDAL_HEADLINES, SCANDAL_HEADLINES_PT).replace('{Name}', name),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

export const generateLegalNews = (name: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_legal_${Date.now()}`,
    headline: pickLocalized(language, LEGAL_HEADLINES, LEGAL_HEADLINES_PT).replace('{Name}', name),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

const generateUniverseNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    // Find if player has a studio with universes
    const studio = player.businesses?.find(b => b.type === 'PRODUCTION_HOUSE');
    if (studio && player.world?.universes) {
        const universes = Object.values(normalizeUniverseMap(player.world.universes || {})).filter(u => u.studioId === studio.id);
        if (universes.length > 0 && Math.random() < 0.4) { // 40% chance per week if they have a universe
            const randomUniverse = pick(universes);
            const headline = pickLocalized(language, UNIVERSE_NEWS_TEMPLATES, UNIVERSE_NEWS_TEMPLATES_PT).replace(/{Universe}/g, randomUniverse.name);
            news.push({
                id: `news_uni_buzz_${Date.now()}`,
                headline,
                category: 'UNIVERSE',
                week, year, impactLevel: 'MEDIUM'
            });
        }
    }

    return news;
};

export const generateWeeklyNews = (player: Player): NewsItem[] => {
    const topStories = generateTopStories(player);
    const industry = generateIndustryNews(player);
    const personal = generatePersonalNews(player);
    const universe = generateUniverseNews(player);

    const all = [...topStories, ...personal, ...industry, ...universe];
    return all;
};
