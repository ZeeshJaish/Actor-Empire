import {streamingCatalogueScaleFixture} from './streamingCatalogueScaleFixture';
import {getHistoricalCatalogueTitles} from '../../services/historicalCatalogue';
import {getAbsoluteWeek} from '../../services/legacyLogic';
import {createStreamingLicenseContract,createStreamingRightsContractFromLicense} from '../../services/streamingRightsCore';

/** Disposable boundary/stress data only. Starts with 104 normal acquisitions,
 * then seeds distinct released historical titles with explicit canonical grants.
 * Deliberately does not compact: the test must expose any lossy persistence boundary. */
export const streamingCatalogueStressFixture=(titleCount=1040,nowMs=1000)=>{
    if(!Number.isInteger(titleCount)||titleCount<104||titleCount>1040) throw new Error('Stress fixture supports 104–1040 titles.');
    const {player,session}=streamingCatalogueScaleFixture(104,nowMs);
    const platform=player.ownedStreamingPlatform;
    const ids=new Set(platform.catalogProjectIds);
    const week=getAbsoluteWeek(player.age,player.currentWeek);
    for(const title of getHistoricalCatalogueTitles(player)) {
        if(ids.size>=titleCount)break;
        if(ids.has(title.id)||title.id===session.lot.sourceProjectId)continue;
        const license=createStreamingLicenseContract({id:`stress-license:${title.id}`,
            sourceProject:{id:title.id,title:title.title,mediaType:title.projectType,genre:title.genre},
            buyerPlatformId:null,platformContentPlanId:null,cataloguePackageId:null,licensorName:title.studioName,
            territory:'GLOBAL',countryIds:[],durationWeeks:104,exclusivity:'NON_EXCLUSIVE',minimumGuarantee:0,
            platformRevenueShare:100,signedAtAbsoluteWeek:week,startsAtAbsoluteWeek:week,
            origin:'STUDIO_MARKET',sellerType:'STUDIO',sellerPlatformId:null,windowType:'FIRST_WINDOW',
            accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'},
        });
        platform.catalogLicenses.push(license);platform.catalogProjectIds.push(title.id);ids.add(title.id);
        player.world.streamingRightsContracts![license.id]=createStreamingRightsContractFromLicense({license,
            buyer:{type:'PLAYER_PLATFORM',id:platform.identity!.slug,name:platform.identity!.name,platformId:null},
            guaranteeDisposition:'PAID',settledAtAbsoluteWeek:week});
    }
    if(ids.size!==titleCount||platform.catalogLicenses.length!==titleCount)throw new Error(`Expected ${titleCount} distinct licensed titles; got ${ids.size}.`);
    return {player,session};
};
