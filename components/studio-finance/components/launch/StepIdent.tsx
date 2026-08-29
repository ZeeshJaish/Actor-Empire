/* ============================================================================
   3 · Service identity — the motion and sound played before every stream.

   The old version of this screen asked the player to choose between "Standard
   signal sting" and "Full motion identity system" on the strength of the words
   alone. Nobody knows what those mean, and a paragraph would not have helped.

   So the screen shows the thing instead: a frame that plays the ident, a sound
   whose shape you can see, and a kit whose contents are drawn as the frames you
   would actually get.
   ========================================================================== */

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { StepProps } from './LaunchWizard';
import { money } from '../../finance/format';
import { Mark } from '../../../streaming-transplant/StreamingBrandVisuals';
import {
  optimizeStreamingIdentUpload,
  playStreamingIdentPreview,
  type StreamingIdentPreviewId,
} from '../../../../services/streamingIdentAudio';

/* Each sound has a rhythm the preview animates to — that is the only honest
   way to show sound on a screen that cannot play it. */
const RHYTHM: Record<string, { beats: number[]; wave: number[]; feel: string }> = {
  pulse: { beats: [0.15, 0.45], wave: [30, 90, 40, 95, 35, 25, 20], feel: 'Two low hits' },
  ascent: { beats: [0.1, 0.3, 0.55, 0.8], wave: [20, 35, 50, 65, 80, 92, 100], feel: 'Rises to the mark' },
  premiere: { beats: [0.2, 0.9], wave: [45, 55, 70, 85, 100, 80, 60], feel: 'Swells, then lands' },
  silent: { beats: [], wave: [12, 12, 12, 12, 12, 12, 12], feel: 'No sound at all' },
  choir: { beats: [0.25], wave: [60, 70, 78, 82, 80, 74, 66], feel: 'One held voice' },
  machine: { beats: [0.1, 0.35, 0.6], wave: [90, 20, 85, 25, 80, 30, 70], feel: 'Metal and air' },
  spark: { beats: [0.08, 0.3, 0.58], wave: [22, 45, 82, 38, 96, 54, 30], feel: 'Bright glass notes' },
  impact: { beats: [0.08], wave: [100, 76, 48, 34, 26, 20, 16], feel: 'One cinematic hit' },
  orbit: { beats: [0.12, 0.38, 0.7], wave: [30, 48, 72, 96, 72, 48, 30], feel: 'A circling synth figure' },
  bloom: { beats: [0.18, 0.5], wave: [18, 28, 44, 66, 84, 96, 92], feel: 'A warm expanding chord' },
  prism: { beats: [0.08, 0.26, 0.48, 0.72], wave: [46, 88, 34, 96, 42, 78, 28], feel: 'Crystalline fragments' },
  ember: { beats: [0.12, 0.5], wave: [64, 72, 80, 68, 54, 42, 32], feel: 'Warm bass and glow' },
  signal: { beats: [0.08, 0.28, 0.58], wave: [76, 18, 76, 18, 92, 34, 22], feel: 'A digital beacon' },
  horizon: { beats: [0.2, 0.7], wave: [20, 30, 42, 58, 74, 88, 100], feel: 'A wide ambient rise' },
  analog: { beats: [0.1, 0.42, 0.74], wave: [68, 44, 76, 38, 72, 48, 62], feel: 'Tuned vintage texture' },
  custom: { beats: [0.1, 0.35, 0.6, 0.85], wave: [30, 60, 42, 86, 55, 72, 38], feel: 'Your own signature' },
};

