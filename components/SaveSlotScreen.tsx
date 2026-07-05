import { useState } from 'react';
import { logoDataUri } from '../assets/logo';
import type { ActState, SlotEntry } from './types';
import '../styles/intro.css';

interface Props {
  state?: ActState;
  /** One entry per slot; null renders an empty "create a new star" slot */
  slots: SlotEntry[];
  onPlay?: (slotIndex: number) => void;
  onDeleteSlot?: (slotIndex: number) => void;
  onCreateNew?: (slotIndex: number) => void;
  onBack?: () => void;
  version?: string;
  credit?: string;
}

/** ACT IV — save slot selection. */
export default function SaveSlotScreen({
  state = 'on',
  slots,
  onPlay,
  onDeleteSlot,
  onCreateNew,
  onBack,
  version = 'Version 1.0.18',
  credit = 'Designed & built by Zeesh',
}: Props) {
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<number | null>(null);

  return (
    <section className={`phase ${state}`.trim()} id="act4">
      <div className="menu-head">
        <img className="menu-logo" src={logoDataUri} alt="" />
        <div>
          <div className="menu-title">ACTOR EMPIRE</div>
          <div className="menu-sub">{version}</div>
        </div>
      </div>
      <div className="slot-bar">
        <div className="kicker">Select Save Slot</div>
        <button className="back-link" onClick={onBack}>
          Back
        </button>
      </div>
      <div className="slot-list">
        {slots.map((slot, i) =>
          slot ? (
            <div key={i} className="slot-card active-slot" onClick={() => onPlay?.(i)}>
              <div className="slot-info">
                <div className="slot-tags">
                  <span className="tag num">Slot {i + 1}</span>
                  <span className="tag live">Active</span>
                  {onDeleteSlot && (
                    <button
                      type="button"
                      className={'slot-delete' + (confirmDeleteSlot === i ? ' confirm' : '')}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (confirmDeleteSlot === i) {
                          onDeleteSlot(i);
                          setConfirmDeleteSlot(null);
                        } else {
                          setConfirmDeleteSlot(i);
                        }
                      }}
                    >
                      {confirmDeleteSlot === i ? 'Confirm' : 'Delete'}
                    </button>
                  )}
                </div>
                <div className="slot-name">{slot.name}</div>
                <div className="slot-stats">
                  <span>
                    Age <b>{slot.age}</b>
                  </span>
                  <span className="gold">
                    ★ <b>{slot.fame}</b> Fame
                  </span>
                </div>
              </div>
              <div className="slot-go">
                <span className="play" />
              </div>
            </div>
          ) : (
            <div key={i} className="slot-card empty" onClick={() => onCreateNew?.(i)}>
              <div className="slot-info">
                <div className="slot-tags">
                  <span className="tag num">Slot {i + 1}</span>
                </div>
                <div className="slot-name">Empty Slot</div>
                <div className="slot-stats">
                  <span>Start a new career</span>
                </div>
              </div>
              <div className="slot-go new">+</div>
            </div>
          )
        )}
      </div>
      <div className="menu-foot credit" style={{ opacity: 0 }}>
        {credit}
      </div>
    </section>
  );
}
