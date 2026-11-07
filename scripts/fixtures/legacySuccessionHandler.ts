import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Player } from '../../types';
import { INITIAL_PLAYER } from '../../types';
import * as legacy from '../../services/legacyLogic';
import { getStreamingEstate, handoffOwnedStreamingPlatformToHeir, type StreamingHandoffChoice } from '../../services/streamingLegacy';
import { migratePlayerSave } from '../../services/saveMigration';
const ts: typeof import('typescript') = createRequire(process.cwd() + '/package.json')('typescript');
const source = readFileSync('App.tsx', 'utf8');
const handler = source.slice(source.indexOf('const handleContinueAsChild ='), source.indexOf('const handleEventComplete ='));
const body = ts.transpileModule(handler + '\nhandleContinueAsChild(child, choice); return captured();', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
/** The real App handoff with only slot-storage and React sinks captured. */
export function continueThroughAppHandler(player: Player, child: any, choice?: StreamingHandoffChoice): Player {
    let result: Player | undefined;
    const noop = () => {};
    const deps: Record<string, any> = { ...legacy, player, child, choice, INITIAL_PLAYER, handoffOwnedStreamingPlatformToHeir, getStreamingEstate, migratePlayerSave,
        clone: structuredClone, tr: (key: string) => key, syncCurrentSlotSnapshot: noop, setPlayer: (p: Player) => { result = p; },
        setGameStatus: noop, setActivePage: noop, Page: { HOME: 'HOME' }, captured: () => result };
    return new Function(...Object.keys(deps), body)(...Object.values(deps));
}
