import type {Player} from '../types';
import {BUILTIN_NAME_VERSION,builtinPersonNameForId,fictionalPersonName,fictionalProjectTitle,fictionalCharacterName,isBuiltinPersonId,projectBuiltinPerson} from './fictionalNames';
import {BUILTIN_UNIVERSE_IDENTITIES} from './fictionalNameCatalog';

const UNIVERSES = new Set(Object.keys(BUILTIN_UNIVERSE_IDENTITIES));
type Scope = {project?:boolean;universe?:string;roster?:string;personId?:string};
const personName = (id:unknown,name:unknown):unknown => {
    if (!isBuiltinPersonId(id) || typeof name !== 'string') return name;
    return projectBuiltinPerson({id,name}).name;
};

/** One bounded load-time projection. Identity keys, ledgers, receipts and custom content stay intact. */
export const migrateBuiltinNames = (player: Player): Player => {
    if (Number(player.flags?.builtinNameVersion) >= BUILTIN_NAME_VERSION) return player;
    const visit = (value:any, scope:Scope = {}):any => {
        if (!value || typeof value !== 'object') return value;
        if (Array.isArray(value)) {
            const next=value.map(row=>visit(row,scope));
            return next.some((row,i)=>row!==value[i])?next:value;
        }
        let next=value;
        const put=(field:string,replacement:any)=>{
            if (replacement===value[field]) return;
            if (next===value) next={...value};
            next[field]=replacement;
        };
        const id=[value.npcId,value.actorId,value.sourceNpcId,value.id,scope.personId].find(isBuiltinPersonId);
        if (id && typeof value.name==='string') {
            const projected=projectBuiltinPerson({...value,id});
            put('name',projected.name);
            if (value.handle) put('handle',projected.handle);
        }
        for (const role of ['actor','leadActor','director','writer','producer','owner','investor','author','npc','sender','creator','talent','composer']) {
            const field=`${role}Name`;
            const roleId=value[`${role}Id`] || value[`${role}NpcId`] || (role==='actor'||role==='npc'?id:undefined);
            put(field,personName(roleId,value[field]));
            const handleField=`${role}Handle`;
            if(isBuiltinPersonId(roleId) && typeof value[handleField]==='string') {
                const projected=projectBuiltinPerson({id:roleId,name:typeof value[field]==='string'?value[field]:builtinPersonNameForId(roleId),handle:value[handleField]});
                put(handleField,projected.handle);
            }
        }
        const project=scope.project || value.isFamous===true || value.projectDetails?.isFamous===true || value.project?.isFamous===true
            || (typeof value.id==='string' && /^(famous_|uni_proj_|uni_offer_)/.test(value.id));
        if(project){
            for(const field of ['name','title','projectName']) if(typeof value[field]==='string' && !id) put(field,fictionalProjectTitle(value[field]));
            if(typeof value.directorName==='string' && !value.directorId) put('directorName',fictionalPersonName(value.directorName));
            const characters=BUILTIN_UNIVERSE_IDENTITIES[value.universeId]?.characters;
            if(characters && Object.values(characters).includes(value.characterName)) put('characterName',fictionalCharacterName(value.characterName));
        }
        if(scope.universe && value.name===BUILTIN_UNIVERSE_IDENTITIES[scope.universe]?.name) put('name',fictionalCharacterName(value.name));
        if(scope.roster){
            const characterId=String(value.characterId || value.id || '').replace(new RegExp(`^${scope.roster}_`,'i'),'').toLowerCase();
            const name=BUILTIN_UNIVERSE_IDENTITIES[scope.roster]?.characters[characterId];
            if(name && value.name===name) put('name',fictionalCharacterName(name));
        }
        for (const [field,child] of Object.entries(value)) {
            if(!child || typeof child!=='object') continue;
            // Signed cinema settlement snapshots and imported-pack receipts are immutable facts.
            if(['cinema','cinemaMarket','cinemaRecognition','cinemaCastRecognition','modHistory','installedMods','externalFunding','finance'].includes(field)
                || /ledger|receipt|settlement|agreement|journal|transaction|licen[cs]e|payment/i.test(field)) continue;
            const childScope:Scope={
                project:project && ['project','projectDetails','films','universeContract'].includes(field),
                roster:scope.universe && field==='roster'?scope.universe:undefined,
                personId:isBuiltinPersonId(field)?field:undefined,
            };
            put(field,visit(child,childScope));
        }
        return next;
    };
    // Deliberately exclude financial/world ledgers, imported receipts and arbitrary player prose.
    const next:any={...player,flags:{...player.flags,builtinNameVersion:BUILTIN_NAME_VERSION}};
    for(const field of ['relationships','commitments','activeReleases','pastProjects','weeklyOpportunities','outsideProductions','applications','talentNegotiations','inbox','studio','instagram','youtube']) {
        if((player as any)[field]) next[field]=visit((player as any)[field]);
    }
    next.businesses=player.businesses.map(b=>b.studioState?{...b,studioState:visit(b.studioState)}:b);
    for(const field of ['extraNPCs','dynastyCareerArchives','dynastyCareer']) {
        if(player.flags?.[field]) next.flags[field]=visit(player.flags[field]);
    }
    if(player.activeUniverseContract && UNIVERSES.has(player.activeUniverseContract.universeId)) {
        next.activeUniverseContract=visit(player.activeUniverseContract,{project:true});
    }
    const world:any={...player.world};
    for(const field of ['projects','upcomingRivals','talentCareer','industryProductions','awardHistory']) {
        if((player.world as any)[field]) world[field]=visit((player.world as any)[field]);
    }
    world.universes=Object.fromEntries(Object.entries(player.world.universes || {}).map(([id,universe])=>[id,UNIVERSES.has(id)?visit(universe,{universe:id}):universe]));
    next.world=world;
    return next;
};
