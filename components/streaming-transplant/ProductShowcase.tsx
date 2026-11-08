import { StreamingPlusLaterLine } from '../streamingPlus/StreamingPlusParts';
/**
 * The Platform room's PRODUCT tab (#126; plan §19.13): what the service will launch beyond its shows, every product
 * coming in a future update, each a card like a video's — a thumbnail playing a few seconds of the product, its name
 * under it (Zeesh, 2026-11-02: "यूट्यूब वीडियो का थंबनेल … उसके नीचे टेक्स्ट … प्रीव्यू चला है छोटा छोटा", "यूआई तगड़ा
 * होना चाहिए"). Live & Sports leads, as he named it first with Kids.
 *
 * Nothing here is bought: the old Product Lab is gone, and a save's products launched there run on above the
 * showcase, with Pause and Resume as before (services/streamingProductSuite.ts). A preview runs only while its card
 * is on screen; the cards' previews are drawn a frame after the tab opens, so the tap that opens it stays instant.
 */
import React, { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import {
  Award, FerrisWheel, Gamepad2, Glasses, Heart, Mic, Music, Newspaper, PartyPopper, RadioTower, Rocket, Shirt,
  Smartphone, Smile, Split, Ticket, TramFront, Trophy, Usb, Video, X, type LucideIcon,
} from 'lucide-react';
import css from './presentation/screens/NetworkDesk/ProductShowcase.module.css';
import { cx } from './presentation/cx';
import { ProductScene } from './ProductScenes';
import {
  PRODUCT_SHOWCASE, PRODUCT_SHOWCASE_SECTIONS, productShowcaseSectionOf,
  type ProductShowcaseId, type ProductShowcaseItem, type ProductShowcaseSection,
} from './productShowcaseCatalogue';
import type { PlatformProduct } from './StreamingNetworkExperience';

const ICONS: Record<ProductShowcaseId, LucideIcon> = {
  LIVE: Trophy, KIDS: Smile, GAMES: Gamepad2, INTERACTIVE: Split, SHORTS: Smartphone, PODCASTS: Mic, MUSIC: Music,
  FAN_CLUB: Heart, PREMIERES: Ticket, MERCH: Shirt, FESTIVAL: PartyPopper, TOURS: TramFront, WORLD: FerrisWheel,
  STICK: Usb, TELCO: RadioTower, NEWS: Newspaper, CREATORS: Video, AWARDS: Award, VR: Glasses,
};
const FEATURED: ProductShowcaseId = 'LIVE';
type Filter = 'ALL' | ProductShowcaseSection;
const FILTERS: ReadonlyArray<{ id: Filter; name: string }> = [{ id: 'ALL', name: 'All' }, ...PRODUCT_SHOWCASE_SECTIONS.map(section => ({ id: section.id, name: section.name }))];
const accent = (item: ProductShowcaseItem) => ({ ['--ac' as string]: item.accent } as React.CSSProperties);
const money = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : `$${Math.round(n / 1000)}K`;

const Name: React.FC<{ item: ProductShowcaseItem }> = ({ item }) => (
  <>{item.name}{item.futuristic && <em aria-label="far future">✦</em>}</>
);

const Card: React.FC<{ item: ProductShowcaseItem; drawn: boolean; onOpen: (id: ProductShowcaseId) => void }> = ({ item, drawn, onOpen }) => {
  const Icon = ICONS[item.id];
  return (
    <button type="button" className={css.card} style={accent(item)} data-card={item.id} onClick={() => onOpen(item.id)}
      aria-label={`${item.name}: ${item.line}. Coming soon`}>
      <span className={css.thumb}>
        {drawn && <ProductScene id={item.id} uid={`pc-${item.id}`} />}
        <span className={css.soon}>SOON</span>
      </span>
      <span className={css.meta}>
        <span className={css.av}><Icon aria-hidden="true" /></span>
        <span className={css.text}>
          <span className={css.name}><Name item={item} /></span>
          <span className={css.line}>{item.line}</span>
          <span className={css.when}>Coming soon</span>
        </span>
      </span>
    </button>
  );
};

const Sheet: React.FC<{ item: ProductShowcaseItem; onClose: () => void }> = ({ item, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const section = productShowcaseSectionOf(item.section);
  return (
    <div className={css.sheet} style={accent(item)} role="dialog" aria-modal="true" aria-label={item.name}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={css.panel}>
        <div className={css.grab} aria-hidden="true" />
        <button type="button" ref={closeRef} className={css.close} onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
        <div className={css.sheetthumb}><ProductScene id={item.id} uid={`ps-${item.id}`} live /></div>
        <div className={css.kicker}>{section.name.toUpperCase()} · COMING SOON</div>
        <h2 className={css.sheettitle}><Name item={item} /></h2>
        <p className={css.about}>{item.about}</p>
        <div className={css.willhead}>WHAT IT WILL DO</div>
        <ul className={css.will}>
          {item.will.map((line, i) => <li key={line}><i aria-hidden="true">{i + 1}</i><span>{line}</span></li>)}
        </ul>
        <div className={css.coming}><Rocket aria-hidden="true" />Coming in a future update</div>
      </div>
    </div>
  );
};

export interface ProductShowcaseProps {
  /** products this save launched in the old Product Lab: they run on, shown above the showcase */
  yours: PlatformProduct[];
  onPause?: (product: PlatformProduct, paused: boolean) => { ok: boolean; message: string };
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({ yours, onPause }) => {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [open, setOpen] = useState<ProductShowcaseId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  /* the previews are drawn a frame after the tab opens (heavy SVG), so the tap that opened it answers at once */
  const [drawn, setDrawn] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const draw = () => startTransition(() => setDrawn(true));
    /* after the first paint; a page that is not painting (in the background) still gets them a moment later */
    const frame = requestAnimationFrame(draw);
    const late = window.setTimeout(draw, 160);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(late); };
  }, []);
  /* a card's preview plays only while the card is on screen; the attribute is set directly, so nothing re-renders */
  useEffect(() => {
    const host = root.current;
    if (!host || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.toggleAttribute('data-play', entry.isIntersecting);
    }), { threshold: .3 });
    host.querySelectorAll('[data-card]').forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [filter, drawn]);

  const featured = PRODUCT_SHOWCASE.find(item => item.id === FEATURED)!;
  const showFeatured = filter === 'ALL' || filter === featured.section;
  const sections = PRODUCT_SHOWCASE_SECTIONS.filter(section => filter === 'ALL' || section.id === filter);
  const openItem = open ? PRODUCT_SHOWCASE.find(item => item.id === open) ?? null : null;
  const pause = (product: PlatformProduct, paused: boolean) => {
    const result = onPause?.(product, paused);
    if (result) setFeedback(result.message);
  };

  return (
    <div className={css.ps} ref={root}>
      <div className={css.head}>
        <h2>Products</h2>
        <span>{PRODUCT_SHOWCASE.length} ON THE WAY</span>
      </div>
      <p className={css.sub}>What your service will launch beyond its shows. Every one is coming in a future update.</p>
      <StreamingPlusLaterLine what="they" className={css.sub} />

      {yours.length > 0 && (
        <section className={css.yours}>
          <h3>YOUR PRODUCTS</h3>
          {yours.map(product => {
            const running = product.state === 'ACTIVE';
            return (
              <div className={css.yrow} key={product.id}>
                <div>
                  <b><i className={running ? undefined : css.off} aria-hidden="true" />{product.name}</b>
                  <span>
                    {product.state === 'BUILDING'
                      ? `Ready in ${product.readyIn ?? 1} week${product.readyIn === 1 ? '' : 's'}`
                      : running ? 'Running' : 'Paused'}
                    {product.weeklyCost ? ` · ${money(product.weeklyCost)} a week` : ''}
                    {product.load ? ` · +${product.load}% load` : ''}
                  </span>
                </div>
                {product.state !== 'BUILDING' && onPause && (
                  <button type="button" className={css.ybtn} onClick={() => pause(product, running)}>{running ? 'Pause' : 'Resume'}</button>
                )}
              </div>
            );
          })}
          {feedback && <p className={css.feedback} role="status">{feedback}</p>}
        </section>
      )}

      <div className={css.chips} role="group" aria-label="Show products">
        {FILTERS.map(item => (
          <button key={item.id} type="button" className={css.chip} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.name}</button>
        ))}
      </div>

      {showFeatured && (
        <button type="button" className={css.feature} style={accent(featured)} onClick={() => setOpen(featured.id)}
          aria-label={`${featured.name}: ${featured.line}. Coming soon`}>
          <span className={css.thumb}><ProductScene id={featured.id} uid="pf-featured" live /></span>
          <span className={css.featurebody}>
            <small><i aria-hidden="true" />FEATURED · COMING SOON</small>
            <b>{featured.name}</b>
            <span>{featured.line}</span>
          </span>
        </button>
      )}

      {sections.map(section => {
        const items = PRODUCT_SHOWCASE.filter(item => item.section === section.id && item.id !== FEATURED);
        const count = PRODUCT_SHOWCASE.filter(item => item.section === section.id).length;
        return (
          <section className={css.sec} key={section.id}>
            <div className={css.sechead}>
              <h3>{section.name.toUpperCase()}</h3>
              <span>{section.line} · {count}</span>
            </div>
            <div className={css.grid}>
              {items.map(item => <Card key={item.id} item={item} drawn={drawn} onOpen={setOpen} />)}
            </div>
          </section>
        );
      })}

      {openItem && <Sheet item={openItem} onClose={close} />}
    </div>
  );
};

export default ProductShowcase;
