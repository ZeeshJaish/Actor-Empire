import type {OwnedStreamingRightsNegotiation, Player, StreamingCollectionNegotiationSnapshot, StreamingRightsAccessGrant} from '../types';
import type {StreamingCataloguePackageOpportunity, StreamingRightsTermsInput} from './streamingRightsMarketplace';
import {createDeterministicId} from './deterministicRandom';
import {getAbsoluteWeek} from './legacyLogic';
import {getOwnedPlatformPackageCountryIds} from './streamingContentAvailability';
import {resolveStreamingRightsCompatibility} from './streamingRightsCompatibility';
import {createStreamingRightsAccessGrantForOffer} from './streamingRightsAccessGrant';
import {getStreamingBuyerBackendCapability, validateNewStreamingBackendTerms} from './streamingBackendPolicy';

/** Whole USD, deliberately bounded above the largest 50-title aggregate. Never clamp an offer. */
export const MAX_PRIVATE_COLLECTION_MONEY = 5_000_000_000_000;
export const validatePrivateTermsNumbers = (terms: StreamingRightsTermsInput, collection = false): string | null => {
    const limit = collection ? MAX_PRIVATE_COLLECTION_MONEY : 5_000_000_000;
    if (![terms.minimumGuarantee, terms.cancellationPenalty].every(v => Number.isSafeInteger(v) && v >= 0 && v <= limit))
        return `Fees and penalties must be whole USD between 0 and ${limit}.`;
    if (!Number.isInteger(terms.durationWeeks) || terms.durationWeeks < 1 || terms.durationWeeks > 520
        || !Number.isInteger(terms.platformRevenueShare) || terms.platformRevenueShare < 80 || terms.platformRevenueShare > 100)
        return 'Choose a supported duration and an integer seller backend between 0% and 20%.';
    if (terms.marketingGuarantee !== 0 || terms.viewershipBonusAmount !== 0 || terms.viewershipBonusThreshold !== 0)
        return 'New private offers use a fixed fee and eligible ads/rental backend; marketing and success bonuses are not supported.';
    if (!['DOMESTIC','MULTI_REGION','GLOBAL'].includes(terms.territory)
        || !['FIRST_WINDOW','SECOND_WINDOW','PERMANENT'].includes(terms.windowType)
        || !['EXCLUSIVE','NON_EXCLUSIVE'].includes(terms.exclusivity)
        || !['NONE','NOTICE','CONSENT_REQUIRED'].includes(terms.changeOfControl)) return 'Unsupported rights terms.';
    return null;
};
export const collectionPrivateDefaults = (player: Player, opportunity: StreamingCataloguePackageOpportunity): StreamingRightsTermsInput => ({
    territory:'MULTI_REGION', countryIds:opportunity.package.requestedCountryIds.slice(),
    durationWeeks:opportunity.package.maximumDurationWeeks, exclusivity:opportunity.package.requestedExclusivity,
    windowType:opportunity.package.requestedWindowType, minimumGuarantee:opportunity.totalGuarantee,
    platformRevenueShare:100, marketingGuarantee:0, viewershipBonusThreshold:0, viewershipBonusAmount:0,
    renewalOption:true, sublicensingAllowed:opportunity.package.requestedExclusivity==='NON_EXCLUSIVE',
    sequelRightsIncluded:false, changeOfControl:'NOTICE', cancellationPenalty:Math.round(opportunity.totalGuarantee*.2),
    accessGrant:createStreamingRightsAccessGrantForOffer(player.ownedStreamingPlatform.serviceConfiguration.pricing.streams,false),
});
const snapshotSignature = (snapshot: Omit<StreamingCollectionNegotiationSnapshot,'signature'>) =>
    createDeterministicId('collection-private-v1',JSON.stringify(snapshot));
