import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import css from './StreamingPlus.module.css';
import { StreamingPlusIcon, StreamingPlusPreview } from './StreamingPlusParts';
import { STREAMING_PLUS_LATER, STREAMING_PLUS_TODAY } from '../../services/streamingPlusPack';
import {
    STREAMING_PLUS_SHEET_EVENT,
    STREAMING_PLUS_UNLOCKED_EVENT,
    type StreamingPlusSheetRequest,
} from '../../services/streamingPlusEvents';
import { getPremiumCatalogProducts } from '../../services/iapService';
import { trackGameEvent } from '../../services/firebaseService';

/* The one sheet (Zeesh, 2026-11-08): a moving preview, the store's own price, what the pack gives
   today, what comes later with no date, Buy and Restore pinned. Opened from every chip. And the
   level-up moment after buying: chips are gone at once, no restart. */

const isNativeStore = () => Capacitor.isNativePlatform() && ['ios', 'android'].includes(Capacitor.getPlatform());
const isDev = () => Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

let cachedPrice: string | null = null;
const loadStorePrice = async (): Promise<string | null> => {
    if (cachedPrice) return cachedPrice;
    if (!isNativeStore()) return isDev() ? '$7.99' : null;
    const products = await getPremiumCatalogProducts();
    cachedPrice = products.find(product => product.premiumProductId === 'streaming_plus')?.priceLabel || null;
    return cachedPrice;
};

export interface StreamingPlusHostProps {
    owned: boolean;
    onBuy: () => Promise<void> | void;
    onRestore: () => Promise<void> | void;
}

