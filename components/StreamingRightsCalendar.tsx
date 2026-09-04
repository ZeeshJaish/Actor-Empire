import { useMemo, useState, type KeyboardEvent } from 'react';
import {
    ArrowLeft,
    CalendarClock,
    Check,
    ChevronRight,
    Clock3,
    FileKey2,
    Gauge,
    Handshake,
    LibraryBig,
    ReceiptText,
    RotateCcw,
    ShieldCheck,
    SlidersHorizontal,
    Store,
    Layers3,
} from 'lucide-react';
import type {
    Player,
    StreamingRightsDistributionPriority,
    StreamingRightsDurationPreference,
    StreamingRightsExclusivityPolicy,
    StreamingRightsFinancialPriority,
    StreamingRightsPartnerPreference,
    StreamingRightsContract,
    StreamingRightsRenewalCase,
    StreamingRightsRenewalPreference,
    StreamingRightsStudioMandate,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    getStreamingRightsCalendar,
    normalizeStreamingRightsManagementState,
    resolveStreamingRightsRenewal,
    takeControlOfStreamingRightsRenewal,
    updateStreamingRightsManagement,
    updateStreamingRightsStudioMandate,
    type StreamingRightsCalendarItem,
} from '../services/streamingRightsCalendar';
import {
    getStreamingCommercialRelationships,
    getStreamingPlatformCommercialStatement,
    getStreamingRightsOffice,
    getStreamingStudioCommercialStatement,
} from '../services/streamingRightsOffice';
import {
    isStreamingLicenseActiveAt,
    normalizeStreamingRightsContractRegistry,
} from '../services/streamingRightsCore';
import {
    getStreamingRightsTransferChain,
    normalizeStreamingRightsTransactionRegistry,
} from '../services/streamingRightsTransactions';
import { getStreamingDayOneMarket } from '../services/streamingDayOneMarkets';
import '../styles/streaming-rights-calendar.css';
import StreamingCataloguePackageDesk from './StreamingCataloguePackageDesk';

interface StreamingRightsCalendarProps {
    player: Player;
    context: 'STUDIO' | 'PLATFORM';
    onUpdatePlayer: (player: Player) => void;
    onClose?: () => void;
    embedded?: boolean;
    studioId?: string;
    initialDeskTab?: StreamingRightsDeskTab;
}

export type StreamingRightsDeskTab = 'PORTFOLIO' | 'MANDATE' | 'RELATIONSHIPS' | 'STATEMENTS' | 'PACKAGES';

export const STREAMING_RIGHTS_DESK_TABS: StreamingRightsDeskTab[] = [
    'PORTFOLIO',
    'MANDATE',
    'RELATIONSHIPS',
    'STATEMENTS',
    'PACKAGES',
];

export const getNextStreamingRightsDeskTab = (
    current: StreamingRightsDeskTab,
    key: string,
): StreamingRightsDeskTab => {
    const currentIndex = Math.max(0, STREAMING_RIGHTS_DESK_TABS.indexOf(current));
    if (key === 'Home') return STREAMING_RIGHTS_DESK_TABS[0];
    if (key === 'End') return STREAMING_RIGHTS_DESK_TABS[STREAMING_RIGHTS_DESK_TABS.length - 1];
    if (key === 'ArrowRight') return STREAMING_RIGHTS_DESK_TABS[(currentIndex + 1) % STREAMING_RIGHTS_DESK_TABS.length];
    if (key === 'ArrowLeft') return STREAMING_RIGHTS_DESK_TABS[(currentIndex - 1 + STREAMING_RIGHTS_DESK_TABS.length) % STREAMING_RIGHTS_DESK_TABS.length];
    return current;
};

const formatMoney = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    return `$${Math.round(value).toLocaleString()}`;
};

const scopeLabel = (item: {
    territory: StreamingRightsRenewalCase['territory'];
    countryIds?: string[];
    exclusivity: StreamingRightsRenewalCase['exclusivity'];
}): string => {
    const countryIds = item.countryIds || [];
    const territory = item.territory === 'GLOBAL'
        ? 'Worldwide'
        : countryIds.length === 1 ? countryIds[0] : `${countryIds.length} markets`;
    return `${territory} ${item.exclusivity === 'EXCLUSIVE' ? 'exclusive' : 'shared'}`;
};

const countryScopeLabel = (countryIds: string[]): string => {
    const names = countryIds.map(countryId => getStreamingDayOneMarket(countryId)?.country || countryId);
    if (!names.length) return 'Worldwide';
    if (names.length <= 2) return names.join(' + ');
    return `${names.slice(0, 2).join(' + ')} +${names.length - 2}`;
};

