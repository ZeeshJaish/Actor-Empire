/* 20 Nov 2026 (Recovery Mode "Minified React error #300" on 1.0.29): the Production House screen open while the player's
   last studio goes away must show "Studio not available", not fail. Bundled for a browser by
   qa/2026-11-20-hotfix4/studio-gone-test.cjs; the page reports what happened on window.__result. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import { ProductionHouseGame } from '../views/lifestyle/business/ProductionHouseGame';

const errors: string[] = [];
class Catch extends React.Component<{ children: React.ReactNode }, { failed: string | null }> {
    state = { failed: null as string | null };
    static getDerivedStateFromError(error: Error) { return { failed: String(error?.message || error) }; }
    componentDidCatch(error: Error) { errors.push(String(error?.message || error)); }
    render() { return this.state.failed ? <div data-failed>{this.state.failed}</div> : (this as unknown as { props: { children: React.ReactNode } }).props.children; }
}
const base = structuredClone(INITIAL_PLAYER) as Player;
const studio = createBusiness('Test Pictures', 'PRODUCTION_HOUSE', 'INDIE_STUDIO' as never, { quality: 'STANDARD', pricing: 'MARKET', marketing: 'MEDIUM' } as never, '', base.currentWeek, base.age) as Business;
const withStudio: Player = { ...base, businesses: [studio] };
const withoutStudio: Player = { ...base, businesses: [] };
const mount = document.getElementById('root')!;
const root = createRoot(mount);
const draw = (player: Player) => flushSync(() => root.render(
    <Catch><ProductionHouseGame player={player} onBack={() => {}} onUpdatePlayer={() => {}} /></Catch>,
));
const run = async () => {
    const result: Record<string, unknown> = {};
    try {
        draw(withStudio);
        await new Promise(resolve => setTimeout(resolve, 300));
        result.withStudio = { failed: mount.querySelector('[data-failed]')?.textContent || null, missing: !!mount.querySelector('[data-studio-missing]'), text: (mount.textContent || '').slice(0, 80) };
        draw(withoutStudio);
        await new Promise(resolve => setTimeout(resolve, 300));
        result.studioGone = { failed: mount.querySelector('[data-failed]')?.textContent || null, missing: !!mount.querySelector('[data-studio-missing]') };
        draw(withStudio);
        await new Promise(resolve => setTimeout(resolve, 300));
        result.studioBack = { failed: mount.querySelector('[data-failed]')?.textContent || null, missing: !!mount.querySelector('[data-studio-missing]') };
    } catch (error) { result.thrown = String((error as Error)?.message || error); }
    result.errors = errors;
    (window as unknown as { __result: unknown }).__result = result;
};
void run();
