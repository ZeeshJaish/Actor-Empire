/** Physical representation only. Gameplay/export always receive a complete Player. */
const KIND = 'ACTOR_EMPIRE_PLAYER_BLOCKS';
const TAG = '$actorSaveValue';
const BLOCK_MIN_CHARS = 64 * 1024;
type Field = {kind:'inline'; value:unknown} | {kind:'blob'; checksum:string; blob:Blob}
    | {kind:'fields'; fields:Array<[string,Field]>};
export interface BlockPlayer {
    kind: typeof KIND;
    formatVersion: 1;
    checksum: string;
    fields: Array<[string,Field]>;
}
export class SavePayloadCorruptionError extends Error {}
class UnsupportedSaveValue extends Error {}
const own = (value:object,key:PropertyKey) => Object.prototype.hasOwnProperty.call(value,key);
const define = (value:object,key:string,item:unknown) => Object.defineProperty(value,key,{value:item,writable:true,enumerable:true,configurable:true});

// Versioned accidental-corruption checksum, not an authentication/security token.
const checksum = (text:string):string => {
    let first=0x811c9dc5,second=0x9e3779b9;
    for(let i=0;i<text.length;i++){
        const code=text.charCodeAt(i);
        first=Math.imul(first^code,0x01000193);
        second=Math.imul(second^(code+i),0x85ebca6b);
    }
    return (first>>>0).toString(16).padStart(8,'0')+(second>>>0).toString(16).padStart(8,'0');
};
const needsTaggedValues=(value:unknown,ancestors=new Set<object>()):boolean=>{
    if(value===undefined||typeof value==='bigint')return true;
    if(typeof value==='function'||typeof value==='symbol')throw new UnsupportedSaveValue('Non-cloneable value');
    if(typeof value==='number')return !Number.isFinite(value)||Object.is(value,-0);
    if(!value||typeof value!=='object')return false;
    if(value instanceof Date)return true;
    const proto=Object.getPrototypeOf(value),array=Array.isArray(value);
    if(!array&&proto!==Object.prototype&&proto!==null)throw new UnsupportedSaveValue('Keep native structured-clone value');
    if(ancestors.has(value))throw new UnsupportedSaveValue('Keep native cyclic references');
    const keys=Object.keys(value);
    if(array&&keys.some(key=>String(Number(key))!==key||Number(key)<0||Number(key)>=value.length))throw new UnsupportedSaveValue('Keep named array properties');
    if(own(value,TAG)||array&&keys.length!==value.length)return true;
    ancestors.add(value);
    try{for(const key of keys)if(needsTaggedValues((value as any)[key],ancestors))return true;return false;}
    finally{ancestors.delete(value);}
};
/** Native JSON handles ordinary world rows without a callback for every scalar.
 * Use tagged encoding only for sections that actually require it. */
export const serializeSaveBlock = (value:unknown):string => {
    if(!needsTaggedValues(value))return JSON.stringify(value);
    return JSON.stringify(value,function(key,item){
    const original=this[key];
    if(original===undefined)return {[TAG]:Array.isArray(this)&&!own(this,key)?'hole':'undefined'};
    if(typeof original==='number'){
        if(Object.is(original,-0))return {[TAG]:'number',value:'-0'};
        if(!Number.isFinite(original))return {[TAG]:'number',value:String(original)};
    }
    if(original instanceof Date)return {[TAG]:'date',value:Number.isNaN(original.getTime())?null:original.toISOString()};
    if(typeof original==='bigint')return {[TAG]:'bigint',value:String(original)};
    if(typeof original==='function'||typeof original==='symbol')throw new UnsupportedSaveValue('Non-cloneable value');
    if(original&&typeof original==='object'){
        const proto=Object.getPrototypeOf(original);
        if(!Array.isArray(original)&&proto!==Object.prototype&&proto!==null)throw new UnsupportedSaveValue('Keep native structured-clone value');
        if(typeof original.toJSON==='function')throw new UnsupportedSaveValue('Custom JSON conversion');
        if(own(original,TAG))return {[TAG]:'object',entries:Object.entries(original)};
    }
    return item;
    });
};
export const parseSaveBlock = (text:string):unknown => {
    if(!text.includes('"'+TAG+'"'))return JSON.parse(text);
    const undefinedValue=Symbol('undefined'),hole=Symbol('hole');
    const result=JSON.parse(text,(_key,item)=>{
        if(!item||typeof item!=='object')return item;
        for(const key of Object.keys(item)){
            if(item[key]===undefinedValue)define(item,key,undefined);
            else if(item[key]===hole){if(!Array.isArray(item))throw new SavePayloadCorruptionError('Invalid sparse field');delete item[key];}
        }
        if(!own(item,TAG))return item;
        switch(item[TAG]){
            case 'undefined':return undefinedValue;
            case 'hole':return hole;
            case 'date':return new Date(item.value===null?NaN:item.value);
            case 'bigint':return BigInt(item.value);
            case 'number':
                if(item.value==='-0')return -0;
                if(item.value==='NaN')return NaN;
                if(item.value==='Infinity')return Infinity;
                if(item.value==='-Infinity')return -Infinity;
                break;
            case 'object':return Object.fromEntries(item.entries);
        }
        throw new SavePayloadCorruptionError('Unknown encoded value');
    });
    return result===undefinedValue?undefined:result;
};
export const isBlockPlayer = (value:unknown):value is BlockPlayer => Boolean(value&&typeof value==='object'
    &&(value as BlockPlayer).kind===KIND);
