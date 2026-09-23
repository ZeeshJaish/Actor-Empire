/* ============================================================================
   FIBRE — two layers, and a standard that will not hold still.

   The chip it is modelled on: a five-nanometre part is a generation, and then
   the same part gets twenty percent faster over its life because the benchmark
   improved. Two different kinds of progress, and a player should be able to
   spend on either.

     GENERATION  a real technology, researched once through the existing
                 pipeline — weeks, staff, money, a patent decision. It sets the
                 ceiling.

     LEVEL       where you sit under that ceiling. Cheap, repeatable, and the
                 grind. This is the benchmark improving at the same node.

   The two are balanced against each other by construction: **a generation at
   level 100 is worth exactly the next generation at level 0.** So grinding
   levels can never overtake a jump, and jumping can never escape the grind. A
   player pushing generations while leaving levels at five ends up in the same
   place as one doing the reverse, having spent differently to get there.

   Nothing here ever falls. Your level does not decay and your generation is
   permanent. What moves is `expectedStandard` — how good a stream has to be
   before anyone calls it good. Standing still is how you fall behind, not
   losing what you earned, which is the difference between upkeep and
   punishment.
   ========================================================================== */

export interface StreamingFibreGeneration {
  id: string;
  name: string;
  /** What this generation actually is, in a line. */
  line: string;
  /** Reach multiplier at level 0. */
  floor: number;
  /** Reach multiplier at the top level. Equal to the next generation's floor,
      which is the whole balance. */
  ceiling: number;
}

export const MAX_FIBRE_LEVEL = 100;

export const STREAMING_FIBRE_GENERATIONS: StreamingFibreGeneration[] = [
  { id: 'G1', name: 'Standard single-mode', line: 'What the landlord already ran into the building.', floor: 1.00, ceiling: 1.10 },
  { id: 'G2', name: 'Coherent DWDM', line: 'More colours of light down the same strand.', floor: 1.10, ceiling: 1.21 },
  { id: 'G3', name: 'Hollow-core', line: 'Light through air rather than glass, and faster for it.', floor: 1.21, ceiling: 1.32 },
  { id: 'G4', name: 'Multi-band amplified', line: 'Bands nobody else is lighting, amplified end to end.', floor: 1.32, ceiling: 1.43 },
  { id: 'G5', name: 'Photonic mesh', line: 'The network routes itself in light, without asking.', floor: 1.43, ceiling: 1.55 },
];

/* Every generation's ceiling must be the next one's floor, or the balance above
   is a claim rather than a fact. Checked here so it cannot drift during a
   tuning pass. */
(() => {
  const broken = STREAMING_FIBRE_GENERATIONS
    .slice(0, -1)
    .map((generation, index) => ({ generation, next: STREAMING_FIBRE_GENERATIONS[index + 1] }))
    .filter(({ generation, next }) => Math.abs(generation.ceiling - next.floor) > 1e-9)
    .map(({ generation, next }) => `${generation.id} tops out at ${generation.ceiling} but ${next.id} starts at ${next.floor}`);
  if (broken.length > 0) {
    throw new Error(`The fibre ladder has a step in it: ${broken.join('; ')}`);
  }
})();

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

export const getStreamingFibreGeneration = (id: string): StreamingFibreGeneration | undefined => (
  STREAMING_FIBRE_GENERATIONS.find(generation => generation.id === id)
);

/** Where a platform sits on the ladder. Two integers, and that is the whole
    save footprint. */
export interface StreamingFibreState {
  /** 0-based index into the generations. */
  generation: number;
  /** 0..MAX_FIBRE_LEVEL within that generation. */
  level: number;
}

export const DEFAULT_FIBRE_STATE: StreamingFibreState = { generation: 0, level: 0 };

/** Reach multiplier for a position on the ladder. Linear inside a generation,
    because the interesting non-linearity is the cost of the levels, not their
    effect — a player should be able to read "ten more levels" as "the same
    again", and feel the price rise instead. */
export function fibreMultiplier(state: StreamingFibreState | undefined | null): number {
  const generationIndex = clamp(Math.round(state?.generation ?? 0), 0, STREAMING_FIBRE_GENERATIONS.length - 1);
  const generation = STREAMING_FIBRE_GENERATIONS[generationIndex];
  const level = clamp(Math.round(state?.level ?? 0), 0, MAX_FIBRE_LEVEL);
  return generation.floor + (generation.ceiling - generation.floor) * (level / MAX_FIBRE_LEVEL);
}

/** What the next step up the ladder is worth, so a screen can price it honestly
    rather than saying "improves reach". */
export function nextFibreStep(state: StreamingFibreState): {
  kind: 'LEVEL' | 'GENERATION' | 'MAXED';
  from: number;
  to: number;
} {
  const here = fibreMultiplier(state);
  if (state.level < MAX_FIBRE_LEVEL) {
    return { kind: 'LEVEL', from: here, to: fibreMultiplier({ ...state, level: state.level + 1 }) };
  }
  if (state.generation < STREAMING_FIBRE_GENERATIONS.length - 1) {
    return { kind: 'GENERATION', from: here, to: fibreMultiplier({ generation: state.generation + 1, level: 0 }) };
  }
  return { kind: 'MAXED', from: here, to: here };
}

/* --- what a level costs -----------------------------------------------------

   Levels are the grind, so the curve has to be in the price rather than in the
   effect: ten more levels always buy the same reach, and always cost more than
   the ten before. A player should feel the bill rise, not squint at a
   diminishing bar.

   Buying the level is not the whole cost. Holding it is weekly, and it rises
   with the level, so "how high can I afford to sit" is a real question and a
   maxed ladder is something you must keep paying for rather than something you
   finish. */