export const getStreamingRightsTimingLabel = (
    contract: Pick<StreamingRightsContract, 'status' | 'permanentPurchase' | 'windowType' | 'renewalOption' | 'expiresAtAbsoluteWeek'>,
    absoluteWeek: number,
    renewalCase: StreamingRightsRenewalCase | null | undefined,
): string => {
    if (contract.permanentPurchase || contract.windowType === 'PERMANENT') return 'Permanent';
    if (contract.status === 'EXPIRED') return 'Expired';
    if (renewalCase?.status === 'ACTION_REQUIRED') return 'Decision required';
    if (renewalCase?.status === 'RENEWAL_SECURED') {
        return `Renewal secured - starts Week ${renewalCase.renewalStartsAtAbsoluteWeek}`;
    }
    if (renewalCase?.status === 'RETURNING_TO_MARKET') {
        return `Returns to market in Week ${renewalCase.renewalStartsAtAbsoluteWeek}`;
    }
    if (renewalCase?.status === 'LETTING_EXPIRE' || !contract.renewalOption) {
        return `Leaving catalogue after Week ${contract.expiresAtAbsoluteWeek}`;
    }
    if (renewalCase?.status === 'NO_OFFER') return 'No renewal offer';
    const remaining = Math.max(0, contract.expiresAtAbsoluteWeek - absoluteWeek);
    if (renewalCase) return `Renews in ${remaining} ${remaining === 1 ? 'week' : 'weeks'}`;
    const opensIn = Math.max(0, contract.expiresAtAbsoluteWeek - 8 - absoluteWeek);
    return opensIn > 0
        ? `Renewal opens in ${opensIn} ${opensIn === 1 ? 'week' : 'weeks'}`
        : `Leaving catalogue after Week ${contract.expiresAtAbsoluteWeek}`;
};

export const getStreamingRightsProjectLine = (
    player: Player,
    projectId: string,
    absoluteWeek: number,
): string | null => {
    const contract = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts))
        .filter(candidate => (
            candidate.sourceProjectId === projectId
            && isStreamingLicenseActiveAt(candidate, absoluteWeek)
        ))
        .sort((left, right) => (
            Number(right.territory === 'GLOBAL') - Number(left.territory === 'GLOBAL')
            || Number(right.exclusivity === 'EXCLUSIVE') - Number(left.exclusivity === 'EXCLUSIVE')
            || left.expiresAtAbsoluteWeek - right.expiresAtAbsoluteWeek
            || left.id.localeCompare(right.id)
        ))[0];
    if (!contract) return null;
    const remaining = Math.max(0, contract.expiresAtAbsoluteWeek - absoluteWeek);
    const timing = contract.permanentPurchase || contract.windowType === 'PERMANENT'
        ? 'Permanent'
        : `${remaining} ${remaining === 1 ? 'week' : 'weeks'} remaining`;
    return `${contract.buyer.name} · ${scopeLabel(contract)} · ${timing}`;
};

const preferenceOptions: Array<{ id: StreamingRightsRenewalPreference; label: string }> = [
    { id: 'BALANCED', label: 'Balanced' },
    { id: 'RENEW_WINNERS', label: 'Renew winners' },
    { id: 'RETEST_MARKET', label: 'Retest market' },
    { id: 'UPFRONT_SECURITY', label: 'Upfront security' },
    { id: 'BACKEND_UPSIDE', label: 'Backend upside' },
    { id: 'RELATIONSHIP_FIRST', label: 'Relationship first' },
];

const mandateOptions = {
    financialPriority: [
        { id: 'UPFRONT_SECURITY', label: 'Upfront security' },
        { id: 'BALANCED_RETURN', label: 'Balanced return' },
        { id: 'BACKEND_UPSIDE', label: 'Backend upside' },
    ] as Array<{ id: StreamingRightsFinancialPriority; label: string }>,
    distributionPriority: [
        { id: 'GLOBAL_PARTNER', label: 'Global partner' },
        { id: 'REGIONAL_OPTIMIZATION', label: 'Regional optimization' },
        { id: 'BROAD_NON_EXCLUSIVE', label: 'Broad non-exclusive' },
    ] as Array<{ id: StreamingRightsDistributionPriority; label: string }>,
    exclusivityPolicy: [
        { id: 'ALLOW_WITHIN_LIMITS', label: 'Allow within limits' },
        { id: 'RESTRICT', label: 'Restrict exclusivity' },
        { id: 'REQUIRE_APPROVAL', label: 'Require approval' },
    ] as Array<{ id: StreamingRightsExclusivityPolicy; label: string }>,
    durationPreference: [
        { id: 'SHORT', label: 'Short windows' },
        { id: 'BALANCED', label: 'Balanced windows' },
        { id: 'LONG', label: 'Long windows' },
    ] as Array<{ id: StreamingRightsDurationPreference; label: string }>,
    partnerPreference: [
        { id: 'STRONGEST_ECONOMICS', label: 'Strongest economics' },
        { id: 'WIDEST_REACH', label: 'Widest reach' },
        { id: 'TRUSTED_RELATIONSHIPS', label: 'Trusted relationships' },
    ] as Array<{ id: StreamingRightsPartnerPreference; label: string }>,
};

