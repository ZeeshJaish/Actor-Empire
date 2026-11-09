import type {Player} from '../types';
import type {SaveGenerationStore, SaveGenerationKeys, StoredSaveGeneration, WriteVerifiedGenerationInput} from './saveGenerations';
import {verifySaveIntegrity, type SaveIntegrityManifest} from './saveIntegrity';
import {waitForIndexedDbTransaction} from './indexedDbResilience';
import {packSavePlayer, materializeSaveRecord, createImmutableSaveRecordReadBatch, SavePayloadCorruptionError} from './savePayloadBlocks';

/* Lag round (2026-11-09): A/B save copies.

   Before: every save read the old current back (76 MB on a late career), checked it, wrote it
   again as `__previous`, wrote the new current and read that back: 2 reads, 2 writes, 2 checks.

   Now the two copies take turns. The new week goes into the slot that holds the older copy, is
   read back and checked, and a tiny `__head` record says which slot is the newest. The other copy
   stays on disk untouched, so a week costs 1 write, 1 read back and 1 check.

   - The physical keys are the old ones: `K` + `K__integrity` (slot CURRENT) and `K__previous`
     (slot PREVIOUS, a generation record). Without a head, or with newest CURRENT, the layout is
     exactly the old one. Readers always get the logical view: current = newest, previous = other.
   - The old live copy is trusted without reading it only when this session verified it (on load
     or by the read-back of its own write) and nothing has rewritten the head since. Otherwise it
     is read and checked as before, and a copy that fails never pushes out the good backup.
   - Every write is still read back and verified inside the same transaction, and the head flips
     in that transaction too: a crash or failure leaves both copies and the old head as they were. */
const HEAD_SUFFIX = '__head';
type SlotName = 'CURRENT' | 'PREVIOUS';
interface SaveHead {
    kind: 'ACTOR_EMPIRE_SAVE_HEAD';
    formatVersion: 1;
    newest: SlotName;
    /** Manifest digest of the copy in each slot, as written by this layer. */
    digests: Partial<Record<SlotName, string>>;
    /** Changes on every head write, so a session can tell its own last head from anyone else's. */
    token: string;
}
const isHead = (value: unknown): value is SaveHead => Boolean(value && typeof value === 'object'
    && (value as SaveHead).kind === 'ACTOR_EMPIRE_SAVE_HEAD' && (value as SaveHead).formatVersion === 1
    && ((value as SaveHead).newest === 'CURRENT' || (value as SaveHead).newest === 'PREVIOUS'));
const newToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const SUFFIXES = ['__integrity', '__previous', '__candidate', '__quarantine', HEAD_SUFFIX] as const;
const splitKey = (key: string): [string, string] => {
    for (const suffix of SUFFIXES) if (key.endsWith(suffix)) return [key.slice(0, -suffix.length), suffix];
    return [key, ''];
};
/** Keys whose meaning depends on the head. */
const LOGICAL_SUFFIXES = new Set(['', '__integrity', '__previous']);

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
    if(keys.length===0){
        // Stay inside the transaction: answer from a request callback, never synchronously.
        const request=store.count('__actor_save_transaction_lifetime__');request.onsuccess=()=>done([]);return;
    }
    const values:any[]=new Array(keys.length);let pending=keys.length;
    for(let index=0;index<keys.length;index++){
        const request=store.get(keys[index]);request.onsuccess=()=>{values[index]=request.result??null;if(--pending===0)done(values);};
    }
};
const generation=(player:unknown,manifest:unknown,needsRecoveryCheckpoint=false):unknown=>({kind:'ACTOR_EMPIRE_SAVE_GENERATION',formatVersion:1,player,manifest,needsRecoveryCheckpoint});
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
const digestOf=(manifest:unknown):string|undefined=>manifest&&typeof manifest==='object'&&typeof (manifest as SaveIntegrityManifest).digest==='string'
    ?(manifest as SaveIntegrityManifest).digest:undefined;
const isGenerationRecord=(value:unknown):value is {player:unknown;manifest:unknown;needsRecoveryCheckpoint?:boolean}=>Boolean(value&&typeof value==='object'
    &&(value as StoredSaveGeneration).kind==='ACTOR_EMPIRE_SAVE_GENERATION'&&(value as StoredSaveGeneration).player);
/** The head only counts when its newest slot really holds a generation record. */
const liveSlotOf=(head:SaveHead|null,previousRecord:unknown):SlotName=>head?.newest==='PREVIOUS'&&isGenerationRecord(previousRecord)?'PREVIOUS':'CURRENT';