export const StreamingPlusSheet: React.FC<{
    request: StreamingPlusSheetRequest;
    owned: boolean;
    onClose: () => void;
    onBuy: () => Promise<void> | void;
    onRestore: () => Promise<void> | void;
}> = ({ request, owned, onClose, onBuy, onRestore }) => {
    const [price, setPrice] = useState<string | null>(cachedPrice);
    const [priceState, setPriceState] = useState<'LOADING' | 'READY' | 'UNAVAILABLE'>(cachedPrice ? 'READY' : 'LOADING');
    const [busy, setBusy] = useState<'BUY' | 'RESTORE' | null>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let live = true;
        loadStorePrice().then(label => {
            if (!live) return;
            setPrice(label);
            setPriceState(label ? 'READY' : 'UNAVAILABLE');
        }).catch(() => { if (live) setPriceState('UNAVAILABLE'); });
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => { live = false; window.removeEventListener('keydown', onKey); };
    }, [onClose]);

    const run = async (kind: 'BUY' | 'RESTORE') => {
        if (busy) return;
        setBusy(kind);
        trackGameEvent(kind === 'BUY' ? 'streaming_plus_buy_tapped' : 'streaming_plus_restore_tapped', { source: request.source });
        try {
            await (kind === 'BUY' ? onBuy() : onRestore());
        } finally {
            setBusy(null);
        }
    };

    const storeName = Capacitor.getPlatform() === 'android' ? 'Google Play' : 'the App Store';
    const canBuy = !owned && priceState === 'READY' && Boolean(price);

    return createPortal(
        <div className={css.backdrop} role="presentation" onClick={event => { if (event.target === event.currentTarget) onClose(); }} data-streaming-plus-sheet>
            <section className={css.sheet} role="dialog" aria-modal="true" aria-labelledby="sp-sheet-title">
                <span className={css.grab} aria-hidden="true" />
                <button ref={closeRef} type="button" className={css.close} onClick={onClose} aria-label="Close"><StreamingPlusIcon id="close" size={16} /></button>
                <div className={css.scroll}>
                    <StreamingPlusPreview />
                    <div className={css.body}>
                        <span className={css.eyebrow}>{owned ? 'YOURS' : 'EXPANSION · ONE-TIME PURCHASE'}</span>
                        <h2 id="sp-sheet-title" className={css.title}>Streaming+ Pack</h2>
                        <p className={css.lead}>Your streaming company is complete without it. The pack takes it further: 21 more countries with China, the high-end hardware, the future of the picture and Wall Street.</p>
                        {request.line && !owned ? <p className={css.focus}><StreamingPlusIcon id="lock" size={15} />{request.line}</p> : null}
                        <p className={css.section}>WHAT YOU GET TODAY</p>
                        <ul className={css.list}>
                            {STREAMING_PLUS_TODAY.map((item, index) => (
                                <li key={item.id} className={`${css.row}${request.focus === item.id ? ` ${css.rowOn}` : ''}`} style={{ animationDelay: `${.04 + index * .045}s` }}>
                                    <span className={css.rowIcon}><StreamingPlusIcon id={item.id} /></span>
                                    <span className={css.rowText}><b className={css.rowTitle}>{item.title}</b><span className={css.rowLine}>{item.line}</span></span>
                                </li>
                            ))}
                        </ul>
                        <div className={css.later}>
                            <p className={css.section}>LATER · NO DATE YET</p>
                            <ul className={css.list}>
                                {STREAMING_PLUS_LATER.map(item => (
                                    <li key={item.id} className={`${css.row}${request.focus === 'products' && item.id === 'products' ? ` ${css.rowOn}` : ''}`}>
                                        <span className={css.rowIcon}><StreamingPlusIcon id={item.id} /></span>
                                        <span className={css.rowText}><b className={css.rowTitle}>{item.title}</b><span className={css.rowLine}>{item.line}</span></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <p className={css.fine}>
                            One-time purchase, not a subscription. It unlocks on every save on this account and can be restored on a new device.
                            {' '}The price is set by {storeName} in your currency. Nothing you already own is taken away, with or without it.
                        </p>
                    </div>
                </div>
                <div className={css.bar}>
                    {owned
                        ? <><button type="button" className={css.restore} onClick={onClose}>Close</button><span className={css.ownedBar}><StreamingPlusIcon id="check" size={16} />You own the Streaming+ Pack</span></>
                        : <>
                            <button type="button" className={css.restore} disabled={Boolean(busy)} onClick={() => run('RESTORE')}>{busy === 'RESTORE' ? 'Restoring…' : 'Restore'}</button>
                            <button type="button" className={css.buy} disabled={!canBuy || Boolean(busy)} onClick={() => run('BUY')} data-streaming-plus-buy>
                                {busy === 'BUY'
                                    ? 'Opening the store…'
                                    : priceState === 'LOADING'
                                        ? 'Getting the price…'
                                        : priceState === 'UNAVAILABLE'
                                            ? isNativeStore() ? `Not available from ${storeName} right now` : 'Available in the iOS and Android app'
                                            : <>Get Streaming+ <span className={css.buyPrice}>· {price}</span></>}
                            </button>
                        </>}
                </div>
            </section>
        </div>,
        document.body,
    );
};

export const StreamingPlusMoment: React.FC<{ onDone: () => void }> = ({ onDone }) => {
    const continueRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { continueRef.current?.focus(); }, []);
    return createPortal(
        <div className={css.moment} role="dialog" aria-modal="true" aria-labelledby="sp-moment-title" data-streaming-plus-moment>
            <div className={css.burst} aria-hidden="true">
                <span className={css.ring} /><span className={css.ring} /><span className={css.ring} />
                <span className={css.badge}><StreamingPlusIcon id="plus" size={46} /></span>
            </div>
            <div className={css.momentBody}>
                <h2 id="sp-moment-title" className={css.momentTitle}>Streaming+ unlocked</h2>
                <p className={css.momentLead}>Open on every save on this account, from this moment. No restart.</p>
                <ul className={css.momentList}>
                    {STREAMING_PLUS_TODAY.map((item, index) => (
                        <li key={item.id} className={css.momentRow} style={{ animationDelay: `${.55 + index * .08}s` }}>
                            <StreamingPlusIcon id="check" size={16} />{item.title}
                        </li>
                    ))}
                </ul>
            </div>
            <div className={css.momentBar}>
                <button ref={continueRef} type="button" className={css.buy} onClick={onDone}>Continue</button>
            </div>
        </div>,
        document.body,
    );
};

/** Mounted once by the app: answers every chip and announces the unlock. */
export const StreamingPlusHost: React.FC<StreamingPlusHostProps> = ({ owned, onBuy, onRestore }) => {
    const [request, setRequest] = useState<StreamingPlusSheetRequest | null>(null);
    const [moment, setMoment] = useState(false);
    const lastMomentAt = useRef(0);

    useEffect(() => {
        const onSheet = (event: Event) => {
            const detail = (event as CustomEvent<StreamingPlusSheetRequest>).detail || { source: 'unknown' };
            trackGameEvent('streaming_plus_sheet_opened', { source: detail.source, owned });
            setRequest(detail);
        };
        const onUnlocked = () => {
            if (Date.now() - lastMomentAt.current < 8000) return;
            lastMomentAt.current = Date.now();
            setRequest(null);
            setMoment(true);
        };
        window.addEventListener(STREAMING_PLUS_SHEET_EVENT, onSheet);
        window.addEventListener(STREAMING_PLUS_UNLOCKED_EVENT, onUnlocked);
        return () => {
            window.removeEventListener(STREAMING_PLUS_SHEET_EVENT, onSheet);
            window.removeEventListener(STREAMING_PLUS_UNLOCKED_EVENT, onUnlocked);
        };
    }, [owned]);

    const close = useCallback(() => setRequest(null), []);

    return <>
        {request ? <StreamingPlusSheet request={request} owned={owned} onClose={close} onBuy={onBuy} onRestore={onRestore} /> : null}
        {moment ? <StreamingPlusMoment onDone={() => setMoment(false)} /> : null}
    </>;
};

export default StreamingPlusHost;
