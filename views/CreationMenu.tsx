
import React, { useState, useRef, useMemo } from 'react';
import { User, Calendar, Check, ArrowRight, UploadCloud, AtSign, X, Shuffle } from 'lucide-react';
import { Gender } from '../types';
import { ProfilePictureBuilder } from './avatar/ProfilePictureBuilder';
import {
  ProfileBuilderGender,
  ProfileBuilderSelection,
  createDefaultProfileSelection,
  createSeededProfileSelection,
} from '../services/profileBuilder';
import { exportProfilePortrait } from './avatar/profilePortraitRenderer';

interface CreationMenuProps {
  onStartGame: (name: string, age: number, gender: Gender, avatar: string, handle: string) => void;
}

interface PortraitPreset {
  id: string;
  label: string;
  selection: ProfileBuilderSelection;
  thumbnail: string;
}

const PROFILE_PRESET_SEEDS = [
  'Opening Night',
  'Casting Call',
  'Studio Breakout',
  'Award Season',
  'Indie Darling',
  'Action Lead',
  'Press Tour',
  'Festival Face',
  'Streaming Star',
  'Teen Idol',
  'Prestige Role',
  'Red Carpet Debut',
];

const toProfileGender = (gender: Gender): ProfileBuilderGender => {
  if (gender === 'FEMALE') return 'FEMALE';
  if (gender === 'NON_BINARY') return 'NON_BINARY';
  return 'MALE';
};

const safeExportProfilePortrait = (selection: ProfileBuilderSelection, exportScale = 3): string => {
  if (typeof document === 'undefined') return '';
  return exportProfilePortrait(selection, exportScale);
};

