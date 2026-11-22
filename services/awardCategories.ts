/* 22 Nov 2026 (Zeesh: "we try to have everything as per the real world"): every award category's rules in one place.

   The four shows' lists follow the real ceremonies wherever the game has the data to fill a category honestly:
   - Golden Globes: Drama and Musical or Comedy are separate for pictures and lead performances (film and TV), with
     Animated, Non-English Language, Cinematic and Box Office Achievement, Director, Screenplay, supporting roles;
   - Emmys: lead and supporting performances, directing and writing, each split into drama and comedy series;
   - Oscars and BAFTA: Animated, International / Not in the English Language, Visual Effects, Cinematography,
     Screenplay.
   Crafts the game has no people for (editing, costume, make-up, sound, production design) are left out rather than
   given to invented names.

   Every other file reads a category through getAwardCategorySpec, never by guessing from words in its name: "Best
   Actress - Motion Picture" is an acting award even though it says "Picture", and "Outstanding Directing for a Drama
   Series" is a directing award even though it says "Series". */
import type { AwardType } from '../types';

export type AwardCategoryKind =
    | 'PICTURE' | 'BOX_OFFICE' | 'ACTING' | 'DIRECTOR' | 'SCREENPLAY' | 'CINEMATOGRAPHY' | 'VFX' | 'SCORE' | 'SONG';

/** What a title must be to fit: a drama (anything but a comedy), a musical or comedy, animated, or not in English. */
export type AwardCategoryField = 'DRAMA' | 'COMEDY' | 'ANIMATED' | 'NON_ENGLISH';

export interface AwardCategorySpec {
    kind: AwardCategoryKind;
    media: 'MOVIE' | 'SERIES';
    field?: AwardCategoryField;
    gender?: 'MALE' | 'FEMALE';
    role?: 'LEAD' | 'SUPPORTING';
}

export const AWARD_CATEGORY_LISTS: Record<AwardType, string[]> = {
    OSCAR: [
        'Best Picture', 'Best Director',
        'Best Actor', 'Best Actress',
        'Best Supporting Actor', 'Best Supporting Actress',
        'Best Original Screenplay', 'Best Animated Feature', 'Best International Feature',
        'Best Cinematography', 'Best Visual Effects',
        'Best Original Song', 'Best Score',
    ],
    BAFTA: [
        'Best Film', 'Best Director',
        'Best Actor', 'Best Actress',
        'Best Supporting Actor', 'Best Supporting Actress',
        'Best Original Screenplay', 'Best Film Not in the English Language', 'Best Animated Film',
        'Best Cinematography', 'Best Special Visual Effects', 'Best Score',
    ],
    GOLDEN_GLOBE: [
        'Best Motion Picture - Drama', 'Best Motion Picture - Musical or Comedy',
        'Best Motion Picture - Animated', 'Best Motion Picture - Non-English Language',
        'Cinematic and Box Office Achievement',
        'Best Director - Motion Picture', 'Best Screenplay - Motion Picture',
        'Best Actor - Motion Picture Drama', 'Best Actress - Motion Picture Drama',
        'Best Actor - Motion Picture Musical or Comedy', 'Best Actress - Motion Picture Musical or Comedy',
        'Best Supporting Actor - Motion Picture', 'Best Supporting Actress - Motion Picture',
        'Best Original Song', 'Best Score',
        'Best TV Series - Drama', 'Best TV Series - Musical or Comedy',
        'Best Actor - TV Series Drama', 'Best Actress - TV Series Drama',
        'Best Actor - TV Series Musical or Comedy', 'Best Actress - TV Series Musical or Comedy',
        'Best Supporting Actor - Television', 'Best Supporting Actress - Television',
    ],
    EMMY: [
        'Outstanding Drama Series', 'Outstanding Comedy Series',
        'Outstanding Lead Actor in a Drama Series', 'Outstanding Lead Actress in a Drama Series',
        'Outstanding Lead Actor in a Comedy Series', 'Outstanding Lead Actress in a Comedy Series',
        'Outstanding Supporting Actor in a Drama Series', 'Outstanding Supporting Actress in a Drama Series',
        'Outstanding Supporting Actor in a Comedy Series', 'Outstanding Supporting Actress in a Comedy Series',
        'Outstanding Directing for a Drama Series', 'Outstanding Directing for a Comedy Series',
        'Outstanding Writing for a Drama Series', 'Outstanding Writing for a Comedy Series',
        'Outstanding Original Song', 'Outstanding Score',
    ],
};

/** Names used before 22 Nov 2026. A ceremony frozen with them (a save made before the update) still plays out with
    them; new ballots never use them. */
export const AWARD_RETIRED_CATEGORIES: Record<AwardType, string[]> = {
    OSCAR: [],
    BAFTA: [],
    GOLDEN_GLOBE: ['Best Actor - Motion Picture', 'Best Actress - Motion Picture', 'Best Actor - TV Series', 'Best Actress - TV Series'],
    EMMY: ['Outstanding Lead Actor', 'Outstanding Lead Actress', 'Outstanding Supporting Actor', 'Outstanding Supporting Actress'],
};

const specCache = new Map<string, AwardCategorySpec>();

