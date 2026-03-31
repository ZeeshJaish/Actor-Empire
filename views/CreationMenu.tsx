
import React, { useState, useRef, useMemo } from 'react';
import { User, Calendar, Check, ArrowRight, Camera, UploadCloud, AtSign } from 'lucide-react';
import { Gender } from '../types';
import { MALE_AVATAR_SEEDS, FEMALE_AVATAR_SEEDS } from '../services/npcLogic';

interface CreationMenuProps {
  onStartGame: (name: string, age: number, gender: Gender, avatar: string, handle: string) => void;
}

export const CreationMenu: React.FC<CreationMenuProps> = ({ onStartGame }) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [isHandleEdited, setIsHandleEdited] = useState(false);
  const [age, setAge] = useState<number | string>(18);
  const [gender, setGender] = useState<Gender>('MALE');
  const [selectedAvatar, setSelectedAvatar] = useState(`https://api.dicebear.com/8.x/pixel-art/svg?seed=${MALE_AVATAR_SEEDS[0]}`);
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter avatars based on gender
  const currentAvatarList = useMemo(() => {
      const seeds = gender === 'MALE' 
        ? MALE_AVATAR_SEEDS 
        : gender === 'FEMALE' 
            ? FEMALE_AVATAR_SEEDS 
            : [...MALE_AVATAR_SEEDS, ...FEMALE_AVATAR_SEEDS].sort(() => 0.5 - Math.random());
      
      return seeds.slice(0, 30).map(seed => `https://api.dicebear.com/8.x/pixel-art/svg?seed=${seed}`);
  }, [gender]);

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

  // Reset avatar when gender changes if not uploaded
  React.useEffect(() => {
      if (!isCustomUpload) {
          setSelectedAvatar(currentAvatarList[0]);
      }
  }, [gender, currentAvatarList]);

  return (
    <div className="h-full relative flex flex-col bg-black overflow-hidden font-sans">
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
            <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px] animate-blob-slow" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-900/10 rounded-full blur-[80px] animate-blob-slow" style={{ animationDelay: '2s' }} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
        </div>

      <div className="flex-1 flex flex-col justify-center p-6 relative z-10 overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="text-center mb-6 animate-in slide-in-from-top duration-700">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900/50 rounded-2xl mb-4 border border-zinc-800 shadow-xl backdrop-blur-sm">
             <User size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Create Your Star</h1>
          <p className="text-zinc-400 text-sm tracking-wide">Define the face of the next generation.</p>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-6">
          
          {/* AVATAR SECTION */}
          <div className="space-y-4">
              {/* Selected Preview */}
              <div className="flex flex-col items-center justify-center mb-2">
                  <div className="relative group cursor-pointer" onClick={triggerFileUpload}>
                      <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-transform duration-300 group-hover:scale-105 relative z-10">
                          {isCompressing ? (
                              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center border-4 border-black">
                                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                          ) : (
                              <img 
                                src={selectedAvatar} 
                                alt="Selected Avatar" 
                                className="w-full h-full rounded-full bg-zinc-900 object-cover border-4 border-black" 
                              />
                          )}
                      </div>
                      {/* Upload Badge Overlay */}
                      <div className="absolute bottom-0 right-0 bg-white text-black p-2 rounded-full border-4 border-black shadow-xl z-20 group-hover:bg-amber-100 transition-colors">
                          <Camera size={18} />
                      </div>
                      
                      {/* 
                          iPad Crash Fix: 
                          Do not use className="hidden" or display: none.
                          Use opacity-0 and dimensions to keep it in layout for popover anchoring.
                      */}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="absolute opacity-0 w-1 h-1 -z-10 overflow-hidden top-0 left-0" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                      />
                  </div>
                  <button onClick={triggerFileUpload} className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-3 hover:text-white transition-colors flex items-center gap-1">
                      <UploadCloud size={12}/> Tap to Upload Photo
                  </button>
              </div>

              {/* Preset Grid (Scrollable) */}
              <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-4 border border-white/5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 block px-1">Choose Preset</label>
                  <div className="grid grid-cols-5 gap-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {currentAvatarList.map((avatarUrl, idx) => {
                          const isSelected = selectedAvatar === avatarUrl;
                          return (
                            <button 
                                key={idx}
                                type="button"
                                onClick={() => { setSelectedAvatar(avatarUrl); setIsCustomUpload(false); }}
                                className={`aspect-square rounded-xl overflow-hidden relative transition-all duration-300 ${isSelected ? 'ring-2 ring-amber-500 scale-110 z-10 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                            >
                                <img src={avatarUrl} alt="avatar" className="w-full h-full bg-zinc-800 object-cover" />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <Check size={14} className="text-white drop-shadow-md" strokeWidth={3}/>
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
    </div>
  );
};
