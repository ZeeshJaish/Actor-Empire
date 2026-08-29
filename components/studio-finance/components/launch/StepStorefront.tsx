/* ==========================================================================
   4 · THE STOREFRONT DESIGNER

   Only permanent tile-display formats live in this compact, preview-first
   library. Recommendation engines, live products, social systems and campaign
   takeovers are configured elsewhere. The large stage uses real titles from
   the game-world catalogue so this feels like designing a product, not choosing
   between empty wireframes.
   ========================================================================== */

import React, { useState } from 'react';
import { CustomPosterImage } from '../../../CustomPosterImage';
import type { AnchorTitle, Approach } from '../../finance/launch';
import { Poster } from '../Poster';
import type { StepProps } from './LaunchWizard';

export function StepStorefront({ data, draft, patch, handlers }: StepProps) {
  const firstLayout = data.storefronts.some(option => option.id === draft.storefrontId)
    ? draft.storefrontId || ''
    : data.storefronts[0]?.id || '';
  const [previewId, setPreviewId] = useState(firstLayout);
  const preview = data.storefronts.find(option => option.id === previewId) || data.storefronts[0];
  const previewLock = preview ? data.capabilityLocks[`storefront:${preview.id}`] : undefined;
  const saved = Boolean(preview && data.offer.saved && data.offer.storefrontId === preview.id);
  const applied = Boolean(preview && draft.storefrontId === preview.id);

  const applyLayout = () => {
    if (!preview || previewLock) return;
    patch({ storefrontId: preview.id });
    handlers.onSaveViewerOffer?.(preview.id);
  };

  if (!preview) return null;

  return (
    <>
      <section className="st-designer" aria-labelledby="st-preview-title">
        <header className="st-designer-head">
          <div>
            <p className="sf-eyebrow">Your front page</p>
            <h2 id="st-preview-title">{preview.name}</h2>
          </div>
          <span className={`st-preview-state${previewLock ? ' is-research' : applied ? ' is-applied' : ''}`}>
            {previewLock ? 'Preview only' : applied ? 'Applied' : 'Ready'}
          </span>
        </header>

        <StorefrontCanvas
          option={preview}
          company={data.company.name}
          logoSrc={data.company.logoSrc}
          titles={data.storefrontTitles}
        />

        <div className="st-preview-copy">
          <p>{preview.line}</p>
          <ul aria-label={`${preview.name} effects`}>
            {preview.effects.map((effect, index) => (
              <li key={effect} className={index === 0 ? 'is-upside' : index === preview.effects.length - 1 ? 'is-tradeoff' : ''}>
                <i aria-hidden="true" />{effect}
              </li>
            ))}
          </ul>
          {previewLock ? (
            <button type="button" className="st-research-link" onClick={() => handlers.onOpenTechnology?.()}>
              <span><b>Research required</b><em>{previewLock}</em></span><i aria-hidden="true">↗</i>
            </button>
          ) : null}
        </div>
      </section>

      <section className="st-library" aria-labelledby="st-library-title">
        <header>
          <div><p className="sf-eyebrow">Base layout library</p><h3 id="st-library-title">Choose the shape of the page</h3></div>
          <span>{String(data.storefronts.findIndex(item => item.id === preview.id) + 1).padStart(2, '0')} / {data.storefronts.length}</span>
        </header>

        <div className="st-layout-scroll">
          <div className="st-layout-grid" role="listbox" aria-label="Preview a front page layout">
            {data.storefronts.map(option => {
              const lock = data.capabilityLocks[`storefront:${option.id}`];
              const isPreview = preview.id === option.id;
              const isApplied = draft.storefrontId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isPreview}
                  aria-label={`${option.name}${lock ? `, research preview: ${lock}` : ''}${isApplied ? ', applied' : ''}`}
                  className={`st-layout-pick${isPreview ? ' is-preview' : ''}${isApplied ? ' is-applied' : ''}${lock ? ' is-locked' : ''}`}
                  onClick={() => setPreviewId(option.id)}
                >
                  <LayoutGlyph composition={option.layout || 'hero'} layoutId={option.id} />
                  <span><b>{option.name}</b><em>{lock ? 'Research' : isApplied ? 'Applied' : 'Base layout'}</em></span>
                  {lock ? <i className="st-pick-lock" aria-hidden="true">◇</i> : null}
                </button>
              );
            })}
          </div>
        </div>
        <p className="st-library-note">Every option changes tile placement, scale and browsing rhythm only. Platform features are configured separately.</p>
      </section>

      <button
        type="button"
        className={`sf-btn ${previewLock ? 'sf-btn--research' : 'sf-btn--primary'}`}
        disabled={!previewLock && saved}
        onClick={previewLock ? () => handlers.onOpenTechnology?.() : applyLayout}
      >
        {previewLock
          ? `Research ${preview.name}`
          : saved
            ? 'Front page saved'
            : applied
              ? 'Save the front page'
              : `Use ${preview.name}`}
      </button>

      <p className="lw-rule">This same saved layout becomes the subscriber home screen and remains available in the dashboard customizer after launch.</p>
    </>
  );
}

