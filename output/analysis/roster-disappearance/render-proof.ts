import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER } from '../../../types';
import { createBusiness } from '../../../services/businessLogic';
import { createContract } from '../../../services/talentService';
import { generateNewUnknowns } from '../../../services/npcLogic';
import { StudioPage } from '../../../views/StudioPage';
const player=structuredClone(INITIAL_PLAYER);
const studio=createBusiness('Roster render QA','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',1);
player.businesses=[studio];
const actor={...generateNewUnknowns(1)[0],id:'qa-profile-lookup',name:'QA Visible Actor'};
const contract={...createContract(actor.id,'MOVIE_DEAL','UPFRONT',3,100000,100,1),studioId:studio.id};
player.studio.talentRoster=[contract];studio.studioState!.talentRoster=[contract];
for(const present of [true,false]){
 player.flags.extraNPCs=present?[actor]:[];
 const html=renderToStaticMarkup(React.createElement(StudioPage,{player,studioId:studio.id,onUpdatePlayer:()=>{},onBack:()=>{}})).replace(/<!--.*?-->/g,'');
 assert.ok(html.includes('Roster (1)'));
 assert.equal(html.includes('<h3 class="font-bold text-white">QA Visible Actor</h3>'),present);
 console.log(JSON.stringify({actorProfilePresent:present,actualRosterComponentCount:1,actualActorCardVisible:present,emptyStateVisible:html.includes('No talent signed yet')}));
}
console.log('PASS real StudioPage rendering reproduces count=1 with no actor card and no empty-state explanation.');
