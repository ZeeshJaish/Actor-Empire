import assert from 'node:assert/strict';
import {stableSaveHash} from '../services/stableSaveHash';
import {issuedSaveHash} from './fixtures/issuedSaveHashReference';
const sparse=Array(3);sparse[1]='middle';
const vectors:unknown[]=[null,undefined,true,false,0,-0,123.5,NaN,Infinity,'','a','\u0000\b\t\n\f\r\\"','😀','\ud800','\udc00',[],{},[undefined,null,()=>{}],sparse,{z:undefined,a:1,b:[{name:'A',amount:1.25}]},new Date(0),123n];
for(const value of vectors)assert.equal(stableSaveHash(value),issuedSaveHash(value),'issued hash compatibility for '+String(value));
let state=91;const random=()=>{state=Math.imul(state,1664525)+1013904223|0;return(state>>>0)/2**32};
const create=(depth:number):any=>{const kind=Math.floor(random()*(depth?6:4));if(kind===0)return Math.floor(random()*1e9)/100;if(kind===1)return ['US','IN','quoted"','😀','\u0001','same-key'][Math.floor(random()*6)];if(kind===2)return random()<.5;if(kind===3)return random()<.5?null:undefined;if(kind===4)return Array.from({length:Math.floor(random()*8)},()=>create(depth-1));return Object.fromEntries(Array.from({length:Math.floor(random()*8)},(_,i)=>['key-'+i,create(depth-1)]))};
for(let i=0;i<1000;i++){const value=create(4);assert.equal(stableSaveHash(value),issuedSaveHash(value),'seeded compatibility '+i)}
console.log(JSON.stringify({passed:vectors.length+1000,hashOutputUnchanged:true}));
