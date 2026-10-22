import type { SaveGenerationStore, StoredSaveGeneration } from '../../services/saveGenerations';
/** Test adapter for the real generation coordinator; promotion/recovery are atomic map swaps. */
export class CinemaMemorySaveStore implements SaveGenerationStore {
    records=new Map<string,unknown>();
    failPromotion=false;
    async read(key:string){const value=this.records.get(key);return value===undefined?null:structuredClone(value)}
    async write(key:string,value:unknown){this.records.set(key,structuredClone(value))}
    async remove(key:string){this.records.delete(key)}
    async promoteGeneration({keys,retainPrevious}:Parameters<SaveGenerationStore['promoteGeneration']>[0]){
        if(this.failPromotion)throw new Error('Injected promotion failure');
        const candidate=this.records.get(keys.candidate) as StoredSaveGeneration;if(!candidate)throw new Error('Missing candidate');
        const next=new Map(this.records),current=this.records.get(keys.current),manifest=this.records.get(keys.integrity);
        if(retainPrevious && current && manifest)next.set(keys.previous,{kind:candidate.kind,formatVersion:candidate.formatVersion,player:structuredClone(current),manifest:structuredClone(manifest),needsRecoveryCheckpoint:false});
        next.set(keys.current,structuredClone(candidate.player));next.set(keys.integrity,structuredClone(candidate.manifest));next.delete(keys.candidate);this.records=next;
    }
    async recoverGeneration({keys}:Parameters<SaveGenerationStore['recoverGeneration']>[0]){
        const previous=this.records.get(keys.previous) as StoredSaveGeneration;if(!previous)throw new Error('Missing previous');
        const next=new Map(this.records);next.set(keys.current,structuredClone(previous.player));next.set(keys.integrity,structuredClone(previous.manifest));this.records=next;
    }
    async promoteGenerationBatch(){throw new Error('Unused batch adapter')}
}
export const cinemaLegacyIntegrityHash=(value:unknown):string=>{
    const serialize=(v:unknown):string=>v===undefined||v===null?'null':typeof v==='string'?JSON.stringify(v):typeof v==='number'?Number.isFinite(v)?String(v):'null':typeof v==='boolean'?String(v):Array.isArray(v)?`[${v.map(serialize).join(',')}]`:`{${Object.keys(v as object).sort().map(k=>`${JSON.stringify(k)}:${serialize((v as Record<string,unknown>)[k])}`).join(',')}}`;
    let a=0x811c9dc5,b=0x9e3779b9;const text=serialize(value);for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),0x01000193);b=Math.imul(b^(text.charCodeAt(i)+i),0x85ebca6b)}
    return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
};