/** Logical view inside one transaction: current/integrity/previous follow the head. */
const readLogical=(store:IDBObjectStore,keys:readonly string[],done:(values:unknown[],heads:Map<string,SaveHead|null>)=>void)=>{
    const families=[...new Set(keys.map(splitKey).filter(([,suffix])=>LOGICAL_SUFFIXES.has(suffix)).map(([base])=>base))];
    readSnapshot(store,families.map(base=>base+HEAD_SUFFIX),rawHeads=>{
        const heads=new Map(families.map((base,index)=>[base,isHead(rawHeads[index])?rawHeads[index] as SaveHead:null]));
        type Plan={kind:'plain'|'wrapperPlayer'|'wrapperManifest'|'pairAsGeneration';keys:string[]};
        const plans:Plan[]=keys.map(key=>{
            const [base,suffix]=splitKey(key),head=heads.get(base);
            if(!head||head.newest!=='PREVIOUS'||!LOGICAL_SUFFIXES.has(suffix))return {kind:'plain',keys:[key]};
            if(suffix==='')return {kind:'wrapperPlayer',keys:[base+'__previous',key]};
            if(suffix==='__integrity')return {kind:'wrapperManifest',keys:[base+'__previous',key]};
            return {kind:'pairAsGeneration',keys:[base,base+'__integrity',key]};
        });
        const physical=[...new Set(plans.flatMap(plan=>plan.keys))];
        readSnapshot(store,physical,values=>{
            const byKey=new Map(physical.map((key,index)=>[key,values[index]]));
            done(plans.map(plan=>{
                const first=byKey.get(plan.keys[0]);
                if(plan.kind==='plain')return first??null;
                if(plan.kind==='wrapperPlayer'||plan.kind==='wrapperManifest'){
                    // A head that points at a missing record falls back to the old layout.
                    if(!isGenerationRecord(first))return byKey.get(plan.keys[1])??null;
                    return (plan.kind==='wrapperPlayer'?first.player:first.manifest)??null;
                }
                const wrapper=byKey.get(plan.keys[2]);
                if(!isGenerationRecord(wrapper))return wrapper??null;
                const player=first,manifest=byKey.get(plan.keys[1]);
                return player==null?null:generation(player,manifest,Boolean((manifest as any)?.needsRecoveryCheckpoint));
            }),heads);
        });
    });
};

