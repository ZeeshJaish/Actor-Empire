import { useState } from 'react';
import type { ActState, NewCareerData } from './types';
import '../styles/intro.css';

/* placeholder busts — swap in real pixel portraits from the character creator */
const SKINS = ['#8a5a3b', '#c78d5e', '#5c3a24', '#e0a67a', '#a06a42', '#6e4526', '#d69a6b', '#78482a'];
const HAIRS = ['#e6c34c', '#2a2118', '#8a8f96', '#5a2f16', '#c2452a', '#e8e3da', '#1c1c20', '#7a3a1c'];
const SHIRTS = ['#3a6ea5', '#7a2e2e', '#2e6e4f', '#5b4a8a', '#8a6a2e', '#2e5f6e', '#6e2e5b', '#444a52'];

function bustSVG(i: number): string {
  const s = SKINS[i % 8], h = HAIRS[i % 8], t = SHIRTS[(i + 3) % 8];
  return `<svg viewBox="0 0 64 64"><path d="M10 64c0-13 9-19 22-19s22 6 22 19z" fill="${t}"/><rect x="26" y="34" width="12" height="12" rx="3" fill="${s}"/><circle cx="32" cy="24" r="13" fill="${s}"/><path d="M19 22c0-8 6-14 13-14s13 6 13 14c0-3-5-7-13-7s-13 4-13 7z" fill="${h}"/></svg>`;
}

const GENDERS = ['Male', 'Female', 'Non-Binary'] as const;

interface Props {
  state?: ActState;
  onBegin?: (data: NewCareerData) => void;
  onBack?: () => void;
}

/** ACT V — CREATE YOUR STAR (new career form). */
export default function CreateStarScreen({ state = 'on', onBegin, onBack }: Props) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [gender, setGender] = useState<NewCareerData['gender']>('Male');
  const [stageName, setStageName] = useState('');
  const [handle, setHandle] = useState('');
  const [age, setAge] = useState(18);

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
            <div className="bust" dangerouslySetInnerHTML={{ __html: bustSVG(presetIndex) }} />
          </div>
          <div className="portrait-actions">
            <button className="chip-btn solid">Build</button>
            <button
              className="chip-btn ghost"
              onClick={() => setPresetIndex(Math.floor(Math.random() * 8))}
            >
              ⚂ Random
            </button>
          </div>
          <button className="upload-line">⬆ Upload custom photo</button>
        </div>

        <div className="panel">
          <div className="panel-bar">
            <div className="kicker">Preset Bench</div>
            <button
              className="upload-line"
              style={{ color: 'var(--gold)', padding: 0 }}
              onClick={() => setPresetIndex((presetIndex + 1) % 8)}
            >
              Reroll Face
            </button>
          </div>
          <div className="preset-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <button
                key={i}
                className={'preset' + (i === presetIndex ? ' sel' : '')}
                onClick={() => setPresetIndex(i)}
              >
                <div className="bust" dangerouslySetInnerHTML={{ __html: bustSVG(i) }} />
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
                onClick={() => setGender(g)}
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
            <button onClick={() => setAge(Math.max(18, age - 1))}>−</button>
            <div className="val">
              <span>{age}</span>
              <small>Years old</small>
            </div>
            <button onClick={() => setAge(Math.min(45, age + 1))}>+</button>
          </div>
        </div>

        <button
          className="btn-begin"
          onClick={() => onBegin?.({ presetIndex, gender, stageName, handle, age })}
        >
          Begin Career
        </button>
      </div>
    </section>
  );
}
