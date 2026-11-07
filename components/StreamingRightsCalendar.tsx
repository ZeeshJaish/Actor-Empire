import { gameWeekLabel, gameWeekShort } from '../services/gameWeek';
import { useMemo, useState } from 'react';
import {
    ArrowLeft,
    CalendarClock,
    ChevronRight,
    Clock3,
    FileKey2,
    Gauge,
    RotateCcw,
    ShieldCheck,
    Store,
} from 'lucide-react';
import type {
    Player,
    StreamingRightsContract,
    StreamingRightsRenewalCase,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    getStreamingRightsCalendar,
    resolveStreamingRightsRenewal,
    takeControlOfStreamingRightsRenewal,
    type StreamingRightsCalendarItem,
} from '../services/streamingRightsCalendar';
import { getStreamingPlatformCommercialStatement } from '../services/streamingRightsOffice';
import {
    isStreamingLicenseActiveAt,
    normalizeStreamingRightsContractRegistry,
} from '../services/streamingRightsCore';
import '../styles/streaming-rights-calendar.css';

/* #316: the platform's calendar of what it holds. A Production House's rights live in `components/rights/RightsRoom.tsx`. */
interface StreamingRightsCalendarProps {
    player: Player;
    onUpdatePlayer: (player: Player) => void;
    onClose?: () => void;
    embedded?: boolean;
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
        return `Renewal secured - starts ${gameWeekLabel(renewalCase.renewalStartsAtAbsoluteWeek, absoluteWeek)}`;
    }
    if (renewalCase?.status === 'RETURNING_TO_MARKET') {
        return `Returns to market in ${gameWeekLabel(renewalCase.renewalStartsAtAbsoluteWeek, absoluteWeek)}`;
    }
    if (renewalCase?.status === 'LETTING_EXPIRE' || !contract.renewalOption) {
        return `Leaving catalogue after ${gameWeekLabel(contract.expiresAtAbsoluteWeek, absoluteWeek)}`;
    }
    if (renewalCase?.status === 'NO_OFFER') return 'No renewal offer';
    const remaining = Math.max(0, contract.expiresAtAbsoluteWeek - absoluteWeek);
    if (renewalCase) return `Renews in ${remaining} ${remaining === 1 ? 'week' : 'weeks'}`;
    const opensIn = Math.max(0, contract.expiresAtAbsoluteWeek - 8 - absoluteWeek);
    return opensIn > 0
        ? `Renewal opens in ${opensIn} ${opensIn === 1 ? 'week' : 'weeks'}`
        : `Leaving catalogue after ${gameWeekLabel(contract.expiresAtAbsoluteWeek, absoluteWeek)}`;
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