/** A category's rules, read from its name once (the same answer for old and new names). */
export const getAwardCategorySpec = (category: string, awardType?: AwardType | string | null): AwardCategorySpec => {
    const key = `${awardType || ''}::${category}`;
    const cached = specCache.get(key);
    if (cached) return cached;
    const name = String(category || '');
    const media: AwardCategorySpec['media'] = awardType === 'EMMY' || /^Outstanding\b|Series|Television|\bTV\b/.test(name)
        ? 'SERIES' : 'MOVIE';
    const field: AwardCategoryField | undefined = /Comedy|Musical or/.test(name) ? 'COMEDY'
        : /Animated/.test(name) ? 'ANIMATED'
            : /Non-English|International|Not in the English/.test(name) ? 'NON_ENGLISH'
                : /Drama/.test(name) ? 'DRAMA' : undefined;
    const gender = /Actress/.test(name) ? 'FEMALE' as const : /\bActor\b/.test(name) ? 'MALE' as const : undefined;
    let spec: AwardCategorySpec;
    if (gender) spec = { kind: 'ACTING', media, gender, role: /Supporting/.test(name) ? 'SUPPORTING' : 'LEAD', ...(field ? { field } : {}) };
    else if (/Direct/.test(name)) spec = { kind: 'DIRECTOR', media, ...(field ? { field } : {}) };
    else if (/Screenplay|Writing/.test(name)) spec = { kind: 'SCREENPLAY', media, ...(field ? { field } : {}) };
    else if (/Cinematograph/.test(name)) spec = { kind: 'CINEMATOGRAPHY', media };
    else if (/Visual Effects/.test(name)) spec = { kind: 'VFX', media };
    else if (/Box Office/.test(name)) spec = { kind: 'BOX_OFFICE', media };
    else if (/Score|Composition/i.test(name)) spec = { kind: 'SCORE', media };
    else if (/Song|Lyrics|Soundtrack|Trailer|Music Video/i.test(name)) spec = { kind: 'SONG', media };
    else spec = { kind: 'PICTURE', media, ...(field ? { field } : {}) };
    specCache.set(key, spec);
    return spec;
};

/** A title's award fields: Musical or Comedy (comedies, musicals and romances, as the Globes file them), animated,
    documentary, or drama (everything else, from thrillers to war films). */
export const getAwardGenreClass = (genre?: string | null): 'DRAMA' | 'COMEDY' | 'ANIMATED' | 'DOCUMENTARY' => {
    const value = String(genre || '').toUpperCase();
    if (value === 'COMEDY' || value === 'MUSICAL' || value === 'ROMANCE') return 'COMEDY';
    if (value === 'ANIMATION') return 'ANIMATED';
    if (value === 'DOCUMENTARY') return 'DOCUMENTARY';
    return 'DRAMA';
};

export interface AwardTitleFacts {
    mediaType: 'MOVIE' | 'SERIES';
    genre?: string | null;
    languageId?: string | null;
}

/** Whether a title can compete in a category at all (media, field, and the real rules: no performances, directing
    or cinematography for animated or documentary titles, no documentaries among the pictures). */
export const fitsAwardCategory = (spec: AwardCategorySpec, title: AwardTitleFacts): boolean => {
    if (spec.media !== title.mediaType) return false;
    const genreClass = getAwardGenreClass(title.genre);
    const english = !title.languageId || String(title.languageId).toLowerCase() === 'english';
    if (['ACTING', 'DIRECTOR', 'CINEMATOGRAPHY'].includes(spec.kind) && (genreClass === 'ANIMATED' || genreClass === 'DOCUMENTARY')) return false;
    if (['PICTURE', 'SCREENPLAY', 'VFX', 'BOX_OFFICE'].includes(spec.kind) && genreClass === 'DOCUMENTARY') return false;
    if (spec.field === 'COMEDY') return genreClass === 'COMEDY';
    if (spec.field === 'DRAMA') return genreClass === 'DRAMA';
    if (spec.field === 'ANIMATED') return genreClass === 'ANIMATED';
    if (spec.field === 'NON_ENGLISH') return !english;
    return true;
};

/** A title award (the work itself wins: picture, series, box office); everything else names a person. */
export const isAwardTitleCategory = (category: string, awardType?: AwardType | string | null): boolean => {
    const kind = getAwardCategorySpec(category, awardType).kind;
    return kind === 'PICTURE' || kind === 'BOX_OFFICE';
};

export const isAwardActingCategory = (category: string, awardType?: AwardType | string | null): boolean => (
    getAwardCategorySpec(category, awardType).kind === 'ACTING'
);

export const isAwardMusicCategory = (category: string, awardType?: AwardType | string | null): boolean => {
    const kind = getAwardCategorySpec(category, awardType).kind;
    return kind === 'SCORE' || kind === 'SONG';
};

/** The show's top prize: its first picture category (Best Picture, Best Film, Best Motion Picture - Drama, Outstanding
    Drama Series). */
export const getAwardTopPrizeCategory = (awardType: AwardType): string => (
    AWARD_CATEGORY_LISTS[awardType].find(category => getAwardCategorySpec(category, awardType).kind === 'PICTURE')
    || AWARD_CATEGORY_LISTS[awardType][0]
);

/**
 * The category a player's credit competes in at a show, or null when the show has none for it. A field-specific
 * category (Animated, Non-English Language, Musical or Comedy) is preferred over a general one, as a studio would
 * submit it.
 */
export const findAwardCategoryForTitle = (
    awardType: AwardType,
    want: { kind: AwardCategoryKind; gender?: 'MALE' | 'FEMALE'; role?: 'LEAD' | 'SUPPORTING' } & AwardTitleFacts,
): string | null => {
    const matches = AWARD_CATEGORY_LISTS[awardType].filter(category => {
        const spec = getAwardCategorySpec(category, awardType);
        if (spec.kind !== want.kind) return false;
        if (want.gender && spec.gender && spec.gender !== want.gender) return false;
        if (spec.kind === 'ACTING' && (spec.role || 'LEAD') !== (want.role || 'LEAD')) return false;
        return fitsAwardCategory(spec, want);
    });
    return matches.find(category => Boolean(getAwardCategorySpec(category, awardType).field)) || matches[0] || null;
};