export const createCollectionNegotiationSnapshot = (player:Player, opportunity:StreamingCataloguePackageOpportunity):StreamingCollectionNegotiationSnapshot => {
    const snapshot={schemaVersion:1 as const,package:structuredClone(opportunity.package),accessGrant:collectionPrivateDefaults(player,opportunity).accessGrant!};
    return {...snapshot,signature:snapshotSignature(snapshot)};
};
/** Invalid saved snapshots remain visibly unavailable; never fall back to a single component. */
export const validCollectionSnapshot = (snapshot:StreamingCollectionNegotiationSnapshot):boolean => {
    if (!snapshot || snapshot.schemaVersion!==1 || !snapshot.package || !snapshot.accessGrant) return false;
    const {signature,...payload}=snapshot;
    const p=snapshot.package;
    if (!Array.isArray(p.components) || !Array.isArray(p.acceptedTerms) || !Array.isArray(p.requestedCountryIds)
        || !Array.isArray(snapshot.accessGrant.modes) || !p.seller?.id || typeof p.id!=='string'
        || !Number.isSafeInteger(p.totalGuarantee) || p.totalGuarantee<=0 || p.totalGuarantee>MAX_PRIVATE_COLLECTION_MONEY
        || !Number.isSafeInteger(p.startsAtAbsoluteWeek) || !Number.isSafeInteger(p.maximumDurationWeeks)
        || p.maximumDurationWeeks<1 || p.maximumDurationWeeks>520) return false;
    return p.components.length>=3 && p.components.length<=50
        && p.components.every(c=>c && typeof c.sourceProjectId==='string' && c.rightsLot && Array.isArray(c.rightsLot.countryIds))
        && new Set(p.components.map(c=>c.sourceProjectId)).size===p.components.length
        && p.acceptedTerms.length===p.components.length
        && p.acceptedTerms.every(r=>r && Number.isSafeInteger(r.minimumGuarantee) && r.minimumGuarantee>0 && r.minimumGuarantee<=MAX_PRIVATE_COLLECTION_MONEY)
        && new Set(p.acceptedTerms.map(r=>r.componentProjectId)).size===p.components.length
        && p.components.every(c=>p.acceptedTerms.some(r=>r.componentProjectId===c.sourceProjectId))
        && p.acceptedTerms.reduce((sum,r)=>sum+r.minimumGuarantee,0)===p.totalGuarantee
        && signature===snapshotSignature(payload);
};
const grantCovered=(requested:StreamingRightsAccessGrant,available:StreamingRightsAccessGrant)=>
    Array.isArray(requested.modes) && requested.modes.length>0 && requested.modes.every(mode=>available.modes.includes(mode))
    && Number.isInteger(requested.earlyWindowWeeks) && requested.earlyWindowWeeks>=0
    && requested.earlyWindowWeeks<=available.earlyWindowWeeks && requested.purchaseFulfillment===available.purchaseFulfillment;
