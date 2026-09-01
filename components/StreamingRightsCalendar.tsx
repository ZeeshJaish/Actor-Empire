import { useMemo, useState } from 'react';
import {
    ArrowLeft,
    CalendarClock,
    Check,
    ChevronRight,
    Clock3,
    FileKey2,
    Gauge,
    RotateCcw,
    ShieldCheck,
    Store,
    Layers3,
} from 'lucide-react';
import type {
    Player,
    StreamingRightsContract,
    StreamingRightsRenewalCase,
    StreamingRightsRenewalPreference,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    getStreamingRightsCalendar,
    normalizeStreamingRightsManagementState,
    resolveStreamingRightsRenewal,
    takeControlOfStreamingRightsRenewal,
    updateStreamingRightsManagement,
    type StreamingRightsCalendarItem,
} from '../services/streamingRightsCalendar';
import {
    isStreamingLicenseActiveAt,
    normalizeStreamingRightsContractRegistry,
} from '../services/streamingRightsCore';
import '../styles/streaming-rights-calendar.css';
import StreamingCataloguePackageDesk from './StreamingCataloguePackageDesk';

interface StreamingRightsCalendarProps {
    player: Player;
    context: 'STUDIO' | 'PLATFORM';
    onUpdatePlayer: (player: Player) => void;
    onClose?: () => void;
    embedded?: boolean;
    studioId?: string;
}

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

