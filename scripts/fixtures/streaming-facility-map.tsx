/** Read-only controlled capacity states; no player or persistence APIs. */
import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../styles/fonts.css';
import '../../components/studio-finance/styles/tokens.css';
import '../../components/studio-finance/styles/studio-finance.css';
import {FacilityCapacityPanel} from '../../components/studio-finance/components/build/FacilityCapacityPanel';
const width=new URLSearchParams(location.search).get('width')==='320'?320:430;
const cases=[{name:'Comfortable',demand:4_400_000,capacity:75_500_000,burst:23_000_000},{name:'Near limit',demand:85,capacity:100,burst:20},{name:'Burst required',demand:110,capacity:100,burst:20},{name:'Shortfall',demand:125,capacity:100,burst:20},{name:'Empty',demand:0,capacity:0,burst:0}];
createRoot(document.getElementById('root')!).render(<main className="sf" style={{width,maxWidth:'100%',height:'auto',minHeight:0,padding:16,overflow:'visible'}}>{cases.map(item=><div key={item.name}><FacilityCapacityPanel totals={item} expectedPeak={item.demand}/></div>)}</main>);