const metadata = (field:Field):unknown => {
    if(field.kind==='inline')return {kind:'inline',value:field.value};
    if(field.kind==='blob'&&field.blob instanceof Blob)return {kind:'blob',checksum:field.checksum,bytes:field.blob.size};
    if(field.kind==='fields'&&Array.isArray(field.fields))return {kind:'fields',fields:field.fields.map(([key,value])=>[key,metadata(value)])};
    throw new SavePayloadCorruptionError('Invalid payload field');
};
const rootChecksum=(fields:BlockPlayer['fields'])=>checksum(serializeSaveBlock(fields.map(([key,value])=>[key,metadata(value)])));
const priorBlobs = (value:unknown):Map<string,Blob> => {
    const result=new Map<string,Blob>();
    const visit=(field:Field)=>{
        if(field?.kind==='blob'&&field.blob instanceof Blob)result.set(field.checksum,field.blob);
        else if(field?.kind==='fields'&&Array.isArray(field.fields))for(const row of field.fields)if(Array.isArray(row))visit(row[1]);
    };
    if(isBlockPlayer(value)&&Array.isArray(value.fields))for(const row of value.fields)if(Array.isArray(row))visit(row[1]);
    return result;
};

export const packSavePlayer = async <T extends object>(player:T,previous?:unknown):Promise<T|BlockPlayer> => {
    if(typeof Blob!=='function'||typeof Blob.prototype.text!=='function')return player;
    const prior=priorBlobs(previous);let count=0;
    const pack=async(value:unknown):Promise<Field>=>{
        const text=serializeSaveBlock(value);
        if(text.length<BLOCK_MIN_CHARS)return {kind:'inline',value};
        const digest=checksum(text);let blob=prior.get(digest);
        // A checksum only selects a candidate: exact stored bytes decide reuse.
        if(blob){try{if(await blob.text()!==text)blob=undefined;}catch{blob=undefined;}}
        if(!blob)blob=new Blob([text],{type:'application/x-actor-save-block+json'});
        count++;return {kind:'blob',checksum:digest,blob};
    };
    try{
        const fields:BlockPlayer['fields']=[];
        for(const [key,value] of Object.entries(player)){
            if((key==='world'||key==='flags')&&value&&typeof value==='object'&&!Array.isArray(value)){
                const children:Array<[string,Field]>=[];
                for(const [name,child] of Object.entries(value))children.push([name,await pack(child)]);
                fields.push([key,{kind:'fields',fields:children}]);
            }else fields.push([key,await pack(value)]);
        }
        return count?{kind:KIND,formatVersion:1,fields,checksum:rootChecksum(fields)}:player;
    }catch(error){if(error instanceof UnsupportedSaveValue)return player;throw error;}
};

type ReadBlocks=Map<string,{text:string;checksum:string;value:unknown}>;
const unpack = async (value:unknown,blocks:ReadBlocks):Promise<unknown> => {
    if(!isBlockPlayer(value))return value;
    try{
        if(value.formatVersion!==1||!Array.isArray(value.fields)||rootChecksum(value.fields)!==value.checksum)throw Error('Payload root checksum mismatch');
        const unpackFields=async(fields:Array<[string,Field]>,path:string[]=[]):Promise<Record<string,unknown>>=>{
            const result:Record<string,unknown>={},seen=new Set<string>();
            for(const row of fields){
                if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||seen.has(row[0]))throw Error('Invalid/duplicate payload key');
                const [key,field]=row;seen.add(key);let child:unknown;
                if(field.kind==='inline')child=field.value;
                else if(field.kind==='fields')child=await unpackFields(field.fields,[...path,key]);
                else if(field.kind==='blob'&&field.blob instanceof Blob){
                    const text=await field.blob.text();
                    const identity=JSON.stringify([...path,key]),cached=blocks.get(identity);
                    // The actual stored bytes must match exactly. No checksum-
                    // only reuse, and no sharing equal values at different paths.
                    if(cached&&cached.checksum===field.checksum&&cached.text===text)child=cached.value;
                    else{
                        if(checksum(text)!==field.checksum)throw Error('Payload block checksum mismatch');
                        child=parseSaveBlock(text);blocks.set(identity,{text,checksum:field.checksum,value:child});
                    }
                }else throw Error('Invalid payload block');
                define(result,key,child);
            }
            return result;
        };
        return await unpackFields(value.fields);
    }catch(error){throw new SavePayloadCorruptionError(error instanceof Error?error.message:'Unreadable save payload');}
};
export const unpackSavePlayer=(value:unknown):Promise<unknown>=>unpack(value,new Map());

const materialize = async (record:unknown,blocks:ReadBlocks):Promise<any> => {
    if(isBlockPlayer(record))return unpack(record,blocks);
    if(record&&typeof record==='object'&&(record as any).kind==='ACTOR_EMPIRE_SAVE_GENERATION'){
        return {...record,player:await unpack((record as any).player,blocks)};
    }
    return record;
};
export const materializeSaveRecord=(record:unknown):Promise<any>=>materialize(record,new Map());
/** Private verification callers only: do not mutate/hand out decoded values
 * during the batch. Public gameplay reads always use a fresh decoder. */
export const createImmutableSaveRecordReadBatch=()=>{
    const blocks:ReadBlocks=new Map();return(record:unknown)=>materialize(record,blocks);
};
