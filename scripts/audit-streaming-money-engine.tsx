/**
 * #104 The money engine and the offers' personalities (Zeesh, 2026-11-01: "चेंज द मॉडल में जो … बॉक्सेस आ रहे हैं वो बॉक्स
 * मुझे एकदम पसंद नहीं" … "गेम वाला भी फील आना चाहिए" … "तीनों का एक पर्सनैलिटी दे दे कि रेंट और बाय को … एक कलर ही
 * एसोसिएट करा दे … प्रॉपर गुड बटन बना दे"; plan §18.4, §18.10):
 *  - each way to earn has a character: its own colour, emblem, tag and voice, the same everywhere;
 *  - the engine: before a first choice an empty front door and the three to choose from; then the MAIN slot (crowned)
 *    and two side slots with a switch and "Make main"; read-only, no buttons;
 *  - Define the Launch's Pricing step and the Offer tab both show it (the 01/02/03 boxes, "Change model", "Extend your
 *    service" and the "Ways to earn" cards are gone).
 * Renders the engine with react-dom/server; the pages by their source. (~1 s)
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MoneyEngine, type MoneyEngineSlot } from '../components/streaming-transplant/MoneyEngine';
import { STREAMING_OFFER_ORDER, STREAMING_OFFER_PERSONALITY, StreamingOfferEmblem } from '../components/streaming-transplant/offerPersonality';

/* ── the characters ── */
const colours = STREAMING_OFFER_ORDER.map(offer => STREAMING_OFFER_PERSONALITY[offer].colour);
assert.equal(new Set(colours).size, 3, 'Three colours, one each');
assert.deepEqual(colours, ['#45b5de', '#ab94ff', '#eeac43'], 'The wizard\'s own three: sky for Subscription, violet for Free with ads, amber for Rent or buy');
for (const offer of STREAMING_OFFER_ORDER) {
    const persona = STREAMING_OFFER_PERSONALITY[offer];
    assert.ok(persona.tag && persona.pitch && persona.line, `${persona.name} has a tag, a voice and a line`);
    assert.match(renderToStaticMarkup(createElement(StreamingOfferEmblem, { offer })), /^<svg[\s\S]*<\/svg>$/, `${persona.name} has an emblem`);
}
console.log(`PASS characters: ${STREAMING_OFFER_ORDER.map(offer => `${STREAMING_OFFER_PERSONALITY[offer].name} (${STREAMING_OFFER_PERSONALITY[offer].tag}, ${STREAMING_OFFER_PERSONALITY[offer].colour})`).join(' · ')}`);

/* ── the engine ── */
const slot = (on: boolean, value: string | null, note: string, detail?: string): MoneyEngineSlot => ({ on, value, note, ...(detail ? { detail } : {}) });
const slots = {
    SUBSCRIPTION: slot(true, '$4.2M', 'a month, forecast', '2 plans · from $7.99 · 1 with ads'),
    ADS: slot(true, '$8.1M', 'a month, forecast', 'A break every 15 min'),
    STORE: slot(false, null, 'a month, forecast'),
};
const render = (props: Partial<Parameters<typeof MoneyEngine>[0]>) => renderToStaticMarkup(createElement(MoneyEngine, {
    main: 'ADS', slots, editable: true, onMain: () => undefined, onToggle: () => undefined, ...props,
}));

const first = render({ main: null });
assert.match(first, /Your money engine[\s\S]*Choose your front door[\s\S]*Subscription[\s\S]*Free with ads[\s\S]*Rent or buy/, 'Before a first choice: an empty front door and the three');
assert.match(first, /aria-label="Free with ads: Viewers watch free; the ads they see pay\. Make it your front door"/, 'Each is a button that says what it is');
assert.doesNotMatch(first, /MAIN<|Make main/, 'Nothing crowned yet');

const engine = render({});
assert.match(engine, /Your money engine[\s\S]*MAIN[\s\S]*Free with ads[\s\S]*\$8\.1M[\s\S]*A break every 15 min/, 'The MAIN slot: crowned, its name, its money, what it holds');
assert.match(engine, /style="--c:#ab94ff"/, 'The MAIN slot in its own colour');
assert.match(engine, /role="switch" aria-checked="true"[^>]*aria-label="Subscription: on"[\s\S]*Make Subscription your front door/,
    'A side slot that is on: its switch, and Make main');
assert.match(engine, /Rent or buy[\s\S]*>Off<[\s\S]*role="switch" aria-checked="false"[^>]*aria-label="Rent or buy: off"[\s\S]*Turn on/, 'A side slot that is off: Off, and Turn on');
assert.equal((engine.match(/Make main/g) ?? []).length, 2, 'Make main on both side slots, none on the main one');

const readOnly = render({ editable: false });
assert.doesNotMatch(readOnly, /role="switch"|Make main/, 'Read-only (the Offer tab before Change pricing): no switches, no Make main');
console.log('PASS engine: an empty front door to choose; then a crowned MAIN slot and two side slots with a switch and Make main; read-only shows no buttons');

/* ── the pages ── */
const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const pricing = source('components/studio-finance/components/launch/StepPricing.tsx');
assert.ok(pricing.includes('const engine = <MoneyEngine main={engineMain} editable') && pricing.includes('if (!selected) return <div className="pr-rebuild">{engine}</div>;'),
    'Define the Launch\'s Pricing step: the engine, first choice and after');
assert.ok(!pricing.includes('<CoreOfferPicker') && !pricing.includes('pr-included-offers'), 'No 01/02/03 boxes, no "Extend your service" switches');
assert.ok(!existsSync(resolve(process.cwd(), 'components/studio-finance/components/launch/CoreOfferPicker.tsx')), 'The boxes\' component is gone');
const offerTab = source('components/streaming-transplant/PlatformOffer.tsx');
assert.ok(/<MoneyEngine [^>]*main=\{core\} editable=\{editing\}/.test(offerTab) && !offerTab.includes('css.models'), 'The Offer tab: the same engine, editable while changing the offer');
const css = source('components/streaming-transplant/presentation/screens/Pricing/MoneyEngine.module.css');
for (const [needle, why] of [
    ['@keyframes me-crowned', 'a new crown plays its moment'], ['@keyframes me-sweep', 'the MAIN slot breathes'],
    ['.toggle.isOn i::after{transform:translateX(14px)', 'a switch that slides'], ['@media (prefers-reduced-motion:reduce)', 'still for reduced motion'],
] as const) assert.ok(css.includes(needle), why);
console.log('PASS pages: Define the Launch and the Offer tab both show the engine; the boxes, Change model, Extend your service and the old cards are gone');
console.log('done');