export function StepIdent({ data, draft, patch, free, handlers }: StepProps) {
  const [take, setTake] = useState(0);   // bumping this replays the preview
  const [previewPackageId, setPreviewPackageId] = useState(() => draft.packageId || 'sting');
  const [processingUpload, setProcessingUpload] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const sound = (draft.soundId ?? 'pulse') as StreamingIdentPreviewId;
  const rhythm = RHYTHM[sound] ?? RHYTHM.pulse;
  const pack = data.identPackages.find((p) => p.id === draft.packageId);
  const previewPack = data.identPackages.find((p) => p.id === previewPackageId) || pack;
  const previewLock = previewPack ? data.capabilityLocks[`ident:${previewPack.id}`] : undefined;
  const full = Boolean(previewPack && !previewPack.included);
  const cost = pack && !pack.included ? pack.cost : 0;
  const previewCost = previewPack && !previewPack.included ? previewPack.cost : 0;
  const packagePurchased = Boolean(pack && data.ident.purchasedPackageIds.includes(pack.id));
  const dueNow = pack && !pack.included && !packagePurchased ? cost : 0;
  const short = Math.max(0, dueNow - free);
  const packageLock = draft.packageId ? data.capabilityLocks[`ident:${draft.packageId}`] : undefined;
  const customReady = sound !== 'custom' || Boolean(draft.customAudio?.dataUrl);
  const ready = Boolean(draft.soundId && draft.packageId) && customReady && short === 0 && !packageLock;
  const sameCustomAudio = sound !== 'custom'
    || draft.customAudio?.fingerprint === data.ident.customAudio?.fingerprint;
  const matchesCommissioned = data.ident.commissioned
    && draft.soundId === data.ident.soundId
    && draft.packageId === data.ident.packageId
    && sameCustomAudio;

  const replay = () => {
    setTake((current) => current + 1);
    void playStreamingIdentPreview(sound, draft.customAudio).catch(() => setUploadError('Sound preview is unavailable on this device.'));
  };

  const chooseSound = (next: string) => {
    patch({ soundId: next });
    setTake((current) => current + 1);
    void playStreamingIdentPreview(next as StreamingIdentPreviewId, draft.customAudio)
      .catch(() => setUploadError('Sound preview is unavailable on this device.'));
  };

  const previewPackage = (nextId: string, locked: boolean) => {
    setPreviewPackageId(nextId);
    setTake((current) => current + 1);
    if (!locked) patch({ packageId: nextId });
  };

  const uploadCustomAudio = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setProcessingUpload(true);
    setUploadError('');
    try {
      const customAudio = await optimizeStreamingIdentUpload(file);
      patch({ soundId: 'custom', customAudio });
      setTake((current) => current + 1);
      void playStreamingIdentPreview('custom', customAudio)
        .catch(() => setUploadError('The upload is ready, but this device blocked its preview.'));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The audio could not be prepared.');
    } finally {
      setProcessingUpload(false);
    }
  };

  const removeCustomAudio = () => {
    patch({ customAudio: null, soundId: sound === 'custom' ? 'pulse' : draft.soundId });
    handlers.onRemoveCustomIdentAudio?.();
    setConfirmRemove(false);
    setUploadError('');
  };

  return (
    <>
      {/* --- the thing itself ---------------------------------------------- */}
      <section className="id-stage">
        <div
          className={`id-screen is-${sound}${full ? ' is-full' : ''} is-package-${previewPack?.id || 'sting'}${previewLock ? ' is-research-preview' : ''}`}
          key={`${sound}-${take}-${previewPack?.id || 'sting'}`}
        >
          {/* The player uploaded a logo when they founded the service, so the
              ident has to be built around an image it has never seen. It is
              revealed rather than drawn: a wipe up, a settle, and a shadow
              underneath so any shape sits on the frame. A drawn mark stands in
              when no logo exists. */}
          <span className="id-logo" aria-hidden="true">
            <Mark
              brand={{
                name: data.company.name,
                markId: data.company.markId || 'BOLT',
                customMark: data.company.logoSrc || null,
              }}
              className="id-player-mark"
            />
          </span>
          <span className="id-word">{data.company.name}</span>
          {previewLock && <span className="id-research-stamp">Research preview</span>}
          <span className="id-sweep" aria-hidden="true" />
          {rhythm.beats.map((at, i) => (
            <span key={i} className="id-beat" style={{ ['--at' as string]: `${at}` }} aria-hidden="true" />
          ))}
        </div>
        <div className="id-stagefoot">
          <span>{previewLock ? `Prototype · ${previewPack?.name}` : `${rhythm.feel}${full ? ` · ${previewPack?.name}` : ''}`}</span>
          <button type="button" className="id-replay" onClick={replay}>Play again</button>
        </div>
      </section>

      {/* --- pick the sound by its shape ------------------------------------- */}
      <section className="lw-block">
        <p className="sf-eyebrow lw-block-head">The sound</p>
        {/* Two horizontal rows keep fifteen real previews inside one compact
            soundboard. The stage above remains where the choice is judged. */}
        <ul className="id-chips">
          {data.identSounds.map((option) => {
            const on = draft.soundId === option.id;
            const shape = RHYTHM[option.id] ?? RHYTHM.pulse;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className={on ? 'id-chip is-on' : 'id-chip'}
                  onClick={() => chooseSound(option.id)}
                  aria-pressed={on}
                  aria-label={`Preview ${option.name} ident sound`}
                >
                  <span className="id-wave" aria-hidden="true">
                    {shape.wave.map((h, i) => <i key={i} style={{ height: `${h}%`, ['--b' as string]: i }} />)}
                  </span>
                  <b>{option.name}</b>
                </button>
              </li>
            );
          })}
        </ul>

        <div className={`id-upload${sound === 'custom' ? ' is-on' : ''}`}>
          <input
            ref={uploadRef}
            type="file"
            accept="audio/*,.aac,.flac,.m4a,.mp3,.ogg,.wav"
            className="id-upload-input"
            onChange={uploadCustomAudio}
            aria-label="Upload custom ident audio"
          />
          <div className="id-upload-copy">
            <b>{draft.customAudio ? draft.customAudio.originalName : 'Your own sound'}</b>
            <span>
              {draft.customAudio
                ? `${draft.customAudio.durationSeconds.toFixed(1)}s · optimized on device`
                : 'The first 8 seconds are kept as a compact mobile-ready WAV.'}
            </span>
          </div>
          {draft.customAudio && sound !== 'custom' && (
            <button type="button" className="id-upload-use" onClick={() => chooseSound('custom')}>Use</button>
          )}
          {draft.customAudio && (
            <button type="button" className="id-upload-remove" onClick={() => setConfirmRemove(true)}>Remove</button>
          )}
          <button
            type="button"
            className="id-upload-button"
            disabled={processingUpload}
            onClick={() => uploadRef.current?.click()}
          >
            {processingUpload ? 'Optimizing…' : draft.customAudio ? 'Replace' : 'Upload'}
          </button>
        </div>
        {confirmRemove && (
          <div className="id-upload-confirm" role="group" aria-label="Confirm custom sound removal">
            <span>Delete this sound from the game save?</span>
            <button type="button" onClick={() => setConfirmRemove(false)}>Keep</button>
            <button type="button" className="is-remove" onClick={removeCustomAudio}>Delete</button>
          </div>
        )}
        {uploadError && <p className="id-upload-error" role="alert">{uploadError}</p>}
      </section>

      {/* --- and what you are actually buying ---------------------------------- */}
      <section className="lw-block">
        <p className="sf-eyebrow lw-block-head">What gets made</p>
        {/* Four kits would be four tall cards. They are a picker, and only the
            chosen one explains itself. */}
        <div className="id-kits">
          {data.identPackages.map((option) => {
            const on = draft.packageId === option.id;
            const previewing = previewPackageId === option.id;
            const purchased = option.included || data.ident.purchasedPackageIds.includes(option.id);
            const lock = data.capabilityLocks[`ident:${option.id}`];
            return (
              <button
                key={option.id}
                type="button"
                title={lock || undefined}
                aria-label={lock ? `Preview ${option.name}. Research required: ${lock}` : option.name}
                aria-pressed={previewing}
                className={`${on ? 'id-kit is-on' : 'id-kit'}${lock ? ' is-locked' : ''}${previewing && lock ? ' is-preview' : ''}${purchased ? ' is-purchased' : ''}`}
                onClick={() => previewPackage(option.id, Boolean(lock))}
              >
                {lock && <span className="id-kit-research">Research</span>}
                <b>{option.name}</b>
                <em>{option.included ? 'Included' : `${money(option.cost)}${purchased ? ' · Bought' : ''}`}</em>
                <s>{lock ? 'Tap to preview' : `${option.frames.length} surface${option.frames.length > 1 ? 's' : ''}`}</s>
              </button>
            );
          })}
        </div>

        {previewPack && (
          <div className={`id-kitdetail is-package-${previewPack.id}${previewLock ? ' is-research' : ''}`}>
            <div className={`id-framerow is-package-${previewPack.id}${getShowcaseFrames(previewPack.id, previewPack.frames).length === 1 ? ' is-single' : ''}`} aria-label={`${previewPack.name} viewer touchpoints`}>
              {getShowcaseFrames(previewPack.id, previewPack.frames).map((frame) => (
                renderIdentSurfacePreview(frame, data.company, previewPack.id)
              ))}
            </div>
            <div className="id-detail-copy">
              <span className="id-detail-label">What gets made</span>
              <p>{previewPack.description}</p>
            </div>
            {previewPack.viewerImpact && (
              <div className="id-viewer-impact">
                <EyeIcon />
                <span><b>Viewer impact</b><p>{previewPack.viewerImpact}</p></span>
              </div>
            )}
            {previewPack.effect && <p className="id-kiteffect">Studio effect · {previewPack.effect}</p>}
            {previewLock && (
              <div className="id-research-gate">
                <span><b>Research required</b><em>{previewLock}</em></span>
                {handlers.onOpenTechnology && <button type="button" onClick={handlers.onOpenTechnology}>Open research</button>}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="lw-preview">
        <div><span>Package value</span><b>{previewCost > 0 ? money(previewCost) : 'Included'}</b></div>
        <div><span>Due on commission</span><b>{previewLock ? 'Research first' : dueNow > 0 ? money(dueNow) : 'Nothing'}</b></div>
        <div><span>Studio money after</span><b className={!previewLock && short > 0 ? 'sf-tone-bad' : ''}>{previewLock ? '—' : money(Math.max(0, free - dueNow))}</b></div>
        {!previewLock && short > 0 && <div><span>Short by</span><b className="sf-tone-bad">{money(short)}</b></div>}
      </section>

      {matchesCommissioned && (
        <p className="id-commissioned" role="status"><span aria-hidden="true">✓</span> This exact ident is commissioned and paid.</p>
      )}

      <button
        type="button"
        className="sf-btn sf-btn--primary"
        disabled={Boolean(previewLock) || !ready || matchesCommissioned}
        onClick={() => draft.soundId && draft.packageId && handlers.onCommissionIdent?.(draft.soundId, draft.packageId, draft.customAudio)}
      >
        {previewLock
          ? 'Research required to commission'
          : matchesCommissioned
          ? 'Current ident commissioned'
          : data.ident.commissioned
            ? `Commission changes${dueNow ? ` · ${money(dueNow)}` : ''}`
            : `Commission this ident${dueNow ? ` · ${money(dueNow)}` : ''}`}
      </button>
    </>
  );
}

const SHOWCASE_FRAMES: Record<string, string[]> = {
  sting: ['Ident'],
  full: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'],
  cinematic: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'],
  genre: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'],
  adaptive: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'],
  living: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'],
};

function getShowcaseFrames(packageId: string, fallback: string[]) {
  return SHOWCASE_FRAMES[packageId] || fallback.slice(0, 6);
}

const SURFACE_KICKER: Record<string, string> = {
  Ident: 'An original',
  End: 'Up next',
  Trailer: 'Official trailer',
  Kids: 'Kids space',
  Live: 'Live now',
  Premiere: 'Premieres in',
};

const GENRE_MODE: Record<string, string> = {
  Ident: 'Drama', End: 'Comedy', Trailer: 'Action', Kids: 'Family', Live: 'Sport', Premiere: 'Event',
};

const PACKAGE_MODE: Record<string, string> = {
  sting: 'Signal', full: 'System', cinematic: 'Cinema', adaptive: 'Auto',
};

const LIVING_MODE: Record<string, string> = {
  Ident: '07:12', End: '12:40', Trailer: '18:05', Kids: 'Home', Live: 'Now', Premiere: 'Tonight',
};

function renderIdentSurfacePreview(frame: string, company: StepProps['data']['company'], packageId: string) {
  const surface = frame.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const mode = packageId === 'genre'
    ? GENRE_MODE[frame]
    : packageId === 'living' ? LIVING_MODE[frame] : PACKAGE_MODE[packageId];
  const brand = {
    name: company.name,
    markId: company.markId || 'BOLT',
    customMark: company.logoSrc || null,
  };

  return (
    <div key={frame} className="id-surface-wrap">
      <div
        className={`id-surface is-${surface} is-package-${packageId}`}
        aria-hidden="true"
        data-preview-package={packageId}
        data-preview-surface={surface}
      >
        {renderPackageSurface(packageId, frame, mode, brand)}
      </div>
      <em>{frame}</em>
    </div>
  );
}

function renderPackageSurface(
  packageId: string,
  frame: string,
  mode: string | undefined,
  brand: { name: string; markId: string; customMark: string | null },
) {
  if (packageId === 'cinematic' || packageId === 'genre' || packageId === 'adaptive' || packageId === 'living') {
    return (
      <span className={`id-motion id-motion--${packageId}`}>
        {renderMotionStoryboard(packageId, frame)}
        <span className="id-motion-mark">
          <Mark brand={brand} className="id-surface-mark" />
        </span>
      </span>
    );
  }

  return (
    <>
      <span className="id-surface-brand"><Mark brand={brand} className="id-surface-mark" /></span>
      <span className="id-surface-kicker">{SURFACE_KICKER[frame] || frame}</span>
      {mode && <span className="id-surface-mode">{mode}</span>}
      <span className="id-surface-copy"><i /><i /></span>
      <span className="id-surface-tiles"><i /><i /><i /></span>
      <span className="id-surface-progress"><i /></span>
      <span className="id-surface-action" />
      {frame === 'Live' && <span className="id-surface-live">Live</span>}
      {frame === 'Premiere' && <span className="id-surface-count">03:12</span>}
    </>
  );
}

function renderMotionStoryboard(packageId: string, frame: string) {
  if (packageId === 'cinematic') return renderCinematicStoryboard(frame);
  if (packageId === 'genre') return renderGenreStoryboard(frame);
  if (packageId === 'adaptive') return renderAdaptiveStoryboard(frame);
  return renderLivingStoryboard(frame);
}

function renderCinematicStoryboard(frame: string) {
  let scene: ReactNode;

  switch (frame) {
    case 'Ident':
      scene = (
        <>
          <path className="id-motion-beam" d="M60 -8h40l26 106H34z" />
          <circle className="id-motion-orbit" cx="80" cy="45" r="24" />
          <path className="id-motion-fine" d="M27 67h106M45 72h70" />
        </>
      );
      break;
    case 'End':
      scene = (
        <>
          <path className="id-motion-fine" d="M14 19h51M14 28h43M14 37h48M14 46h36M14 55h42" />
          <rect className="id-motion-panel" x="88" y="13" width="56" height="62" rx="6" />
          <path className="id-motion-accent" d="M96 22h40v3H96zM96 58h27v3H96z" />
          <rect className="id-motion-track" x="96" y="67" width="40" height="3" rx="1.5" />
          <rect className="id-motion-fill" x="96" y="67" width="24" height="3" rx="1.5" />
        </>
      );
      break;
    case 'Trailer':
      scene = (
        <>
          <path className="id-motion-beam" d="M122 -10L158 8 92 92 51 92z" />
          <path className="id-motion-fine" d="M13 15h42M13 22h28" />
          <g className="id-motion-play" data-preview-play="true">
            <circle cx="80" cy="45" r="14" />
            <path d="M76 37l13 8-13 8z" />
          </g>
          <rect className="id-motion-track" x="17" y="77" width="126" height="3" rx="1.5" />
          <rect className="id-motion-fill" x="17" y="77" width="79" height="3" rx="1.5" />
        </>
      );
      break;
    case 'Kids':
      scene = (
        <>
          <rect className="id-motion-card is-card-one" x="17" y="17" width="36" height="55" rx="6" />
          <rect className="id-motion-card is-card-two" x="62" y="11" width="36" height="61" rx="6" />
          <rect className="id-motion-card is-card-three" x="107" y="17" width="36" height="55" rx="6" />
          <path className="id-motion-card-line" d="M24 59h22M69 55h22M114 59h22" />
          <path className="id-motion-card-glyph" d="M35 28l3.4 6.9 7.6 1.1-5.5 5.3 1.3 7.5-6.8-3.5-6.8 3.5 1.3-7.5-5.5-5.3 7.6-1.1z" />
          <path className="id-motion-card-glyph" d="M80 24l3.4 6.9 7.6 1.1-5.5 5.3 1.3 7.5-6.8-3.5-6.8 3.5 1.3-7.5-5.5-5.3 7.6-1.1z" />
          <path className="id-motion-card-glyph" d="M125 28l3.4 6.9 7.6 1.1-5.5 5.3 1.3 7.5-6.8-3.5-6.8 3.5 1.3-7.5-5.5-5.3 7.6-1.1z" />
        </>
      );
      break;
    case 'Live':
      scene = (
        <>
          <rect className="id-motion-live-pill" x="11" y="10" width="27" height="12" rx="3" />
          <text className="id-motion-live-text" x="24.5" y="18.3" textAnchor="middle">LIVE</text>
          <path className="id-motion-corners" d="M17 36v-9h9M143 36v-9h-9M17 57v9h9M143 57v9h-9" />
          <path className="id-motion-wave" d="M42 49h8l4-13 7 27 7-38 8 44 7-32 7 24 6-12h22" />
          <circle className="id-motion-dot" cx="124" cy="46" r="3" />
        </>
      );
      break;
    default:
      scene = (
        <>
          <path className="id-motion-beam" d="M17 -8l49 0 23 98H45zM97 -8h43l-25 98H73z" />
          <path className="id-motion-stage" d="M34 75c17-14 75-14 92 0z" />
          <text className="id-motion-count" x="80" y="49" textAnchor="middle">03:12</text>
          <path className="id-motion-fine" d="M58 58h44" />
        </>
      );
  }

  return <MotionCanvas family="cinematic">{scene}</MotionCanvas>;
}

function renderGenreStoryboard(frame: string) {
  let scene: ReactNode;

  switch (frame) {
    case 'Ident':
      scene = (
        <>
          <path className="id-genre-curtain is-left" d="M0 0h61l-9 90H0z" />
          <path className="id-genre-curtain is-right" d="M99 0h61v90h-52z" />
          <path className="id-motion-fine" d="M19 12v66M32 12v66M128 12v66M141 12v66" />
          <rect className="id-genre-plinth" x="58" y="67" width="44" height="3" rx="1.5" />
        </>
      );
      break;
    case 'End':
      scene = (
        <>
          <path className="id-genre-rays" d="M80 45L14 3h44zm0 0L111 0h40zm0 0l77 21v24zm0 0L108 90H65zm0 0L5 82V39z" />
          <rect className="id-motion-card is-card-one" x="18" y="18" width="42" height="52" rx="5" />
          <rect className="id-motion-card is-card-two" x="68" y="12" width="42" height="58" rx="5" />
          <rect className="id-motion-card is-card-three" x="118" y="22" width="24" height="48" rx="5" />
          <path className="id-motion-accent" d="M76 57h26v3H76z" />
        </>
      );
      break;
    case 'Trailer':
      scene = (
        <>
          <path className="id-genre-shard is-one" d="M0 70L46 0h28L31 90H0z" />
          <path className="id-genre-shard is-two" d="M105 0h33L94 90H61z" />
          <path className="id-genre-speed" d="M112 20h38M103 28h47M119 62h31M109 70h41" />
          <g className="id-motion-play" data-preview-play="true">
            <circle cx="80" cy="45" r="14" />
            <path d="M76 37l13 8-13 8z" />
          </g>
        </>
      );
      break;
    case 'Kids':
      scene = (
        <>
          <path className="id-genre-house is-one" d="M14 39l22-18 22 18v34H14z" />
          <path className="id-genre-house is-two" d="M58 32l22-18 22 18v41H58z" />
          <path className="id-genre-house is-three" d="M102 39l22-18 22 18v34h-44z" />
          <rect className="id-genre-door" x="73" y="46" width="14" height="27" rx="4" />
          <path className="id-motion-fine" d="M21 51h30M109 51h30" />
        </>
      );
      break;
    case 'Live':
      scene = (
        <>
          <rect className="id-genre-field" x="12" y="10" width="136" height="70" rx="5" />
          <path className="id-genre-field-line" d="M80 10v70M12 25h22v40H12M148 25h-22v40h22" />
          <circle className="id-genre-field-line" cx="80" cy="45" r="17" />
          <circle className="id-motion-dot" cx="66" cy="39" r="3" />
          <circle className="id-motion-dot" cx="95" cy="53" r="3" />
          <text className="id-genre-score" x="80" y="50" textAnchor="middle">2–1</text>
        </>
      );
      break;
    default:
      scene = (
        <>
          <path className="id-genre-spotlight is-left" d="M25 0h22l35 90H22z" />
          <path className="id-genre-spotlight is-right" d="M113 0h22l3 90H78z" />
          <path className="id-genre-carpet" d="M65 52h30l25 38H40z" />
          <path className="id-motion-fine" d="M20 76h120" />
          <text className="id-motion-count" x="80" y="43" textAnchor="middle">03:12</text>
        </>
      );
  }

  return <MotionCanvas family="genre">{scene}</MotionCanvas>;
}

function renderAdaptiveStoryboard(frame: string) {
  let scene: ReactNode;

  switch (frame) {
    case 'Ident':
      scene = (
        <>
          <circle className="id-adaptive-ring is-outer" cx="80" cy="45" r="30" />
          <circle className="id-adaptive-ring is-inner" cx="80" cy="45" r="20" />
          <circle className="id-motion-dot" cx="80" cy="15" r="3" />
          <circle className="id-motion-dot" cx="105" cy="61" r="2" />
          <path className="id-adaptive-bracket" d="M25 31v-9h24M135 59v9h-24" />
        </>
      );
      break;
    case 'End':
      scene = (
        <>
          <rect className="id-motion-panel" x="12" y="14" width="53" height="26" rx="5" />
          <rect className="id-motion-panel" x="12" y="48" width="53" height="26" rx="5" />
          <rect className="id-adaptive-hero" x="73" y="14" width="75" height="60" rx="6" />
          <path className="id-motion-fine" d="M21 27h35M21 61h31M84 57h52" />
          <rect className="id-motion-fill" x="84" y="64" width="35" height="3" rx="1.5" />
        </>
      );
      break;
    case 'Trailer':
      scene = (
        <>
          <rect className="id-adaptive-hero" x="10" y="11" width="99" height="68" rx="6" />
          <rect className="id-motion-panel" x="117" y="11" width="33" height="19" rx="4" />
          <rect className="id-motion-panel" x="117" y="36" width="33" height="19" rx="4" />
          <rect className="id-motion-panel" x="117" y="61" width="33" height="18" rx="4" />
          <g className="id-motion-play" data-preview-play="true">
            <circle cx="80" cy="45" r="13" />
            <path d="M76 37l12 8-12 8z" />
          </g>
        </>
      );
      break;
    case 'Kids':
      scene = (
        <>
          <rect className="id-adaptive-kid is-one" x="13" y="18" width="39" height="55" rx="8" />
          <rect className="id-adaptive-kid is-two" x="60" y="11" width="40" height="62" rx="8" />
          <rect className="id-adaptive-kid is-three" x="108" y="18" width="39" height="55" rx="8" />
          <path className="id-adaptive-safe" d="M80 23l9 4v8c0 8-4 13-9 16-5-3-9-8-9-16v-8z" />
          <path className="id-adaptive-check" d="M75 36l4 4 7-9" />
        </>
      );
      break;
    case 'Live':
      scene = (
        <>
          <rect className="id-motion-live-pill" x="11" y="10" width="27" height="12" rx="3" />
          <text className="id-motion-live-text" x="24.5" y="18.3" textAnchor="middle">LIVE</text>
          <path className="id-adaptive-chart" d="M16 69l22-19 18 7 21-26 22 12 21-19 24 12" />
          <path className="id-motion-fine" d="M16 75h128M16 24v51" />
          <circle className="id-motion-dot" cx="77" cy="31" r="3" />
          <circle className="id-motion-dot" cx="120" cy="24" r="3" />
        </>
      );
      break;
    default:
      scene = (
        <>
          <rect className="id-motion-panel" x="15" y="13" width="130" height="64" rx="8" />
          <path className="id-adaptive-bell" d="M80 25c-8 0-13 6-13 15v8l-6 8h38l-6-8v-8c0-9-5-15-13-15zm-5 37h10" />
          <text className="id-motion-count" x="80" y="72" textAnchor="middle">03:12</text>
          <path className="id-adaptive-bracket" d="M24 27v-8h16M136 63v8h-16" />
        </>
      );
  }

  return <MotionCanvas family="adaptive">{scene}</MotionCanvas>;
}

function renderLivingStoryboard(frame: string) {
  let scene: ReactNode;

  switch (frame) {
    case 'Ident':
      scene = (
        <>
          <circle className="id-living-sun" cx="119" cy="24" r="11" />
          <path className="id-living-horizon" d="M0 66c25-8 48-8 72 0s49 8 88-2v26H0z" />
          <path className="id-motion-fine" d="M18 60h124M28 71h104" />
        </>
      );
      break;
    case 'End':
      scene = (
        <>
          <circle className="id-living-sun" cx="29" cy="23" r="9" />
          <rect className="id-living-window" x="15" y="39" width="54" height="36" rx="5" />
          <rect className="id-living-window is-main" x="76" y="14" width="69" height="61" rx="6" />
          <path className="id-motion-fine" d="M25 58h34M87 55h47M87 63h33" />
        </>
      );
      break;
    case 'Trailer':
      scene = (
        <>
          <circle className="id-living-sun" cx="124" cy="31" r="10" />
          <path className="id-living-horizon" d="M0 60c28-15 50 4 79-5 32-10 51-5 81 7v28H0z" />
          <g className="id-motion-play" data-preview-play="true">
            <circle cx="80" cy="45" r="14" />
            <path d="M76 37l13 8-13 8z" />
          </g>
          <rect className="id-motion-track" x="17" y="77" width="126" height="3" rx="1.5" />
          <rect className="id-motion-fill" x="17" y="77" width="87" height="3" rx="1.5" />
        </>
      );
      break;
    case 'Kids':
      scene = (
        <>
          <path className="id-living-home" d="M23 44l26-22 26 22v31H23z" />
          <rect className="id-living-window" x="84" y="17" width="27" height="25" rx="5" />
          <rect className="id-living-window" x="118" y="17" width="27" height="25" rx="5" />
          <rect className="id-living-window" x="84" y="49" width="61" height="26" rx="5" />
          <path className="id-motion-fine" d="M34 54h30M94 62h41" />
        </>
      );
      break;
    case 'Live':
      scene = (
        <>
          <rect className="id-motion-live-pill" x="11" y="10" width="27" height="12" rx="3" />
          <text className="id-motion-live-text" x="24.5" y="18.3" textAnchor="middle">LIVE</text>
          <path className="id-living-wave" d="M14 51h11l5-16 8 33 8-49 9 57 8-40 9 28 8-19 8 10h12l7-22 8 39 8-24h15" />
          <circle className="id-living-pulse-dot" cx="130" cy="21" r="5" />
        </>
      );
      break;
    default:
      scene = (
        <>
          <circle className="id-living-moon" cx="120" cy="24" r="13" />
          <circle className="id-living-star" cx="28" cy="22" r="1.5" />
          <circle className="id-living-star" cx="48" cy="12" r="1" />
          <circle className="id-living-star" cx="65" cy="27" r="1.3" />
          <path className="id-living-horizon" d="M0 70c30-10 57 4 84-3 31-8 52-3 76 5v18H0z" />
          <text className="id-motion-count" x="80" y="50" textAnchor="middle">03:12</text>
          <path className="id-motion-fine" d="M58 59h44" />
        </>
      );
  }

  return <MotionCanvas family="living">{scene}</MotionCanvas>;
}

function MotionCanvas({ family, children }: { family: string; children: ReactNode }) {
  return (
    <svg className={`id-motion-svg is-${family}`} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {children}
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
