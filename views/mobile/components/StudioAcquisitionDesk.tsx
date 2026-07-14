import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
    AlertTriangle,
    ArrowLeft,
    Banknote,
    Building2,
    Check,
    ChevronRight,
    CircleDollarSign,
    FileSearch,
    Landmark,
    LockKeyhole,
    Minus,
    Percent,
    Plus,
    Scale,
    ShieldAlert,
    Sparkles,
    Target,
    TrendingUp,
    UserRound,
    Zap,
} from 'lucide-react';
import type { Player, SubsidiaryOperatingModel } from '../../../types';
import type { ForbesStudioProfile } from '../../../services/forbesStudioProfile';
import {
    calculateDueDiligenceFee,
    analyzeCustomOffer,
    getFundingOptions,
    getOfferPresets,
    completeStudioAcquisition,
    completeStockControlAcquisition,
    runDueDiligence,
    submitOpeningOffer,
    type AcquisitionCase,
    type AcquisitionFundingOption,
    type AcquisitionFundingSelection,
    type AcquisitionCommitmentId,
    type AcquisitionOfferType,
    type SellerResponsePosture,
    getAcquisitionCommitments,
} from '../../../services/studioAcquisition';
import { getCompanyPosition, getStrategicStakeThreshold } from '../../../services/companyPosition';
import { formatMoney } from '../../../services/formatUtils';
import { getOperatingModels } from '../../../services/studioGroup';
import { getPlayerLanguage, t } from '../../../services/i18n';
import { PHASE_ONE_ENERGY_COSTS } from '../../../services/energyCosts';
import { showAd } from '../../../services/adLogic';
import { hasNoAds } from '../../../services/premiumLogic';

type I18nKey = Parameters<typeof t>[1];

type DeskStage = 'ENTRY' | 'OFFER' | 'FUNDING' | 'REVIEW';
type FundingPurpose = 'DILIGENCE' | 'OFFER';
type ClosingStepId = 'PURCHASE_AGREEMENT' | 'ASSETS_LIABILITIES' | 'OWNERSHIP_TRANSFER';
type AcquisitionRequirementPrompt = {
    title: string;
    message: string;
    detail: string;
    actionLabel?: string;
};

interface StudioAcquisitionDeskProps {
    player: Player;
    profile: ForbesStudioProfile;
    acquisitionCase?: AcquisitionCase;
    onClose: () => void;
    onImmersiveChange?: (immersive: boolean) => void;
    onSetOperatingModel: (model: SubsidiaryOperatingModel) => { success: boolean };
    onRunDiligence: (funding: AcquisitionFundingSelection) => ReturnType<typeof runDueDiligence>;
    onSubmitOffer: (input: {
        offerType: AcquisitionOfferType;
        offerAmount: number;
        minorityPercent?: number;
        funding: AcquisitionFundingSelection;
        commitments?: AcquisitionCommitmentId[];
    }) => ReturnType<typeof submitOpeningOffer>;
    onAcceptCounter: () => { success: boolean };
    onReviseOffer: (offerAmount: number) => { success: boolean };
    onBeatRival: (offerAmount: number) => { success: boolean };
    onWalkAway: () => { success: boolean };
    onCompleteAcquisition: () => ReturnType<typeof completeStudioAcquisition>;
    onCompleteStockControl: () => ReturnType<typeof completeStockControlAcquisition>;
}

const POSTURE_COPY: Record<SellerResponsePosture, { labelKey: I18nKey; noteKey: I18nKey; color: string; bar: string }> = {
    DISMISSIVE: { labelKey: 'studioAcquisitionDesk.posture.dismissive.label', noteKey: 'studioAcquisitionDesk.posture.dismissive.note', color: 'text-rose-300', bar: 'bg-rose-400' },
    TESTING: { labelKey: 'studioAcquisitionDesk.posture.testing.label', noteKey: 'studioAcquisitionDesk.posture.testing.note', color: 'text-sky-300', bar: 'bg-sky-400' },
    SERIOUS: { labelKey: 'studioAcquisitionDesk.posture.serious.label', noteKey: 'studioAcquisitionDesk.posture.serious.note', color: 'text-emerald-300', bar: 'bg-emerald-400' },
    COMPELLING: { labelKey: 'studioAcquisitionDesk.posture.compelling.label', noteKey: 'studioAcquisitionDesk.posture.compelling.note', color: 'text-amber-300', bar: 'bg-amber-400' },
    OVERPAYING: { labelKey: 'studioAcquisitionDesk.posture.overpaying.label', noteKey: 'studioAcquisitionDesk.posture.overpaying.note', color: 'text-orange-300', bar: 'bg-orange-400' },
};

const COMPLIANCE_COPY = {
    ROUTINE: { labelKey: 'studioAcquisitionDesk.compliance.routine', color: 'text-emerald-300', bar: 'bg-emerald-400' },
    REVIEWABLE: { labelKey: 'studioAcquisitionDesk.compliance.reviewable', color: 'text-amber-300', bar: 'bg-amber-400' },
    HIGH_SCRUTINY: { labelKey: 'studioAcquisitionDesk.compliance.highScrutiny', color: 'text-orange-300', bar: 'bg-orange-400' },
    INVESTIGATION_LIKELY: { labelKey: 'studioAcquisitionDesk.compliance.investigationLikely', color: 'text-rose-300', bar: 'bg-rose-400' },
} as const;

const STAGE_KEYS: I18nKey[] = [
    'studioAcquisitionDesk.stage.publicView',
    'studioAcquisitionDesk.stage.offerSetup',
    'studioAcquisitionDesk.stage.funding',
    'studioAcquisitionDesk.stage.review',
];

const CLOSING_STEP_IDS: ClosingStepId[] = ['PURCHASE_AGREEMENT', 'ASSETS_LIABILITIES', 'OWNERSHIP_TRANSFER'];

const getStageIndex = (stage: DeskStage) => {
    if (stage === 'ENTRY') return 0;
    if (stage === 'OFFER') return 1;
    if (stage === 'FUNDING') return 2;
    return 3;
};

