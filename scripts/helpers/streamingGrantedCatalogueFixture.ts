import type {Player, StreamingTitleAccessMode} from '../../types';
import {createStreamingLicenseContract} from '../../services/streamingRightsCore';

/** Supply a real, explicitly licensed audit title without changing audience,
 * household budgets, subscription authority, or company cash. */
export const addStreamingAuditCatalogueTitle = (player:Player, absoluteWeek:number,
    id:string, modes:StreamingTitleAccessMode[]=['SUBSCRIPTION']) => {
    const title='Granted Audit Film';
    player.world.projects.push({id,title,genre:'DRAMA',mediaType:'MOVIE',quality:80,rating:8,
        originalLanguageId:'English',year:player.age,weekReleased:player.currentWeek} as any);
    const license=createStreamingLicenseContract({
        id:`${id}-license`,sourceProject:{id,title,mediaType:'MOVIE',genre:'DRAMA'},
        buyerPlatformId:null,platformContentPlanId:null,cataloguePackageId:null,
        licensorName:'Audit Studio',territory:'GLOBAL',durationWeeks:104,
        exclusivity:'NON_EXCLUSIVE',minimumGuarantee:0,platformRevenueShare:100,
        signedAtAbsoluteWeek:Math.max(0,absoluteWeek-4),startsAtAbsoluteWeek:Math.max(0,absoluteWeek-4),
        origin:'STUDIO_MARKET',sellerType:'STUDIO',sellerPlatformId:null,windowType:'FIRST_WINDOW',
        accessGrant:{schemaVersion:1,modes,earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'},
    });
    player.ownedStreamingPlatform.catalogLicenses.push(license);
    return license;
};
