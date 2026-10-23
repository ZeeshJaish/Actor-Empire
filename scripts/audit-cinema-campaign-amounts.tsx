import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CampaignStep} from '../views/lifestyle/business/release-strategy-transplant/CampaignStep';

const noop=()=>{};
const render=(budget:number,spent:number)=>renderToStaticMarkup(<CampaignStep
  cinema film={{title:'Small film',art:'drama',hue:28,tagline:'An independent film'}}
  positions={[]} selectedPositionId="EVENT" timelines={[]} selectedTimelineId="BALANCED"
  forecast={{score:0,label:'',openingRange:'',breakEvenChance:0,weekTwoDropRisk:0,streamingBidBoost:0,awardsVisibility:0,note:''}}
  soundtrack={{label:'',score:0,openingLift:0,trailerLift:0,mismatchRisk:0}}
  channels={[{id:'SOCIAL_DIGITAL',label:'Social / Digital',description:'',icon:'share',amount:spent}]}
  budget={budget} spent={spent} allocationStep={200}
  onSelectPosition={noop} onSelectTimeline={noop} onChangeChannel={noop} onContinue={noop} onBack={noop}
/>);
const small=render(2000,200);
assert.ok(small.includes('$2,000 AVAILABLE'),'A real $2,000 pool must remain visible');
assert.match(small,/data-testid="campaign-remaining">\$1,800</,'Remaining cash must preserve small allocation steps');
assert.match(small,/data-testid="channel-SOCIAL_DIGITAL-value">\$200</,'A paid $200 channel must remain visible');
assert.ok(!small.includes('$0.0M'),'Small budgets cannot look like a zero pool');
assert.ok(render(2_000_000,1_000_000).includes('$2.0M AVAILABLE'),'Large campaign totals retain compact money formatting');
assert.ok(render(0,0).includes('$0 AVAILABLE'),'Zero remains zero');
console.log('Campaign amount presentation: PASS (zero, small pool, paid channel, large pool)');
