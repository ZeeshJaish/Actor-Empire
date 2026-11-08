import {
    BUILTIN_CHARACTER_ALIASES,
    BUILTIN_PERSON_ALIASES,
    BUILTIN_PERSON_IDENTITIES,
    BUILTIN_PROJECT_ALIASES,
} from './fictionalNameCatalog';
import { PACK_TALENT_ALIASES } from './packTalentAliases';

// 2: the global talent packs and creator list get satire stand-ins too, so saves rename those people once.
export const BUILTIN_NAME_VERSION = 2;
const own = <T>(record: Readonly<Record<string, T>>, name: string): T | undefined =>
    Object.prototype.hasOwnProperty.call(record, name) ? record[name] : undefined;
const key = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const reverse = (entries: Readonly<Record<string, string>>) => new Map(
    Object.entries(entries).flatMap(([canonical, display]) => [[key(canonical), canonical], [key(display), canonical]]),
);
const people = reverse({ ...PACK_TALENT_ALIASES, ...BUILTIN_PERSON_ALIASES });
const projects = reverse(BUILTIN_PROJECT_ALIASES);
const characters = reverse(BUILTIN_CHARACTER_ALIASES);

export const canonicalPersonName = (name: string) => people.get(key(name)) || name;
export const fictionalPersonName = (name: string) => {
    const canonical = canonicalPersonName(name);
    return own(BUILTIN_PERSON_ALIASES, canonical) || own(PACK_TALENT_ALIASES, canonical) || name;
};
/** Global-pack actors (mod_actor_<pack>_<n>) and creators (yt_global_<name>): built in, but with no identity row. */
export const isPackPersonId = (id: unknown): id is string => typeof id === 'string' && /^(mod_actor_|yt_global_)/.test(id);
export const canonicalProjectTitle = (title: string): string => {
    const direct = projects.get(key(title));
    if (direct) return direct;
    const season = title.match(/^(.*?)(:\s*Season\s+\d+|\s+\(Series\))$/i);
    return season ? canonicalProjectTitle(season[1]) + season[2] : title;
};
export const fictionalProjectTitle = (title: string): string => {
    const canonical = canonicalProjectTitle(title);
    const direct = own(BUILTIN_PROJECT_ALIASES, canonical);
    if (direct) return direct;
    const season = title.match(/^(.*?)(:\s*Season\s+\d+|\s+\(Series\))$/i);
    return season ? fictionalProjectTitle(season[1]) + season[2] : title;
};
export const canonicalCharacterName = (name: string) => characters.get(key(name)) || name;
export const fictionalCharacterName = (name: string) => own(BUILTIN_CHARACTER_ALIASES, canonicalCharacterName(name)) || name;
export const isBuiltinPersonId = (id: unknown): id is string => typeof id === 'string' && Object.prototype.hasOwnProperty.call(BUILTIN_PERSON_IDENTITIES, id);
export const isProjectablePersonId = (id: unknown): id is string => isBuiltinPersonId(id) || isPackPersonId(id);
export const builtinPersonNameForId = (id: string) => fictionalPersonName(own(BUILTIN_PERSON_IDENTITIES, id) || '');
const handleSlug = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const fictionalHandle = (canonicalName: string, oldHandle: string): string => {
    const name = fictionalPersonName(canonicalName);
    if (name === canonicalName) return oldHandle;
    const current = handleSlug(oldHandle);
    // Pack handles were cut with accents dropped ("@pedroalmodvar"), the catalogue's with accents folded ("almodovar").
    const original = [handleSlug(canonicalName), canonicalName.toLowerCase().replace(/[^a-z0-9]/g, '')]
        .find(slug => slug && current.startsWith(slug));
    if (!original) return oldHandle;
    const suffix = current.slice(original.length);
    // Only regenerate issued automatic handles; retain custom edits and meaningful name digits.
    if (suffix && !/^\d+$/.test(suffix)) return oldHandle;
    return '@' + handleSlug(name) + suffix;
};

/** Applies to issued built-ins and global-pack people. Custom edits and imported content keep their names. */
export const projectBuiltinPerson = <T extends { id: string; name: string; handle?: string }>(person: T): T => {
    const canonical = own(BUILTIN_PERSON_IDENTITIES, person.id);
    if (!canonical) {
        // Pack actors and creators have no identity row: a saved real name moves to its stand-in once.
        if (!isPackPersonId(person.id)) return person;
        const real = canonicalPersonName(person.name);
        const name = own(PACK_TALENT_ALIASES, real);
        if (!name || name === person.name) return person;
        const handle = person.handle ? fictionalHandle(real, person.handle) : person.handle;
        return { ...person, name, ...(person.handle ? { handle } : {}) };
    }
    if (person.name !== canonical && person.name !== fictionalPersonName(canonical)) return person;
    const name = fictionalPersonName(canonical);
    const handle = person.handle ? fictionalHandle(canonical, person.handle) : person.handle;
    if (name === person.name && handle === person.handle) return person;
    return { ...person, name, ...(person.handle ? { handle } : {}) };
};

const textPairs: Record<string, string> = {
    ...Object.fromEntries(Object.entries(BUILTIN_PERSON_ALIASES).filter(([name]) => name.includes(' ') || name.length >= 7)),
    ...Object.fromEntries(Object.entries(BUILTIN_PROJECT_ALIASES).filter(([title]) => title.length >= 8)),
    ...BUILTIN_CHARACTER_ALIASES,
};
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const textPattern = new RegExp(
    '(^|[^\\p{L}\\p{N}])(' + Object.keys(textPairs).sort((a, b) => b.length - a.length).map(escape).join('|') + ')(?![\\p{L}\\p{N}])', 'gu',
);
/** Only for built-in narrative templates, never player text or imported pack content. */
export const fictionalBuiltinText = (text: string) => text.replace(textPattern, (_match, prefix: string, name: string) => prefix + (own(textPairs, name) || name));