/* Calibrated against the generation beside it, because the first numbers made
   the grind pointless: taking G1 from level 0 to 100 cost $205M to reach ×1.10,
   and researching Coherent DWDM cost $24M all-in to reach the same ×1.10. The
   grind was strictly dominated and no one would ever have touched it.

   The relationship that makes both worth having:

     - the first levels are cheap enough to buy before you could dream of
       affording a generation, which is what makes them the early-game answer
     - a FULL climb of a generation's levels costs about half again what the
       next generation costs outright, which is a fair premium for not having
       to wait six weeks and find the staff
     - holding a high level is dearer weekly than running a generation, so the
       top of a generation is somewhere you visit rather than somewhere you sit

   Full run 0 -> 100 lands near $36M against Coherent DWDM's $24M. */
const LEVEL_BASE_COST = 40_000;
const LEVEL_COST_SLOPE = 520;
const LEVEL_COST_CURVE = 1.6;
/** Per level, per week. */
const LEVEL_WEEKLY_HOLD = 1_500;

/** What the next single level costs, from where you are. */
export function fibreLevelCost(level: number): number {
  const next = clamp(Math.round(level), 0, MAX_FIBRE_LEVEL - 1) + 1;
  return Math.round((LEVEL_BASE_COST + LEVEL_COST_SLOPE * Math.pow(next, LEVEL_COST_CURVE)) / 1_000) * 1_000;
}

/** What a run of levels costs, because buying one at a time a hundred times is
    not a decision, it is a chore. */
export function fibreLevelRunCost(fromLevel: number, count: number): { levels: number; cost: number } {
  let level = clamp(Math.round(fromLevel), 0, MAX_FIBRE_LEVEL);
  let cost = 0;
  let levels = 0;
  while (levels < count && level < MAX_FIBRE_LEVEL) {
    cost += fibreLevelCost(level);
    level += 1;
    levels += 1;
  }
  return { levels, cost };
}

/** The weekly bill for sitting where you are. */
export function fibreWeeklyHoldCost(state: StreamingFibreState | undefined | null): number {
  return Math.round(clamp(Math.round(state?.level ?? 0), 0, MAX_FIBRE_LEVEL) * LEVEL_WEEKLY_HOLD);
}

/** Buy levels, if the treasury can carry it. Returns what was actually bought,
    so a caller that offered ten and could afford six says six. */
export function buyFibreLevels(
  state: StreamingFibreState,
  count: number,
  treasury: number,
): { state: StreamingFibreState; levels: number; cost: number } {
  let level = clamp(Math.round(state.level), 0, MAX_FIBRE_LEVEL);
  let cost = 0;
  let levels = 0;
  while (levels < count && level < MAX_FIBRE_LEVEL) {
    const step = fibreLevelCost(level);
    if (cost + step > treasury) break;
    cost += step;
    level += 1;
    levels += 1;
  }
  return { state: { ...state, level }, levels, cost };
}

/* --- the standard that moves ------------------------------------------------

   A market is READY when the best room reaching it clears this bar. It was a
   constant 0.55 and it is now a slow climb, because the thing that makes a
   network obsolete is not the network getting worse.

   Measured against a fixed twenty-city network that is never touched again:

       standard 0.55  ->  94.5% of the audience
       standard 0.61  ->  85.7%
       standard 0.70  ->  80.4%

   and the same network on G5 fibre holds 95.9% at 0.70. So fourteen points of
   coverage are the price of standing still, and the ladder is what buys them
   back. Each generation is worth about five years of drift.

   It is a pure function of weeks elapsed: no saved state, nothing to migrate,
   and a save written before this existed reads the launch standard and behaves
   exactly as it did. */

export const FIBRE_STANDARD_AT_LAUNCH = 0.55;
export const FIBRE_STANDARD_CEILING = 0.70;
/** Per year. Fifteen years from launch to the ceiling. */
const FIBRE_STANDARD_CLIMB = 0.01;

export function expectedStandard(weeksElapsed: number): number {
  const years = Math.max(0, weeksElapsed) / 52;
  return clamp(FIBRE_STANDARD_AT_LAUNCH + FIBRE_STANDARD_CLIMB * years, FIBRE_STANDARD_AT_LAUNCH, FIBRE_STANDARD_CEILING);
}

/** How the bar is doing, for a screen that has to explain why last year's
    network is not good enough this year. */
export function standardReadout(weeksElapsed: number): { now: number; inFiveYears: number; atCeiling: boolean } {
  const now = expectedStandard(weeksElapsed);
  return {
    now,
    inFiveYears: expectedStandard(weeksElapsed + 5 * 52),
    atCeiling: now >= FIBRE_STANDARD_CEILING - 1e-9,
  };
}

/** Save-shape guard. Two integers, clamped, with a deterministic default —
    the house pattern for a field older saves will not carry. */
export function normalizeStreamingFibreState(value: unknown): StreamingFibreState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_FIBRE_STATE };
  const source = value as Record<string, unknown>;
  const generation = Number(source.generation);
  const level = Number(source.level);
  return {
    generation: Number.isFinite(generation)
      ? clamp(Math.round(generation), 0, STREAMING_FIBRE_GENERATIONS.length - 1) : 0,
    level: Number.isFinite(level) ? clamp(Math.round(level), 0, MAX_FIBRE_LEVEL) : 0,
  };
}