const humanize = (value: string): string => value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, first => first.toUpperCase());

const isVisibleForContext = (
    item: StreamingRightsCalendarItem,
    context: StreamingRightsCalendarProps['context'],
): boolean => context === 'STUDIO'
    ? item.seller.type === 'PLAYER_STUDIO'
    : item.incumbentBuyer.type === 'PLAYER_PLATFORM';

export const getStreamingRightsCaseDisclosureOpen = (
    item: Pick<StreamingRightsCalendarItem, 'status' | 'outcome'>,
): boolean => item.outcome === 'PENDING' && (
    item.status === 'ACTION_REQUIRED'
    || item.status === 'OFFER_AVAILABLE'
);

const groupDefinitions: Array<{
    key: 'actionRequired' | 'expiringSoon' | 'renewalNegotiations' | 'returningToMarket' | 'recentlyCompleted';
    label: string;
    description: string;
}> = [
    { key: 'actionRequired', label: 'Action required', description: 'Protected decisions waiting for you.' },
    { key: 'renewalNegotiations', label: 'Renewal negotiations', description: 'Live terms inside the valid decision window.' },
    { key: 'expiringSoon', label: 'Expiring soon', description: 'Contracts being watched by the rights desk.' },
    { key: 'returningToMarket', label: 'Returning to market', description: 'Exact windows prepared for a future auction.' },
    { key: 'recentlyCompleted', label: 'Recently completed', description: 'Renewed, expired, or closed decisions.' },
];

