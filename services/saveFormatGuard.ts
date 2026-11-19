/* Phase 1 of the week-speed plan (2026-11-17): the format guard (the plan's rule 4), on today's A/B save.

   Every slot gets a small marker record beside its save (`actorEmpireSave_N__format`): the save format the slot
   holds, and the oldest reader that can open it. This build writes format 1 and reads formats 1 and 2 (Phase 2a, the
   reader release: SAVE_READER_GENERATION below). A later build that writes a format this build cannot read (Phase 3's
   v6) raises the marker past it, and from then on this build:
   - lists the slot even if it holds no A/B copy, so a new career never lands on top of it;
   - says "saved by a newer version, please update" instead of opening it;
   - never writes to it: a save, a staged or promoted week, an import, an entitlement sync, a recovery and a slot
     delete all refuse (services/saveGenerations.ts).
   Builds before this one (1.0.28 and older) do not know the marker, so a release that writes a new format must not
   reach players who could still roll back to them (rule 3: readers first, rollback builds from Phase 1 or later).

   Not here: a commit counter that rises with every save (the plan's commitSeq). Nothing in Phase 1 reads it (the
   purchase ledger compares save times instead), and a counter would add a write to every save; Phase 3's writer
   keeps one in its own head. */

/** The format this build writes. */
export const SAVE_FORMAT_GENERATION = 1;
/** The newest format this build reads. Week-speed Phase 2a, the reader release (2026-11-19): this build reads every
 *  shape of format 2 while it still writes format 1. Format 2 = 2b's face table (saveFaceTable.ts), cinema receipt v2,
 *  transfer v2, and the cinema audience cells stored packed (debt plan v2, boxOffice/boxOfficeCellStorage.ts). The build
 *  that first writes any of them marks the slot format 2, reader 2, so this build still opens it. */
export const SAVE_READER_GENERATION = 2;
/** The oldest reader generation that can open a slot of each format. */
export const MIN_READER_FOR_FORMAT: Readonly<Record<number, number>> = { 1: 1, 2: 2 };
export const SLOT_FORMAT_SUFFIX = '__format';

export interface SlotFormatMarker {
    kind: 'ACTOR_EMPIRE_SLOT_FORMAT';
    /** The newest format this slot holds. */
    formatGeneration: number;
    /** The oldest reader generation that can open (and so write) this slot. */
    minReaderGeneration: number;
    /** The app version that wrote this marker (support only). */
    writtenBy: string;
    at: number;
}

export const slotFormatKey = (currentKey: string): string => `${currentKey}${SLOT_FORMAT_SUFFIX}`;

export const isSlotFormatMarker = (value: unknown): value is SlotFormatMarker => Boolean(
    value
    && typeof value === 'object'
    && (value as SlotFormatMarker).kind === 'ACTOR_EMPIRE_SLOT_FORMAT'
    && Number.isFinite(Number((value as SlotFormatMarker).minReaderGeneration))
    && Number.isFinite(Number((value as SlotFormatMarker).formatGeneration)),
);

/** No marker (a slot an older build wrote) or a marker this build can read. */
export const thisBuildCanOpen = (marker: SlotFormatMarker | null): boolean =>
    !marker || Number(marker.minReaderGeneration) <= SAVE_READER_GENERATION;

export const createSlotFormatMarker = (writtenBy: string): SlotFormatMarker => ({
    kind: 'ACTOR_EMPIRE_SLOT_FORMAT',
    formatGeneration: SAVE_FORMAT_GENERATION,
    /* the oldest reader of what this build writes, not the newest format it can read */
    minReaderGeneration: MIN_READER_FOR_FORMAT[SAVE_FORMAT_GENERATION],
    writtenBy,
    at: Date.now(),
});

export class NewerSaveFormatError extends Error {
    constructor(key: string) {
        super(`This career was saved by a newer version of Actor Empire. Update the game to open it; nothing was changed. (${key})`);
        this.name = 'NewerSaveFormatError';
    }
}
