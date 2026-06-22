import { Player, ProjectConcept, Script, ScriptStatus } from '../types';

export const PROJECT_TITLE_MAX_LENGTH = 72;

export const normalizeProjectTitle = (value: string) => value.replace(/\s+/g, ' ').trim();

export const getProjectTitleError = (value: string): string | null => {
    const normalizedTitle = normalizeProjectTitle(value);
    if (!normalizedTitle) return 'Enter a working title.';
    if (normalizedTitle.length > PROJECT_TITLE_MAX_LENGTH) {
        return `Keep the title to ${PROJECT_TITLE_MAX_LENGTH} characters or fewer.`;
    }
    return null;
};

export const canManageWorkingTitle = (status: ScriptStatus) => status !== 'PRODUCED';

const EDITABLE_PROJECT_PHASES = new Set([
    'CONCEPT',
    'DEVELOPMENT',
    'PLANNING',
    'PRE-PRODUCTION'
]);

export const canRenameProjectTitle = (phase?: string) => {
    if (!phase) return false;
    return EDITABLE_PROJECT_PHASES.has(phase.replace(/_/g, '-').toUpperCase());
};

const createRenameSignal = (player: Player, oldTitle: string, newTitle: string): Player => {
    const newsItem = {
        id: `title_rename_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        headline: `${oldTitle} gets a new working title`,
        subtext: `${newTitle} is now the title on the studio slate before production locks the project identity.`,
        category: 'INDUSTRY' as const,
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'LOW' as const
    };

    return {
        ...player,
        news: [newsItem, ...(player.news || [])].slice(0, 80),
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: `🎬 Working title renamed from "${oldTitle}" to "${newTitle}".`,
            type: 'neutral' as const
        }, ...(player.logs || [])].slice(0, 50)
    };
};

interface RenameableStudioProject {
    id: string;
    name?: string;
    title?: string;
    phase?: string;
    scriptId?: string;
    concept?: {
        scriptId?: string;
    };
    projectDetails?: {
        title?: string;
        sourceScriptId?: string;
    };
}

export const renameStudioProjectTitle = (
    player: Player,
    studioId: string,
    project: RenameableStudioProject,
    value: string
): Player => {
    const title = normalizeProjectTitle(value);
    if (getProjectTitleError(title) || !canRenameProjectTitle(project.phase)) return player;

    const oldTitle = project.name || project.title || project.projectDetails?.title;
    if (!oldTitle || normalizeProjectTitle(oldTitle) === title) return player;

    const explicitScriptId = project.scriptId
        || project.concept?.scriptId
        || project.projectDetails?.sourceScriptId
        || (project.phase === 'DEVELOPMENT' ? project.id : undefined);

    let didUpdate = false;
    const commitments = player.commitments.map(commitment => {
        if (commitment.id !== project.id) return commitment;
        didUpdate = true;
        return {
            ...commitment,
            name: title,
            projectDetails: commitment.projectDetails
                ? { ...commitment.projectDetails, title }
                : commitment.projectDetails
        };
    });

    const businesses = player.businesses.map(business => {
        if (business.id !== studioId || !business.studioState?.scripts) return business;

        const titleMatches = explicitScriptId
            ? []
            : business.studioState.scripts.filter(script => script.title === oldTitle);
        const fallbackScriptId = titleMatches.length === 1 ? titleMatches[0].id : undefined;
        const targetScriptId = explicitScriptId || fallbackScriptId;
        if (!targetScriptId) return business;

        let scriptUpdated = false;
        const scripts = business.studioState.scripts.map(script => {
            if (script.id !== targetScriptId) return script;
            scriptUpdated = true;
            return { ...script, title };
        });
        if (!scriptUpdated) return business;

        didUpdate = true;
        return {
            ...business,
            studioState: {
                ...business.studioState,
                scripts
            }
        };
    });

    if (!didUpdate) return player;
    return createRenameSignal({
        ...player,
        commitments,
        businesses
    }, normalizeProjectTitle(oldTitle), title);
};

export const renameScriptWorkingTitle = (
    player: Player,
    studioId: string,
    scriptId: string,
    value: string
): Player => {
    const title = normalizeProjectTitle(value);
    if (getProjectTitleError(title)) return player;

    let oldTitle = '';
    let didUpdate = false;

    const businesses = player.businesses.map(business => {
        if (business.id !== studioId || !business.studioState?.scripts) return business;

        const script = business.studioState.scripts.find(item => item.id === scriptId);
        if (!script || !canManageWorkingTitle(script.status)) return business;

        oldTitle = script.title;
        if (normalizeProjectTitle(oldTitle) === title) return business;

        didUpdate = true;
        return {
            ...business,
            studioState: {
                ...business.studioState,
                scripts: business.studioState.scripts.map(item => (
                    item.id === scriptId ? { ...item, title } : item
                ))
            }
        };
    });

    if (!didUpdate || !oldTitle) return player;

    const commitments = player.commitments.map(commitment => {
        const isLinkedProject = commitment.projectDetails?.sourceScriptId === scriptId;
        if (!isLinkedProject || !canRenameProjectTitle(commitment.projectPhase)) return commitment;

        return {
            ...commitment,
            name: title,
            projectDetails: {
                ...commitment.projectDetails,
                title
            }
        };
    });

    return createRenameSignal({
        ...player,
        commitments,
        businesses
    }, normalizeProjectTitle(oldTitle), title);
};

export const discardUnreleasedScript = (
    scripts: Script[],
    concepts: ProjectConcept[],
    scriptId: string
): { scripts: Script[]; concepts: ProjectConcept[]; discarded: boolean } => {
    const script = scripts.find(item => item.id === scriptId);
    if (!script || !canManageWorkingTitle(script.status)) {
        return { scripts, concepts, discarded: false };
    }

    return {
        scripts: scripts.filter(item => item.id !== scriptId),
        concepts: concepts.filter(concept => concept.scriptId !== scriptId),
        discarded: true
    };
};