const isVisibleForContext = (
    item: StreamingRightsCalendarItem,
    context: StreamingRightsCalendarProps['context'],
): boolean => context === 'STUDIO'
    ? item.seller.type === 'PLAYER_STUDIO'
    : item.incumbentBuyer.type === 'PLAYER_PLATFORM';

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
}: StreamingRightsCalendarProps) {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const management = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
    const calendar = useMemo(() => getStreamingRightsCalendar(player, absoluteWeek), [player, absoluteWeek]);
    const [feedback, setFeedback] = useState('');
    const [activeDeskTab, setActiveDeskTab] = useState<'CALENDAR' | 'PACKAGES'>('CALENDAR');
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

    const setMode = (controlMode: 'STRATEGY' | 'CUSTOM' | 'FULL') => {
        onUpdatePlayer(updateStreamingRightsManagement(player, { controlMode, absoluteWeek }));
        setFeedback(`${controlMode === 'CUSTOM' ? 'Custom Control' : controlMode === 'FULL' ? 'Full Control' : 'Strategy Mode'} will govern future undecided cases.`);
    };

    const setPreference = (preference: StreamingRightsRenewalPreference) => {
        onUpdatePlayer(updateStreamingRightsManagement(player, { preference, absoluteWeek }));
        setFeedback('Renewal policy updated. Signed contracts and saved offers were not rerolled.');
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

    return (
        <div className={`streaming-rights-calendar is-${context.toLowerCase()} ${embedded ? 'is-embedded' : ''}`}>
            <header className="src-topbar">
                {onClose ? <button type="button" className="src-back" onClick={onClose} aria-label="Close Rights Calendar"><ArrowLeft size={19} /></button> : null}
                <div className="src-heading-mark"><CalendarClock size={23} /></div>
                <div className="src-heading-copy">
                    <span>{context === 'STUDIO' ? 'EMPIRE STUDIOS / RIGHTS DESK' : 'EMPIRE+ / RIGHTS EXCHANGE'}</span>
                    <h1>Rights Calendar</h1>
                    <p>Week {absoluteWeek} · exact contract windows and renewal decisions</p>
                </div>
                <div className="src-clock"><Clock3 size={15} /><span>Portfolio clock</span><strong>W{absoluteWeek}</strong></div>
            </header>

            <main className="src-main">
                {context === 'STUDIO' && studioId ? <nav className="src-desk-tabs" aria-label="Rights Desk sections">
                    <button type="button" className={activeDeskTab === 'CALENDAR' ? 'is-active' : ''} onClick={() => setActiveDeskTab('CALENDAR')}><CalendarClock size={15} />Calendar</button>
                    <button type="button" className={activeDeskTab === 'PACKAGES' ? 'is-active' : ''} onClick={() => setActiveDeskTab('PACKAGES')}><Layers3 size={15} />Packages</button>
                </nav> : null}
                {activeDeskTab === 'PACKAGES' && context === 'STUDIO' && studioId
                    ? <StreamingCataloguePackageDesk player={player} studioId={studioId} onUpdatePlayer={onUpdatePlayer} />
                    : <>
                <section className="src-command-strip" aria-label="Rights control settings">
                    <div className="src-control-copy">
                        <span>CONTROL AUTHORITY</span>
                        <strong>{management.controlMode === 'CUSTOM' ? 'Custom Control' : management.controlMode === 'FULL' ? 'Full Control' : 'Strategy Mode'}</strong>
                        <p>Routine work follows policy. Protected titles remain visible.</p>
                    </div>
                    <div className="src-mode-switch" role="group" aria-label="Rights control mode">
                        {(['STRATEGY', 'CUSTOM', 'FULL'] as const).map(mode => (
                            <button type="button" key={mode} className={management.controlMode === mode ? 'is-active' : ''} onClick={() => setMode(mode)}>
                                {management.controlMode === mode ? <Check size={13} /> : null}
                                {mode === 'STRATEGY' ? 'Strategy' : mode === 'CUSTOM' ? 'Custom' : 'Full'}
                            </button>
                        ))}
                    </div>
                    <label className="src-policy-select">
                        <span>Standing policy</span>
                        <select value={management.policy.preference} onChange={event => setPreference(event.target.value as StreamingRightsRenewalPreference)}>
                            {preferenceOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                    </label>
                </section>

                <section className="src-scoreboard" aria-label="Rights portfolio summary">
                    <div className={actionCount ? 'is-alert' : ''}><span>Decision queue</span><strong>{actionCount}</strong><small>require approval</small></div>
                    <div><span>Approaching</span><strong>{approachingCount}</strong><small>expiry or offer</small></div>
                    <div><span>Delegated</span><strong>{delegatedCount}</strong><small>renewals secured</small></div>
                    <div><span>Market return</span><strong>{marketCount}</strong><small>exact windows</small></div>
                </section>

                {feedback ? <div className="src-feedback" role="status"><ShieldCheck size={15} />{feedback}</div> : null}

                <div className="src-groups">
                    {groupDefinitions.map(group => {
                        const items = visibleGroups[group.key];
                        if (!items.length && group.key !== 'actionRequired') return null;
                        return (
                            <section className={`src-group is-${group.key}`} key={group.key}>
                                <header><div><span>{group.label}</span><p>{group.description}</p></div><strong>{items.length}</strong></header>
                                {items.length ? <div className="src-case-list">
                                    {items.map(item => (
                                        <article className="src-case" key={item.id} data-renewal-case-id={item.id}>
                                            <div className="src-case-state"><i /><span>{item.status.replaceAll('_', ' ')}</span></div>
                                            <div className="src-case-title">
                                                <h2>{item.title}</h2>
                                                <p>{item.incumbentBuyer.name} · {scopeLabel(item)} · {item.windowType.replaceAll('_', ' ').toLowerCase()}</p>
                                            </div>
                                            <div className="src-case-time">
                                                <span>Current window</span>
                                                <strong>Through W{item.sourceExpiresAtAbsoluteWeek}</strong>
                                                <small>{item.weeksRemaining ? `${item.weeksRemaining} weeks remaining` : `Next window W${item.renewalStartsAtAbsoluteWeek}`}</small>
                                            </div>
                                            <div className="src-case-terms">
                                                {item.proposedEconomics ? <>
                                                    <div><span>Guarantee</span><strong>{formatMoney(item.proposedEconomics.minimumGuarantee)}</strong></div>
                                                    <div><span>Studio backend</span><strong>{item.proposedEconomics.licensorRevenueShare}%</strong></div>
                                                    <div><span>Term</span><strong>{item.proposedEconomics.durationWeeks}w</strong></div>
                                                </> : <div className="is-wide"><span>Renewal position</span><strong>{item.offerDisposition === 'DECLINED' ? 'No incumbent offer' : 'Under review'}</strong></div>}
                                            </div>
                                            {item.protectionReasons.length ? <div className="src-case-reasons"><ShieldCheck size={14} />{item.protectionReasons.map(reason => reason.replaceAll('_', ' ').toLowerCase()).join(' · ')}</div> : null}
                                            {item.delegatedReason ? <div className="src-case-mandate"><Gauge size={14} />{item.delegatedReason}</div> : null}
                                            {item.outcome === 'PENDING' ? <footer>
                                                {item.offerDisposition === 'OFFERED' ? <button type="button" className="is-primary" onClick={() => resolve(item.id, 'ACCEPT_RENEWAL')}><FileKey2 size={15} />Accept renewal</button> : null}
                                                <button type="button" onClick={() => resolve(item.id, 'RETURN_TO_MARKET')}><Store size={15} />Return to market</button>
                                                <button type="button" onClick={() => resolve(item.id, 'LET_EXPIRE')}><RotateCcw size={15} />Let expire</button>
                                                {item.status !== 'ACTION_REQUIRED' ? <button type="button" className="is-link" onClick={() => takeControl(item.id)}>Take control <ChevronRight size={14} /></button> : null}
                                            </footer> : null}
                                        </article>
                                    ))}
                                </div> : <div className="src-clear"><ShieldCheck size={19} /><span>No protected decision is waiting.</span></div>}
                            </section>
                        );
                    })}
                    {!visibleItems.length ? <div className="src-empty"><CalendarClock size={31} /><h2>No contract deadlines yet</h2><p>Signed non-permanent streaming contracts will enter this portfolio clock before expiry.</p></div> : null}
                </div>
                </>}
            </main>
        </div>
    );
}