export const createIndexedDbSaveGenerationStore=(openDB:()=>Promise<IDBDatabase>,name:string,
    options:{blockPayloads?:boolean}={}):SaveGenerationStore=>{
    /** The live copy this session has verified, per save key, with the head token it saw then. */
    const verifiedLive=new Map<string,{digest:string;token:string|null}>();
    const seenHeadTokens=new Map<string,string|null>();
    const forget=(currentKeys:readonly string[])=>{for(const key of currentKeys){verifiedLive.delete(key);seenHeadTokens.delete(key);}};
    const readRaw=async(keys:readonly string[])=>{
        const db=await openDB();try{
            const tx=db.transaction(name,'readonly');let result:unknown[]=[];let heads=new Map<string,SaveHead|null>();
            readLogical(tx.objectStore(name),keys,(values,seen)=>{result=values;heads=seen;});
            await waitForIndexedDbTransaction(tx,{operation:'read verified save snapshot'});
            for(const [base,head] of heads)seenHeadTokens.set(base,head?.token??null);
            return result;
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
    const promote=(keys:SaveGenerationKeys[],retainPrevious=true,expected:Record<string,string>={})=>{
        forget(keys.map(k=>k.current));
        return mutate('promote verified save generations',store=>{
            readSnapshot(store,keys.map(k=>k.current+HEAD_SUFFIX),rawHeads=>{
                const heads=rawHeads.map(value=>isHead(value)?value as SaveHead:null);
                // The old live copy of each family: the PREVIOUS record when the head says so.
                readSnapshot(store,keys.flatMap((k,index)=>heads[index]?.newest==='PREVIOUS'?[k.previous,k.integrity,k.candidate,k.current]:[k.current,k.integrity,k.candidate,k.current+HEAD_SUFFIX]),raw=>{
                    prepareInTransaction(store,async()=>{
                        const decode=createImmutableSaveRecordReadBatch();
                        const verified:Array<{keys:SaveGenerationKeys;liveSlot:SlotName;live:unknown;manifest:unknown;candidate:any;keep:boolean}>=[];
                        for(let index=0;index<keys.length;index++){
                            const [first,manifest,candidate]=raw.slice(index*4,index*4+3);
                            const previousRecord=heads[index]?.newest==='PREVIOUS'?first:raw[index*4+3];
                            const liveSlot=liveSlotOf(heads[index],previousRecord);
                            const live=liveSlot==='PREVIOUS'?first:(heads[index]?.newest==='PREVIOUS'?raw[index*4+3]:first);
                            const materialized=await decode(candidate) as StoredSaveGeneration|null;
                            if(!materialized||materialized.kind!=='ACTOR_EMPIRE_SAVE_GENERATION'||materialized.formatVersion!==1||!valid(materialized.player,materialized.manifest))throw Error('Stored candidate failed independent promotion verification');
                            if(Object.prototype.hasOwnProperty.call(expected,keys[index].current)&&materialized.manifest.digest!==expected[keys[index].current])throw Error('Stored candidate no longer matches the requested generation');
                            let keep=false;
                            if(retainPrevious){
                                if(liveSlot==='PREVIOUS'){const old=await materializeOrInvalid(live,decode) as any;keep=isGenerationRecord(old)&&valid(old.player,old.manifest);}
                                else{const old=await materializeOrInvalid(live,decode);keep=valid(old,manifest);}
                            }
                            verified.push({keys:keys[index],liveSlot,live,manifest,candidate,keep});
                        }
                        return ()=>{
                            for(const item of verified){
                                const headKey=item.keys.current+HEAD_SUFFIX;
                                if(item.liveSlot==='PREVIOUS'&&!item.keep){
                                    // The live copy failed: it is replaced, and the older good copy in CURRENT stays.
                                    store.put(generation(item.candidate.player,item.candidate.manifest,item.candidate.needsRecoveryCheckpoint===true),item.keys.previous);
                                    store.put({kind:'ACTOR_EMPIRE_SAVE_HEAD',formatVersion:1,newest:'PREVIOUS',digests:{PREVIOUS:item.candidate.manifest.digest},token:newToken()} satisfies SaveHead,headKey);
                                }else{
                                    // Old layout. A live PREVIOUS copy is already where the backup belongs.
                                    if(item.keep&&item.liveSlot==='CURRENT')store.put(generation(item.live,item.manifest),item.keys.previous);
                                    store.put(item.candidate.player,item.keys.current);
                                    store.put(item.candidate.manifest,item.keys.integrity);
                                    store.delete(headKey);
                                }
                                store.delete(item.keys.candidate);
                            }
                        };
                    });
                });
            });
        });
    };
    const writeVerifiedGeneration=async({keys,generation:next,retainPrevious,expectedCandidateDigest}:WriteVerifiedGenerationInput)=>{
        const headKey=keys.current+HEAD_SUFFIX;let committed:{digest:string;token:string|null}|null=null;
        await mutate('write and verify atomic save generation',store=>{
            /** Writes the new generation into one slot, reads it back, checks it, then flips the head. */
            const writeSlot=(target:SlotName,head:SaveHead|null,kept:{slot:SlotName;digest:string}|null)=>{
                if(target==='CURRENT'){store.put(next.player,keys.current);store.put(next.manifest,keys.integrity);}
                else store.put(generation(next.player,next.manifest,next.needsRecoveryCheckpoint===true),keys.previous);
                // These reads see the actual serialized writes inside this same
                // transaction. Any failure aborts the slot, header and backup together;
                // no intermediate generation is visible to another reader.
                readSnapshot(store,target==='CURRENT'?[keys.current,keys.integrity]:[keys.previous],raw=>{
                    prepareInTransaction(store,async()=>{
                        let stored:unknown,manifest:unknown;
                        if(target==='CURRENT'){stored=await materializeSaveRecord(raw[0]);manifest=raw[1];}
                        else{const record=await materializeSaveRecord(raw[0]) as any;stored=record?.player;manifest=record?.manifest;}
                        if(!valid(stored,manifest))throw Error('Stored current failed independent read-back verification');
                        if(digestOf(manifest)!==expectedCandidateDigest)throw Error('Stored current no longer matches the requested generation');
                        return ()=>{
                            store.delete(keys.candidate);
                            if(target==='CURRENT'&&(!head||head.newest==='CURRENT')&&!kept){
                                // Nothing flips: the old layout stays exactly as it was.
                                if(head)store.delete(headKey);
                                committed={digest:expectedCandidateDigest,token:null};
                                return;
                            }
                            const nextHead:SaveHead={kind:'ACTOR_EMPIRE_SAVE_HEAD',formatVersion:1,newest:target,
                                digests:{...(kept?{[kept.slot]:kept.digest}:{}),[target]:expectedCandidateDigest},token:newToken()};
                            store.put(nextHead,headKey);
                            committed={digest:expectedCandidateDigest,token:nextHead.token};
                        };
                    });
                });
            };
            readSnapshot(store,[headKey,keys.integrity],rawHead=>{
                const head=isHead(rawHead[0])?rawHead[0] as SaveHead:null;
                const liveSlot:SlotName=head?.newest==='PREVIOUS'?'PREVIOUS':'CURRENT';
                const otherSlot:SlotName=liveSlot==='CURRENT'?'PREVIOUS':'CURRENT';
                if(!retainPrevious){writeSlot(liveSlot,head,null);return;}
                const liveDigest=liveSlot==='CURRENT'?digestOf(rawHead[1]):head?.digests?.PREVIOUS;
                const known=verifiedLive.get(keys.current);
                if(known&&liveDigest&&known.digest===liveDigest&&known.token===(head?.token??null)){
                    writeSlot(otherSlot,head,{slot:liveSlot,digest:liveDigest});return;
                }
                // Not proven by this session: read the live copy and check it, as the old path did.
                readSnapshot(store,liveSlot==='CURRENT'?[keys.current,keys.integrity]:[keys.previous],raw=>{
                    prepareInTransaction(store,async()=>{
                        let good=false,digest:string|undefined;
                        if(liveSlot==='CURRENT'){const old=await materializeOrInvalid(raw[0]);good=valid(old,raw[1]);digest=digestOf(raw[1]);}
                        else{const old=await materializeOrInvalid(raw[0]) as any;good=isGenerationRecord(old)&&valid(old.player,old.manifest);digest=digestOf(old?.manifest);}
                        // A live copy that fails never pushes out the good backup: the new save replaces it instead.
                        return ()=>good&&digest?writeSlot(otherSlot,head,{slot:liveSlot,digest}):writeSlot(liveSlot,head,null);
                    });
                });
            });
        });
        if(committed)verifiedLive.set(keys.current,committed);
    };
    return {
        read:async key=>(await readMany([key]))[0],readMany,
        // Physical block transport remains an opt-in experiment on its existing
        // staging path. Production keeps exactly the same plain current layout.
        ...(options.blockPayloads?{}:{writeVerifiedGeneration}),
        rememberVerifiedCurrent:(key:string,digest:string)=>{
            if(seenHeadTokens.has(key))verifiedLive.set(key,{digest,token:seenHeadTokens.get(key)??null});
        },
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
            const [base,suffix]=splitKey(key);
            if(suffix==='')forget([base]);
            // A plain write of a save key makes that copy the live one, as before heads existed.
            await mutate('write save record '+key,store=>{store.put(physical,key);if(suffix==='')store.delete(base+HEAD_SUFFIX);});
        },
        remove:key=>{
            const [base,suffix]=splitKey(key);
            if(suffix==='')forget([base]);
            return mutate('remove save record '+key,store=>{store.delete(key);if(suffix==='')store.delete(base+HEAD_SUFFIX);});
        },
        promoteGeneration:({keys,retainPrevious,expectedCandidateDigest})=>promote([keys],retainPrevious,
            expectedCandidateDigest?Object.fromEntries([[keys.current,expectedCandidateDigest]]):{}),
        promoteGenerationBatch:({keys,expectedCandidateDigests})=>promote(keys,true,expectedCandidateDigests),
        recoverGeneration:({keys})=>{
            forget([keys.current]);
            return mutate('recover verified save generation',store=>{
                readSnapshot(store,[keys.current+HEAD_SUFFIX,keys.current,keys.integrity,keys.previous],raw=>{
                    const head=isHead(raw[0])?raw[0] as SaveHead:null;
                    const [current,integrity,previous]=raw.slice(1);
                    const liveSlot=liveSlotOf(head,previous);
                    prepareInTransaction(store,async()=>{
                        if(liveSlot==='PREVIOUS'){
                            // The live copy is the PREVIOUS record; the backup is CURRENT + integrity.
                            const backup=await materializeSaveRecord(current);
                            if(!valid(backup,integrity))throw Error('Stored previous failed recovery verification');
                            return ()=>{
                                store.put({player:previous.player,manifest:previous.manifest,quarantinedAt:Date.now()},keys.quarantine);
                                // As before heads, both slots then hold the recovered copy.
                                store.put(generation(current,integrity),keys.previous);
                                store.delete(keys.current+HEAD_SUFFIX);
                            };
                        }
                        const recovered=await materializeSaveRecord(previous) as StoredSaveGeneration|null;
                        if(!recovered||recovered.kind!=='ACTOR_EMPIRE_SAVE_GENERATION'||!valid(recovered.player,recovered.manifest))throw Error('Stored previous failed recovery verification');
                        return ()=>{
                            store.put({player:current,manifest:integrity,quarantinedAt:Date.now()},keys.quarantine);
                            store.put(previous.player,keys.current);store.put(previous.manifest,keys.integrity);
                            store.delete(keys.current+HEAD_SUFFIX);
                        };
                    });
                });
            });
        },
    };
};