export const validateCollectionPrivateTerms = (player:Player,snapshot:StreamingCollectionNegotiationSnapshot,terms:StreamingRightsTermsInput,
    week=getAbsoluteWeek(player.age,player.currentWeek)):string|null => {
    const invalid=validatePrivateTermsNumbers(terms,true);if(invalid)return invalid;
    if(!validCollectionSnapshot(snapshot))return 'The complete collection snapshot is unavailable.';
    const p=snapshot.package;
    const countries=terms.countryIds||[];
    if(terms.windowType!==p.requestedWindowType || terms.durationWeeks>p.maximumDurationWeeks
        || terms.territory==='GLOBAL' || !countries.length || terms.territory==='DOMESTIC'&&countries.length!==1
        || new Set(countries).size!==countries.length || countries.some(id=>!p.requestedCountryIds.includes(id)
            || !getOwnedPlatformPackageCountryIds(player.ownedStreamingPlatform).includes(id)))return 'The requested country or window exceeds the collection offer.';
    if(week>=p.startsAtAbsoluteWeek+p.maximumDurationWeeks)return 'The collection offer window has expired.';
    if(terms.exclusivity!==p.requestedExclusivity)return 'This collection offers non-exclusive rights only.';
    if(terms.sequelRightsIncluded)return 'Collection offers do not include ownership of sequel rights.';
    if(!terms.accessGrant || !grantCovered(terms.accessGrant,snapshot.accessGrant))return 'The requested viewing modes exceed the collection offer.';
    const backend=validateNewStreamingBackendTerms({minimumGuarantee:terms.minimumGuarantee,licensorRevenueShare:100-terms.platformRevenueShare,
        referenceFee:p.totalGuarantee,capability:getStreamingBuyerBackendCapability(player,null,week,countries,terms.accessGrant)});
    if(backend)return backend;
    for(const component of p.components){
        const source=player.world.projects.find(project=>project.id===component.sourceProjectId);
        if(!source || source.studioId!==p.seller.id)return 'A collection component is no longer offered by this seller.';
        const inherited = Object.values(player.world.streamingRightsContracts || {}).some(contract=>contract.sourceProjectId===component.sourceProjectId
            && contract.status==='ACTIVE' && contract.buyer.id===p.seller.id && contract.seller.id!==p.seller.id);
        if(inherited)return 'A component now requires an inherited rights transfer; the original-studio collection cannot reissue that grant.';
        if(countries.some(id=>!component.rightsLot.countryIds.includes(id)))return 'A component does not cover the requested countries.';
        const result=resolveStreamingRightsCompatibility({world:player.world,sourceProjectId:component.sourceProjectId,buyerPlatformId:null,
            sellerPartyId:p.seller.id,territory:terms.territory,countryIds:countries,startsAtAbsoluteWeek:week,
            expiresAtAbsoluteWeek:week+terms.durationWeeks,windowType:terms.windowType,exclusivity:terms.exclusivity});
        if(!result.available)return result.summary;
    }
    return null;
};
/** Largest-remainder allocation in whole USD; BigInt avoids intermediate overflow. */
export const allocatePrivateCollectionMoney = (total:number,weights:number[]):number[] => {
    const sum=weights.reduce((s,w)=>s+BigInt(w),0n);let allocated=0;
    const rows=weights.map((w,index)=>{const product=BigInt(total)*BigInt(w);const amount=Number(product/sum);allocated+=amount;return {index,amount,remainder:product%sum};});
    const order=rows.slice().sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1);
    for(let i=0;i<total-allocated;i++)order[i].amount++;
    return rows.map(r=>r.amount);
};
export const collectionOpportunityForNegotiation = (negotiation:OwnedStreamingRightsNegotiation,week:number):StreamingCataloguePackageOpportunity => {
    const snapshot=negotiation.collectionSnapshot!;
    const p=snapshot.package;
    const amounts=allocatePrivateCollectionMoney(negotiation.minimumGuarantee,p.acceptedTerms.map(r=>r.minimumGuarantee));
    const rows=p.acceptedTerms.map((row,i)=>{
        const durationWeeks=negotiation.durationWeeks;
        const licensorRevenueShare=100-negotiation.platformRevenueShare;
        const expectedRoyaltyCost=licensorRevenueShare===0 ? 0 : Math.round(row.expectedRoyaltyCost
            * licensorRevenueShare/Math.max(1,row.licensorRevenueShare) * durationWeeks/row.durationWeeks);
        return {...row,minimumGuarantee:amounts[i],referenceAllocation:amounts[i],durationWeeks,
            territory:negotiation.territory,countryIds:negotiation.countryIds,windowType:negotiation.windowType,exclusivity:negotiation.exclusivity,
            platformRevenueShare:negotiation.platformRevenueShare,licensorRevenueShare,expectedRoyaltyCost,
            expectedTotalCost:amounts[i]+expectedRoyaltyCost};
    });
    return {id:p.id,package:{...p,startsAtAbsoluteWeek:week,acceptedTerms:rows,totalGuarantee:negotiation.minimumGuarantee},rows,
        totalGuarantee:negotiation.minimumGuarantee,sellerName:p.seller.name,marketHeat:negotiation.marketHeat==='HOT'?'HOT':'ACTIVE'};
};
