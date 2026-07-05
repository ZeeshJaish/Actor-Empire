import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import {
  PROFILE_BUILDER_CATEGORIES,
  ProfileBuilderCategoryId,
  ProfileBuilderGender,
  ProfileBuilderPart,
  ProfileBuilderSelection,
  createDefaultProfileSelection,
  getCompatibleProfileOptions,
  normalizeProfileSelection,
} from '../../services/profileBuilder';
import {
  PROFILE_CANVAS_HEIGHT,
  PROFILE_CANVAS_WIDTH,
  exportProfilePortrait,
  renderProfilePortrait,
} from './profilePortraitRenderer';
import { GameLanguage } from '../../types';
import { t } from '../../services/i18n';

interface ProfilePictureBuilderProps {
  gender: ProfileBuilderGender;
  language?: GameLanguage;
  initialSelection?: ProfileBuilderSelection | null;
  onApply: (avatarDataUrl: string, selection?: ProfileBuilderSelection) => void;
}

const COLOR_CATEGORIES = new Set<ProfileBuilderCategoryId>(['skinTone', 'hairColor', 'frame']);
const FACE_DETAIL_CATEGORIES = new Set<ProfileBuilderCategoryId>(['eyebrows', 'eyes', 'nose', 'mouth', 'facialHair']);

const PixelOptionThumb: React.FC<{
  category: ProfileBuilderCategoryId;
  option: ProfileBuilderPart;
  selection: ProfileBuilderSelection;
}> = ({ category, option, selection }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const nextSelection = {
      ...selection,
      [category]: option.id,
    };

    const offscreen = document.createElement('canvas');
    offscreen.width = PROFILE_CANVAS_WIDTH;
    offscreen.height = PROFILE_CANVAS_HEIGHT;
    const offscreenContext = offscreen.getContext('2d');
    if (!offscreenContext) return;

    renderProfilePortrait(offscreenContext, nextSelection);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (FACE_DETAIL_CATEGORIES.has(category)) {
      ctx.drawImage(offscreen, 26 * 3, 36 * 3, 60 * 3, 72 * 3, 0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
  }, [category, option.id, selection]);

  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={108}
      className="h-16 w-14 shrink-0 rounded-lg bg-zinc-950 [image-rendering:pixelated]"
      aria-hidden="true"
    />
  );
};