const isTheServicesOwn = (item: StreamingRightsCalendarItem): boolean => item.incumbentBuyer.type === 'PLAYER_PLATFORM';

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
    onUpdatePlayer,
    onClose,
    embedded = false,
}: StreamingRightsCalendarProps) {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const calendar = useMemo(() => getStreamingRightsCalendar(player, absoluteWeek), [player, absoluteWeek]);
    const [feedback, setFeedback] = useState('');
    const platformStatement = useMemo(
        () => getStreamingPlatformCommercialStatement(
            player,
            player.ownedStreamingPlatform.identity?.slug || `player-platform:${player.id}`,
        ),
        [player],
    );
    const visibleGroups: typeof calendar.groups = {
        actionRequired: calendar.groups.actionRequired.filter(isTheServicesOwn),
        expiringSoon: calendar.groups.expiringSoon.filter(isTheServicesOwn),
        renewalNegotiations: calendar.groups.renewalNegotiations.filter(isTheServicesOwn),
        returningToMarket: calendar.groups.returningToMarket.filter(isTheServicesOwn),
        recentlyCompleted: calendar.groups.recentlyCompleted.filter(isTheServicesOwn),
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
        <div className={`streaming-rights-calendar is-platform ${embedded ? 'is-embedded' : ''}`}>
            <header className="src-topbar">
                {onClose ? <button type="button" className="src-back" onClick={onClose} aria-label="Close Rights Exchange"><ArrowLeft size={19} /></button> : null}
                <div className="src-heading-mark"><CalendarClock size={23} /></div>
                <div className="src-heading-copy">
                    <span>EMPIRE+ / RIGHTS EXCHANGE</span>
                    <h1>Rights Exchange</h1>
                    <p>{gameWeekLabel(absoluteWeek, absoluteWeek)} · portfolio, mandates and exact contract windows</p>
                </div>
                <div className="src-clock"><Clock3 size={15} /><span>Portfolio clock</span><strong>{gameWeekShort(absoluteWeek)}</strong></div>
            </header>

            <main className="src-main">
                <section className="src-platform-statement"><span>PLATFORM RIGHTS POSITION</span><strong>{formatMoney(platformStatement.retainedContribution)}</strong><p>Realized retained contribution across contracts and transfers.</p></section>

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
                        return <section className={`src-group is-${group.key}`} key={group.key}>
                            <header><div><span>{group.label}</span><p>{group.description}</p></div><strong>{items.length}</strong></header>
                            {items.length ? <div className="src-case-list">{items.map(item => <article className="src-case" key={item.id} data-renewal-case-id={item.id}>
                                <div className="src-case-state"><i /><span>{item.status.replaceAll('_', ' ')}</span></div>
                                <div className="src-case-title"><h2>{item.title}</h2><p>{item.incumbentBuyer.name} · {scopeLabel(item)} · {item.windowType.replaceAll('_', ' ').toLowerCase()}</p></div>
                                <details className="src-case-file" open={getStreamingRightsCaseDisclosureOpen(item)} data-contract-disclosure>
                                    <summary><span>Contract file</span><strong>{item.weeksRemaining ? `${item.weeksRemaining}w left` : `${gameWeekShort(item.renewalStartsAtAbsoluteWeek)} next`}</strong><ChevronRight size={14} /></summary>
                                    <div className="src-case-file-body">
                                        <div className="src-case-time"><span>Current window</span><strong>Through {gameWeekShort(item.sourceExpiresAtAbsoluteWeek)}</strong><small>{item.weeksRemaining ? `${item.weeksRemaining} weeks remaining` : `Next window ${gameWeekShort(item.renewalStartsAtAbsoluteWeek)}`}</small></div>
                                        <div className="src-case-terms">{item.proposedEconomics ? <><div><span>Guarantee</span><strong>{formatMoney(item.proposedEconomics.minimumGuarantee)}</strong></div><div><span>Studio backend</span><strong>{item.proposedEconomics.licensorRevenueShare}%</strong></div><div><span>Term</span><strong>{item.proposedEconomics.durationWeeks}w</strong></div></> : <div className="is-wide"><span>Renewal position</span><strong>{item.offerDisposition === 'DECLINED' ? 'No incumbent offer' : 'Under review'}</strong></div>}</div>
                                        {item.protectionReasons.length ? <div className="src-case-reasons"><ShieldCheck size={14} />{item.protectionReasons.map(reason => reason.replaceAll('_', ' ').toLowerCase()).join(' · ')}</div> : null}
                                        {item.delegatedReason ? <div className="src-case-mandate"><Gauge size={14} />The team handles this one, unless you take control.</div> : null}
                                    </div>
                                </details>
                                {item.outcome === 'PENDING' ? <footer>{item.offerDisposition === 'OFFERED' ? <button type="button" className="is-primary" onClick={() => resolve(item.id, 'ACCEPT_RENEWAL')}><FileKey2 size={15} />Accept renewal</button> : null}<button type="button" onClick={() => resolve(item.id, 'RETURN_TO_MARKET')}><Store size={15} />Return to market</button><button type="button" onClick={() => resolve(item.id, 'LET_EXPIRE')}><RotateCcw size={15} />Let expire</button>{item.status !== 'ACTION_REQUIRED' ? <button type="button" className="is-link" onClick={() => takeControl(item.id)}>Take control <ChevronRight size={14} /></button> : null}</footer> : null}
                            </article>)}</div> : <div className="src-clear"><ShieldCheck size={19} /><span>No protected decision is waiting.</span></div>}
                        </section>;
                    })}
                    {!visibleItems.length ? <div className="src-empty"><CalendarClock size={31} /><h2>No contract deadlines yet</h2><p>Signed non-permanent streaming contracts will enter this portfolio clock before expiry.</p></div> : null}
                </div>
            </main>
        </div>
    );
}
