import { useMemo, useState } from 'react';
import type { ActState, NewCareerData } from './types';
import {
  createSeededProfileSelection,
} from '../services/profileBuilder';
import type { ProfileBuilderGender, ProfileBuilderSelection } from '../services/profileBuilder';
import { ProfilePictureBuilder } from '../views/avatar/ProfilePictureBuilder';
import { exportProfilePortrait } from '../views/avatar/profilePortraitRenderer';
import '../styles/intro.css';

const GENDERS = ['Male', 'Female', 'Non-Binary'] as const;
const PROFILE_PRESET_COUNT = 8;

const toProfileGender = (gender: NewCareerData['gender']): ProfileBuilderGender => {
  if (gender === 'Female') return 'FEMALE';
  if (gender === 'Non-Binary') return 'NON_BINARY';
  return 'MALE';
};

interface Props {
  state?: ActState;
  onBegin?: (data: NewCareerData) => void;
  onBack?: () => void;
}

/** ACT V — CREATE YOUR STAR (new career form). */
export default function CreateStarScreen({ state = 'on', onBegin, onBack }: Props) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [gender, setGender] = useState<NewCareerData['gender']>('Male');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState('');
  const [customSelection, setCustomSelection] = useState<ProfileBuilderSelection | null>(null);
  const [stageName, setStageName] = useState('');
  const [handle, setHandle] = useState('');
  const [age, setAge] = useState(15);
  const profileGender = toProfileGender(gender);
  const presetSelections = useMemo(
    () =>
      Array.from({ length: PROFILE_PRESET_COUNT }, (_, index) =>
        createSeededProfileSelection(profileGender, `create-star-${profileGender}-${index}`)
      ),
    [profileGender]
  );
  const selectedPreset = presetSelections[presetIndex] || presetSelections[0];
  const selectedPresetAvatar = useMemo(
    () => (selectedPreset ? exportProfilePortrait(selectedPreset, 2) : ''),
    [selectedPreset]
  );
  const presetAvatars = useMemo(
    () => presetSelections.map((selection) => exportProfilePortrait(selection, 1)),
    [presetSelections]
  );
  const selectedAvatarDataUrl = customAvatarDataUrl || selectedPresetAvatar;
  const selectedSelection = customSelection || selectedPreset;
  const openBuilder = () => setIsBuilderOpen(true);
  const choosePreset = (index: number) => {
    setPresetIndex(index);
    setCustomAvatarDataUrl('');
    setCustomSelection(null);
  };
  const applyProfilePortrait = (avatarDataUrl: string, selection?: ProfileBuilderSelection) => {
    setCustomAvatarDataUrl(avatarDataUrl);
    setCustomSelection(selection || null);
    setIsBuilderOpen(false);
  };
  const rerollPreset = () => choosePreset((presetIndex + 1) % PROFILE_PRESET_COUNT);

  return (
    <section className={`phase ${state}`.trim()} id="act5">
      <div className="create-wrap">
        <div className="create-head">
          <button className="back-link" onClick={onBack} />
          <div className="create-title-box">
            <div className="create-kicker">New Career File</div>
            <div className="create-title">CREATE YOUR STAR</div>
            <div className="create-sub">Build the playable actor file</div>
          </div>
        </div>

        <div className="panel gold portrait-stage">
          <div className="panel-bar" style={{ width: '100%' }}>
            <div className="kicker">Portrait Rig</div>
            <div className="pill">PXL-01</div>
          </div>
          <div className="portrait-frame">
            {selectedAvatarDataUrl && (
              <img className="profile-avatar-preview" src={selectedAvatarDataUrl} alt="" />
            )}
          </div>
          <div className="portrait-actions">
            <button className="chip-btn solid" onClick={openBuilder}>
              Build
            </button>
            <button
              className="chip-btn ghost"
              onClick={() => choosePreset(Math.floor(Math.random() * PROFILE_PRESET_COUNT))}
            >
              ⚂ Random
            </button>
          </div>
          <button className="upload-line upload-line-hero" onClick={openBuilder}>
            ⬆ Upload custom photo
          </button>
        </div>

        {isBuilderOpen && (
          <div className="panel profile-builder-panel">
            <ProfilePictureBuilder
              gender={profileGender}
              initialSelection={selectedSelection}
              onApply={applyProfilePortrait}
            />
          </div>
        )}

        <div className="panel">
          <div className="panel-bar">
            <div className="kicker">Preset Bench</div>
            <button
              className="upload-line"
              style={{ color: 'var(--gold)', padding: 0 }}
              onClick={rerollPreset}
            >
              Reroll Face
            </button>
          </div>
          <div className="preset-grid">
            {presetAvatars.map((avatar, i) => (
              <button
                key={i}
                className={'preset' + (i === presetIndex && !customAvatarDataUrl ? ' sel' : '')}
                onClick={() => choosePreset(i)}
              >
                <img className="profile-avatar-thumb" src={avatar} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">Identity</div>
          <div className="seg">
            {GENDERS.map((g) => (
              <button
                key={g}
                className={g === gender ? 'sel' : ''}
                onClick={() => {
                  setGender(g);
                  setPresetIndex(0);
                  setCustomAvatarDataUrl('');
                  setCustomSelection(null);
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">Stage Name</div>
          <div className="input-row">
            <span className="pre">✦</span>
            <input
              type="text"
              placeholder="e.g. Alex Sterling"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <div className="field-label">Social Handle</div>
          <div className="input-row">
            <span className="pre">@</span>
            <input
              type="text"
              placeholder="alexsterling"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <div className="field-label">Starting Age</div>
          <div className="stepper">
            <button onClick={() => setAge(Math.max(15, age - 1))}>−</button>
            <div className="val">
              <span>{age}</span>
              <small>Years old</small>
            </div>
            <button onClick={() => setAge(Math.min(45, age + 1))}>+</button>
          </div>
        </div>

        <button
          className="btn-begin"
          onClick={() =>
            onBegin?.({
              presetIndex,
              gender,
              stageName,
              handle,
              age,
              avatarDataUrl: selectedAvatarDataUrl,
              profileSelection: selectedSelection,
            })
          }
        >
          Begin Career
        </button>
      </div>
    </section>
  );
}
