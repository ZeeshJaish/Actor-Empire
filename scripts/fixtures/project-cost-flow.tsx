// Isolated browser fixture: real production/release components and real save data.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER, type Player } from '../../types';
import { createBusiness } from '../../services/businessLogic';
import { processGameWeek } from '../../services/gameLoop';
import { migratePlayerSave } from '../../services/saveMigration';
import { getProjectCostSummary } from '../../services/projectCostPresentation';
import { GreenlightWizard } from '../../views/lifestyle/business/GreenlightWizard';
import { ReleaseWizard } from '../../views/lifestyle/business/ReleaseWizard';
import { ProjectDashboardModal } from '../../views/lifestyle/business/components/ProjectDashboardModal';

const script = { id: 'cost-script', title: 'Budget Proof', genres: ['DRAMA'], status: 'READY', quality: 80,
    options: [], writerId: null, weeksInDevelopment: 0, totalDevelopmentWeeks: 0, isOriginal: true,
    projectType: 'MOVIE', sourceMaterial: 'ORIGINAL' };
const concept = { id: 'cost-concept', scriptId: script.id, lastStep: 'SETUP',
    crewModes: { director: 'SELF', cinematographer: 'IN_HOUSE', composer: 'IN_HOUSE', lineProducer: 'IN_HOUSE', vfx: 'IN_HOUSE' },
    selectedCrew: {}, castList: [{ id: 'lead', role: 'Lead', roleType: 'LEAD', actorId: 'PLAYER_SELF', actorName: 'Budget QA' }],
    selectedLocations: ['LA'], equipmentChoices: {}, reservedMarketingBudget: 10_000_000,
    musicStrategy: 'COMPOSER_ONLY', selectedMusicArtistIds: [], selectedMusicCreditRoles: [] };

function fixture(): Player {
    const p = structuredClone(INITIAL_PLAYER);
    Object.assign(p, { id: 'budget-flow', name: 'Budget QA', age: 30, currentWeek: 12, money: 2_000_000_000,
        commitments: [], activeReleases: [], pastProjects: [], pendingEvents: [], scheduledEvents: [], pendingEvent: null,
        news: [], inbox: [], logs: [] });
    p.flags.premiumPurchases = ['no_ads'];
    p.studio.isUnlocked = true;
    p.energy = { current: 100, max: 100 };
    const studio = createBusiness('Budget Pictures', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 12, 30);
    studio.id = 'budget-studio'; studio.balance = 1_000_000_000;
    studio.studioState!.scripts = [script as any]; studio.studioState!.concepts = [concept as any];
    p.businesses = [studio];
    return p;
}

const database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('budget-flow-fixture', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});
async function readSave(): Promise<Player | undefined> {
    const db = await database;
    return new Promise((resolve, reject) => {
        const request = db.transaction('saves').objectStore('saves').get('player');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function writeSave(player: Player): Promise<void> {
    const db = await database;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('saves', 'readwrite');
        transaction.objectStore('saves').put(player, 'player');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

function App() {
    const [player, setPlayer] = React.useState<Player | null>(null);
    const [view, setView] = React.useState<'STUDIO' | 'GREENLIGHT' | 'DASHBOARD' | 'RELEASE'>('STUDIO');
    const [busy, setBusy] = React.useState(false);
    React.useEffect(() => { readSave().then(saved => setPlayer(saved ? migratePlayerSave(saved) : fixture())); }, []);
    if (!player) return <p>Loading budget verification fixture…</p>;
    const studio = player.businesses[0];
    const project = player.commitments[0];
    const update = (p: Player) => { (window as any).budgetSaveFinished = writeSave(p); setPlayer(p); };
    (window as any).budgetSnapshot = () => JSON.parse(JSON.stringify({ player, summary: project ? getProjectCostSummary(project) : null }));
    return <>
        {view === 'GREENLIGHT' && <GreenlightWizard player={player} studio={studio}
            initialConcept={studio.studioState?.concepts?.[0] || concept}
            onBack={() => setView('STUDIO')} onComplete={() => setView('STUDIO')} onUpdatePlayer={update} />}
        {view === 'DASHBOARD' && project && <ProjectDashboardModal project={{ ...project,
            phase: project.projectPhase === 'AWAITING_RELEASE' ? 'AWAITING RELEASE' : project.projectPhase?.replaceAll('_', '-') }}
            player={player} studio={studio as any} onClose={() => setView('STUDIO')} onUpdatePlayer={update} />}
        {view === 'RELEASE' && project && <ReleaseWizard player={player} studio={studio} project={project}
            onBack={() => setView('STUDIO')} onComplete={() => setView('STUDIO')} onUpdatePlayer={update} />}
        {view === 'STUDIO' && <main style={{ padding: 24, color: 'white', display: 'grid', gap: 16 }}>
            <h1>Actor Empire budget flow verification</h1>
            {!project && <button onClick={() => setView('GREENLIGHT')}>Plan project</button>}
            {project && <>
                <button onClick={() => setView('DASHBOARD')}>Open project dashboard</button>
                <button disabled={busy} onClick={async () => {
                    setBusy(true);
                    let p = player;
                    for (let i = 0; i < 60 && p.commitments[0]?.projectPhase !== 'AWAITING_RELEASE'; i++) {
                        p = (await processGameWeek(p)).player;
                    }
                    update(p); setBusy(false);
                }}>Advance production to release</button>
                <button onClick={() => setView('RELEASE')}>Configure release</button>
            </>}
            <output data-testid="fixture-state">{JSON.stringify({ balance: studio.balance, cash: player.money,
                phase: project?.projectPhase, reserve: project?.projectDetails?.reservedMarketingBudget })}</output>
        </main>}
    </>;
}
createRoot(document.getElementById('root')!).render(<App />);
