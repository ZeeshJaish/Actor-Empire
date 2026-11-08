import { StreamingPlusChip } from '../../../streamingPlus/StreamingPlusParts';
import { openStreamingPlusSheet } from '../../../../services/streamingPlusEvents';
/* ==========================================================================
   4 · THE STOREFRONT DESIGNER

   Only permanent tile-display formats live in this compact, preview-first
   library. Recommendation engines, live products, social systems and campaign
   takeovers are configured elsewhere. The large stage uses real titles from
   the game-world catalogue so this feels like designing a product, not choosing
   between empty wireframes.

   #122 (Zeesh: "ये तो मैंने जीपीटीज बनवाए थे तो मुझे नहीं पता ये ऐप में कितने अच्छे
   से दिखेंगे"): the stage and the library tiles are the subscriber app's own
   home for each layout (StreamingViewerHomePreview), so what is picked here is
   what viewers get; the stage shows its first screen, the tiles a miniature.
   ========================================================================== */

import { useEffect, useMemo, useState } from 'react';
import type { AnchorTitle, Approach } from '../../finance/launch';
import type { StepProps } from './LaunchWizard';
import { TechLockMark } from './TechLockMark';
import { StreamingViewerHomePreview } from '../../../streaming-transplant/StreamingViewerHomes';
import type { AppTitle } from '../../../streaming-transplant/StreamingViewerExperience';
import type { Brand } from '../../../streaming-transplant/StreamingBrandVisuals';