export default function StreamingRightsCalendar({
    player,
    context,
    onUpdatePlayer,
    onClose,
    embedded = false,
    studioId,
    initialDeskTab,
}: StreamingRightsCalendarProps) {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const management = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
    const calendar = useMemo(() => getStreamingRightsCalendar(player, absoluteWeek), [player, absoluteWeek]);
    const [feedback, setFeedback] = useState('');
    const [activeDeskTab, setActiveDeskTab] = useState<StreamingRightsDeskTab>(initialDeskTab || 'PORTFOLIO');
    const office = useMemo(
        () => studioId ? getStreamingRightsOffice(player, studioId, absoluteWeek) : null,
        [absoluteWeek, player, studioId],
    );
    const mandate = office?.mandate || null;
    const relationships = useMemo(
        () => studioId ? getStreamingCommercialRelationships(player, studioId) : [],
        [player, studioId],
    );
    const studioStatement = useMemo(
        () => studioId ? getStreamingStudioCommercialStatement(player, studioId) : null,
        [player, studioId],
    );
    const platformStatement = useMemo(
        () => getStreamingPlatformCommercialStatement(
            player,
            player.ownedStreamingPlatform.identity?.slug || `player-platform:${player.id}`,
        ),
        [player],
    );
    const visibleGroups: typeof calendar.groups = {
        actionRequired: calendar.groups.actionRequired.filter(item => isVisibleForContext(item, context)),
        expiringSoon: calendar.groups.expiringSoon.filter(item => isVisibleForContext(item, context)),
        renewalNegotiations: calendar.groups.renewalNegotiations.filter(item => isVisibleForContext(item, context)),
        returningToMarket: calendar.groups.returningToMarket.filter(item => isVisibleForContext(item, context)),
        recentlyCompleted: calendar.groups.recentlyCompleted.filter(item => isVisibleForContext(item, context)),
    };
    const visibleItems: StreamingRightsCalendarItem[] = [
        ...visibleGroups.actionRequired,
        ...visibleGroups.expiringSoon,
        ...visibleGroups.renewalNegotiations,
        ...visibleGroups.returningToMarket,
        ...visibleGroups.recentlyCompleted,
    ];
    const actionCount = visibleGroups.actionRequired.length;
    const approachingCount = visibleGroups.expiringSoon.length + visibleGroups.renewalNegotiations.length;
    const delegatedCount = visibleItems.filter(item => item.outcome === 'DELEGATED_ACCEPTED').length;
    const marketCount = visibleGroups.returningToMarket.length;
    const transferLedger = useMemo(() => {
        if (context !== 'STUDIO') return [];
        const contracts = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
        const transactions = Object.values(normalizeStreamingRightsTransactionRegistry(player.world.streamingRightsTransactions))
            .filter(transaction => (
                transaction.kind === 'LICENSE_TRANSFER'
                && transaction.status === 'SETTLED'
                && transaction.originalOwner.type === 'PLAYER_STUDIO'
                && (!studioId || transaction.originalOwner.id === studioId)
            ))
            .sort((left, right) => right.settledAtAbsoluteWeek - left.settledAtAbsoluteWeek);
        const seenRoots = new Set<string>();
        return transactions.flatMap(transaction => {
            if (seenRoots.has(transaction.rootContractId)) return [];
            seenRoots.add(transaction.rootContractId);
            const current = Object.values(contracts).find(contract => (
                contract.rootContractId === transaction.rootContractId
                && isStreamingLicenseActiveAt(contract, absoluteWeek)
            ));
            if (!current) return [];
            const chain = getStreamingRightsTransferChain(player.world, current.id);
            return [{
                id: transaction.rootContractId,
                title: current.titleAtSigning,
                holders: chain.holders.map(holder => holder.name),
                currentHolder: current.buyer.name,
                countryIds: current.countryIds,
                remainingWeeks: Math.max(0, current.expiresAtAbsoluteWeek - absoluteWeek),
                exclusivity: current.exclusivity,
            }];
        });
    }, [absoluteWeek, context, player.world, studioId]);

    const setMode = (controlMode: 'STRATEGY' | 'CUSTOM' | 'FULL') => {
        const nextPlayer = studioId
            ? updateStreamingRightsStudioMandate(player, { studioId, absoluteWeek, patch: { controlMode } })
            : updateStreamingRightsManagement(player, { controlMode, absoluteWeek });
        onUpdatePlayer(nextPlayer);
        setFeedback(`${controlMode === 'CUSTOM' ? 'Custom Control' : controlMode === 'FULL' ? 'Full Control' : 'Strategy Mode'} will govern future undecided cases.`);
    };

    const setPreference = (preference: StreamingRightsRenewalPreference) => {
        const nextPlayer = studioId
            ? updateStreamingRightsStudioMandate(player, { studioId, absoluteWeek, patch: { renewalPreference: preference } })
            : updateStreamingRightsManagement(player, { preference, absoluteWeek });
        onUpdatePlayer(nextPlayer);
        setFeedback('Renewal policy updated. Signed contracts and saved offers were not rerolled.');
    };

    const updateMandate = (patch: Partial<Omit<StreamingRightsStudioMandate, 'studioId' | 'revision' | 'updatedAtAbsoluteWeek'>>) => {
        if (!studioId) return;
        onUpdatePlayer(updateStreamingRightsStudioMandate(player, { studioId, absoluteWeek, patch }));
        setFeedback('Licensing mandate updated. Existing contracts remain unchanged.');
    };

    const resolve = (caseId: string, action: 'ACCEPT_RENEWAL' | 'RETURN_TO_MARKET' | 'LET_EXPIRE') => {
        const result = resolveStreamingRightsRenewal(player, { caseId, action, absoluteWeek });
        if (!result.changed) {
            setFeedback(result.detail || 'This decision is no longer available.');
            return;
        }
        onUpdatePlayer(result.player);
        setFeedback(result.detail || 'Rights decision recorded.');
    };

    const takeControl = (caseId: string) => {
        const result = takeControlOfStreamingRightsRenewal(player, caseId, absoluteWeek);
        if (!result.changed) return;
        onUpdatePlayer(result.player);
        setFeedback('Manual Control applied to this title.');
    };

    const activateDeskTab = (tab: StreamingRightsDeskTab) => {
        setActiveDeskTab(tab);
    };

    const handleDeskTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: StreamingRightsDeskTab) => {
        const nextTab = getNextStreamingRightsDeskTab(tab, event.key);
        if (nextTab === tab && !['Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        activateDeskTab(nextTab);
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(() => document.getElementById(`streaming-rights-tab-${nextTab.toLowerCase()}`)?.focus());
        }
    };

    return (
        <div className={`streaming-rights-calendar is-${context.toLowerCase()} ${embedded ? 'is-embedded' : ''}`}>
            <header className="src-topbar">
                {onClose ? <button type="button" className="src-back" onClick={onClose} aria-label="Close Rights Office"><ArrowLeft size={19} /></button> : null}
                <div className="src-heading-mark"><CalendarClock size={23} /></div>
                <div className="src-heading-copy">
                    <span>{context === 'STUDIO' ? 'EMPIRE STUDIOS / RIGHTS DESK' : 'EMPIRE+ / RIGHTS EXCHANGE'}</span>
                    <h1>{context === 'STUDIO' ? 'Rights Office' : 'Rights Exchange'}</h1>
                    <p>Week {absoluteWeek} · portfolio, mandates and exact contract windows</p>
                </div>
                <div className="src-clock"><Clock3 size={15} /><span>Portfolio clock</span><strong>W{absoluteWeek}</strong></div>
            </header>

            <main className="src-main">
                {context === 'STUDIO' && studioId ? <nav className="src-desk-tabs" role="tablist" aria-label="Rights Office sections">
                    <button id="streaming-rights-tab-portfolio" type="button" role="tab" aria-selected={activeDeskTab === 'PORTFOLIO'} aria-controls="streaming-rights-panel-portfolio" tabIndex={activeDeskTab === 'PORTFOLIO' ? 0 : -1} className={activeDeskTab === 'PORTFOLIO' ? 'is-active' : ''} onClick={() => activateDeskTab('PORTFOLIO')} onKeyDown={event => handleDeskTabKeyDown(event, 'PORTFOLIO')}><LibraryBig size={15} />Portfolio</button>
                    <button id="streaming-rights-tab-mandate" type="button" role="tab" aria-selected={activeDeskTab === 'MANDATE'} aria-controls="streaming-rights-panel-mandate" tabIndex={activeDeskTab === 'MANDATE' ? 0 : -1} className={activeDeskTab === 'MANDATE' ? 'is-active' : ''} onClick={() => activateDeskTab('MANDATE')} onKeyDown={event => handleDeskTabKeyDown(event, 'MANDATE')}><SlidersHorizontal size={15} />Mandate</button>
                    <button id="streaming-rights-tab-relationships" type="button" role="tab" aria-selected={activeDeskTab === 'RELATIONSHIPS'} aria-controls="streaming-rights-panel-relationships" tabIndex={activeDeskTab === 'RELATIONSHIPS' ? 0 : -1} className={activeDeskTab === 'RELATIONSHIPS' ? 'is-active' : ''} onClick={() => activateDeskTab('RELATIONSHIPS')} onKeyDown={event => handleDeskTabKeyDown(event, 'RELATIONSHIPS')}><Handshake size={15} />Relationships</button>
                    <button id="streaming-rights-tab-statements" type="button" role="tab" aria-selected={activeDeskTab === 'STATEMENTS'} aria-controls="streaming-rights-panel-statements" tabIndex={activeDeskTab === 'STATEMENTS' ? 0 : -1} className={activeDeskTab === 'STATEMENTS' ? 'is-active' : ''} onClick={() => activateDeskTab('STATEMENTS')} onKeyDown={event => handleDeskTabKeyDown(event, 'STATEMENTS')}><ReceiptText size={15} />Statements</button>
                    <button id="streaming-rights-tab-packages" type="button" role="tab" aria-selected={activeDeskTab === 'PACKAGES'} aria-controls="streaming-rights-panel-packages" tabIndex={activeDeskTab === 'PACKAGES' ? 0 : -1} className={activeDeskTab === 'PACKAGES' ? 'is-active' : ''} onClick={() => activateDeskTab('PACKAGES')} onKeyDown={event => handleDeskTabKeyDown(event, 'PACKAGES')}><Layers3 size={15} />Packages</button>
                </nav> : null}
                <div
                    id={`streaming-rights-panel-${activeDeskTab.toLowerCase()}`}
                    role={context === 'STUDIO' && studioId ? 'tabpanel' : undefined}
                    aria-labelledby={context === 'STUDIO' && studioId ? `streaming-rights-tab-${activeDeskTab.toLowerCase()}` : undefined}
                    tabIndex={context === 'STUDIO' && studioId ? 0 : undefined}
                >{activeDeskTab === 'PACKAGES' && context === 'STUDIO' && studioId
                    ? <StreamingCataloguePackageDesk player={player} studioId={studioId} onUpdatePlayer={onUpdatePlayer} />
                    : activeDeskTab === 'MANDATE' && mandate
                        ? <section className="src-office-view src-mandate-view">
                            <header className="src-view-heading"><div><span>CONTROL POLICY</span><h2>Licensing mandate</h2><p>Set the rules once. Your rights team uses them only for future eligible decisions.</p></div><strong>REV {mandate.revision}</strong></header>
                            <div className="src-command-strip" aria-label="Rights control settings">
                                <div className="src-control-copy"><span>CONTROL AUTHORITY</span><strong>{humanize(mandate.controlMode)}</strong><p>Protected decisions always return to you.</p></div>
                                <div className="src-mode-switch" role="group" aria-label="Rights control mode">
                                    {(['STRATEGY', 'CUSTOM', 'FULL'] as const).map(mode => <button type="button" key={mode} className={mandate.controlMode === mode ? 'is-active' : ''} onClick={() => setMode(mode)}>{mandate.controlMode === mode ? <Check size={13} /> : null}{humanize(mode)}</button>)}
                                </div>
                                <label className="src-policy-select"><span>Renewal policy</span><select value={mandate.renewalPreference} onChange={event => setPreference(event.target.value as StreamingRightsRenewalPreference)}>{preferenceOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                            </div>
                            <div className="src-mandate-grid">
                                <label><span>Financial priority</span><select value={mandate.financialPriority} onChange={event => updateMandate({ financialPriority: event.target.value as StreamingRightsFinancialPriority })}>{mandateOptions.financialPriority.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                                <label><span>Distribution priority</span><select value={mandate.distributionPriority} onChange={event => updateMandate({ distributionPriority: event.target.value as StreamingRightsDistributionPriority })}>{mandateOptions.distributionPriority.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                                <label><span>Exclusivity policy</span><select value={mandate.exclusivityPolicy} onChange={event => updateMandate({ exclusivityPolicy: event.target.value as StreamingRightsExclusivityPolicy })}>{mandateOptions.exclusivityPolicy.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                                <label><span>Window duration</span><select value={mandate.durationPreference} onChange={event => updateMandate({ durationPreference: event.target.value as StreamingRightsDurationPreference })}>{mandateOptions.durationPreference.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                                <label><span>Partner preference</span><select value={mandate.partnerPreference} onChange={event => updateMandate({ partnerPreference: event.target.value as StreamingRightsPartnerPreference })}>{mandateOptions.partnerPreference.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                                <label><span>Automatic guarantee ceiling</span><select value={mandate.maximumAutomaticGuarantee} onChange={event => updateMandate({ maximumAutomaticGuarantee: Number(event.target.value) })}>{[50_000_000, 100_000_000, 150_000_000, 250_000_000].map(value => <option key={value} value={value}>{formatMoney(value)}</option>)}</select></label>
                            </div>
                            <div className="src-protection-rules">
                                <label><input type="checkbox" checked={mandate.protectGlobalExclusives} onChange={event => updateMandate({ protectGlobalExclusives: event.target.checked })} /><span><strong>Global exclusives</strong><small>Always request approval before locking every market.</small></span></label>
                                <label><input type="checkbox" checked={mandate.protectFranchises} onChange={event => updateMandate({ protectFranchises: event.target.checked })} /><span><strong>Franchise titles</strong><small>Keep strategic IP decisions under manual control.</small></span></label>
                            </div>
                            {feedback ? <div className="src-feedback" role="status"><ShieldCheck size={15} />{feedback}</div> : null}
                        </section>
                        : activeDeskTab === 'RELATIONSHIPS' && studioId
                            ? <section className="src-office-view">
                                <header className="src-view-heading"><div><span>COMMERCIAL HISTORY</span><h2>Relationship intelligence</h2><p>Built from accepted deals, commissioned delivery, renewals, settlements and recovery.</p></div><strong>{relationships.length}</strong></header>
                                <div className="src-relationship-list">
                                    {relationships.map(relationship => <article key={relationship.platformId}>
                                        <div className="src-relationship-score"><strong>{relationship.score}</strong><span>/ 100</span></div>
                                        <div className="src-relationship-name"><h3>{relationship.platformName}</h3><p>{humanize(relationship.tier)} · {humanize(relationship.trend)}</p></div>
                                        <div className="src-relationship-facts">{relationship.reasons.map(reason => <span key={reason}>{reason}</span>)}</div>
                                        <div className="src-relationship-value"><span>Realized partner value</span><strong>{formatMoney(relationship.realizedPartnerValue + relationship.backendPaid)}</strong></div>
                                    </article>)}
                                    {!relationships.length ? <div className="src-empty"><Handshake size={31} /><h2>No commercial history yet</h2><p>Relationships emerge from real contracts, delivery and settlements.</p></div> : null}
                                </div>
                            </section>
                            : activeDeskTab === 'STATEMENTS' && studioStatement
                                ? <section className="src-office-view">
                                    <header className="src-view-heading"><div><span>REALIZED ECONOMICS</span><h2>Commercial statement</h2><p>Contract-backed cash and attribution. Production funding is shown separately from income.</p></div><strong>{formatMoney(studioStatement.cashIncome)}</strong></header>
                                    <div className="src-statement-ledger">
                                        {[
                                            ['Licensing guarantees', studioStatement.licensingGuarantees],
                                            ['Producer fees paid', studioStatement.producerFeesPaid],
                                            ['Backend paid', studioStatement.backendPaid],
                                            ['Downstream transfer proceeds', studioStatement.downstreamTransferProceeds],
                                            ['Restricted production funding', studioStatement.platformFundedProductionBudgets],
                                            ['Locked future-season funding', studioStatement.lockedFutureSeasonFunding],
                                            ['Attributed adjusted gross', studioStatement.attributedAdjustedGross],
                                            ['Gross backend accrued', studioStatement.grossBackendAccrued],
                                            ['Recoupment remaining', studioStatement.recoupmentRemaining],
                                        ].map(([label, value], index) => <div key={String(label)} className={index < 4 ? 'is-cash' : ''}><span>{label}</span><strong>{formatMoney(Number(value))}</strong></div>)}
                                    </div>
                                    <div className="src-statement-total"><span>Cash income received</span><strong>{formatMoney(studioStatement.cashIncome)}</strong><small>No production cap is counted as studio income.</small></div>
                                </section>
                                : <>
                                    {context === 'STUDIO' && !studioId ? <section className="src-command-strip" aria-label="Rights control settings">
                                        <div className="src-control-copy"><span>CONTROL AUTHORITY</span><strong>{management.controlMode === 'CUSTOM' ? 'Custom Control' : management.controlMode === 'FULL' ? 'Full Control' : 'Strategy Mode'}</strong><p>Routine work follows policy. Protected titles remain visible.</p></div>
                                        <div className="src-mode-switch" role="group" aria-label="Rights control mode">{(['STRATEGY', 'CUSTOM', 'FULL'] as const).map(mode => <button type="button" key={mode} className={management.controlMode === mode ? 'is-active' : ''} onClick={() => setMode(mode)}>{management.controlMode === mode ? <Check size={13} /> : null}{humanize(mode)}</button>)}</div>
                                        <label className="src-policy-select"><span>Standing policy</span><select value={management.policy.preference} onChange={event => setPreference(event.target.value as StreamingRightsRenewalPreference)}>{preferenceOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                                    </section> : null}
                                    {office ? <section className="src-office-intro">
                                        <div><span>LICENSING PORTFOLIO</span><h2>{office.totalTitles} titles under management</h2><p>{humanize(office.controlMode)} control · {humanize(office.mandate.financialPriority)} · mandate revision {office.mandate.revision}</p></div>
                                        {office.latestDigest ? <blockquote><span>W{office.latestDigest.absoluteWeek} DESK NOTE</span><p>{office.latestDigest.summary}</p></blockquote> : <blockquote><span>DESK NOTE</span><p>No material rights activity this week.</p></blockquote>}
                                    </section> : context === 'PLATFORM' ? <section className="src-platform-statement"><span>PLATFORM RIGHTS POSITION</span><strong>{formatMoney(platformStatement.retainedContribution)}</strong><p>Realized retained contribution across contracts and transfers.</p></section> : null}

                                    {office ? <section className="src-action-rail">
                                        <header><div><span>Action rail</span><p>Only protected or deadline-sensitive decisions reach this queue.</p></div><strong>{office.actionRail.length}</strong></header>
                                        {office.actionRail.length ? <div>{office.actionRail.map(item => <article key={item.id}><i /><div><strong>{item.title}</strong><span>{item.platformName || 'Open market'} · {item.warning || 'approval required'}</span></div><time>{item.deadlineAbsoluteWeek === null ? 'OPEN' : `W${item.deadlineAbsoluteWeek}`}</time><b>{formatMoney(item.minimumGuarantee)}</b></article>)}</div> : <div className="src-clear"><ShieldCheck size={19} /><span>No protected decision is waiting.</span></div>}
                                    </section> : null}

                                    <section className="src-scoreboard" aria-label="Rights portfolio summary">
                                        <div className={actionCount ? 'is-alert' : ''}><span>Decision queue</span><strong>{actionCount}</strong><small>require approval</small></div>
                                        <div><span>Approaching</span><strong>{approachingCount}</strong><small>expiry or offer</small></div>
                                        <div><span>Delegated</span><strong>{delegatedCount}</strong><small>renewals secured</small></div>
                                        <div><span>Market return</span><strong>{marketCount}</strong><small>exact windows</small></div>
                                    </section>

                                    {feedback ? <div className="src-feedback" role="status"><ShieldCheck size={15} />{feedback}</div> : null}

                                    {transferLedger.length ? <section className="src-transfer-ledger" aria-label="Rights transfer ledger">
                                        <header><div><span>Rights transfer ledger</span><p>Your studio still owns the IP. This records who currently holds each licensed window.</p></div><strong>{transferLedger.length}</strong></header>
                                        <div>{transferLedger.map(row => <article key={row.id}>
                                            <div className="src-transfer-title"><span>LICENCE CHAIN</span><strong>{row.title}</strong></div>
                                            <div className="src-transfer-chain">{row.holders.map((holder, index) => <span key={`${row.id}:${holder}:${index}`}>{index ? <ChevronRight size={12} /> : null}<b>{holder}</b></span>)}</div>
                                            <div className="src-transfer-holder"><span>Current holder</span><strong>{row.currentHolder}</strong></div>
                                            <div className="src-transfer-scope"><span>{row.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}</span><strong>{countryScopeLabel(row.countryIds)} · {row.remainingWeeks} weeks remaining</strong></div>
                                        </article>)}</div>
                                    </section> : null}

                                    <div className="src-groups">
                                        {groupDefinitions.map(group => {
                                            const items = visibleGroups[group.key];
                                            if (!items.length && group.key !== 'actionRequired') return null;
                                            return <section className={`src-group is-${group.key}`} key={group.key}>
                                                <header><div><span>{group.label}</span><p>{group.description}</p></div><strong>{items.length}</strong></header>
                                                {items.length ? <div className="src-case-list">{items.map(item => <article className="src-case" key={item.id} data-renewal-case-id={item.id}>
                                                    <div className="src-case-state"><i /><span>{item.status.replaceAll('_', ' ')}</span></div>
                                                    <div className="src-case-title"><h2>{item.title}</h2><p>{item.incumbentBuyer.name} · {scopeLabel(item)} · {item.windowType.replaceAll('_', ' ').toLowerCase()}</p></div>
                                                    <details className="src-case-file" open={getStreamingRightsCaseDisclosureOpen(item)} data-contract-disclosure>
                                                        <summary><span>Contract file</span><strong>{item.weeksRemaining ? `${item.weeksRemaining}w left` : `W${item.renewalStartsAtAbsoluteWeek} next`}</strong><ChevronRight size={14} /></summary>
                                                        <div className="src-case-file-body">
                                                            <div className="src-case-time"><span>Current window</span><strong>Through W{item.sourceExpiresAtAbsoluteWeek}</strong><small>{item.weeksRemaining ? `${item.weeksRemaining} weeks remaining` : `Next window W${item.renewalStartsAtAbsoluteWeek}`}</small></div>
                                                            <div className="src-case-terms">{item.proposedEconomics ? <><div><span>Guarantee</span><strong>{formatMoney(item.proposedEconomics.minimumGuarantee)}</strong></div><div><span>Studio backend</span><strong>{item.proposedEconomics.licensorRevenueShare}%</strong></div><div><span>Term</span><strong>{item.proposedEconomics.durationWeeks}w</strong></div></> : <div className="is-wide"><span>Renewal position</span><strong>{item.offerDisposition === 'DECLINED' ? 'No incumbent offer' : 'Under review'}</strong></div>}</div>
                                                            {item.protectionReasons.length ? <div className="src-case-reasons"><ShieldCheck size={14} />{item.protectionReasons.map(reason => reason.replaceAll('_', ' ').toLowerCase()).join(' · ')}</div> : null}
                                                            {item.delegatedReason ? <div className="src-case-mandate"><Gauge size={14} />{item.delegatedReason}</div> : null}
                                                        </div>
                                                    </details>
                                                    {item.outcome === 'PENDING' ? <footer>{item.offerDisposition === 'OFFERED' ? <button type="button" className="is-primary" onClick={() => resolve(item.id, 'ACCEPT_RENEWAL')}><FileKey2 size={15} />Accept renewal</button> : null}<button type="button" onClick={() => resolve(item.id, 'RETURN_TO_MARKET')}><Store size={15} />Return to market</button><button type="button" onClick={() => resolve(item.id, 'LET_EXPIRE')}><RotateCcw size={15} />Let expire</button>{item.status !== 'ACTION_REQUIRED' ? <button type="button" className="is-link" onClick={() => takeControl(item.id)}>Take control <ChevronRight size={14} /></button> : null}</footer> : null}
                                                </article>)}</div> : <div className="src-clear"><ShieldCheck size={19} /><span>No protected decision is waiting.</span></div>}
                                            </section>;
                                        })}
                                        {!visibleItems.length ? <div className="src-empty"><CalendarClock size={31} /><h2>No contract deadlines yet</h2><p>Signed non-permanent streaming contracts will enter this portfolio clock before expiry.</p></div> : null}
                                    </div>
                                </>}
                </div>
            </main>
        </div>
    );
}