function StorefrontCanvas({ option, company, logoSrc, titles }: {
  option: Approach;
  company: string;
  logoSrc?: string;
  titles: AnchorTitle[];
}) {
  const composition = option.layout || 'hero';
  const titleAt = (index: number): AnchorTitle => titles[index % Math.max(1, titles.length)] || {
    id: `store-preview-${index}`,
    name: `Opening Title ${index + 1}`,
    format: index % 3 === 0 ? 'Series' : 'Film',
    posterSeed: `store-preview-${index}`,
    linked: false,
  };
  const brand = (
    <header className="st-product-bar">
      <span>{logoSrc ? <img src={logoSrc} alt="" /> : <i aria-hidden="true" />}</span>
      <b>{company}</b>
      <nav><em>Films</em><em>Series</em><em>My List</em></nav>
      <s aria-hidden="true" />
    </header>
  );
  const poster = (index: number, className = '') => (
    React.createElement(StorePoster, {
      key: `${option.id}-${index}`,
      title: titleAt(index),
      index,
      className,
    })
  );

  let scene: React.ReactNode;
  if (option.id === 'cinema') {
    scene = (
      <div className="st-scene-cinema">
        {poster(0, 'is-backdrop')}
        <div className="st-cinema-copy">
          <small>Empire+ original premiere</small>
          <b>{titleAt(0).name}</b>
          <em>Tonight, the platform opens with one unmistakable story.</em>
          <span><i>▶ Play</i><i>＋ My List</i></span>
        </div>
        <section aria-label="More opening titles">
          {poster(1)}{poster(2)}{poster(3)}{poster(4)}
        </section>
      </div>
    );
  } else if (option.id === 'spotlight') {
    scene = (
      <div className="st-scene-spotlight">
        <div className="st-spotlight-art">{poster(0, 'is-feature')}</div>
        <div className="st-spotlight-copy">
          <small>Tonight's one choice</small>
          <b>{titleAt(0).name}</b>
          <em>No carousel. No clutter. One decisive invitation to play.</em>
          <span><i>▶</i><strong>Start watching</strong></span>
        </div>
        <p><i /> Hand-picked by the studio</p>
      </div>
    );
  } else if (option.id === 'quiet-shelf') {
    scene = (
      <div className="st-scene-quiet">
        <header><small>Three for tonight</small><b>A quieter way in.</b><em>Chosen with intent, not volume.</em></header>
        <section>{poster(0, 'is-lead')}{poster(1)}{poster(2)}</section>
        <footer><span>01</span><i /><span>03</span></footer>
      </div>
    );
  } else if (option.id === 'marquee') {
    scene = (
      <div className="st-scene-marquee">
        <section className="is-main">{poster(0, 'is-backdrop')}<span className="st-marquee-copy"><small>Now presenting</small><b>{titleAt(0).name}</b><em>Watch the official trailer →</em></span></section>
        <section className="is-bill"><p>Also on the marquee</p>{poster(1)}{poster(2)}{poster(3)}</section>
      </div>
    );
  } else if (option.id === 'chapters') {
    const chapters = ['The opening act', 'After dark', 'A different ending'];
    scene = (
      <div className="st-scene-chapters">
        {chapters.map((chapter, index) => (
          <section key={chapter}><span><small>Chapter {String(index + 1).padStart(2, '0')}</small><b>{chapter}</b></span>{poster(index * 2)}{poster(index * 2 + 1)}</section>
        ))}
      </div>
    );
  } else if (option.id === 'live-arena') {
    scene = (
      <div className="st-scene-arena">
        {poster(0, 'is-backdrop')}
        <header><span>LIVE</span><b>2 — 1</b><em>78:42</em></header>
        <div><small>Now in the arena</small><b>{titleAt(0).name}</b><em>148K watching · momentum rising</em></div>
        <aside><span><i /> Crowd</span><span><i /> Score</span><span><i /> Reactions</span></aside>
      </div>
    );
  } else if (option.id === 'creator-channels') {
    scene = (
      <div className="st-scene-creators">
        <header><small>Channels you trust</small><b>Programmed by people, not a feed.</b></header>
        {['Mira Vale', 'The Midnight Cut', 'Second Unit'].map((creator, index) => (
          <section key={creator}><i>{creator.slice(0, 1)}</i><span><b>{creator}</b><em>{index === 0 ? 'Premieres and intimate thrillers' : index === 1 ? 'Cult films after dark' : 'Craft, stunts and cinema'}</em></span>{poster(index)}</section>
        ))}
      </div>
    );
  } else if (composition === 'wall') {
    scene = <div className="st-scene-wall">{Array.from({ length: 12 }, (_, index) => poster(index, index % 5 === 0 ? 'is-wide' : ''))}</div>;
  } else if (composition === 'shelves') {
    const labels = ['Featured now', 'New releases', 'Browse by genre'];
    scene = <div className="st-scene-shelves">{labels.map((label, row) => <section key={label}><p>{label}</p><div>{Array.from({ length: 4 }, (_, index) => poster(row * 4 + index))}</div></section>)}</div>;
  } else if (composition === 'event') {
    scene = <div className="st-scene-event"><span className="st-event-live">{option.id === 'live-arena' ? 'LIVE · 2–1' : 'PREMIERE IN'}</span><div className="st-event-clock"><b>00</b><i>:</i><b>12</b><i>:</i><b>48</b></div>{poster(0, 'is-feature')}<p>{titleAt(0).name}<em>{option.id === 'live-arena' ? 'Audience rising now' : 'Everyone starts together'}</em></p></div>;
  } else if (composition === 'channel') {
    scene = <div className="st-scene-channel">{poster(0, 'is-feature')}<span className="st-channel-live"><i /> On now</span><div className="st-channel-copy"><b>{titleAt(0).name}</b><em>{option.id === 'creator-channels' ? 'Programmed by Mira Vale' : 'Started 14 minutes ago'}</em><span><i style={{ width: '38%' }} /></span></div><div className="st-channel-next">Up next {poster(1)}{poster(2)}{poster(3)}</div></div>;
  } else if (composition === 'feed') {
    scene = <div className="st-scene-feed st-scene-tile-feed">{Array.from({ length: 3 }, (_, index) => <section key={titleAt(index).id}>{poster(index, 'is-feature')}<span><b>{titleAt(index).name}</b><em>{titleAt(index).format} · Open details</em></span></section>)}</div>;
  } else if (composition === 'rooms') {
    const roomLabels = option.id === 'family-house'
      ? ['Grown-ups', 'Teens', 'Kids']
      : option.id === 'fandom-hub'
        ? ['The saga', 'Behind the world', 'Fan favourites']
        : ['Sunday night', 'After midnight', 'Something lighter'];
    scene = <div className="st-scene-rooms">{roomLabels.map((label, row) => <section key={label}><div>{poster(row * 2)}{poster(row * 2 + 1)}</div><span><b>{label}</b><em>{row === 0 ? 'Enter room' : `${8 + row * 5} titles`}</em></span></section>)}</div>;
  } else if (composition === 'timeline') {
    const schedule = option.id === 'premiere-lane' ? ['Doors open · 8:00', 'Tomorrow · Encore', 'Friday · New original'] : ['Added today', 'Yesterday', 'Last Friday'];
    scene = <ol className="st-scene-timeline">{schedule.map((label, index) => <li key={label}><time>{label}</time>{poster(index)}<span><b>{titleAt(index).name}</b><em>{titleAt(index).format}</em></span></li>)}</ol>;
  } else if (composition === 'concierge') {
    const question = option.id === 'ai-guide' ? 'I have 45 minutes. Why this one?' : 'What kind of night is this?';
    scene = <div className="st-scene-concierge"><p>{question}<i /></p><div className="st-concierge-answer"><span>{option.id === 'ai-guide' ? 'Because you finish intimate thrillers and skipped broad comedies.' : 'Tense, short and worth staying up for.'}</span><section>{poster(0)}<b>{titleAt(0).name}<em>98% fit · Play</em></b></section></div></div>;
  } else if (composition === 'lobby') {
    scene = <div className="st-scene-lobby"><div className="st-lobby-people">{['Z', 'M', 'A', 'R', '+8'].map(name => <i key={name}>{name}</i>)}</div><p><b>{option.id === 'party-mode' ? 'Your room is ready' : 'Tonight’s lobby'}</b><em>{option.id === 'party-mode' ? 'Friends choose the queue together' : '1,284 viewers are inside'}</em></p><section>{poster(0)}{poster(1)}{poster(2)}</section><button type="button" tabIndex={-1}>Enter together</button></div>;
  } else if (composition === 'split') {
    scene = <div className="st-scene-split"><section>{poster(0, 'is-feature')}<span><b>{titleAt(0).name}</b><em>Play feature</em></span></section><section>{poster(1, 'is-feature')}<span><b>{titleAt(1).name}</b><em>{option.id === 'double-feature' ? 'Choose the other side' : 'Watch trailer'}</em></span></section></div>;
  } else if (composition === 'vault') {
    scene = <div className="st-scene-vault"><aside><span>01</span><span>02</span><span>03</span><span>04</span></aside>{poster(0, 'is-feature')}<div><small>{option.id === 'quiet-shelf' ? 'Tonight’s selection' : 'Restored collection · Volume I'}</small><b>{titleAt(0).name}</b><em>{option.id === 'quiet-shelf' ? 'One confident recommendation' : 'Filed by year, movement and maker'}</em></div></div>;
  } else if (composition === 'map') {
    scene = <div className="st-scene-map"><svg viewBox="0 0 220 90" aria-hidden="true"><path d="M14 56c24-28 42-23 58-35 18 19 37 4 50 23 18-9 37 4 47 18 18-3 29 5 38 17" /><circle cx="52" cy="39" r="4" /><circle cx="119" cy="45" r="4" /><circle cx="178" cy="64" r="4" /></svg><p>{option.id === 'story-map' ? 'Explore the connected world' : 'Popular in your market'}</p><section>{poster(0)}{poster(1)}{poster(2)}{poster(3)}</section></div>;
  } else if (composition === 'binge') {
    scene = <div className="st-scene-binge">{poster(0, 'is-feature')}<div><small>Continue the journey</small><b>{titleAt(0).name}</b>{['Next episode · 42m', 'Then · 51m', 'Season finale · 58m'].map((episode, index) => <span key={episode}><i>{index + 4}</i>{episode}<em>{index === 0 ? '98% match' : 'Queued'}</em></span>)}</div></div>;
  } else if (composition === 'canvas') {
    scene = <div className="st-scene-canvas"><svg viewBox="0 0 300 150" aria-hidden="true"><path d="M28 110L92 40l62 66 58-58 62 50" /><circle cx="92" cy="40" r="5" /><circle cx="154" cy="106" r="5" /><circle cx="212" cy="48" r="5" /></svg>{Array.from({ length: 6 }, (_, index) => poster(index, `is-node is-node-${index + 1}`))}<p>Freeform tile field</p></div>;
  } else {
    scene = <div className="st-scene-hero">{poster(0, 'is-feature')}<div><small>{option.id === 'spotlight' ? 'Chosen for tonight' : 'An original premiere'}</small><b>{titleAt(0).name}</b><em>{option.id === 'spotlight' ? 'One choice. No noise.' : 'A new story begins here.'}</em><span><i>▶ Play</i><i>＋ My List</i></span></div><section>{poster(1)}{poster(2)}{poster(3)}{poster(4)}</section></div>;
  }

  return (
    <div className={`st-product-preview is-${composition} is-layout-${option.id}`} data-storefront-layout={option.id}>
      {brand}
      <div className="st-product-scene">{scene}</div>
      <span className="st-product-caption"><b>{option.name}</b><em>{option.experimental ? 'Advanced base' : 'Base layout'}</em></span>
    </div>
  );
}

function StorePoster({ title, index, className = '' }: { title: AnchorTitle; index: number; className?: string }) {
  return (
    <span className={`st-title-poster ${className}`} title={title.name}>
      <CustomPosterImage
        poster={title.poster}
        alt={`${title.name} poster`}
        className="st-title-poster-image"
        fallback={<Poster seed={title.posterSeed || title.id} size={54 + (index % 2) * 2} />}
      />
      <small>{title.name}</small>
    </span>
  );
}

function LayoutGlyph({ composition, layoutId }: { composition: NonNullable<Approach['layout']>; layoutId: string }) {
  return (
    <span className={`st-layout-glyph is-${composition} is-${layoutId}`} aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
    </span>
  );
}
