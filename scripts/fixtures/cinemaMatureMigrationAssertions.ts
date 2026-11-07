import assert from 'node:assert/strict';
import type {CastMember} from '../../types';

/** Existing story meanings remain protected. The production migration explicitly
 * promotes AUTO provenance to CANON for a universe; that tag alone is metadata.
 */
export const assertMatureCastMigrationPreserved=(before:CastMember,after:CastMember|undefined,universeId?:string)=>{
    assert.ok(after,'A saved cast credit cannot disappear');
    for(const key of ['storyFunction','storyRole','abilityType','nature','identitySource'] as const){
        if(before[key]===undefined)continue;
        if(key==='identitySource'&&universeId&&before.identitySource==='AUTO'&&after.identitySource==='CANON')continue;
        assert.deepEqual(after[key],before[key]);
    }
};
