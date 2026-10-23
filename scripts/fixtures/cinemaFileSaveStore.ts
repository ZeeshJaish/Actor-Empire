import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,renameSync,unlinkSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {serialize,deserialize} from 'node:v8';
import type {SaveGenerationStore,StoredSaveGeneration} from '../../services/saveGenerations';

type ValueRef={file:string};
type GenerationRef={generation:Omit<StoredSaveGeneration,'player'|'manifest'>;player:ValueRef;manifest:ValueRef};
type Ref=ValueRef|GenerationRef;

/** Audit-only disk adapter. Immutable values and an atomic index swap preserve
 * clone isolation/promotion semantics without retaining several worlds in RAM.
 * V8 serialization also preserves undefined/sparse arrays like structuredClone.
 */
export class CinemaFileSaveStore implements SaveGenerationStore {
    private records:Map<string,Ref>;
    private index:string;
    failPromotion=false;
    constructor(private directory:string){
        mkdirSync(directory,{recursive:true});this.index=join(directory,'index.json');
        this.records=new Map(existsSync(this.index)?JSON.parse(readFileSync(this.index,'utf8')):[]);
    }
    private value(value:unknown):ValueRef{
        const bytes=serialize(value),file=createHash('sha256').update(bytes).digest('hex')+'.bin',path=join(this.directory,file);
        if(!existsSync(path)){writeFileSync(path+'.next',bytes);renameSync(path+'.next',path)}
        return {file};
    }
    private resolve(ref:Ref|undefined):any{
        if(!ref)return null;
        return 'file' in ref?deserialize(readFileSync(join(this.directory,ref.file))):{
            ...ref.generation,player:this.resolve(ref.player),manifest:this.resolve(ref.manifest),
        };
    }
    private commit(next:Map<string,Ref>){
        writeFileSync(this.index+'.next',JSON.stringify([...next]));renameSync(this.index+'.next',this.index);this.records=next;
        const retained=new Set<string>();for(const ref of next.values())if('file' in ref)retained.add(ref.file);else{retained.add(ref.player.file);retained.add(ref.manifest.file)}
        for(const name of readdirSync(this.directory))if(name.endsWith('.bin')&&!retained.has(name))unlinkSync(join(this.directory,name));
    }
    async read(key:string){return this.resolve(this.records.get(key))}
    async readMany(keys:readonly string[]){const refs=keys.map(key=>this.records.get(key));return refs.map(ref=>this.resolve(ref))}
    async write(key:string,value:unknown){
        const v=value as StoredSaveGeneration;
        const ref:Ref=v?.kind==='ACTOR_EMPIRE_SAVE_GENERATION'&&v.player&&v.manifest?{
            generation:{kind:v.kind,formatVersion:v.formatVersion,needsRecoveryCheckpoint:v.needsRecoveryCheckpoint},
            player:this.value(v.player),manifest:this.value(v.manifest),
        }:this.value(value);
        const next=new Map(this.records);next.set(key,ref);this.commit(next);
    }
    async remove(key:string){const next=new Map(this.records);next.delete(key);this.commit(next)}
    async promoteGeneration({keys,retainPrevious}:Parameters<SaveGenerationStore['promoteGeneration']>[0]){
        if(this.failPromotion)throw new Error('Injected promotion failure');
        const candidate=this.records.get(keys.candidate);if(!candidate||!('generation' in candidate))throw new Error('Missing candidate');
        const next=new Map(this.records),current=next.get(keys.current),manifest=next.get(keys.integrity);
        if(retainPrevious&&current&&'file' in current&&manifest&&'file' in manifest)next.set(keys.previous,{
            generation:{...candidate.generation,needsRecoveryCheckpoint:false},player:current,manifest,
        });
        next.set(keys.current,candidate.player);next.set(keys.integrity,candidate.manifest);next.delete(keys.candidate);this.commit(next);
    }
    async recoverGeneration({keys}:Parameters<SaveGenerationStore['recoverGeneration']>[0]){
        const previous=this.records.get(keys.previous);if(!previous||!('generation' in previous))throw new Error('Missing previous');
        const next=new Map(this.records);next.set(keys.current,previous.player);next.set(keys.integrity,previous.manifest);this.commit(next);
    }
    async promoteGenerationBatch(){throw new Error('Unused batch adapter')}
}