export const CreationMenu: React.FC<CreationMenuProps> = ({ onStartGame }) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [isHandleEdited, setIsHandleEdited] = useState(false);
  const [age, setAge] = useState<number | string>(18);
  const [gender, setGender] = useState<Gender>('MALE');
  const initialProfileGender = toProfileGender('MALE');
  const initialSelection = createDefaultProfileSelection(initialProfileGender);
  const [selectedProfileSelection, setSelectedProfileSelection] = useState<ProfileBuilderSelection | null>(initialSelection);
  const [selectedAvatar, setSelectedAvatar] = useState(() => safeExportProfilePortrait(initialSelection, 3));
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showPortraitBuilder, setShowPortraitBuilder] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileGender = useMemo(() => toProfileGender(gender), [gender]);

  const portraitPresets = useMemo<PortraitPreset[]>(() => {
      return PROFILE_PRESET_SEEDS.map((seed, index) => {
          const selection = createSeededProfileSelection(profileGender, `${profileGender}:${seed}:${index}`);
          return {
              id: `${profileGender}-${seed}`,
              label: seed,
              selection,
              thumbnail: safeExportProfilePortrait(selection, 1),
          };
      });
  }, [profileGender]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setName(newName);
      // Auto-generate handle if user hasn't manually edited it
      if (!isHandleEdited) {
          const autoHandle = `@${newName.toLowerCase().replace(/\s+/g, '')}`;
          setHandle(autoHandle);
      }
  };

  const handleHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHandle(e.target.value);
      setIsHandleEdited(true);
  };

  const handleStart = () => {
    const parsedAge = typeof age === 'string' ? parseInt(age, 10) : age;
    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }
    if (!handle.trim() || handle.length < 2) {
        setError('Please enter a valid social handle.');
        return;
    }
    if (isNaN(parsedAge) || parsedAge < 15) {
      setError('You must be at least 15 years old.');
      return;
    }
    
    // Ensure handle starts with @
    const finalHandle = handle.startsWith('@') ? handle : `@${handle}`;

    setError('');
    onStartGame(name, parsedAge, gender, selectedAvatar, finalHandle);
  };

  const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          // Optimization: Use createObjectURL instead of FileReader to avoid 
          // loading the huge base64 string into memory before resizing.
          const blobUrl = URL.createObjectURL(file);
          const img = new Image();
          
          img.onload = () => {
              // Revoke URL to free memory immediately
              URL.revokeObjectURL(blobUrl);

              const canvas = document.createElement('canvas');
              // Limit max dimensions to 300px to keep save file small
              const MAX_SIZE = 300;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                  if (width > MAX_SIZE) {
                      height *= MAX_SIZE / width;
                      width = MAX_SIZE;
                  }
              } else {
                  if (height > MAX_SIZE) {
                      width *= MAX_SIZE / height;
                      height = MAX_SIZE;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  // Export as JPEG with 0.7 quality for compression
                  resolve(canvas.toDataURL('image/jpeg', 0.7));
              } else {
                  reject(new Error("Canvas context failed"));
              }
          };

          img.onerror = (err) => {
              URL.revokeObjectURL(blobUrl);
              reject(err);
          };

          img.src = blobUrl;
      });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation
      if (!file.type.startsWith('image/')) {
          setError("Please upload an image file.");
          return;
      }
      
      setIsCompressing(true);
      setError('');
      
      try {
          const compressed = await compressImage(file);
          setSelectedAvatar(compressed);
          setSelectedProfileSelection(null);
          setIsCustomUpload(true);
      } catch (err) {
          console.error("Image processing failed", err);
          setError("Failed to process image. Try a smaller file.");
      } finally {
          setIsCompressing(false);
          // Reset input so same file can be selected again if needed
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const applyProfileSelection = (selection: ProfileBuilderSelection) => {
      setSelectedProfileSelection(selection);
      setSelectedAvatar(safeExportProfilePortrait(selection, 3));
      setIsCustomUpload(false);
      setError('');
  };

  const randomizePortrait = () => {
      const currentSignature = selectedProfileSelection ? Object.values(selectedProfileSelection).join('|') : 'custom';
      const randomSeed = `${profileGender}:${currentSignature}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      applyProfileSelection(createSeededProfileSelection(profileGender, randomSeed));
  };

  // Reset modular avatar when gender changes, while preserving manual uploads.
  React.useEffect(() => {
      if (!isCustomUpload && portraitPresets[0]) {
          applyProfileSelection(portraitPresets[0].selection);
      }
  }, [profileGender, portraitPresets, isCustomUpload]);

  return (
    <div className="h-full relative flex flex-col bg-black overflow-hidden overflow-x-hidden font-sans">
        {/* Custom CSS for blob animations */}
        <style>{`
            @keyframes float-slow {
                0% { transform: translate(0px, 0px) scale(1); }
                33% { transform: translate(20px, -30px) scale(1.1); }
                66% { transform: translate(-10px, 20px) scale(0.95); }
                100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob-slow {
                animation: float-slow 15s infinite ease-in-out;
            }
        `}</style>

        {/* Background Atmosphere */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-18%] right-[-8rem] h-96 w-96 bg-indigo-900/20 rounded-full blur-[100px] animate-blob-slow" />
            <div className="absolute bottom-[-10%] left-[-8rem] h-80 w-80 bg-amber-900/10 rounded-full blur-[80px] animate-blob-slow" style={{ animationDelay: '2s' }} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
        </div>

      <div className="flex-1 min-h-0 flex flex-col justify-start px-6 pb-12 pt-8 relative z-10 overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="mb-5 animate-in slide-in-from-top duration-700">
          <div className="mx-auto w-full max-w-sm rounded-[1.35rem] border border-zinc-800 bg-black/55 p-4 shadow-xl backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">New Career File</div>
              <div className="rounded-md border border-zinc-700 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Slot Setup</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-white shadow-inner">
                <User size={28} />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-black leading-none tracking-tight text-white">Create Your Star</h1>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Build the playable actor file.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-6">
          
          {/* AVATAR SECTION */}
          <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-amber-500/25 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(0,0,0,0.98))] p-4 shadow-[0_0_32px_rgba(245,158,11,0.06)]">
                  <div className="absolute left-0 right-0 top-0 h-px bg-amber-400/50" />
                  <div className="absolute inset-x-4 top-16 h-px bg-white/5" />
                  <div className="relative flex flex-col items-center">
                      <div className="mb-3 grid w-full grid-cols-[1fr_auto] items-center gap-3">
                          <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">Portrait Rig</div>
                              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Modular actor build</div>
                          </div>
                          <div className="rounded-lg border border-zinc-700 bg-black px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400">
                              PXL-01
                          </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPortraitBuilder(true)}
                        className="group relative"
                        aria-label="Build pixel portrait"
                      >
                          <div className="relative z-10 h-44 w-44 rounded-[1.35rem] border-2 border-black bg-black p-2 shadow-2xl shadow-black/60 transition-transform duration-300 group-hover:scale-[1.03]">
                              <div className="h-full w-full overflow-hidden rounded-[1rem] bg-zinc-950 ring-1 ring-white/10">
                                  {isCompressing ? (
                                      <div className="flex h-full w-full items-center justify-center">
                                          <div className="h-9 w-9 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                                      </div>
                                  ) : selectedAvatar ? (
                                      <img
                                        src={selectedAvatar}
                                        alt="Selected portrait"
                                        className="h-full w-full object-cover [image-rendering:pixelated]"
                                      />
                                  ) : (
                                      <div className="flex h-full w-full items-center justify-center text-zinc-700">
                                          <User size={38} />
                                      </div>
                                  )}
                              </div>
                              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-amber-300/40 bg-black px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
                                  {isCustomUpload ? 'Custom Photo' : 'Modular Build'}
                              </div>
                          </div>
                          <div className="absolute inset-4 rounded-[1.35rem] bg-amber-500/14 blur-2xl transition-opacity group-hover:opacity-80" />
                      </button>

                      <div className="mt-7 grid w-full grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setShowPortraitBuilder(true)}
                            className="rounded-xl border border-amber-300 bg-amber-500 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[0_0_20px_rgba(245,158,11,0.16)] transition-colors hover:bg-amber-400"
                          >
                              Build
                          </button>
                          <button
                            type="button"
                            onClick={randomizePortrait}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:border-amber-400/40 hover:text-amber-200"
                          >
                              <Shuffle size={14} /> Random
                          </button>
                      </div>

                      <button
                        type="button"
                        onClick={triggerFileUpload}
                        className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white"
                      >
                          <UploadCloud size={12}/> Upload custom photo
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        className="absolute opacity-0 w-1 h-1 -z-10 overflow-hidden top-0 left-0"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                  </div>
              </div>

              <div className="rounded-[1.35rem] border border-zinc-800 bg-black/65 p-4 backdrop-blur-md">
                  <div className="mb-3 flex items-center justify-between gap-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Preset Bench</label>
                      <button
                        type="button"
                        onClick={randomizePortrait}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-400 hover:text-amber-200"
                      >
                          Reroll Face
                      </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {portraitPresets.map(preset => {
                          const isSelected = selectedProfileSelection === preset.selection;
                          return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyProfileSelection(preset.selection)}
                                className={`relative aspect-square overflow-hidden rounded-2xl border bg-zinc-900 transition-all duration-300 ${isSelected ? 'border-amber-400 shadow-[0_0_0_2px_rgba(245,158,11,0.25)] scale-[1.04] z-10' : 'border-white/5 opacity-75 hover:opacity-100 hover:border-zinc-600'}`}
                                title={preset.label}
                            >
                                <img src={preset.thumbnail} alt={preset.label} className="h-full w-full object-cover [image-rendering:pixelated]" />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <Check size={16} className="text-white drop-shadow-md" strokeWidth={3}/>
                                    </div>
                                )}
                            </button>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* FORM INPUTS */}
          <div className="space-y-4">
              
              {/* Gender */}
              <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 block px-1">Identity</label>
                  <div className="grid grid-cols-3 gap-2 bg-zinc-900/60 p-1 rounded-2xl border border-zinc-800">
                      <button 
                        onClick={() => setGender('MALE')}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${gender === 'MALE' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                          Male
                      </button>
                      <button 
                        onClick={() => setGender('FEMALE')}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${gender === 'FEMALE' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                          Female
                      </button>
                      <button 
                        onClick={() => setGender('NON_BINARY')}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${gender === 'NON_BINARY' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                          Non-Binary
                      </button>
                  </div>
              </div>

              {/* Name */}
              <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 block px-1">Stage Name</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                        <User size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Alex Sterling"
                      value={name}
                      onChange={handleNameChange}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-lg focus:outline-none focus:border-amber-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-700"
                    />
                  </div>
              </div>

              {/* Social Handle */}
              <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 block px-1">Social Handle</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                        <AtSign size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="@alexsterling"
                      value={handle}
                      onChange={handleHandleChange}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white font-mono font-bold text-lg focus:outline-none focus:border-amber-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-700"
                    />
                  </div>
              </div>

              {/* Age */}
              <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 block px-1">Starting Age</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                        <Calendar size={18} />
                    </div>
                    <input
                      type="number"
                      placeholder="18"
                      value={age}
                      min={15}
                      max={99}
                      onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-lg focus:outline-none focus:border-amber-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-700"
                    />
                  </div>
              </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center animate-in fade-in slide-in-from-bottom-2">
                <p className="text-rose-400 text-xs font-bold">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={isCompressing}
            className={`group w-full py-5 rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 relative overflow-hidden ${isCompressing ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-amber-600 text-black'}`}
          >
            <span className="relative z-10 flex items-center gap-2">
                {isCompressing ? 'Processing Image...' : <>Begin Career <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/></>}
            </span>
            {!isCompressing && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-xl"></div>}
          </button>
        </div>
      </div>
      {showPortraitBuilder && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md max-h-[100dvh] overflow-x-hidden overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] border border-zinc-800 bg-black p-5 custom-scrollbar">
            <button
              type="button"
              onClick={() => setShowPortraitBuilder(false)}
              className="absolute right-4 top-4 rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <ProfilePictureBuilder
              gender={gender}
              initialSelection={selectedProfileSelection}
              onApply={(avatarDataUrl, selection) => {
                setSelectedAvatar(avatarDataUrl);
                setSelectedProfileSelection(selection || null);
                setIsCustomUpload(false);
                setShowPortraitBuilder(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