export const ProfilePictureBuilder: React.FC<ProfilePictureBuilderProps> = ({ gender, language, initialSelection, onApply }: ProfilePictureBuilderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeCategory, setActiveCategory] = useState<ProfileBuilderCategoryId>('hair');
  const [selection, setSelection] = useState<ProfileBuilderSelection>(() => normalizeProfileSelection(gender, initialSelection || createDefaultProfileSelection(gender)));
  const activeLanguage: GameLanguage = language || 'en';
  const tr = (key: string, vars?: Record<string, string | number>) => t(activeLanguage, key, vars);
  const trFallback = (key: string, fallback: string) => {
    const translated = tr(key);
    return translated === key ? fallback : translated;
  };
  const getCategoryLabel = (category: { id: ProfileBuilderCategoryId; label: string }) => trFallback(`profileBuilder.category.${category.id}`, category.label);
  const getPartLabel = (part: ProfileBuilderPart) => trFallback(`profileBuilder.part.${part.id}`, part.label);

  const compatibleOptions = useMemo(() => getCompatibleProfileOptions(gender), [gender]);

  useEffect(() => {
    setSelection(current => normalizeProfileSelection(gender, initialSelection || current));
  }, [gender, initialSelection]);

  const renderPortrait = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    renderProfilePortrait(ctx, selection);
  }, [selection]);

  useEffect(() => {
    renderPortrait();
  }, [renderPortrait]);

  const applyPortrait = () => {
    onApply(exportProfilePortrait(selection, 3), selection);
  };

  const optionsForCategory = compatibleOptions[activeCategory] || [];
  const selectedId = selection[activeCategory];
  const isColorCategory = COLOR_CATEGORIES.has(activeCategory);
  const activeCategoryConfig = PROFILE_BUILDER_CATEGORIES.find(category => category.id === activeCategory);

  const selectOption = (id: string) => {
    setSelection(current => normalizeProfileSelection(gender, { ...current, [activeCategory]: id }));
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 text-white">
      <div className="flex items-start justify-between gap-12 pr-12">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-amber-400 font-black">{tr('profileBuilder.loadout')}</div>
          <h4 className="text-2xl font-black leading-none tracking-tight text-white">{tr('profileBuilder.title')}</h4>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
          {tr('profileBuilder.editMode')}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[1.25rem] border border-amber-500/25 bg-[linear-gradient(180deg,rgba(20,20,22,0.98),rgba(0,0,0,0.98))] p-4 shadow-2xl shadow-black/50">
        <div className="absolute left-0 right-0 top-0 h-px bg-amber-400/50" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-amber-900/50" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <div className="mb-3 inline-flex rounded-md border border-zinc-700 bg-black px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
              {tr('profileBuilder.activeSlot')}
            </div>
            <div className="text-lg font-black uppercase tracking-[0.16em] text-white">{activeCategoryConfig ? getCategoryLabel(activeCategoryConfig) : tr('profileBuilder.edit')}</div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
              {tr('profileBuilder.variantsLoaded', { count: optionsForCategory.length })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-[0.14em]">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-zinc-500">
                {tr('profileBuilder.layer')} <span className="text-amber-400">{PROFILE_BUILDER_CATEGORIES.findIndex(category => category.id === activeCategory) + 1}</span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-zinc-500">
                {tr('profileBuilder.state')} <span className="text-amber-400">{tr('profileBuilder.state.live')}</span>
              </div>
            </div>
          </div>

          <div className="relative aspect-[112/128] w-36 rounded-[1.1rem] border-2 border-black bg-zinc-950 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
            <canvas
              ref={canvasRef}
              width={PROFILE_CANVAS_WIDTH}
              height={PROFILE_CANVAS_HEIGHT}
              className="h-full w-full rounded-[0.75rem] bg-zinc-900 object-cover [image-rendering:pixelated]"
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md border border-amber-300/40 bg-black px-3 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">
              {tr('profileBuilder.preview')}
            </div>
          </div>
        </div>
      </section>

      <nav className="rounded-[1.1rem] border border-zinc-800 bg-black p-2">
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {PROFILE_BUILDER_CATEGORIES.map((category, index) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`min-h-12 min-w-[5.75rem] rounded-xl border px-3 text-[9px] font-black uppercase tracking-[0.11em] transition-all ${isActive ? 'border-amber-300 bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-white'}`}
              >
                <span className="mb-1 block text-[8px] opacity-60">#{String(index + 1).padStart(2, '0')}</span>
                <span>{getCategoryLabel(category)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <section className="rounded-[1.15rem] border border-zinc-800 bg-black/70 p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{tr('profileBuilder.partInventory')}</div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">{activeCategoryConfig ? getCategoryLabel(activeCategoryConfig) : ''}</div>
        </div>

        <div className="grid max-h-[18rem] grid-cols-2 gap-2 overflow-y-auto pr-1 custom-scrollbar">
          {optionsForCategory.map((option, index) => {
            const isSelected = selectedId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectOption(option.id)}
                className={`relative min-h-[7.25rem] overflow-hidden rounded-xl border p-2 text-left transition-all ${isSelected ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_0_2px_rgba(245,158,11,0.14)]' : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-600'}`}
              >
                {isSelected && (
                  <span className="absolute right-2 top-2 z-10 rounded-md bg-amber-400 p-1 text-black">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                <span className="absolute left-2 top-2 rounded-md border border-zinc-800 bg-black px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="flex h-16 items-center justify-center rounded-lg bg-black/55 ring-1 ring-white/5">
                  {isColorCategory ? (
                    <span
                      className="block h-11 w-16 rounded-lg border border-white/10 shadow-inner"
                      style={{ background: option.swatch }}
                    />
                  ) : (
                    <PixelOptionThumb category={activeCategory} option={option} selection={selection} />
                  )}
                </div>

                <div className="mt-2 min-h-8 text-center text-[10px] font-black uppercase leading-tight tracking-[0.1em] text-white">
                  {getPartLabel(option)}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-1 bg-gradient-to-t from-black via-black to-transparent px-1 pt-2">
        <button
          type="button"
          onClick={applyPortrait}
          className="w-full rounded-xl border border-amber-300 bg-amber-500 py-4 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_0_30px_rgba(245,158,11,0.16)] transition-colors hover:bg-amber-400"
        >
          {tr('profileBuilder.usePortrait')}
        </button>
      </div>
    </div>
  );
};