export function StepStorefront({ data, draft, patch, handlers, operations }: StepProps) {
  const firstLayout = data.storefronts.some(option => option.id === draft.storefrontId)
    ? draft.storefrontId || ''
    : data.storefronts[0]?.id || '';
  const [previewId, setPreviewId] = useState(firstLayout);
  const preview = data.storefronts.find(option => option.id === previewId) || data.storefronts[0];
  const previewLock = preview ? data.capabilityLocks[`storefront:${preview.id}`] : undefined;
  /* #109: the Tech step a locked layout needs, so the way to unlock it opens that step */
  const previewTech = preview ? data.capabilityLockTech?.[`storefront:${preview.id}`] : undefined;
  const previewPlus = Boolean(preview && data.capabilityLockPlus?.[`storefront:${preview.id}`]);
  const openPlus = () => openStreamingPlusSheet({ source: 'launch-front-page', focus: 'brand', line: `${preview?.name || 'This front page'} is one of the Streaming+ Pack's 13 front pages.` });
  const applied = Boolean(preview && (operations ? data.offer.storefrontId : draft.storefrontId) === preview.id);
  const brand = useMemo(() => wizardBrand(data.company), [data.company]);
  const appTitles = useMemo(() => wizardTitles(data.storefrontTitles), [data.storefrontTitles]);
  /* the library's miniatures come a beat after the stage, so arriving on this step stays instant */
  const [miniatures, setMiniatures] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMiniatures(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const saveLayout = (option: Approach) => {
    patch({ storefrontId: option.id });
    handlers.onSaveViewerOffer?.(option.id);
  };

  /* Choosing a layout saves it. A locked one is previewed only — it can be
     looked at, never adopted — so the Unlock button below (its Tech step) is what it offers
     instead. */
  const chooseLayout = (optionId: string) => {
    setPreviewId(optionId);
    const option = data.storefronts.find(item => item.id === optionId);
    if (!option) return;
    if (data.capabilityLocks[`storefront:${option.id}`]) {
      /* Same rule as the ident: reaching for a locked layout abandons the one
         you had, so the stage reports that nothing available is chosen. */
      if (draft.storefrontId) {
        patch({ storefrontId: undefined });
        handlers.onClearViewerOffer?.();
      }
      return;
    }
    saveLayout(option);
  };

  /* Reconcile a real choice the platform never recorded — never invent one. The
     library opens with a layout previewed so there is something to look at, but
     that preview is not a selection: only a layout the draft actually names is
     written through, and only if it is unlocked. Arriving with nothing chosen
     leaves the stage open, which is the honest report. */
  useEffect(() => {
    if (!draft.storefrontId) return;
    const chosen = data.storefronts.find(option => option.id === draft.storefrontId);
    if (!chosen || data.capabilityLocks[`storefront:${chosen.id}`]) return;
    if (data.offer.saved && data.offer.storefrontId === chosen.id) return;
    saveLayout(chosen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            {previewPlus ? 'Preview · Streaming+' : previewLock ? 'Preview · unlock in Tech' : applied ? 'Applied' : operations ? 'Unsaved preview' : 'Ready'}
          </span>
        </header>

        <StorefrontCanvas option={preview} brand={brand} titles={appTitles} />

        <div className="st-preview-copy">
          <p>{preview.line}</p>
          <ul aria-label={`${preview.name} effects`}>
            {preview.effects.map((effect, index) => (
              <li key={effect} className={index === 0 ? 'is-upside' : index === preview.effects.length - 1 ? 'is-tradeoff' : ''}>
                <i aria-hidden="true" />{effect}
              </li>
            ))}
          </ul>
          {previewPlus ? (
            <button type="button" className="st-research-link" onClick={openPlus} aria-label="Part of the Streaming+ Pack">
              <StreamingPlusChip /><i aria-hidden="true">›</i>
            </button>
          ) : previewLock ? (
            <button type="button" className="st-research-link" onClick={() => handlers.onOpenTechnology?.(previewTech?.techId)} aria-label={previewLock}>
              <TechLockMark tech={previewTech?.tech} /><i aria-hidden="true">›</i>
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
              const isApplied = (operations ? data.offer.storefrontId : draft.storefrontId) === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isPreview}
                  aria-label={`${option.name}${lock ? `, locked: ${lock}` : ''}${isApplied ? ', applied' : ''}`}
                  className={`st-layout-pick${isPreview ? ' is-preview' : ''}${isApplied ? ' is-applied' : ''}${lock ? ' is-locked' : ''}`}
                  onClick={() => chooseLayout(option.id)}
                >
                  <LayoutGlyph composition={option.layout || 'hero'} layoutId={option.id} brand={miniatures ? brand : null} titles={appTitles} />
                  <span>
                    <b>{option.name}</b>
                    {/* No reason here on purpose: thirteen tiles repeating
                        "Product Experience 24" is noise, and the requirement is
                        named once on the preview panel above. The tile only has
                        to say the option is not available yet. */}
                    {data.capabilityLockPlus?.[`storefront:${option.id}`]
                      ? <StreamingPlusChip />
                      : lock
                      ? <TechLockMark tech={data.capabilityLockTech?.[`storefront:${option.id}`]?.tech} compact />
                      : <em>{isApplied ? 'Applied' : 'Base layout'}</em>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="st-library-note">Every option changes tile placement, scale and browsing rhythm only. Platform features are configured separately.</p>
      </section>

      {/* Only one button survives here, and only when it has something to do.
          Choosing a layout saves it, so "Use <layout>" was asking the player to
          confirm a choice they had already made — and until they did, the stage
          reported that no storefront had been selected. What a locked layout
          still needs is the way to unlock it. */}
      {previewPlus ? (
        <button type="button" className="sf-btn sf-btn--research" onClick={openPlus}>
          Use {preview.name} with Streaming+ ›
        </button>
      ) : previewLock ? (
        <button type="button" className="sf-btn sf-btn--research" onClick={() => handlers.onOpenTechnology?.(previewTech?.techId)}>
          Unlock {preview.name}{previewTech ? `: ${previewTech.tech}` : ''} ›
        </button>
      ) : null}

      <p className="lw-rule">This same saved layout becomes the subscriber home screen and remains available in the dashboard customizer after launch.</p>
    </>
  );
}

/* the service's brand as the subscriber app draws it, from the founding identity */
function wizardBrand(company: StepProps['data']['company']): Brand {
  const { hue, sat } = hexHueSat(company.brandHex);
  return {
    name: company.name, markId: company.markId || 'BOLT', customMark: company.logoSrc || null, hue, sat, identId: 'NONE', customIdent: null,
    promiseId: 'NONE', publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: (hue + 180) % 360, identMode: 'none', identLen: 2,
    ratingId: 'ALL', lockupId: 'SIDE', serverCity: null,
  };
}

const hexHueSat = (hex?: string): { hue: number; sat: number } => {
  const value = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return { hue: 214, sat: 72 };
  const [r, g, b] = [0, 2, 4].map(at => parseInt(value.slice(at, at + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) hue = max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  const light = (max + min) / 2;
  const sat = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  return { hue: Math.round((hue + 360) % 360), sat: Math.max(40, Math.min(100, Math.round(sat * 100))) };
};

/* the wizard's titles as the subscriber app lists them: the chart, a few watched, a few new */
function wizardTitles(titles: AnchorTitle[]): AppTitle[] | undefined {
  if (!titles.length) return undefined;
  return titles.map((title, index) => {
    let seed = 0;
    for (let at = 0; at < title.id.length; at += 1) seed = (seed * 31 + title.id.charCodeAt(at)) >>> 0;
    return {
      id: title.id, title: title.name, kind: title.linked ? 'ORIGINAL' as const : 'LICENSED' as const, format: title.format,
      genre: title.genre || '', hue: seed % 360, logline: title.note || '',
      rank: index < 4 ? index + 1 : undefined, newThisWeek: index % 4 === 2 || undefined,
      progress: index === 1 ? .4 : index === 4 ? .7 : undefined,
    };
  });
}

/* the stage: the app's home for this layout in a phone, its whole first screen */
function StorefrontCanvas({ option, brand, titles }: { option: Approach; brand: Brand; titles?: AppTitle[] }) {
  const composition = option.layout || 'hero';
  return (
    <div className={`st-product-preview is-${composition} is-layout-${option.id} is-app-home`} data-storefront-layout={option.id}>
      <span className="st-phone">
        <span className="st-phone-screen">
          <span className="st-home-crop"><StreamingViewerHomePreview layoutId={option.id} brand={brand} titles={titles} /></span>
        </span>
      </span>
      <span className="st-product-caption"><b>{option.name}</b><em>{option.experimental ? 'Advanced base' : 'Base layout'}</em></span>
    </div>
  );
}

/* a library tile: the app's home in miniature once the stage has drawn, the layout's glyph before that */
function LayoutGlyph({ composition, layoutId, brand, titles }: { composition: NonNullable<Approach['layout']>; layoutId: string; brand: Brand | null; titles?: AppTitle[] }) {
  if (brand) {
    return (
      <span className={`st-layout-glyph is-app-home is-${layoutId}`} aria-hidden="true">
        <span className="st-layout-mini"><StreamingViewerHomePreview layoutId={layoutId} brand={brand} titles={titles} /></span>
      </span>
    );
  }
  return (
    <span className={`st-layout-glyph is-${composition} is-${layoutId}`} aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
    </span>
  );
}
