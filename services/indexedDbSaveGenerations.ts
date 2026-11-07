import type {Player} from '../types';
import type {SaveGenerationStore, SaveGenerationKeys, StoredSaveGeneration, WriteVerifiedGenerationInput} from './saveGenerations';
import {verifySaveIntegrity, type SaveIntegrityManifest} from './saveIntegrity';
import {waitForIndexedDbTransaction} from './indexedDbResilience';
import {packSavePlayer, materializeSaveRecord, createImmutableSaveRecordReadBatch, SavePayloadCorruptionError} from './savePayloadBlocks';

/** Keep async Blob reads inside the locked snapshot; mutations run in an active
 * IDB request callback, including on WebKit. The existing transaction timeout
 * still aborts stalled work. No preflight-only or cached verification token. */
const prepareInTransaction=(store:IDBObjectStore,prepare:()=>Promise<()=>void>):void=>{
    let ready:(()=>void)|undefined,failed=false;
    void prepare().then(commit=>{ready=commit;},()=>{failed=true;});
    const tick=()=>{
        const request=store.count('__actor_save_transaction_lifetime__');
        request.onsuccess=()=>{
            if(failed){store.transaction.abort();return;}
            if(ready){try{ready();}catch{store.transaction.abort();}return;}
            tick();
        };
    };
    tick();
};
const readSnapshot=(store:IDBObjectStore,keys:readonly string[],done:(values:any[])=>void)=>{
    const values:any[]=new Array(keys.length);let pending=keys.length;
    for(let index=0;index<keys.length;index++){
        const request=store.get(keys[index]);request.onsuccess=()=>{values[index]=request.result??null;if(--pending===0)done(values);};
    }
};
const generation=(player:unknown,manifest:unknown):unknown=>({kind:'ACTOR_EMPIRE_SAVE_GENERATION',formatVersion:1,player,manifest,needsRecoveryCheckpoint:false});
const valid=(player:unknown,manifest:unknown):boolean=>{
    if(!player||typeof player!=='object'||typeof (player as Player).id!=='string'||typeof (player as Player).name!=='string'||!manifest)return false;
    try{return verifySaveIntegrity(player as Player,manifest as SaveIntegrityManifest).ok;}catch{return false;}
};
const materializeOrInvalid=async(record:unknown,decode=materializeSaveRecord)=>{
    try{return await decode(record);}catch(error){
        if(error instanceof SavePayloadCorruptionError)return {kind:'ACTOR_EMPIRE_INVALID_PAYLOAD',message:error.message};
        throw error;
    }
};