const FundingOptionCard: React.FC<{
    option: AcquisitionFundingOption;
    selected: boolean;
    language: ReturnType<typeof getPlayerLanguage>;
    onSelect: () => void;
}> = ({ option, selected, language, onSelect }) => {
    const tr = (key: I18nKey, vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const compliance = COMPLIANCE_COPY[option.complianceBand];
    const isPersonal = option.source === 'PERSONAL';
    return (
        <button
            type="button"
            disabled={!option.affordable}
            onClick={onSelect}
            className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                !option.affordable
                    ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.02] opacity-45'
                    : selected
                        ? isPersonal
                            ? 'border-sky-400/60 bg-sky-400/10 shadow-[0_0_28px_rgba(56,189,248,0.08)]'
                            : 'border-violet-400/60 bg-violet-400/10 shadow-[0_0_28px_rgba(167,139,250,0.08)]'
                        : 'border-white/10 bg-white/[0.035] hover:border-white/20'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isPersonal ? 'border-sky-400/25 bg-sky-400/10 text-sky-300' : 'border-violet-400/25 bg-violet-400/10 text-violet-300'
                }`}>
                    {isPersonal ? <UserRound size={17} /> : <Building2 size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <div className={`text-[7px] font-black uppercase tracking-[0.18em] ${isPersonal ? 'text-sky-400' : 'text-violet-400'}`}>
                                {isPersonal ? tr('studioAcquisitionDesk.funding.personalWealth') : tr('studioAcquisitionDesk.funding.studioCapital')}
                            </div>
                            <div className="mt-0.5 truncate text-xs font-black text-white">{option.label}</div>
                        </div>
                        {selected ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
                                <Check size={14} strokeWidth={3} />
                            </div>
                        ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">{tr('studioAcquisitionDesk.funding.available')}</div>
                            <div className="mt-0.5 font-mono text-[11px] font-black text-zinc-200">{formatMoney(option.balance)}</div>
                        </div>
                        <div>
                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">{tr('studioAcquisitionDesk.funding.afterTransaction')}</div>
                            <div className={`mt-0.5 font-mono text-[11px] font-black ${option.affordable ? 'text-zinc-200' : 'text-rose-300'}`}>
                                {formatMoney(option.remainingBalance)}
                            </div>
                        </div>
                    </div>
                    <p className="mt-2 text-[8px] font-semibold leading-relaxed text-zinc-500">{option.taxTreatment}</p>
                    {!isPersonal ? (
                        <div className="mt-2.5">
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-[6px] font-black uppercase tracking-widest text-zinc-600">{tr('studioAcquisitionDesk.funding.complianceRisk')}</span>
                                <span className={`text-[7px] font-black uppercase tracking-wider ${compliance.color}`}>
                                    {option.complianceRisk}/100 · {tr(COMPLIANCE_COPY[option.complianceBand].labelKey)}
                                </span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                <div className={`h-full rounded-full ${compliance.bar}`} style={{ width: `${option.complianceRisk}%` }} />
                            </div>
                        </div>
                    ) : null}
                    {option.unavailableReason ? (
                        <div className="mt-2 flex items-center gap-1.5 text-[8px] font-bold text-rose-300">
                            <LockKeyhole size={11} /> {option.unavailableReason}
                        </div>
                    ) : null}
                </div>
            </div>
        </button>
    );
};

export const StudioAcquisitionDesk: React.FC<StudioAcquisitionDeskProps> = ({
    player,
    profile,
    acquisitionCase,
    onClose,
    onImmersiveChange,
    onSetOperatingModel,
    onRunDiligence,
    onSubmitOffer,
    onAcceptCounter,
    onReviseOffer,
    onBeatRival,
    onWalkAway,
    onCompleteAcquisition,
    onCompleteStockControl,
}) => {
    const language = getPlayerLanguage(player);
    const tr = (key: I18nKey, vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const strategyEnergyCost = PHASE_ONE_ENERGY_COSTS.ACQUISITION_STRATEGY_ACTION;
    const signingEnergyCost = PHASE_ONE_ENERGY_COSTS.STUDIO_ACQUISITION_SIGNING;
    const stockControlEnergyCost = PHASE_ONE_ENERGY_COSTS.STOCK_CONTROL_TAKEOVER_COMPLETION;
    const hasStrategyEnergy = player.energy.current >= strategyEnergyCost;
    const hasSigningEnergy = player.energy.current >= signingEnergyCost;
    const hasStockControlEnergy = player.energy.current >= stockControlEnergyCost;
    const EnergyChip: React.FC<{ cost: number; enough: boolean; label?: string }> = ({ cost, enough, label = 'Focus' }) => (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.14em] ${
            enough
                ? 'border-amber-300/25 bg-amber-300/10 text-amber-200'
                : 'border-rose-300/25 bg-rose-300/10 text-rose-200'
        }`}>
            <Zap size={10} fill="currentColor" /> {label} {cost}E
        </span>
    );
    const structureLabels = {
        FULL: tr('studioAcquisitionDesk.structure.full') || 'Full Acquisition',
        MINORITY: tr('studioAcquisitionDesk.structure.minority') || 'Minority Stake',
    };
    const stageLabels = STAGE_KEYS.map(key => tr(key));
    const acquisitionCommitments = getAcquisitionCommitments(language);
    const operatingModels = getOperatingModels(language);
    const publicCompany = profile.acquisitionState === 'PUBLICLY_TRADED';
    const companyPosition = getCompanyPosition(player, profile);
    const stockControlMode = publicCompany && !profile.isPlayerOwned && companyPosition.influenceStatus === 'CONTROLLING_OWNER';
    const stockControlClosing = acquisitionCase?.status === 'ACQUIRED'
        && acquisitionCase.closing?.finalPrice === 0
        && /public-market control/i.test(acquisitionCase.closing.assetSummary || '');
    const hasDealStatus = stockControlMode || Boolean(acquisitionCase && ['OFFER_SUBMITTED', 'COUNTERED', 'RIVAL_BID', 'ACCEPTED', 'REJECTED', 'ACQUIRED'].includes(acquisitionCase.status));
    const [stage, setStage] = React.useState<DeskStage>(hasDealStatus ? 'REVIEW' : 'ENTRY');
    const [fundingPurpose, setFundingPurpose] = React.useState<FundingPurpose>('OFFER');
    const [offerType, setOfferType] = React.useState<AcquisitionOfferType>(publicCompany ? 'MINORITY' : 'FAIR');
    const strategicThreshold = getStrategicStakeThreshold(profile);
    const [minorityPercent, setMinorityPercent] = React.useState(strategicThreshold);
    const initialPresets = getOfferPresets({ profile, acquisitionCase, minorityPercent: strategicThreshold });
    const [offerAmountInput, setOfferAmountInput] = React.useState(String(
        publicCompany ? initialPresets.MINORITY.amount : initialPresets.FAIR.amount,
    ));
    const [selectedFunding, setSelectedFunding] = React.useState<AcquisitionFundingSelection | null>(null);
    const [feedback, setFeedback] = React.useState<string | null>(null);
    const [revisionMode, setRevisionMode] = React.useState(false);
    const [revisionInput, setRevisionInput] = React.useState(String(
        acquisitionCase?.sellerResponse?.counterAmount || acquisitionCase?.offer?.amount || 0,
    ));
    const [rivalBidMode, setRivalBidMode] = React.useState(false);
    const [rivalBidInput, setRivalBidInput] = React.useState(String(
        acquisitionCase?.sellerResponse?.requiredBidAmount || acquisitionCase?.offer?.amount || 0,
    ));
    const [selectedCommitments, setSelectedCommitments] = React.useState<AcquisitionCommitmentId[]>(
        acquisitionCase?.offer?.commitments || [],
    );
    const [reviewedClosingSteps, setReviewedClosingSteps] = React.useState<ClosingStepId[]>([]);
    const [signingProgress, setSigningProgress] = React.useState(0);
    const [signingRoomOpen, setSigningRoomOpen] = React.useState(false);
    const [contractPage, setContractPage] = React.useState(0);
    const [stampDropped, setStampDropped] = React.useState(false);
    const [signedAcquisitionLocked, setSignedAcquisitionLocked] = React.useState(false);
    const [isSigningAcquisition, setIsSigningAcquisition] = React.useState(false);
    const [stockControlComplete, setStockControlComplete] = React.useState(stockControlClosing);
    const [selectedOperatingModel, setSelectedOperatingModel] = React.useState<SubsidiaryOperatingModel | null>(null);
    const [requirementPrompt, setRequirementPrompt] = React.useState<AcquisitionRequirementPrompt | null>(null);
    const signingActionInFlightRef = React.useRef(false);

    const offerPresets = getOfferPresets({ profile, acquisitionCase, minorityPercent });
    const offerAmount = Number(offerAmountInput.replace(/[^\d.]/g, '')) || 0;
    const customOfferAnalysis = analyzeCustomOffer({
        profile,
        acquisitionCase,
        offerType,
        offerAmount,
        minorityPercent: offerType === 'MINORITY' ? minorityPercent : undefined,
        existingOwnershipPercent: companyPosition.ownershipPercent,
        strategicThreshold,
    });
    const selectedOffer = {
        amount: customOfferAnalysis.normalizedAmount,
        type: offerType,
        percent: offerType === 'MINORITY' ? minorityPercent : undefined,
    };
    const diligenceFee = calculateDueDiligenceFee(profile);
    const fundingAmount = fundingPurpose === 'DILIGENCE' ? diligenceFee : customOfferAnalysis.normalizedAmount;
    const fundingOptions = getFundingOptions({
        player,
        profile,
        amount: fundingAmount,
        expenseType: fundingPurpose === 'DILIGENCE' ? 'DILIGENCE' : 'OFFER',
        language,
    });
    const resolvedFunding = selectedFunding
        ? fundingOptions.find(option => (
            option.source === selectedFunding.source
            && (selectedFunding.source === 'PERSONAL' || option.businessId === selectedFunding.businessId)
        ))
        : undefined;
    const activeStage = getStageIndex(stage);
    const report = acquisitionCase?.diligence?.report;
    const submittedOffer = acquisitionCase?.status === 'OFFER_SUBMITTED' ? acquisitionCase.offer : undefined;
    const sellerResponse = acquisitionCase?.sellerResponse;
    const responseOffer = acquisitionCase && ['COUNTERED', 'RIVAL_BID', 'ACCEPTED', 'REJECTED', 'ACQUIRED'].includes(acquisitionCase.status)
        ? acquisitionCase.offer
        : undefined;
    const offerStep = Math.max(100_000, Math.round(
        (offerType === 'MINORITY' ? offerPresets.MINORITY.amount : customOfferAnalysis.referenceValue) * 0.01 / 100_000,
    ) * 100_000);
    const anyFundingAffordable = fundingOptions.some(option => option.affordable);
    const activeCommitments = acquisitionCommitments.filter(commitment => selectedCommitments.includes(commitment.id));
    const submittedCommitments = acquisitionCommitments.filter(commitment => submittedOffer?.commitments?.includes(commitment.id));
    const responseCommitments = acquisitionCommitments.filter(commitment => responseOffer?.commitments?.includes(commitment.id));
    const closing = acquisitionCase?.closing;
    const finalPrice = closing?.finalPrice
        || sellerResponse?.agreedAmount
        || sellerResponse?.counterAmount
        || responseOffer?.amount
        || 0;
    const finalVerifiedDebt = closing?.verifiedDebt ?? report?.verifiedDebt ?? profile.debt;
    const finalHiddenLiabilities = closing?.hiddenLiabilities ?? report?.hiddenLiabilities ?? Math.round(profile.valuation * 0.035);
    const finalExpectedIncome = closing?.expectedAnnualIncome ?? report?.expectedAnnualIncome ?? Math.max(profile.profitability, Math.round(profile.valuation * 0.02));
    const finalFundingLabel = responseOffer?.funding.source === 'STUDIO'
        ? player.businesses.find(business => business.id === responseOffer.funding.businessId)?.name || tr('studioAcquisitionDesk.funding.studioCapital')
        : tr('studioAcquisitionDesk.funding.personalWealth');
    const signingFundingOptions = responseOffer
        ? getFundingOptions({
            player,
            profile,
            amount: finalPrice,
            expenseType: 'OFFER',
            language,
        })
        : [];
    const signingFundingOption = responseOffer
        ? signingFundingOptions.find(option => (
            option.source === responseOffer.funding.source
            && (responseOffer.funding.source === 'PERSONAL' || option.businessId === responseOffer.funding.businessId)
        ))
        : undefined;
    const hasSigningFunding = Boolean(signingFundingOption?.affordable);
    const signingFundingShortfall = Math.max(0, finalPrice - (signingFundingOption?.balance || 0));
    const signatoryName = player.name?.trim() || tr('studioAcquisitionDesk.contract.studioOwner');
    const contractSerial = `${profile.id.replace(/[^A-Z0-9]/g, '').slice(0, 4)}-${player.currentWeek}-${Math.max(0, Math.round(finalPrice / 1_000_000))}`;
    const acceptedContractMode = acquisitionCase?.status === 'ACCEPTED' && Boolean(responseOffer && sellerResponse);
    const signingRoomVisible = signingRoomOpen || acceptedContractMode;
    const showStockControlReview = stockControlMode || stockControlComplete || stockControlClosing;

    React.useEffect(() => {
        onImmersiveChange?.(true);
        return () => onImmersiveChange?.(false);
    }, [onImmersiveChange]);

    const closingDocuments = [
        {
            id: 'PURCHASE_AGREEMENT' as const,
            label: tr('studioAcquisitionDesk.closing.purchaseAgreement.label'),
            value: formatMoney(finalPrice),
            note: tr('studioAcquisitionDesk.closing.purchaseAgreement.note'),
            Icon: CircleDollarSign,
        },
        {
            id: 'ASSETS_LIABILITIES' as const,
            label: tr('studioAcquisitionDesk.closing.assetsLiabilities.label'),
            value: tr('studioAcquisitionDesk.closing.assetsLiabilities.value', { count: profile.catalog.length, amount: formatMoney(finalVerifiedDebt + finalHiddenLiabilities) }),
            note: tr('studioAcquisitionDesk.closing.assetsLiabilities.note'),
            Icon: FileSearch,
        },
        {
            id: 'OWNERSHIP_TRANSFER' as const,
            label: tr('studioAcquisitionDesk.closing.ownershipTransfer.label'),
            value: tr('studioAcquisitionDesk.closing.ownershipTransfer.value'),
            note: tr('studioAcquisitionDesk.closing.ownershipTransfer.note'),
            Icon: Landmark,
        },
    ];
    const allClosingStepsReviewed = CLOSING_STEP_IDS.every(stepId => reviewedClosingSteps.includes(stepId));
    const contractPages: Array<{
        eyebrow: string;
        title: string;
        kicker: string;
        body: string;
        stats?: string[][];
        clauses?: string[];
    }> = [
        {
            eyebrow: tr('studioAcquisitionDesk.contract.page1.eyebrow'),
            title: tr('studioAcquisitionDesk.contract.page1.title'),
            kicker: tr('studioAcquisitionDesk.contract.page1.kicker'),
            body: tr('studioAcquisitionDesk.contract.page1.body'),
            stats: [
                [tr('studioAcquisitionDesk.contract.purchasePrice'), formatMoney(finalPrice)],
                [tr('studioAcquisitionDesk.contract.fundingSource'), finalFundingLabel],
                [tr('studioAcquisitionDesk.contract.studio'), profile.name],
            ],
        },
        {
            eyebrow: tr('studioAcquisitionDesk.contract.page2.eyebrow'),
            title: tr('studioAcquisitionDesk.contract.page2.title'),
            kicker: tr('studioAcquisitionDesk.contract.page2.kicker'),
            body: tr('studioAcquisitionDesk.contract.page2.body'),
            stats: [
                [tr('studioAcquisitionDesk.contract.catalog'), tr('studioAcquisitionDesk.contract.titlesCount', { count: profile.catalog.length })],
                [tr('studioAcquisitionDesk.contract.debtLiabilities'), formatMoney(finalVerifiedDebt + finalHiddenLiabilities)],
                [tr('studioAcquisitionDesk.contract.expectedIncome'), formatMoney(finalExpectedIncome)],
            ],
        },
        {
            eyebrow: tr('studioAcquisitionDesk.contract.page3.eyebrow'),
            title: tr('studioAcquisitionDesk.contract.page3.title'),
            kicker: tr('studioAcquisitionDesk.contract.page3.kicker'),
            body: tr('studioAcquisitionDesk.contract.page3.body'),
            clauses: responseCommitments.length > 0
                ? responseCommitments.map(commitment => commitment.shortLabel)
                : [
                    tr('studioAcquisitionDesk.contract.defaultClause.sellerTerms'),
                    tr('studioAcquisitionDesk.contract.defaultClause.assetsTransfer'),
                    tr('studioAcquisitionDesk.contract.defaultClause.liabilitiesAccepted'),
                ],
        },
        {
            eyebrow: tr('studioAcquisitionDesk.contract.page4.eyebrow'),
            title: tr('studioAcquisitionDesk.contract.page4.title'),
            kicker: tr('studioAcquisitionDesk.contract.page4.kicker'),
            body: tr('studioAcquisitionDesk.contract.page4.body'),
            stats: [
                [tr('studioAcquisitionDesk.contract.transferStatus'), signingProgress > 0 ? tr('studioAcquisitionDesk.contract.controlTransferring') : tr('studioAcquisitionDesk.contract.readyToSign')],
                [tr('studioAcquisitionDesk.contract.notaryStamp'), stampDropped ? tr('studioAcquisitionDesk.contract.transferApproved') : tr('studioAcquisitionDesk.contract.pending')],
            ],
        },
    ];
    const boundedContractPage = Math.min(contractPage, contractPages.length - 1);
    const activeContractPage = contractPages[boundedContractPage];
    const canSignContract = boundedContractPage === contractPages.length - 1 && (allClosingStepsReviewed || acceptedContractMode || signingRoomOpen);
    const contractSigned = signedAcquisitionLocked || acquisitionCase?.status === 'ACQUIRED';
    const acquiredStudio = player.businesses.find(business => business.id === profile.id);
    const configuredOperatingModel = acquiredStudio?.studioState?.operatingModel;
    const signingRequirementChecks = [
        {
            id: 'funding',
            label: 'Funds',
            value: hasSigningFunding ? 'Ready' : signingFundingOption ? `Short ${formatMoney(signingFundingShortfall)}` : 'Missing',
            met: hasSigningFunding,
        },
        {
            id: 'energy',
            label: 'Energy',
            value: `${player.energy.current}/${signingEnergyCost}E`,
            met: hasSigningEnergy,
        },
        {
            id: 'terms',
            label: 'Terms',
            value: acceptedContractMode ? 'Accepted' : contractSigned ? 'Signed' : 'Not ready',
            met: acceptedContractMode || contractSigned,
        },
    ];
    const takeoverPercent = Math.max(0, Math.min(100, Math.round(((boundedContractPage + (boundedContractPage === contractPages.length - 1 ? signingProgress / 100 : 0)) / contractPages.length) * 100)));
    const activeStageLabel = boundedContractPage === contractPages.length - 1
        ? (signingProgress > 0 ? tr('studioAcquisitionDesk.contract.signaturePressure') : tr('studioAcquisitionDesk.contract.sealReady'))
        : tr('studioAcquisitionDesk.contract.clauseArmed', { number: boundedContractPage + 1 });
    const takeoverStages = [
        { label: tr('studioAcquisitionDesk.takeover.priceLocked'), value: formatMoney(finalPrice), state: boundedContractPage > 0 ? 'COMPLETE' : 'LIVE' },
        { label: tr('studioAcquisitionDesk.takeover.assetsVerified'), value: tr('studioAcquisitionDesk.contract.titlesCount', { count: profile.catalog.length }), state: boundedContractPage > 1 ? 'COMPLETE' : boundedContractPage === 1 ? 'LIVE' : 'QUEUED' },
        { label: tr('studioAcquisitionDesk.takeover.clausesBound'), value: tr('studioAcquisitionDesk.takeover.termsCount', { count: responseCommitments.length || 3 }), state: boundedContractPage > 2 ? 'COMPLETE' : boundedContractPage === 2 ? 'LIVE' : 'QUEUED' },
        { label: tr('studioAcquisitionDesk.takeover.controlTransfer'), value: contractSigned ? tr('studioAcquisitionDesk.contract.studioAcquired') : `${Math.round(signingProgress)}%`, state: contractSigned ? 'COMPLETE' : boundedContractPage === 3 ? 'LIVE' : 'QUEUED' },
    ];

    const toggleCommitment = (commitmentId: AcquisitionCommitmentId) => {
        setSelectedCommitments(current => (
            current.includes(commitmentId)
                ? current.filter(id => id !== commitmentId)
                : [...current, commitmentId]
        ));
        setFeedback(null);
    };

    const showAcquisitionRequirement = React.useCallback((prompt: AcquisitionRequirementPrompt) => {
        setRequirementPrompt(prompt);
        setFeedback(prompt.message);
    }, []);

    const applyQuickFill = (preset: 'CONSERVATIVE' | 'FAIR' | 'AGGRESSIVE') => {
        const multiplier = preset === 'CONSERVATIVE' ? 0.88 : preset === 'AGGRESSIVE' ? 1.15 : 1;
        const amount = offerType === 'MINORITY'
            ? Math.round(customOfferAnalysis.referenceValue * (minorityPercent / 100) * multiplier)
            : Math.round(customOfferAnalysis.referenceValue * multiplier);
        setOfferAmountInput(String(amount));
        setFeedback(null);
    };

    const selectStructure = (structure: 'FULL' | 'MINORITY') => {
        if (structure === 'FULL' && publicCompany) return;
        const nextType: AcquisitionOfferType = structure === 'MINORITY' ? 'MINORITY' : 'FAIR';
        setOfferType(nextType);
        const nextPresets = getOfferPresets({ profile, acquisitionCase, minorityPercent });
        setOfferAmountInput(String(structure === 'MINORITY' ? nextPresets.MINORITY.amount : nextPresets.FAIR.amount));
        setSelectedFunding(null);
        setFeedback(null);
    };

    const goBack = () => {
        setFeedback(null);
        if (hasDealStatus) {
            onClose();
            return;
        }
        if (stage === 'REVIEW') {
            setStage('FUNDING');
            return;
        }
        if (stage === 'FUNDING') {
            setStage(fundingPurpose === 'DILIGENCE' ? 'ENTRY' : 'OFFER');
            return;
        }
        if (stage === 'OFFER') {
            setStage('ENTRY');
            return;
        }
        onClose();
    };

    const chooseFunding = (option: AcquisitionFundingOption) => {
        if (!option.affordable) return;
        setSelectedFunding({ source: option.source, businessId: option.businessId });
    };

    const continueFromFunding = () => {
        if (!selectedFunding || !resolvedFunding?.affordable) return;
        if (fundingPurpose === 'DILIGENCE') {
            const result = onRunDiligence(selectedFunding);
            if (result.success) {
                setFeedback(tr('studioAcquisitionDesk.feedback.diligenceComplete'));
                setSelectedFunding(null);
                setStage('OFFER');
            } else {
                setFeedback(result.reason === 'ALREADY_PURCHASED'
                    ? tr('studioAcquisitionDesk.feedback.reportAlreadyComplete')
                    : tr('studioAcquisitionDesk.feedback.reviewFundingFailed'));
            }
            return;
        }
        setStage('REVIEW');
    };

    const submitOffer = () => {
        if (!selectedFunding) return;
        if (!hasStrategyEnergy) {
            setFeedback(`Need ${strategyEnergyCost} energy to submit acquisition terms.`);
            return;
        }
        const result = onSubmitOffer({
            offerType,
            offerAmount: customOfferAnalysis.normalizedAmount,
            minorityPercent: offerType === 'MINORITY' ? minorityPercent : undefined,
            funding: selectedFunding,
            commitments: selectedCommitments,
        });
        if (result.success) {
            setFeedback(tr('studioAcquisitionDesk.feedback.offerSubmitted'));
        } else {
            setFeedback(result.reason === 'INSUFFICIENT_FUNDS'
                ? tr('studioAcquisitionDesk.feedback.sourceInsufficient')
                : tr('studioAcquisitionDesk.feedback.offerSubmitFailed'));
        }
    };

    const submitRevision = () => {
        if (!hasStrategyEnergy) {
            setFeedback(`Need ${strategyEnergyCost} energy to revise the acquisition offer.`);
            return;
        }
        const result = onReviseOffer(Number(revisionInput.replace(/[^\d.]/g, '')) || 0);
        if (result.success) {
            setRevisionMode(false);
            setFeedback(tr('studioAcquisitionDesk.feedback.revisionFiled'));
        } else {
            setFeedback(tr('studioAcquisitionDesk.feedback.revisionInvalid'));
        }
    };

    const submitRivalBid = (amount: number) => {
        if (!hasStrategyEnergy) {
            setFeedback(`Need ${strategyEnergyCost} energy to counter the rival bid.`);
            return;
        }
        const result = onBeatRival(amount);
        if (result.success) {
            setRivalBidMode(false);
            setFeedback(tr('studioAcquisitionDesk.feedback.rivalBidBeaten'));
        } else {
            setFeedback(tr('studioAcquisitionDesk.feedback.rivalBidTooLow'));
        }
    };

    const markClosingDocumentReviewed = (stepId: ClosingStepId) => {
        setReviewedClosingSteps(current => current.includes(stepId) ? current : [...current, stepId]);
        setFeedback(null);
    };

    const openSigningRoom = () => {
        if (!allClosingStepsReviewed) {
            showAcquisitionRequirement({
                title: 'Closing checklist incomplete',
                message: tr('studioAcquisitionDesk.feedback.reviewBeforeSigningRoom'),
                detail: 'Stamp Purchase Agreement, Assets + Liabilities, and Ownership Transfer before entering the final signing room.',
                actionLabel: 'Review Documents',
            });
            return;
        }
        if (!hasSigningEnergy) {
            showAcquisitionRequirement({
                title: `Need ${signingEnergyCost} energy`,
                message: `You need ${signingEnergyCost} energy to enter the final signing room.`,
                detail: `Current energy: ${player.energy.current}/${player.energy.max}. Recover energy, then come back and tap the signing-room button again.`,
                actionLabel: 'Got It',
            });
            return;
        }
        setStampDropped(false);
        setSignedAcquisitionLocked(false);
        setSigningProgress(0);
        setContractPage(0);
        setIsSigningAcquisition(false);
        signingActionInFlightRef.current = false;
        setSigningRoomOpen(true);
    };

    const signAcquisition = () => {
        if (!canSignContract) {
            showAcquisitionRequirement({
                title: 'Not ready to sign',
                message: tr('studioAcquisitionDesk.feedback.reviewBeforeSigning'),
                detail: 'Move through every contract page and stamp the closing documents first. Once the packet is complete, the tap-to-sign control will file the transfer.',
                actionLabel: 'Finish Review',
            });
            return;
        }
        if (!hasSigningEnergy) {
            showAcquisitionRequirement({
                title: `Need ${signingEnergyCost} energy`,
                message: `You need ${signingEnergyCost} energy to sign the studio transfer.`,
                detail: `Current energy: ${player.energy.current}/${player.energy.max}. The deal is still safe; recover energy and tap to sign again.`,
                actionLabel: 'Got It',
            });
            return;
        }
        if (!hasSigningFunding) {
            const fundingMissing = !signingFundingOption;
            showAcquisitionRequirement({
                title: fundingMissing ? 'Funding source missing' : 'Funding shortfall',
                message: fundingMissing
                    ? 'The original funding source is no longer available.'
                    : tr('studioAcquisitionDesk.feedback.closeInsufficientFunds'),
                detail: fundingMissing
                    ? `Selected source: ${finalFundingLabel}. Required at closing: ${formatMoney(finalPrice)}. Re-open the acquisition offer and pick a valid funding source.`
                    : `Selected source: ${finalFundingLabel}. Available: ${formatMoney(signingFundingOption.balance)}. Required at closing: ${formatMoney(finalPrice)}. Short by ${formatMoney(signingFundingShortfall)}.`,
                actionLabel: fundingMissing ? 'Got It' : 'Check Funds',
            });
            return;
        }
        if (signingActionInFlightRef.current || isSigningAcquisition || contractSigned) return;
        signingActionInFlightRef.current = true;
        setIsSigningAcquisition(true);
        setFeedback(null);
        setSigningProgress(100);
        setStampDropped(true);
        const result = onCompleteAcquisition();
        if (result.success) {
            setSignedAcquisitionLocked(true);
            setContractPage(contractPages.length - 1);
            setSigningRoomOpen(true);
            setFeedback(tr('studioAcquisitionDesk.feedback.documentsSigned'));
            setIsSigningAcquisition(false);
            return;
        }
        signingActionInFlightRef.current = false;
        setStampDropped(false);
        setSignedAcquisitionLocked(false);
        setSigningProgress(0);
        setIsSigningAcquisition(false);
        const failureMessage = result.reason === 'INSUFFICIENT_FUNDS'
            ? tr('studioAcquisitionDesk.feedback.closeInsufficientFunds')
            : result.reason === 'MINORITY_NOT_OWNERSHIP'
                ? tr('studioAcquisitionDesk.feedback.minorityNotOwnership')
                : result.reason === 'FUNDING_SOURCE_UNAVAILABLE'
                    ? 'The original funding source is no longer available.'
                    : result.reason === 'ALREADY_OWNED'
                        ? tr('studioAcquisitionDesk.feedback.alreadyOwned')
                        : tr('studioAcquisitionDesk.feedback.notReadyToSign');
        showAcquisitionRequirement({
            title: result.reason === 'INSUFFICIENT_FUNDS'
                ? 'Funding shortfall'
                : result.reason === 'MINORITY_NOT_OWNERSHIP'
                    ? 'Minority stake only'
                    : result.reason === 'FUNDING_SOURCE_UNAVAILABLE'
                        ? 'Funding source missing'
                        : result.reason === 'ALREADY_OWNED'
                            ? 'Already acquired'
                            : 'Transfer blocked',
            message: failureMessage,
            detail: result.reason === 'INSUFFICIENT_FUNDS'
                ? `Selected source: ${finalFundingLabel}. Required at closing: ${formatMoney(finalPrice)}. Add cash/capital or use a valid funding source before signing.`
                : result.reason === 'MINORITY_NOT_OWNERSHIP'
                    ? 'A minority investment gives you shares, but it cannot create a fully owned studio in your group.'
                    : result.reason === 'FUNDING_SOURCE_UNAVAILABLE'
                        ? 'The studio or personal funding source chosen for this offer is unavailable now. Re-open the acquisition offer and pick a valid funding source.'
                        : result.reason === 'ALREADY_OWNED'
                            ? `${profile.name} is already inside your owned studio group.`
                            : 'The seller terms, accepted offer, or closing packet is no longer valid. Review the acquisition file before trying again.',
            actionLabel: result.reason === 'INSUFFICIENT_FUNDS' ? 'Check Funds' : 'Got It',
        });
    };

    const completeStockControlTransfer = () => {
        if (!hasStockControlEnergy) {
            setFeedback(`Need ${stockControlEnergyCost} energy to file the control transfer.`);
            return;
        }
        const result = onCompleteStockControl();
        if (result.success) {
            setStockControlComplete(true);
            setFeedback(tr('studioAcquisitionDesk.feedback.controlTransferComplete'));
            return;
        }
        setFeedback(result.reason === 'ALREADY_OWNED'
            ? tr('studioAcquisitionDesk.feedback.alreadyOwned')
            : tr('studioAcquisitionDesk.feedback.majorityRequired'));
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={tr('studioAcquisitionDesk.aria', { name: profile.name })}
            className="Fixed Acquisition Viewport fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-[#050506] text-white"
        >
            <div className="Cinematic Acquisition Screen pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_78%_22%,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(120,53,15,0.28),transparent_42%),linear-gradient(180deg,#0f0b07_0%,#050506_58%,#020202_100%)]" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-[min(760px,90vw)] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,rgba(0,0,0,0.82),transparent)]" />

            <AnimatePresence>
                {requirementPrompt ? (
                    <motion.div
                        key="acquisition-requirement-prompt"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="acquisition-requirement-title"
                        aria-describedby="acquisition-requirement-detail"
                        className="absolute inset-0 z-[70] flex items-center justify-center bg-black/68 px-4 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 18, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                            className="w-full max-w-sm overflow-hidden rounded-[28px] border-2 border-amber-200/60 bg-[linear-gradient(145deg,#1c0f08_0%,#090504_68%,#030202_100%)] text-white shadow-[0_22px_0_#020101,0_32px_90px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,236,179,0.14)]"
                        >
                            <div className="border-b border-amber-200/15 p-5">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200/35 bg-amber-300/12 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.16)]">
                                        <AlertTriangle size={22} strokeWidth={2.8} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[8px] font-black uppercase tracking-[0.24em] text-amber-300">Signing Requirement</div>
                                        <h3 id="acquisition-requirement-title" className="mt-1 text-xl font-black uppercase leading-none tracking-[-0.04em] text-white">
                                            {requirementPrompt.title}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5">
                                <p className="text-sm font-black leading-snug text-amber-50">
                                    {requirementPrompt.message}
                                </p>
                                <p id="acquisition-requirement-detail" className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-[11px] font-bold leading-relaxed text-zinc-300">
                                    {requirementPrompt.detail}
                                </p>
                                <button
                                    type="button"
                                    autoFocus
                                    onClick={() => setRequirementPrompt(null)}
                                    className="mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-[#d8ab3c] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[0_7px_0_#7a4a0a] transition-transform active:translate-y-1 active:shadow-[0_3px_0_#7a4a0a]"
                                >
                                    {requirementPrompt.actionLabel || 'Got It'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <header className="Deal Room Viewport relative z-10 shrink-0 border-b border-amber-400/15 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_42%),linear-gradient(180deg,rgba(17,16,12,0.94)_0%,rgba(8,8,8,0.86)_100%)] px-4 pb-3 pt-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:pt-8">
                <div className="mx-auto w-full max-w-6xl">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label={stage === 'ENTRY' || hasDealStatus ? tr('studioAcquisitionDesk.backToProfile') : tr('studioAcquisitionDesk.previousStep')}
                        onClick={goBack}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300"
                    >
                        <ArrowLeft size={17} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.22em] text-amber-400">
                            <Target size={12} /> {tr('studioAcquisitionDesk.title')}
                        </div>
                        <h2 className="mt-1 line-clamp-2 break-words font-serif text-[clamp(0.95rem,5vw,1.25rem)] font-black uppercase italic leading-[0.95] tracking-tight text-[#f4f0e7]">
                            {profile.name}
                        </h2>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-1">
                    {stageLabels.map((label, index) => (
                        <div key={label}>
                            <div className={`h-1 rounded-full ${index <= activeStage ? 'bg-amber-400' : 'bg-white/[0.07]'}`} />
                            <div className={`mt-1 text-center text-[5px] font-black uppercase tracking-[0.1em] ${index === activeStage ? 'text-amber-300' : 'text-zinc-700'}`}>
                                {label}
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-4 pb-28 pt-4 custom-scrollbar lg:px-8 lg:pb-32">
                <div className="mb-4 hidden grid-cols-3 gap-3 lg:grid">
                    <div className="rounded-3xl border border-amber-300/15 bg-black/24 p-4">
                        <div className="text-[7px] font-black uppercase tracking-[0.22em] text-amber-300">{tr('studioAcquisitionDesk.desktop.viewport')}</div>
                        <div className="mt-1 text-lg font-black uppercase text-white">{tr('studioAcquisitionDesk.desktop.privateFloor')}</div>
                        <p className="mt-1 text-[10px] font-semibold leading-relaxed text-zinc-500">{tr('studioAcquisitionDesk.desktop.phoneToCompany')}</p>
                    </div>
                    <div className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
                        <div className="text-[7px] font-black uppercase tracking-[0.22em] text-emerald-300">{tr('studioAcquisitionDesk.desktop.target')}</div>
                        <div className="mt-1 truncate font-serif text-xl font-black uppercase italic text-[#f4f0e7]">{profile.name}</div>
                        <p className="mt-1 text-[10px] font-semibold leading-relaxed text-zinc-500">{tr('studioAcquisitionDesk.desktop.flow')}</p>
                    </div>
                    <div className="rounded-3xl border border-sky-300/15 bg-sky-300/[0.04] p-4">
                        <div className="text-[7px] font-black uppercase tracking-[0.22em] text-sky-300">{tr('studioAcquisitionDesk.desktop.currentFile')}</div>
                        <div className="mt-1 text-lg font-black uppercase text-white">{acquisitionCase?.status?.replace(/_/g, ' ') || tr('studioAcquisitionDesk.stage.publicView')}</div>
                        <p className="mt-1 text-[10px] font-semibold leading-relaxed text-zinc-500">{tr('studioAcquisitionDesk.desktop.wideLayout')}</p>
                    </div>
                </div>
                <AnimatePresence mode="wait">
                    {showStockControlReview ? (
                        <motion.section
                            key="stock-control-transfer"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="overflow-hidden rounded-3xl border border-sky-300/35 bg-[linear-gradient(145deg,rgba(56,189,248,0.14),rgba(8,8,10,0.97))]"
                        >
                            <div className="border-b border-sky-300/15 p-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-300/10 text-sky-200">
                                    <Landmark size={22} strokeWidth={3} />
                                </div>
                                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.22em] text-sky-300">Majority Stock Control</div>
                                <h3 className="mt-1 text-2xl font-black uppercase tracking-tight">
                                    {stockControlComplete || stockControlClosing ? tr('studioAcquisitionDesk.stockControl.completeTitle') : tr('studioAcquisitionDesk.stockControl.readyTitle')}
                                </h3>
                                <p className="mt-2 text-[10px] font-semibold leading-relaxed text-zinc-400">
                                    No seller counter is needed here. You already bought majority control through public shares, so this closes the company transfer without charging the acquisition price again.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 border-b border-sky-300/15">
                                <div className="border-r border-sky-300/15 p-4">
                                    <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Owned</div>
                                    <div className="mt-1 font-mono text-sm font-black text-sky-200">{companyPosition.ownershipPercent.toFixed(1)}%</div>
                                </div>
                                <div className="border-r border-sky-300/15 p-4">
                                    <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Stock Value</div>
                                    <div className="mt-1 font-mono text-sm font-black text-white">{formatMoney(companyPosition.stockValue)}</div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Additional Price</div>
                                    <div className="mt-1 font-mono text-sm font-black text-emerald-300">{formatMoney(0)}</div>
                                </div>
                            </div>

                            <div className="space-y-3 p-4">
                                <div className="rounded-3xl border border-sky-300/20 bg-black/25 p-4">
                                    <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.2em] text-sky-300">
                                        <Check size={14} /> Control Filing
                                    </div>
                                    <h4 className="mt-2 text-lg font-black uppercase tracking-tight text-white">
                                        {stockControlComplete || stockControlClosing ? `${profile.name} is now controlled` : 'Ready to move into your group'}
                                    </h4>
                                    <p className="mt-2 text-[9px] font-semibold leading-relaxed text-sky-100/70">
                                        Existing public shares become your control basis. The desk only files the transfer, records liabilities, and adds the studio to your owned production group.
                                    </p>
                                </div>
                                {stockControlComplete || stockControlClosing ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="min-h-12 rounded-xl border border-sky-300/25 bg-sky-300/[0.08] px-3 text-[8px] font-black uppercase tracking-wider text-sky-100"
                                        >
                                            Open Studio Profile
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="min-h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[8px] font-black uppercase tracking-wider text-zinc-500"
                                        >
                                            Return To Forbes
                                        </button>
                                    </div>
	                                ) : (
	                                    <button
	                                        type="button"
	                                        onClick={completeStockControlTransfer}
                                            disabled={!hasStockControlEnergy}
	                                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-[9px] font-black uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
	                                    >
	                                        <Check size={15} /> {hasStockControlEnergy ? tr('studioAcquisitionDesk.stockControl.completeAction') : `Need ${stockControlEnergyCost}E`}
	                                    </button>
	                                )}
                                    {!stockControlComplete && !stockControlClosing ? (
                                        <div className="mt-2 flex justify-end">
                                            <EnergyChip cost={stockControlEnergyCost} enough={hasStockControlEnergy} label="Transfer" />
                                        </div>
                                    ) : null}
	                            </div>
                        </motion.section>
                    ) : responseOffer && sellerResponse ? (
                        <motion.section
                            key={`response-${acquisitionCase?.status}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`overflow-hidden rounded-3xl border ${acquisitionCase?.status === 'ACCEPTED' || acquisitionCase?.status === 'ACQUIRED'
                                ? 'border-emerald-400/35 bg-[linear-gradient(145deg,rgba(16,185,129,0.14),rgba(8,8,10,0.97))]'
                                : acquisitionCase?.status === 'COUNTERED' || acquisitionCase?.status === 'RIVAL_BID'
                                    ? 'border-amber-400/35 bg-[linear-gradient(145deg,rgba(245,158,11,0.13),rgba(8,8,10,0.97))]'
                                    : 'border-rose-400/30 bg-[linear-gradient(145deg,rgba(244,63,94,0.12),rgba(8,8,10,0.97))]'}`}
                        >
                            <div className="border-b border-white/[0.07] p-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${acquisitionCase?.status === 'ACCEPTED' || acquisitionCase?.status === 'ACQUIRED'
                                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                    : acquisitionCase?.status === 'COUNTERED' || acquisitionCase?.status === 'RIVAL_BID'
                                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                                        : 'border-rose-400/30 bg-rose-400/10 text-rose-300'}`}
                                >
                                    {acquisitionCase?.status === 'ACCEPTED' || acquisitionCase?.status === 'ACQUIRED' ? <Check size={22} strokeWidth={3} /> : <AlertTriangle size={22} />}
                                </div>
                                <div className={`mt-4 text-[8px] font-black uppercase tracking-[0.22em] ${acquisitionCase?.status === 'ACCEPTED' || acquisitionCase?.status === 'ACQUIRED'
                                    ? 'text-emerald-300'
                                    : acquisitionCase?.status === 'COUNTERED' || acquisitionCase?.status === 'RIVAL_BID' ? 'text-amber-300' : 'text-rose-300'}`}
                                >
                                    {acquisitionCase?.status === 'ACQUIRED' ? 'DEAL SIGNED' : acquisitionCase?.status === 'ACCEPTED' ? 'TERMS AGREED' : acquisitionCase?.status === 'COUNTERED' ? 'SELLER COUNTER' : acquisitionCase?.status === 'RIVAL_BID' ? 'BIDDING WAR' : 'OFFER DECLINED'}
                                </div>
                                <h3 className="mt-1 text-2xl font-black uppercase tracking-tight">
                                    {acquisitionCase?.status === 'ACQUIRED' ? 'Studio Now Owned' : acquisitionCase?.status === 'ACCEPTED' ? 'Board Approval Secured' : acquisitionCase?.status === 'COUNTERED' ? 'Your Move' : acquisitionCase?.status === 'RIVAL_BID' ? 'Rival At The Table' : 'Approach Closed'}
                                </h3>
                                <p className="mt-2 text-[10px] font-semibold leading-relaxed text-zinc-400">{sellerResponse.summary}</p>
                                {responseCommitments.length > 0 ? (
                                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
                                        <div className="text-[6px] font-black uppercase tracking-[0.18em] text-emerald-300">Promises Attached</div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {responseCommitments.map(commitment => (
                                                <span key={commitment.id} className="rounded-full border border-emerald-300/25 px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-emerald-200">
                                                    {commitment.shortLabel}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                {acquisitionCase?.status === 'RIVAL_BID' ? (
                                    <div className="mt-4 rounded-2xl border border-amber-400/20 bg-black/25 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-[6px] font-black uppercase tracking-[0.18em] text-zinc-600">Rival Studio</div>
                                                <div className="mt-1 text-xs font-black uppercase text-amber-200">{sellerResponse.rivalStudioName}</div>
                                            </div>
                                            <div className="rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3 py-1 text-[7px] font-black uppercase tracking-[0.14em] text-amber-300">
                                                Round {sellerResponse.round} / {sellerResponse.maxRounds || 3}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-2 border-b border-white/[0.07]">
                                <div className="border-r border-white/[0.07] p-4">
                                    <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Your Offer</div>
                                    <div className="mt-1 font-mono text-sm font-black text-white">{formatMoney(responseOffer.amount)}</div>
                                </div>
                                    <div className="p-4">
                                    <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">
                                        {acquisitionCase?.status === 'COUNTERED' ? 'Seller Terms' : acquisitionCase?.status === 'RIVAL_BID' ? 'Rival Bid' : acquisitionCase?.status === 'ACCEPTED' || acquisitionCase?.status === 'ACQUIRED' ? 'Agreed Value' : 'Outcome'}
                                    </div>
                                    <div className={`mt-1 font-mono text-sm font-black ${acquisitionCase?.status === 'ACCEPTED' || acquisitionCase?.status === 'ACQUIRED' ? 'text-emerald-300' : acquisitionCase?.status === 'COUNTERED' || acquisitionCase?.status === 'RIVAL_BID' ? 'text-amber-300' : 'text-rose-300'}`}>
                                        {acquisitionCase?.status === 'REJECTED' ? 'Rejected' : formatMoney(sellerResponse.agreedAmount || sellerResponse.counterAmount || sellerResponse.rivalAmount || responseOffer.amount)}
                                    </div>
                                </div>
                            </div>

                            {acquisitionCase?.status === 'ACQUIRED' ? (
                                <div className="space-y-3 p-4">
                                    <div className="relative overflow-hidden rounded-3xl border border-emerald-300/30 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.24),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.16),transparent_38%),rgba(0,0,0,0.28)] p-4">
                                        <div className="pointer-events-none absolute -right-7 top-5 rotate-[-16deg] rounded border-2 border-emerald-300/35 px-6 py-2 text-[17px] font-black uppercase tracking-[0.2em] text-emerald-300/45">
                                            Acquired
                                        </div>
                                        <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                            <Landmark size={14} /> Document Signing
                                        </div>
                                        <h4 className="mt-2 text-xl font-black uppercase tracking-tight text-white">Closing Complete</h4>
                                        <p className="mt-2 text-[9px] font-semibold leading-relaxed text-emerald-100/70">
                                            {profile.name} is now in your owned studio group. Forbes will treat it as player-controlled company intelligence.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Final Price</div>
                                            <div className="mt-1 font-mono text-sm font-black text-emerald-300">{formatMoney(finalPrice)}</div>
                                        </div>
                                        <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Added Asset</div>
                                            <div className="mt-1 text-[9px] font-black uppercase text-white">Production House</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3">
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Catalog Unlocked</div>
                                            <div className="mt-1 font-mono text-sm font-black text-white">{profile.catalog.length}</div>
                                        </div>
                                        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3">
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Talent Retained</div>
                                            <div className="mt-1 font-mono text-sm font-black text-white">{profile.keyTalent.length}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="min-h-11 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.08] px-3 text-[8px] font-black uppercase tracking-wider text-emerald-200"
                                        >
                                            Open Studio Profile
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFeedback('Next: open this owned studio from your production systems and develop from its catalog/IP.')}
                                            className="min-h-11 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-3 text-[8px] font-black uppercase tracking-wider text-amber-200"
                                        >
                                            Develop From Catalog
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="min-h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[8px] font-black uppercase tracking-wider text-zinc-500"
                                        >
                                            Return To Forbes
                                        </button>
                                    </div>
                                </div>
                            ) : acquisitionCase?.status === 'RIVAL_BID' ? (
                                <div className="space-y-3 p-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Beat By</div>
                                            <div className="mt-1 font-mono text-sm font-black text-amber-300">
                                                {formatMoney(Math.max(0, (sellerResponse.requiredBidAmount || 0) - responseOffer.amount))}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Required Bid</div>
                                            <div className="mt-1 font-mono text-sm font-black text-white">{formatMoney(sellerResponse.requiredBidAmount || 0)}</div>
                                        </div>
                                    </div>
                                    {rivalBidMode ? (
                                        <div className="rounded-2xl border border-amber-400/25 bg-black/30 p-3">
                                            <label className="text-[7px] font-black uppercase tracking-[0.18em] text-amber-300">Custom Bid</label>
                                            <div className="mt-2 flex gap-2">
                                                <input
                                                    aria-label="Custom rival acquisition bid"
                                                    inputMode="numeric"
                                                    value={rivalBidInput}
                                                    onChange={(event) => setRivalBidInput(event.target.value)}
                                                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/50 px-3 font-mono text-sm font-black text-white outline-none focus:border-amber-400/50"
                                                />
	                                                <button type="button" onClick={() => submitRivalBid(Number(rivalBidInput.replace(/[^\d.]/g, '')) || 0)} disabled={!hasStrategyEnergy} className="rounded-xl bg-amber-400 px-3 text-[8px] font-black uppercase tracking-wider text-black disabled:bg-zinc-800 disabled:text-zinc-500">Send Bid</button>
	                                            </div>
	                                        </div>
	                                    ) : null}
                                        <div className="flex justify-end">
                                            <EnergyChip cost={strategyEnergyCost} enough={hasStrategyEnergy} />
                                        </div>
	                                    <button
	                                        type="button"
	                                        onClick={() => submitRivalBid(sellerResponse.requiredBidAmount || 0)}
                                            disabled={!hasStrategyEnergy}
	                                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[9px] font-black uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
	                                    >
	                                        <Target size={15} /> {hasStrategyEnergy ? 'Beat Rival' : `Need ${strategyEnergyCost}E`}
	                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setRivalBidMode(value => !value)} className="min-h-11 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 text-[8px] font-black uppercase tracking-wider text-amber-300">Custom Bid</button>
                                        <button type="button" onClick={() => onWalkAway()} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[8px] font-black uppercase tracking-wider text-zinc-500">Walk Away</button>
                                    </div>
                                </div>
                            ) : acquisitionCase?.status === 'COUNTERED' ? (
                                <div className="space-y-3 p-4">
                                    {revisionMode ? (
                                        <div className="rounded-2xl border border-amber-400/25 bg-black/30 p-3">
                                            <label className="text-[7px] font-black uppercase tracking-[0.18em] text-amber-300">Revised Offer</label>
                                            <div className="mt-2 flex gap-2">
                                                <input
                                                    aria-label="Revised acquisition offer"
                                                    inputMode="numeric"
                                                    value={revisionInput}
                                                    onChange={(event) => setRevisionInput(event.target.value)}
                                                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/50 px-3 font-mono text-sm font-black text-white outline-none focus:border-amber-400/50"
                                                />
	                                                <button type="button" onClick={submitRevision} disabled={!hasStrategyEnergy} className="rounded-xl bg-amber-400 px-3 text-[8px] font-black uppercase tracking-wider text-black disabled:bg-zinc-800 disabled:text-zinc-500">Send Revision</button>
	                                            </div>
	                                        </div>
	                                    ) : null}
                                        <div className="flex justify-end">
                                            <EnergyChip cost={strategyEnergyCost} enough={hasStrategyEnergy} />
                                        </div>
	                                    <button
	                                        type="button"
	                                        onClick={() => onAcceptCounter()}
                                            disabled={!hasStrategyEnergy}
	                                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-[9px] font-black uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
	                                    >
	                                        <Check size={15} /> {hasStrategyEnergy ? 'Accept Counter' : `Need ${strategyEnergyCost}E`}
	                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setRevisionMode(value => !value)} className="min-h-11 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 text-[8px] font-black uppercase tracking-wider text-amber-300">Revise Offer</button>
                                        <button type="button" onClick={() => onWalkAway()} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[8px] font-black uppercase tracking-wider text-zinc-500">Walk Away</button>
                                    </div>
                                </div>
                            ) : acquisitionCase?.status === 'ACCEPTED' ? (
                                <div className="space-y-3 p-4">
                                    <section className="rounded-3xl border border-emerald-300/25 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_46%),rgba(0,0,0,0.28)] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-300">Final Deal Review</div>
                                                <h4 className="mt-1 text-xl font-black uppercase tracking-tight text-white">Assets + Liabilities</h4>
                                            </div>
                                            <div className={`rounded-full border px-3 py-1 text-[7px] font-black uppercase tracking-[0.12em] ${
                                                allClosingStepsReviewed
                                                    ? 'border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200'
                                                    : 'border-amber-300/25 bg-amber-300/[0.06] text-amber-200'
                                            }`}>
                                                {allClosingStepsReviewed ? 'Ready' : `${reviewedClosingSteps.length}/3`}
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-[7px] font-black uppercase tracking-[0.18em] text-amber-300">Closing Table</div>
                                                <div className="text-[6px] font-black uppercase tracking-[0.14em] text-zinc-600">Tap each document to stamp</div>
                                            </div>
                                            <div className="grid gap-2">
                                                {closingDocuments.map(document => {
                                                    const reviewed = reviewedClosingSteps.includes(document.id);
                                                    const DocumentIcon = document.Icon;
                                                    return (
                                                        <button
                                                            key={document.id}
                                                            type="button"
                                                            onClick={() => markClosingDocumentReviewed(document.id)}
                                                            className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                                                                reviewed
                                                                    ? 'border-emerald-300/45 bg-emerald-300/[0.08] shadow-[0_0_30px_rgba(16,185,129,0.08)]'
                                                                    : 'border-white/[0.08] bg-white/[0.035] hover:border-amber-300/30 hover:bg-amber-300/[0.05]'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                                                                    reviewed
                                                                        ? 'border-emerald-300/45 bg-emerald-300/[0.12] text-emerald-200'
                                                                        : 'border-amber-300/20 bg-black/25 text-amber-300'
                                                                }`}>
                                                                    <DocumentIcon size={17} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="text-[9px] font-black uppercase tracking-[0.13em] text-white">{document.label}</div>
                                                                        <div className={`rounded-full border px-2 py-1 text-[6px] font-black uppercase tracking-[0.12em] ${
                                                                            reviewed
                                                                                ? 'border-emerald-300/30 text-emerald-200'
                                                                                : 'border-white/10 text-zinc-600'
                                                                        }`}>
                                                                            {reviewed ? 'Stamped' : 'Review'}
                                                                        </div>
                                                                    </div>
                                                                    <div className={`mt-1 font-mono text-[10px] font-black ${reviewed ? 'text-emerald-200' : 'text-amber-200'}`}>{document.value}</div>
                                                                    <p className="mt-1 text-[8px] font-semibold leading-relaxed text-zinc-500">{document.note}</p>
                                                                </div>
                                                            </div>
                                                            {reviewed ? (
                                                                <div className="pointer-events-none absolute -right-4 top-3 rotate-[-12deg] rounded border border-emerald-300/35 px-4 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/70">
                                                                    Reviewed
                                                                </div>
                                                            ) : null}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                                                <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Final Price</div>
                                                <div className="mt-1 font-mono text-sm font-black text-white">{formatMoney(finalPrice)}</div>
                                            </div>
                                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                                                <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Funding</div>
                                                <div className="mt-1 text-[9px] font-black uppercase text-sky-300">{finalFundingLabel}</div>
                                            </div>
                                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                                                <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Debt + Liabilities</div>
                                                <div className="mt-1 font-mono text-sm font-black text-rose-300">{formatMoney(finalVerifiedDebt + finalHiddenLiabilities)}</div>
                                            </div>
                                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                                                <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Expected Income</div>
                                                <div className="mt-1 font-mono text-sm font-black text-emerald-300">{formatMoney(finalExpectedIncome)}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-black/20 py-3">
                                            <div className="px-2 text-center">
                                                <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Catalog</div>
                                                <div className="mt-1 font-mono text-xs font-black text-white">{profile.catalog.length}</div>
                                            </div>
                                            <div className="px-2 text-center">
                                                <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Rights</div>
                                                <div className="mt-1 font-mono text-xs font-black text-white">{profile.rightsCount}</div>
                                            </div>
                                            <div className="px-2 text-center">
                                                <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Facilities</div>
                                                <div className="mt-1 font-mono text-xs font-black text-white">{profile.facilities.length}</div>
                                            </div>
                                        </div>
                                        {responseCommitments.length > 0 ? (
                                            <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3">
                                                <div className="text-[6px] font-black uppercase tracking-[0.18em] text-emerald-300">Binding Clauses</div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {responseCommitments.map(commitment => (
                                                        <span key={commitment.id} className="rounded-full border border-emerald-300/25 px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-emerald-100">
                                                            {commitment.shortLabel}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </section>
	                                    <section className="rounded-3xl border border-amber-400/25 bg-[radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_45%),rgba(245,158,11,0.06)] p-4">
	                                        <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.2em] text-amber-300">
	                                            <Scale size={14} /> Document Signing
	                                        </div>
                                            <div className="mt-3 flex justify-end">
                                                <EnergyChip cost={signingEnergyCost} enough={hasSigningEnergy} label="Signing" />
                                            </div>
	                                        <p className="mt-2 text-[9px] font-semibold leading-relaxed text-zinc-400">
	                                            Signing transfers control into your owned company group. Purchase funds move now, not at offer submission.
	                                        </p>
	                                        <button
	                                            type="button"
	                                            aria-label="Sign & Acquire Studio"
	                                            disabled={!allClosingStepsReviewed || !hasSigningEnergy}
	                                            onClick={openSigningRoom}
                                            className={`relative mt-4 flex min-h-14 w-full select-none items-center justify-center overflow-hidden rounded-2xl border px-4 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${
	                                                allClosingStepsReviewed && hasSigningEnergy
	                                                    ? 'border-emerald-300/40 bg-black text-emerald-100 shadow-[0_16px_40px_rgba(16,185,129,0.12)] active:scale-[0.99]'
	                                                    : 'cursor-not-allowed border-white/[0.07] bg-white/[0.03] text-zinc-600'
	                                            }`}
	                                        >
	                                            <div className="relative z-10 flex items-center gap-2">
	                                                <Check size={15} strokeWidth={3} />
	                                                {!hasSigningEnergy ? `Need ${signingEnergyCost}E` : allClosingStepsReviewed ? 'Enter Signing Room' : 'Stamp Documents First'}
	                                            </div>
	                                        </button>
                                        <div className="mt-2 flex items-center justify-between text-[6px] font-black uppercase tracking-[0.14em] text-zinc-600">
                                            <span>Sign & Acquire Studio</span>
                                            <span>Private closing scene</span>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <button type="button" onClick={() => onWalkAway()} className="min-h-11 w-full rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-3 text-[8px] font-black uppercase tracking-wider text-rose-300">Close File</button>
                                </div>
                            )}
                            {feedback ? <div className="border-t border-white/[0.07] px-4 py-3 text-[9px] font-bold text-amber-300">{feedback}</div> : null}
                        </motion.section>
                    ) : submittedOffer ? (
                        <motion.section
                            key="complete"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="overflow-hidden rounded-3xl border border-emerald-400/25 bg-[linear-gradient(145deg,rgba(16,185,129,0.12),rgba(8,8,10,0.96))]"
                        >
                            <div className="border-b border-white/[0.07] p-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                                    <Check size={22} strokeWidth={3} />
                                </div>
                                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.22em] text-emerald-300">OFFER_SUBMITTED</div>
                                <h3 className="mt-1 text-2xl font-black uppercase tracking-tight">Opening Position Filed</h3>
                                <p className="mt-2 text-[10px] font-semibold leading-relaxed text-zinc-400">
                                    The seller is considering your opening terms. Purchase funds remain available until a final deal is accepted and signed.
                                </p>
                            </div>
                            <div className="grid grid-cols-2">
                                <div className="border-r border-white/[0.07] p-4">
                                    <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Structure</div>
                                    <div className="mt-1 text-xs font-black text-white">
                                        {submittedOffer.type === 'MINORITY' ? structureLabels.MINORITY : structureLabels.FULL}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Opening Value</div>
                                    <div className="mt-1 font-mono text-sm font-black text-emerald-300">{formatMoney(submittedOffer.amount)}</div>
                                </div>
                            </div>
                            {submittedCommitments.length > 0 ? (
                                <div className="border-t border-white/[0.07] p-4">
                                    <div className="text-[6px] font-black uppercase tracking-widest text-emerald-300">Promises Attached</div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {submittedCommitments.map(commitment => (
                                            <span key={commitment.id} className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-emerald-200">
                                                {commitment.shortLabel}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {feedback ? <div className="border-t border-white/[0.07] px-4 py-3 text-[9px] font-bold text-emerald-300">{feedback}</div> : null}
                        </motion.section>
                    ) : stage === 'ENTRY' ? (
                        <motion.div key="entry" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
                            <section className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#111114,#09090b)] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-600">Public Valuation</div>
                                        <div className="mt-1 font-mono text-2xl font-black text-white">{formatMoney(profile.valuation)}</div>
                                    </div>
                                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-2 text-right">
                                        <div className="text-[5px] font-black uppercase tracking-widest text-amber-500/60">Market State</div>
                                        <div className="mt-0.5 text-[8px] font-black uppercase text-amber-300">{profile.acquisitionState.replaceAll('_', ' ')}</div>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.07] border-y border-white/[0.07] py-3">
                                    <div className="px-2 text-center">
                                        <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Capital</div>
                                        <div className="mt-1 font-mono text-[10px] font-black text-emerald-300">{formatMoney(profile.capital)}</div>
                                    </div>
                                    <div className="px-2 text-center">
                                        <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Est. Debt</div>
                                        <div className="mt-1 font-mono text-[10px] font-black text-zinc-300">{formatMoney(profile.debt)}</div>
                                    </div>
                                    <div className="px-2 text-center">
                                        <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Profit</div>
                                        <div className={`mt-1 font-mono text-[10px] font-black ${profile.profitability >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                            {formatMoney(profile.profitability)}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {!report ? (
                                <div className="mt-3 flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-3.5">
                                    <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-300" />
                                    <div>
                                        <div className="text-[8px] font-black uppercase tracking-[0.18em] text-rose-300">Unknown Liabilities</div>
                                        <p className="mt-1 text-[9px] font-semibold leading-relaxed text-zinc-500">
                                            You can bid now, but debt, contracts, and hidden obligations remain estimates.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3.5">
                                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-300">
                                        <FileSearch size={14} /> Due Diligence Complete
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                                        <div>
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Adjusted Value</div>
                                            <div className="mt-1 font-mono text-xs font-black text-white">{formatMoney(report.adjustedEnterpriseValue)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Hidden Liabilities</div>
                                            <div className="mt-1 font-mono text-xs font-black text-rose-300">{formatMoney(report.hiddenLiabilities)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Verified Debt</div>
                                            <div className="mt-1 font-mono text-xs font-black text-zinc-200">{formatMoney(report.verifiedDebt)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Expected Income</div>
                                            <div className="mt-1 font-mono text-xs font-black text-emerald-300">{formatMoney(report.expectedAnnualIncome)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                                        <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Recommended Opening Range</div>
                                        <div className="mt-1 font-mono text-[11px] font-black text-amber-300">
                                            {formatMoney(report.recommendedLow)} – {formatMoney(report.recommendedHigh)}
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            {report.obligations.map(obligation => (
                                                <div key={obligation} className="flex items-start gap-1.5 text-[7px] font-semibold leading-relaxed text-zinc-500">
                                                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                                                    {obligation}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="mt-3 text-[9px] font-semibold leading-relaxed text-zinc-500">{report.primaryRisk}</p>
                                </div>
                            )}

                            <div className="mt-4 space-y-2.5">
                                <button
                                    type="button"
                                    onClick={() => setStage('OFFER')}
                                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-amber-400/35 bg-amber-400 px-4 text-left text-black shadow-[0_16px_40px_rgba(245,158,11,0.12)] active:scale-[0.99]"
                                >
                                    <CircleDollarSign size={22} />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black uppercase tracking-[0.15em]">Make Offer Now</div>
                                        <div className="mt-0.5 text-[8px] font-bold opacity-60">Proceed with {report ? 'verified' : 'public'} company intelligence</div>
                                    </div>
                                    <ChevronRight size={18} />
                                </button>
                                <button
                                    type="button"
                                    disabled={Boolean(report)}
                                    onClick={() => {
                                        setFundingPurpose('DILIGENCE');
                                        setSelectedFunding(null);
                                        setStage('FUNDING');
                                    }}
                                    className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 text-left transition-all ${
                                        report
                                            ? 'cursor-default border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
                                            : 'border-white/12 bg-white/[0.04] text-white hover:border-white/25'
                                    }`}
                                >
                                    {report ? <Check size={21} /> : <FileSearch size={21} />}
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black uppercase tracking-[0.15em]">{report ? 'Diligence Complete' : 'Run Due Diligence'}</div>
                                        <div className="mt-0.5 text-[8px] font-semibold text-zinc-500">
                                            {report ? `${report.confidence}% confidence report saved` : `Optional review · ${formatMoney(diligenceFee)}`}
                                        </div>
                                    </div>
                                    {!report ? <ChevronRight size={18} /> : null}
                                </button>
                            </div>
                        </motion.div>
                    ) : stage === 'OFFER' ? (
                        <motion.div key="offer" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="mb-3">
                                <div className="text-[7px] font-black uppercase tracking-[0.22em] text-amber-400">Choose Opening Structure</div>
                                <h3 className="mt-1 text-xl font-black uppercase tracking-tight">Set Your Position</h3>
                                <p className="mt-1 text-[9px] font-semibold leading-relaxed text-zinc-500">
                                    This is an opening proposal. The seller may accept, reject, or counter in the next negotiation phase.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1.5">
                                <button
                                    type="button"
                                    disabled={publicCompany}
                                    onClick={() => selectStructure('FULL')}
                                    className={`rounded-xl px-2 py-3 text-center transition-all ${
                                        offerType !== 'MINORITY'
                                            ? 'bg-amber-400 text-black'
                                            : publicCompany
                                                ? 'cursor-not-allowed text-zinc-800'
                                                : 'text-zinc-500 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <TrendingUp size={15} className="mx-auto mb-1" />
                                    <div className="text-[8px] font-black uppercase tracking-[0.12em]">{structureLabels.FULL}</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectStructure('MINORITY')}
                                    className={`rounded-xl px-2 py-3 text-center transition-all ${
                                        offerType === 'MINORITY' ? 'bg-violet-300 text-black' : 'text-zinc-500 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <Landmark size={15} className="mx-auto mb-1" />
                                    <div className="text-[8px] font-black uppercase tracking-[0.12em]">{structureLabels.MINORITY}</div>
                                </button>
                            </div>
                            {publicCompany ? (
                                <p className="mt-1.5 text-[7px] font-semibold text-violet-300">Public companies are minority-investment only in this phase.</p>
                            ) : null}

                            {offerType === 'MINORITY' ? (
                                <section className="mt-3 rounded-2xl border border-violet-400/20 bg-violet-400/[0.05] p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-violet-300">{structureLabels.MINORITY}</div>
                                            <div className="mt-1 text-[7px] font-semibold text-zinc-500">5–49% · strategic threshold {strategicThreshold}%</div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Percent size={13} className="text-violet-300" />
                                            <input
                                                aria-label={tr('studioAcquisitionDesk.offer.minorityPercentAria')}
                                                type="number"
                                                min={5}
                                                max={49}
                                                value={minorityPercent}
                                                onChange={(event) => {
                                                    const nextPercent = Number(event.target.value);
                                                    setMinorityPercent(nextPercent);
                                                    const fairAmount = Math.round(customOfferAnalysis.referenceValue * (nextPercent / 100));
                                                    setOfferAmountInput(String(Math.max(0, fairAmount)));
                                                }}
                                                className="w-14 bg-transparent text-right font-mono text-xl font-black text-violet-300 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                                        {[10, 20, 25, 30].map(percent => (
                                            <button
                                                key={percent}
                                                type="button"
                                                onClick={() => {
                                                    setMinorityPercent(percent);
                                                    setOfferAmountInput(String(Math.round(customOfferAnalysis.referenceValue * (percent / 100))));
                                                }}
                                                className={`rounded-lg border py-1.5 font-mono text-[8px] font-black ${
                                                    minorityPercent === percent
                                                        ? 'border-violet-300 bg-violet-300 text-black'
                                                        : 'border-white/10 bg-black/20 text-zinc-500'
                                                }`}
                                            >
                                                {percent}%
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            ) : null}

                            <section className="mt-3 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#111114,#09090b)] p-3.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-[7px] font-black uppercase tracking-[0.2em] text-amber-400">Exact Offer</div>
                                        <div className="mt-0.5 text-[6px] font-black uppercase tracking-widest text-zinc-600">
                                            {report ? 'Verified reference value' : 'Public reference value'} · {formatMoney(customOfferAnalysis.referenceValue)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            aria-label="Decrease Offer Amount"
                                            onClick={() => setOfferAmountInput(String(Math.max(0, customOfferAnalysis.normalizedAmount - offerStep)))}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Increase Offer Amount"
                                            onClick={() => setOfferAmountInput(String(customOfferAnalysis.normalizedAmount + offerStep))}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center border-b border-white/10 pb-2">
                                    <span className="mr-1 font-mono text-xl font-black text-zinc-500">$</span>
                                    <input
                                        aria-label="Exact Offer Amount"
                                        type="text"
                                        inputMode="numeric"
                                        value={offerAmountInput ? Number(offerAmountInput.replace(/[^\d]/g, '')).toLocaleString('en-US') : ''}
                                        onChange={(event) => setOfferAmountInput(event.target.value.replace(/[^\d]/g, ''))}
                                        className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-black text-white outline-none"
                                    />
                                </div>
                                <div className="mt-3">
                                    <div className="mb-1.5 text-[6px] font-black uppercase tracking-[0.18em] text-zinc-600">Quick Fill</div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {(['CONSERVATIVE', 'FAIR', 'AGGRESSIVE'] as const).map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => applyQuickFill(preset)}
                                                className="rounded-lg border border-white/10 bg-white/[0.03] py-2 text-[7px] font-black uppercase tracking-[0.1em] text-zinc-400 transition-colors hover:border-amber-400/30 hover:text-amber-300"
                                            >
                                                {preset === 'CONSERVATIVE' ? 'Conservative' : preset === 'AGGRESSIVE' ? 'Aggressive' : 'Fair'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className={`mt-3 rounded-2xl border p-3.5 ${
                                customOfferAnalysis.valid ? 'border-white/10 bg-white/[0.025]' : 'border-rose-400/25 bg-rose-400/[0.06]'
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[6px] font-black uppercase tracking-[0.18em] text-zinc-600">Seller Posture</div>
                                        <div className={`mt-1 text-sm font-black uppercase ${POSTURE_COPY[customOfferAnalysis.posture].color}`}>
                                            {tr(POSTURE_COPY[customOfferAnalysis.posture].labelKey)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[6px] font-black uppercase tracking-[0.18em] text-zinc-600">
                                            {offerType === 'MINORITY' ? 'Implied Company Value' : 'Value Difference'}
                                        </div>
                                        <div className={`mt-1 font-mono text-sm font-black ${
                                            customOfferAnalysis.valueDeltaPercent < 0 ? 'text-sky-300' : customOfferAnalysis.valueDeltaPercent > 45 ? 'text-rose-300' : 'text-amber-300'
                                        }`}>
                                            {offerType === 'MINORITY'
                                                ? formatMoney(customOfferAnalysis.impliedCompanyValue || 0)
                                                : `${customOfferAnalysis.valueDeltaPercent >= 0 ? '+' : ''}${customOfferAnalysis.valueDeltaPercent}%`}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                    <div className={`h-full rounded-full ${POSTURE_COPY[customOfferAnalysis.posture].bar}`} style={{ width: `${Math.min(100, Math.max(4, customOfferAnalysis.comparisonValue / Math.max(customOfferAnalysis.referenceValue, 1) * 50))}%` }} />
                                </div>
                                <p className="mt-2 text-[8px] font-semibold leading-relaxed text-zinc-500">
                                    {customOfferAnalysis.validationReason || tr(POSTURE_COPY[customOfferAnalysis.posture].noteKey)}
                                </p>
                                {offerType === 'MINORITY' ? (
                                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-3">
                                        <div>
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Combined Ownership</div>
                                            <div className="mt-1 font-mono text-[11px] font-black text-violet-300">{customOfferAnalysis.combinedOwnershipPercent}%</div>
                                        </div>
                                        <div>
                                            <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Influence Result</div>
                                            <div className={`mt-1 text-[8px] font-black uppercase ${customOfferAnalysis.reachesStrategicThreshold ? 'text-emerald-300' : 'text-zinc-500'}`}>
                                                {customOfferAnalysis.reachesStrategicThreshold ? 'Strategic Stake' : 'Financial Stake'}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </section>

                            <section className="mt-3 rounded-2xl border border-emerald-400/20 bg-[linear-gradient(145deg,rgba(16,185,129,0.08),rgba(9,9,11,0.96))] p-3.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-300">Deal Promises</div>
                                        <p className="mt-1 text-[8px] font-semibold leading-relaxed text-zinc-500">
                                            Promises can improve board trust, but they become obligations after signing.
                                        </p>
                                    </div>
                                    <div className="rounded-full border border-emerald-300/20 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-emerald-300">
                                        {selectedCommitments.length}/3
                                    </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {acquisitionCommitments.map(commitment => {
                                        const selected = selectedCommitments.includes(commitment.id);
                                        return (
                                            <button
                                                key={commitment.id}
                                                type="button"
                                                onClick={() => toggleCommitment(commitment.id)}
                                                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                                                    selected
                                                        ? 'border-emerald-300/45 bg-emerald-300/[0.08] shadow-[0_0_24px_rgba(16,185,129,0.08)]'
                                                        : 'border-white/[0.08] bg-black/20 hover:border-emerald-300/20'
                                                }`}
                                            >
                                                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                                                    selected ? 'border-emerald-300 bg-emerald-300 text-black' : 'border-white/10 text-zinc-600'
                                                }`}>
                                                    {selected ? <Check size={14} strokeWidth={3} /> : <ShieldAlert size={13} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className={`text-[9px] font-black uppercase tracking-[0.12em] ${selected ? 'text-emerald-200' : 'text-zinc-300'}`}>
                                                        {commitment.label}
                                                    </div>
                                                    <div className="mt-1 text-[8px] font-semibold leading-relaxed text-zinc-500">{commitment.description}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </motion.div>
                    ) : stage === 'FUNDING' ? (
                        <motion.div key="funding" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="mb-3">
                                <div className="text-[7px] font-black uppercase tracking-[0.22em] text-amber-400">Funding Authority</div>
                                <h3 className="mt-1 text-xl font-black uppercase tracking-tight">
                                    {fundingPurpose === 'DILIGENCE' ? 'Fund Intelligence Review' : 'Choose Deal Capital'}
                                </h3>
                                <p className="mt-1 text-[9px] font-semibold leading-relaxed text-zinc-500">
                                    {fundingPurpose === 'DILIGENCE'
                                        ? `${formatMoney(diligenceFee)} is charged immediately when the report begins.`
                                        : `${formatMoney(selectedOffer.amount)} is validated now but only paid after an accepted final deal.`}
                                </p>
                            </div>
                            <div className="space-y-2.5">
                                {fundingOptions.map(option => (
                                    <FundingOptionCard
                                        key={`${option.source}-${option.businessId || 'personal'}`}
                                        option={option}
                                        language={language}
                                        selected={Boolean(selectedFunding
                                            && selectedFunding.source === option.source
                                            && (option.source === 'PERSONAL' || selectedFunding.businessId === option.businessId))}
                                        onSelect={() => chooseFunding(option)}
                                    />
                                ))}
                            </div>
                            {fundingOptions.every(option => option.source !== 'STUDIO') ? (
                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-violet-400/15 bg-violet-400/[0.05] p-3 text-[8px] font-semibold leading-relaxed text-zinc-500">
                                    <Building2 size={14} className="shrink-0 text-violet-300" />
                                    Open a production studio to unlock Studio Capital funding and its business tax treatment.
                                </div>
                            ) : null}
                            {feedback ? <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-[9px] font-bold text-rose-300">{feedback}</div> : null}
                        </motion.div>
                    ) : (
                        <motion.div key="review" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
	                            <div className="mb-3">
	                                <div className="text-[7px] font-black uppercase tracking-[0.22em] text-amber-400">Final Review</div>
	                                <h3 className="mt-1 text-xl font-black uppercase tracking-tight">Authorize Opening Offer</h3>
                                    <div className="mt-2 flex justify-end">
                                        <EnergyChip cost={strategyEnergyCost} enough={hasStrategyEnergy} />
                                    </div>
	                            </div>
                            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#111114,#09090b)]">
                                <div className="border-b border-white/[0.07] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">Structure</div>
                                            <div className="mt-1 text-sm font-black uppercase text-white">
                                                {offerType === 'MINORITY' ? structureLabels.MINORITY : structureLabels.FULL}
                                            </div>
                                            {offerType === 'MINORITY' ? <div className="mt-1 text-[9px] font-black text-violet-300">{minorityPercent}% company stake</div> : null}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">Opening Value</div>
                                            <div className="mt-1 font-mono text-lg font-black text-amber-300">{formatMoney(selectedOffer.amount)}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 border-b border-white/[0.07]">
                                    <div className="border-r border-white/[0.07] p-4">
                                        <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.16em] text-zinc-600">
                                            <Banknote size={12} /> Funding
                                        </div>
                                        <div className="mt-1 text-[10px] font-black text-white">{resolvedFunding?.label}</div>
                                        <div className="mt-1 font-mono text-[9px] font-black text-zinc-400">{formatMoney(resolvedFunding?.remainingBalance || 0)} after close</div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.16em] text-zinc-600">
                                            <Scale size={12} /> Compliance Risk
                                        </div>
                                        <div className={`mt-1 text-[10px] font-black uppercase ${resolvedFunding ? COMPLIANCE_COPY[resolvedFunding.complianceBand].color : 'text-zinc-500'}`}>
                                            {resolvedFunding ? tr(COMPLIANCE_COPY[resolvedFunding.complianceBand].labelKey) : tr('studioAcquisitionDesk.value.unknown')}
                                        </div>
                                        <div className="mt-1 font-mono text-[9px] font-black text-zinc-400">{resolvedFunding?.complianceRisk || 0}/100 projected</div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start gap-2.5 rounded-xl border border-sky-400/15 bg-sky-400/[0.05] p-3">
                                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-sky-300" />
                                        <p className="text-[8px] font-semibold leading-relaxed text-zinc-400">
                                            Submitting records your opening position only. No acquisition price is deducted until the seller accepts and you confirm final signing.
                                        </p>
                                    </div>
                                    {!report ? (
                                        <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-rose-400/15 bg-rose-400/[0.05] p-3">
                                            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-rose-300" />
                                            <p className="text-[8px] font-semibold leading-relaxed text-zinc-400">
                                                Unknown Liabilities remain. Your offer uses public estimates rather than a verified report.
                                            </p>
                                        </div>
                                    ) : null}
                                    {activeCommitments.length > 0 ? (
                                        <div className="mt-2.5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3">
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-emerald-300">Promises Attached</div>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {activeCommitments.map(commitment => (
                                                    <span key={commitment.id} className="rounded-full border border-emerald-300/20 px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-emerald-200">
                                                        {commitment.shortLabel}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </section>
                            {feedback ? (
                                <div className={`mt-3 rounded-xl border p-3 text-[9px] font-bold ${
                                    feedback.startsWith('Opening offer')
                                        ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
                                        : 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300'
                                }`}>
                                    {feedback}
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {signingRoomVisible ? (
                    <motion.div
                        key="signing-room"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${profile.name} Signing Room`}
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        className="Deal Theater Closing Ritual Fixed Acquisition Viewport Cinematic Acquisition Screen fixed inset-0 z-[9999] overflow-y-auto bg-[radial-gradient(circle_at_50%_-18%,#7a420f_0%,#241205_31%,#070402_58%,#030201_100%)] text-white custom-scrollbar"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-18%,#6b3b0e_0%,#241205_32%,transparent_56%),radial-gradient(circle_at_18%_16%,rgba(255,214,92,0.18),transparent_28%),linear-gradient(180deg,#180c04_0%,#070402_46%,#030201_100%)]" />
                        <div className="Brass Lamp pointer-events-none absolute left-1/2 top-0 h-36 w-[min(760px,88vw)] -translate-x-1/2 rounded-b-full bg-[#ffd45a] opacity-35 blur-3xl" />
                        <div className="Mahogany Closing Table pointer-events-none absolute inset-x-0 bottom-0 h-[34vh] min-h-[240px] bg-[linear-gradient(180deg,rgba(58,25,7,0)_0%,#3b1706_26%,#1b0802_100%)]" />
                        <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(90deg,#fff_1px,transparent_1px),linear-gradient(#fff_1px,transparent_1px)] [background-size:44px_44px]" />
                        <span className="sr-only">
                            {tr('studioAcquisitionDesk.signing.srOnly')}
                        </span>

                        <div className="Deal Room Viewport relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
                            <div className="flex shrink-0 items-start justify-between gap-4">
                                <div className="min-w-0 pt-1">
                                    <div className="flex flex-wrap items-center gap-2 text-[7px] font-black uppercase tracking-[0.28em] text-amber-300">
                                        <span>Studio Takeover Ceremony</span>
                                        <span className="hidden text-zinc-600 sm:inline">·</span>
                                        <span className="hidden text-zinc-500 sm:inline">Deal Room Closing</span>
                                    </div>
                                    <h3 className="mt-1 max-w-[760px] font-serif text-[clamp(1.8rem,7vw,3.4rem)] font-black uppercase italic leading-[0.86] text-[#fff3dd] drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)]">
                                        {profile.name}
                                    </h3>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                        <span>Executive Desk</span>
                                        <span>·</span>
                                        <span>{tr('studioAcquisitionDesk.takeover.controlTransfer')}</span>
                                        <span>·</span>
                                        <span>{activeStageLabel}</span>
                                    </div>
                                </div>
                                <button
	                                    type="button"
	                                    onClick={() => {
	                                        if (acceptedContractMode) {
	                                            onClose();
	                                            return;
                                        }
                                        setSigningRoomOpen(false);
                                    }}
                                    className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-[22px] border-2 border-amber-300/25 bg-[#2a1608] text-amber-100 shadow-[0_14px_0_#0d0502,0_20px_36px_rgba(0,0,0,0.42)] transition-colors hover:border-amber-300/50 hover:bg-[#3a1e0b]"
                                >
                                    <ArrowLeft size={22} />
                                </button>
                            </div>

                            <div className="mt-5 grid shrink-0 grid-cols-4 gap-2">
                                {contractPages.map((page, index) => (
                                    <button
                                        key={page.title}
                                        type="button"
                                        onClick={() => setContractPage(index)}
                                        className={`h-3 cursor-pointer rounded-full border transition-all ${index <= boundedContractPage ? 'border-amber-200 bg-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.34)]' : 'border-[#3f2a12] bg-[#201107]'}`}
                                        aria-label={`Open contract page ${index + 1}`}
                                    />
                                ))}
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 160, damping: 19 }}
                                className="relative mt-4 grid w-full flex-1 grid-cols-1 gap-4 pb-4 lg:grid-cols-[250px_minmax(0,1fr)_270px] lg:items-stretch"
                            >
                                <aside className="Acquisition Command Board Solid Game Panel hidden rounded-[30px] border-2 border-[#7a5014] bg-[#120804] p-4 shadow-[0_18px_0_#050201,0_30px_70px_rgba(0,0,0,0.42)] lg:order-1 lg:block">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[8px] font-black uppercase tracking-[0.24em] text-amber-300">Acquisition Command Board</div>
                                            <div className="mt-1 text-[7px] font-black uppercase tracking-[0.16em] text-zinc-600">Contract Stack</div>
                                        </div>
                                        <Target size={18} className="text-amber-300" />
                                    </div>
                                    <div className="mt-4 grid gap-2">
                                        {takeoverStages.map((stageItem, index) => (
                                            <button
                                                key={stageItem.label}
                                                type="button"
                                                onClick={() => setContractPage(Math.min(index, contractPages.length - 1))}
                                                className={`cursor-pointer rounded-[20px] border-2 p-3 text-left transition-colors ${
                                                    stageItem.state === 'COMPLETE'
                                                        ? 'border-emerald-300/55 bg-[#08261a] text-emerald-100'
                                                        : stageItem.state === 'LIVE'
                                                            ? 'border-amber-300 bg-[#2b1a07] text-amber-100 shadow-[0_0_24px_rgba(252,211,77,0.16)]'
                                                            : 'border-[#2b1a0c] bg-[#0b0705] text-zinc-500'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.14em]">{stageItem.label}</span>
                                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black ${stageItem.state === 'COMPLETE' ? 'bg-emerald-300 text-black' : stageItem.state === 'LIVE' ? 'bg-amber-300 text-black' : 'bg-[#211309] text-zinc-600'}`}>
                                                        {stageItem.state === 'COMPLETE' ? <Check size={13} /> : index + 1}
                                                    </span>
                                                </div>
                                                <div className="mt-2 font-mono text-sm font-black">{stageItem.value}</div>
                                            </button>
                                        ))}
                                    </div>
                                </aside>

                                <section className="Action Plate Solid Game Panel order-1 overflow-hidden rounded-[32px] border-2 border-amber-300 bg-[#160b05] shadow-[0_16px_0_#050201,0_28px_70px_rgba(0,0,0,0.48)] lg:order-2">
                                    <div className="relative overflow-hidden border-b-2 border-[#6b4312] bg-[linear-gradient(135deg,#2c1607_0%,#0c0502_72%)] p-3 sm:p-5">
                                        <div className="absolute right-4 top-4 hidden h-20 w-20 rounded-full border-[10px] border-emerald-300/14 sm:block" />
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300">Wizard Step {boundedContractPage + 1} / {contractPages.length}</div>
                                                <h4 className="mt-1 text-[clamp(1.4rem,7vw,3.1rem)] font-black uppercase leading-[0.88] tracking-[-0.06em] text-white">
                                                    {contractSigned ? 'Studio Acquired' : stampDropped ? 'Filing Transfer' : activeContractPage.title}
                                                </h4>
                                            </div>
                                            <div className="rounded-[18px] border-2 border-amber-300/45 bg-[#100804] px-3 py-2 text-right shadow-[0_7px_0_#050201]">
                                                <div className="text-[6px] font-black uppercase tracking-[0.18em] text-amber-300/70">Agreed Price</div>
                                                <div className="font-mono text-base font-black text-amber-100">{formatMoney(finalPrice)}</div>
                                            </div>
                                        </div>
                                        <div className="Takeover Meter mt-3 rounded-2xl border-2 border-[#4a2c0d] bg-[#070402] p-2">
                                            <div className="flex items-center justify-between px-1 text-[7px] font-black uppercase tracking-[0.18em] text-zinc-500">
                                                <span>Takeover Meter</span>
                                                <span className="font-mono text-amber-300">{takeoverPercent}%</span>
                                            </div>
                                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#261507]">
                                                <motion.div
                                                    className="h-full rounded-full bg-[#c79a2f] shadow-[0_0_18px_rgba(199,154,47,0.24)]"
                                                    animate={{ width: `${takeoverPercent}%` }}
                                                    transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 sm:p-5">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activeContractPage.title}
                                                initial={{ opacity: 0, x: 24 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -24 }}
                                                transition={{ duration: 0.18 }}
                                                className="Responsive Packet Scroll"
                                            >
                                                <div className="rounded-[26px] border-2 border-[#3a240c] bg-[#0b0603] p-3 shadow-[inset_0_0_0_1px_rgba(250,204,21,0.06)] sm:p-5">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <div className="text-[7px] font-black uppercase tracking-[0.24em] text-amber-300">Terms & Conditions · {activeContractPage.eyebrow}</div>
                                                            <h5 className="mt-1 text-xl font-black uppercase tracking-[-0.04em] text-white sm:text-4xl">{activeContractPage.title}</h5>
                                                        </div>
                                                        <div className="rounded-full border border-[#3a240c] bg-[#1f1207] px-3 py-2 text-[7px] font-black uppercase tracking-[0.16em] text-zinc-500">Doc #{contractSerial}</div>
                                                    </div>
                                                    <p className="mt-3 max-w-2xl text-xs font-bold leading-relaxed text-zinc-300 sm:text-sm">{activeContractPage.body}</p>

                                                    {activeContractPage.stats ? (
                                                        <div className="mt-3 overflow-hidden rounded-[22px] border-2 border-[#2d1c0a] bg-[#120a05]">
                                                            {activeContractPage.stats.map(([label, value]) => (
                                                                <div key={label} className="flex items-center justify-between gap-4 border-b border-[#2d1c0a] px-3 py-3 last:border-b-0">
                                                                    <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">{label}</div>
                                                                    <div className="truncate text-right font-mono text-sm font-black text-amber-100 sm:text-lg">{value}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}

                                                    {activeContractPage.clauses ? (
                                                        <div className="mt-3 grid gap-2">
                                                            {activeContractPage.clauses.map(clause => (
                                                                <div key={clause} className="flex items-center gap-3 rounded-[18px] border-2 border-emerald-400/25 bg-[#062015] px-3 py-2.5">
                                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-black shadow-[0_5px_0_#065f46]"><Check size={15} /></span>
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">{clause}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}

                                                    {boundedContractPage === contractPages.length - 1 ? (
                                                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_0.72fr]">
                                                            <div className="Signature Tray rounded-[22px] border-2 border-emerald-300/35 bg-[#041611] p-3 sm:p-4">
                                                                <div className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-300">Signature Line · Ink Signature</div>
                                                                <div className="mt-3 flex min-h-16 items-center rounded-[18px] border-2 border-dashed border-emerald-300/30 bg-[#02100c] px-4 sm:min-h-20">
                                                                    <span className="truncate font-serif text-3xl italic text-emerald-100 sm:text-4xl">{signingProgress > 0 || contractSigned ? signatoryName : 'Tap to write'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="Live Stamp rounded-[22px] border-2 border-amber-300/35 bg-[#2a1808] p-3 text-center sm:p-4">
                                                                <div className="text-[7px] font-black uppercase tracking-[0.18em] text-amber-300">Live Stamp</div>
                                                                <div className="mt-2 text-4xl font-black tracking-[-0.08em] text-white sm:text-5xl">{Math.round(signingProgress)}%</div>
                                                                <div className="mt-1 text-[7px] font-black uppercase tracking-[0.16em] text-zinc-500">{contractSigned ? 'TRANSFER APPROVED' : stampDropped ? 'FILING TRANSFER' : 'APPROVED FOR TRANSFER pending'}</div>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>

                                        {boundedContractPage === contractPages.length - 1 && !contractSigned ? (
                                            <div className="Requirement Check mt-4 rounded-[22px] border-2 border-[#3a240c] bg-[#0d0704] p-3 shadow-[inset_0_1px_0_rgba(250,204,21,0.07)]">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <Banknote size={13} className="shrink-0 text-amber-300" />
                                                        <div className="min-w-0">
                                                            <div className="text-[7px] font-black uppercase tracking-[0.2em] text-amber-300">Requirement Check</div>
                                                            <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                                                                {finalFundingLabel} · {formatMoney(finalPrice)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`shrink-0 rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.12em] ${
                                                        signingRequirementChecks.every(check => check.met)
                                                            ? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-200'
                                                            : 'border-amber-300/30 bg-amber-300/10 text-amber-200'
                                                    }`}>
                                                        {signingRequirementChecks.every(check => check.met) ? 'All met' : 'Needs attention'}
                                                    </div>
                                                </div>
                                                <div className="mt-3 grid grid-cols-3 gap-2">
                                                    {signingRequirementChecks.map(check => {
                                                        const StatusIcon = check.met ? Check : AlertTriangle;
                                                        return (
                                                            <div
                                                                key={check.id}
                                                                className={`min-w-0 rounded-[16px] border px-2.5 py-2 ${
                                                                    check.met
                                                                        ? 'border-emerald-300/24 bg-emerald-300/[0.07] text-emerald-100'
                                                                        : 'border-rose-300/28 bg-rose-300/[0.08] text-rose-100'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-1.5">
                                                                    <StatusIcon size={11} strokeWidth={3} className={check.met ? 'text-emerald-300' : 'text-rose-300'} />
                                                                    <span className="truncate text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">{check.label}</span>
                                                                </div>
                                                                <div className={`mt-1 truncate font-mono text-[10px] font-black ${check.met ? 'text-emerald-100' : 'text-rose-100'}`}>
                                                                    {check.value}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="mt-4">
                                            {boundedContractPage < contractPages.length - 1 ? (
                                                <div className="grid grid-cols-[0.78fr_1.22fr] gap-3">
                                                    <button
                                                        type="button"
                                                        disabled={boundedContractPage === 0}
                                                        onClick={() => setContractPage(page => Math.max(0, page - 1))}
                                                        className="min-h-14 cursor-pointer rounded-[22px] border-2 border-[#3a240c] bg-[#110904] px-4 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-[#6b4312] disabled:cursor-not-allowed disabled:opacity-35"
                                                    >
                                                        Previous
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setContractPage(page => Math.min(contractPages.length - 1, page + 1))}
                                                        className="Confirm Clause min-h-14 cursor-pointer rounded-[22px] bg-[#d8ab3c] px-4 text-[9px] font-black uppercase tracking-[0.18em] text-black shadow-[0_10px_0_#7a4a0a,0_18px_36px_rgba(0,0,0,0.28)] transition-transform active:translate-y-1 active:shadow-[0_5px_0_#7a4a0a]"
                                                    >
                                                        Confirm Clause · Next Clause
                                                    </button>
                                                </div>
                                            ) : contractSigned ? (
                                                <div className="rounded-[28px] border-2 border-emerald-300 bg-[#041c14] p-4 shadow-[0_12px_0_#020705,0_22px_46px_rgba(0,0,0,0.42)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-black shadow-[0_7px_0_#065f46]">
                                                            <Check size={28} strokeWidth={3} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-emerald-300">DEAL SIGNED</div>
                                                            <div className="mt-1 text-2xl font-black uppercase tracking-[-0.06em] text-white">Studio Acquired</div>
                                                        </div>
                                                    </div>
                                                    <p className="mt-3 text-[10px] font-bold leading-relaxed text-emerald-100/70">
                                                        The transfer is locked. {profile.name} is now part of your owned studio group.
                                                    </p>
                                                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-amber-100">
                                                        <Zap size={12} fill="currentColor" /> Final signing used 25E
                                                    </div>
                                                    {configuredOperatingModel ? (
                                                        <div className="mt-4 space-y-3">
                                                            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-200">Operating model saved</div>
                                                                <div className="mt-1 text-[10px] font-bold leading-relaxed text-emerald-100/70">Choose next studio action below.</div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={onClose}
                                                                className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-[22px] bg-[#d8ab3c] px-4 text-[9px] font-black uppercase tracking-[0.18em] text-black shadow-[0_9px_0_#7a4a0a] transition-transform active:translate-y-1 active:shadow-[0_4px_0_#7a4a0a]"
                                                            >
                                                                Open Studio Profile <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-4 border-t border-emerald-200/15 pt-4">
                                                            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-300">Final Board Directive</div>
                                                            <div className="mt-1 text-lg font-black uppercase text-white">Choose how the studio operates</div>
                                                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                                                {operatingModels.map(model => {
                                                                    const active = selectedOperatingModel === model.id;
                                                                    return (
                                                                        <button
                                                                            key={model.id}
                                                                            type="button"
                                                                            onClick={() => setSelectedOperatingModel(model.id)}
                                                                            className={`rounded-2xl border p-3 text-left transition-all ${active ? 'border-amber-300 bg-amber-300/12 shadow-[0_0_20px_rgba(216,171,60,0.12)]' : 'border-white/10 bg-black/25'}`}
                                                                        >
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <span className="text-[9px] font-black uppercase text-white">{model.label}</span>
                                                                                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-amber-300 bg-amber-300 text-black' : 'border-white/15 text-transparent'}`}>
                                                                                    <Check size={11} />
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-2 text-[7px] font-black uppercase tracking-wider text-zinc-500">{model.control}</div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                disabled={!selectedOperatingModel}
                                                                onClick={async () => {
                                                                    if (!selectedOperatingModel) return;
                                                                    const result = onSetOperatingModel(selectedOperatingModel);
                                                                    if (!result.success) {
                                                                        setFeedback('The operating model could not be saved.');
                                                                        return;
                                                                    }
                                                                    setFeedback('Operating model saved. Showing interstitial...');
                                                                    if (!hasNoAds(player)) {
                                                                        await showAd('INTERSTITIAL');
                                                                    }
                                                                    setFeedback('Operating model saved. Choose next studio action.');
                                                                }}
                                                                className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[#d8ab3c] px-4 text-[9px] font-black uppercase tracking-[0.18em] text-black shadow-[0_9px_0_#7a4a0a] transition-transform active:translate-y-1 active:shadow-[0_4px_0_#7a4a0a] disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                Confirm Operating Model <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
	                                                    type="button"
	                                                    aria-label="Sign & Acquire Studio"
	                                                    onClick={signAcquisition}
	                                                    onPointerUp={(event) => {
	                                                        event.preventDefault();
	                                                        signAcquisition();
	                                                    }}
	                                                    onTouchEnd={(event) => {
	                                                        event.preventDefault();
	                                                        signAcquisition();
	                                                    }}
	                                                    onContextMenu={(event) => event.preventDefault()}
                                                    className="Signature Pressure Stamp Strike relative flex min-h-20 w-full cursor-pointer select-none items-center justify-between overflow-hidden rounded-[28px] border-2 border-amber-200/80 bg-[linear-gradient(135deg,#2c1607_0%,#120a04_46%,#050201_100%)] px-5 text-left text-white shadow-[0_12px_0_#050201,0_22px_46px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,236,179,0.12)] transition-transform active:translate-y-1 active:shadow-[0_6px_0_#050201]"
                                                >
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgba(16,185,129,0.36),rgba(250,204,21,0.46))] transition-[width] duration-300"
                                                        style={{ width: `${signingProgress}%` }}
                                                    />
                                                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,244,196,0.18),transparent_26%),linear-gradient(90deg,rgba(255,255,255,0.07),transparent_36%)]" />
                                                    <div className="relative z-10">
                                                        <div className="text-2xl font-black uppercase tracking-[-0.05em]">{isSigningAcquisition ? tr('studioAcquisitionDesk.contract.controlTransferring').toUpperCase() : tr('studioAcquisitionDesk.contract.holdToSign')}</div>
                                                        <div className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-100/70">
                                                            {!hasSigningFunding ? 'Funding shortfall · Check funds' : hasSigningEnergy ? 'Sign & Acquire Studio · Seal Contract' : `Need ${signingEnergyCost}E to sign`}
                                                        </div>
                                                    </div>
                                                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffe082,#d8ab3c)] text-black shadow-[0_7px_0_#7a4a0a,0_0_24px_rgba(250,204,21,0.24)]">
                                                        <Landmark size={24} />
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <aside className="Solid Game Panel hidden rounded-[30px] border-2 border-emerald-300/35 bg-[#04120e] p-4 shadow-[0_18px_0_#020705,0_30px_70px_rgba(0,0,0,0.42)] lg:order-3 lg:block">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300">Transfer Vault</div>
                                            <div className="mt-1 text-[7px] font-black uppercase tracking-[0.16em] text-zinc-600">Ownership Reveal</div>
                                        </div>
                                        <ShieldAlert size={18} className="text-emerald-300" />
                                    </div>
                                    <div className="mt-4 rounded-[28px] border-2 border-emerald-300/25 bg-[#082018] p-4 text-center">
                                        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border-2 ${stampDropped ? 'border-emerald-200 bg-emerald-300 text-black shadow-[0_0_36px_rgba(16,185,129,0.42)]' : 'border-[#1f5b43] bg-[#03100c] text-emerald-300'}`}>
                                            {stampDropped ? <Check size={38} /> : <LockKeyhole size={34} />}
                                        </div>
                                        <div className="mt-4 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">{stampDropped ? 'DEAL SIGNED' : 'Awaiting Stamp'}</div>
                                        <div className="mt-1 text-2xl font-black uppercase tracking-[-0.06em] text-white">{stampDropped ? 'Studio Acquired' : 'Control Locked'}</div>
                                    </div>
                                    <div className="mt-4 grid gap-2">
                                        <div className="rounded-[20px] border-2 border-[#133b2b] bg-[#020b08] p-3">
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">Agreed Value</div>
                                            <div className="mt-1 font-mono text-lg font-black text-emerald-300">{formatMoney(finalPrice)}</div>
                                        </div>
                                        <div className="rounded-[20px] border-2 border-[#133b2b] bg-[#020b08] p-3">
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">Funding Source</div>
                                            <div className="mt-1 text-sm font-black uppercase text-amber-100">{finalFundingLabel}</div>
                                        </div>
                                        <div className="rounded-[20px] border-2 border-[#133b2b] bg-[#020b08] p-3">
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">Expected Annual Income</div>
                                            <div className="mt-1 font-mono text-lg font-black text-white">{formatMoney(finalExpectedIncome)}</div>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[10px] font-bold leading-relaxed text-zinc-500">
                                        {stampDropped ? 'Ownership Reveal complete. Open Studio Profile or Develop From Catalog after the closing updates.' : 'Clear every clause, then tap the transfer control. If anything is missing, the filing desk will show the exact blocker.'}
                                    </p>
                                </aside>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {!hasDealStatus && stage !== 'ENTRY' ? (
                <footer className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#08080a]/95 p-4 backdrop-blur-xl">
                    <div className="mx-auto w-full max-w-6xl">
                    {stage === 'OFFER' ? (
                        <button
                            type="button"
                            disabled={!customOfferAnalysis.valid || !anyFundingAffordable}
                            onClick={() => {
                                setFundingPurpose('OFFER');
                                setSelectedFunding(null);
                                setStage('FUNDING');
                            }}
                            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[9px] font-black uppercase tracking-[0.16em] text-black active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                        >
                            Choose Funding · {formatMoney(customOfferAnalysis.normalizedAmount)} <ChevronRight size={15} />
                        </button>
                    ) : stage === 'FUNDING' ? (
                        <button
                            type="button"
                            disabled={!selectedFunding || !resolvedFunding?.affordable}
                            onClick={continueFromFunding}
                            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[9px] font-black uppercase tracking-[0.16em] text-black disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                        >
                            {fundingPurpose === 'DILIGENCE' ? <FileSearch size={15} /> : <ChevronRight size={15} />}
                            {fundingPurpose === 'DILIGENCE' ? `Authorize ${formatMoney(diligenceFee)} Review` : 'Review Opening Offer'}
                        </button>
                    ) : (
	                        <button
	                            type="button"
	                            onClick={submitOffer}
                                disabled={!hasStrategyEnergy}
	                            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[9px] font-black uppercase tracking-[0.16em] text-black active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
	                        >
	                            <Sparkles size={15} /> {hasStrategyEnergy ? 'Submit Opening Offer' : `Need ${strategyEnergyCost}E`}
	                        </button>
                    )}
                    </div>
                </footer>
            ) : null}
        </div>
    );
};