export const createIndexedDbSaveGenerationStore=(openDB:()=>Promise<IDBDatabase>,name:string,
    options:{blockPayloads?:boolean}={}):SaveGenerationStore=>{
    const readRaw=async(keys:readonly string[])=>{
        const db=await openDB();try{
            const tx=db.transaction(name,'readonly'),requests=keys.map(key=>tx.objectStore(name).get(key));
            await waitForIndexedDbTransaction(tx,{operation:'read verified save snapshot'});
            return requests.map(request=>request.result??null);
        }finally{db.close();}
    };
    const readMany=async(keys:readonly string[])=>{
        const raw=await readRaw(keys),result:unknown[]=[];
        for(const value of raw)result.push(await materializeOrInvalid(value));
        return result;
    };
    const mutate=async(operation:string,start:(store:IDBObjectStore)=>void)=>{
        const db=await openDB();try{
            const tx=db.transaction(name,'readwrite');
            // Attach handlers before any user data can throw or abort.
            const completion=waitForIndexedDbTransaction(tx,{operation});
            try{start(tx.objectStore(name));}catch{tx.abort();}
            await completion;
        }finally{db.close();}
    };
    const promote=(keys:SaveGenerationKeys[],retainPrevious=true,expected:Record<string,string>={})=>mutate('promote verified save generations',store=>{
        readSnapshot(store,keys.flatMap(k=>[k.current,k.integrity,k.candidate]),raw=>{
            prepareInTransaction(store,async()=>{
                const decode=createImmutableSaveRecordReadBatch();
                const verified:Array<{keys:SaveGenerationKeys;current:unknown;manifest:unknown;candidate:any;keep:boolean}>=[];
                for(let index=0;index<keys.length;index++){
                    const [current,manifest,candidate]=raw.slice(index*3,index*3+3);
                    const materialized=await decode(candidate) as StoredSaveGeneration|null;
                    if(!materialized||materialized.kind!=='ACTOR_EMPIRE_SAVE_GENERATION'||materialized.formatVersion!==1||!valid(materialized.player,materialized.manifest))throw Error('Stored candidate failed independent promotion verification');
                    if(Object.prototype.hasOwnProperty.call(expected,keys[index].current)&&materialized.manifest.digest!==expected[keys[index].current])throw Error('Stored candidate no longer matches the requested generation');
                    const old=retainPrevious?await materializeOrInvalid(current,decode):null;
                    verified.push({keys:keys[index],current,manifest,candidate,keep:retainPrevious&&valid(old,manifest)});
                }
                return ()=>{
                    for(const item of verified){
                        if(item.keep)store.put(generation(item.current,item.manifest),item.keys.previous);
                        store.put(item.candidate.player,item.keys.current);
                        store.put(item.candidate.manifest,item.keys.integrity);
                        store.delete(item.keys.candidate);
                    }
                };
            });
        });
    });
    const writeVerifiedGeneration=({keys,generation:next,retainPrevious,expectedCandidateDigest}:WriteVerifiedGenerationInput)=>mutate('write and verify atomic save generation',store=>{
        const writeCurrent=(current:unknown,manifest:unknown,keep:boolean)=>{
            if(keep)store.put(generation(current,manifest),keys.previous);
            store.put(next.player,keys.current);
            store.put(next.manifest,keys.integrity);
            // These reads see the actual serialized writes inside this same
            // transaction. Any failure aborts current/header/backup together;
            // no intermediate generation is visible to another reader.
            readSnapshot(store,[keys.current,keys.integrity],raw=>{
                prepareInTransaction(store,async()=>{
                    const stored=await materializeSaveRecord(raw[0]);
                    if(!valid(stored,raw[1]))throw Error('Stored current failed independent read-back verification');
                    if((raw[1] as SaveIntegrityManifest).digest!==expectedCandidateDigest)throw Error('Stored current no longer matches the requested generation');
                    return ()=>{store.delete(keys.candidate);};
                });
            });
        };
        if(!retainPrevious){writeCurrent(null,null,false);return;}
        readSnapshot(store,[keys.current,keys.integrity],raw=>{
            prepareInTransaction(store,async()=>{
                const old=await materializeOrInvalid(raw[0]);
                const keep=valid(old,raw[1]);
                return ()=>writeCurrent(raw[0],raw[1],keep);
            });
        });
    });
    return {
        read:async key=>(await readMany([key]))[0],readMany,
        // Physical block transport remains an opt-in experiment on its existing
        // staging path. Production keeps exactly the same plain current layout.
        ...(options.blockPayloads?{}:{writeVerifiedGeneration}),
        write:async(key,value)=>{
            let physical=value;
            // Opt-in transport experiment: measured steady-state writes have
            // not established a speed benefit. Production keeps its old layout.
            if(options.blockPayloads&&value&&typeof value==='object'&&(value as any).kind==='ACTOR_EMPIRE_SAVE_GENERATION'){
                const record=value as StoredSaveGeneration;
                const currentKey=key.endsWith('__candidate')?key.slice(0,-'__candidate'.length):null;
                const previous=currentKey?(await readRaw([currentKey]))[0]:null;
                physical={...record,player:await packSavePlayer(record.player,previous)};
            }
            await mutate('write save record '+key,store=>{store.put(physical,key);});
        },
        remove:key=>mutate('remove save record '+key,store=>{store.delete(key);}),
        promoteGeneration:({keys,retainPrevious,expectedCandidateDigest})=>promote([keys],retainPrevious,
            expectedCandidateDigest?Object.fromEntries([[keys.current,expectedCandidateDigest]]):{}),
        promoteGenerationBatch:({keys,expectedCandidateDigests})=>promote(keys,true,expectedCandidateDigests),
        recoverGeneration:({keys})=>mutate('recover verified save generation',store=>{
            readSnapshot(store,[keys.current,keys.integrity,keys.previous],raw=>{
                prepareInTransaction(store,async()=>{
                    const previous=await materializeSaveRecord(raw[2]) as StoredSaveGeneration|null;
                    if(!previous||previous.kind!=='ACTOR_EMPIRE_SAVE_GENERATION'||!valid(previous.player,previous.manifest))throw Error('Stored previous failed recovery verification');
                    return ()=>{
                        store.put({player:raw[0],manifest:raw[1],quarantinedAt:Date.now()},keys.quarantine);
                        store.put(raw[2].player,keys.current);store.put(raw[2].manifest,keys.integrity);
                    };
                });
            });
        }),
    };
};
