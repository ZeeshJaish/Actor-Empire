import { useState } from 'react';
import { Clock3, Upload } from 'lucide-react';
import { logoDataUri } from '../assets/logo';
import type { ActState, SlotEntry } from './types';
import { isAndroidSaveTransferSurface, type SaveTransferResult } from '../services/saveTransfer';
import '../styles/intro.css';

interface Props {
  state?: ActState;
  /** One entry per slot; null renders an empty "create a new star" slot */
  slots: SlotEntry[];
  onPlay?: (slotIndex: number) => void;
  onDeleteSlot?: (slotIndex: number) => void;
  onImportData?: () => Promise<SaveTransferResult | void>;
  onCreateNew?: (slotIndex: number) => void;
  onBack?: () => void;
  version?: string;
  credit?: string;
}

const formatTotalPlayTime = (totalPlayTimeMs: number) => {
  const totalHours = Math.max(0, totalPlayTimeMs) / 3_600_000;
  return totalHours < 100 ? `${totalHours.toFixed(1)}h` : `${Math.floor(totalHours)}h`;
};

/** ACT IV — save slot selection. */
export default function SaveSlotScreen({
  state = 'on',
  slots,
  onPlay,
  onDeleteSlot,
  onImportData,
  onCreateNew,
  onBack,
  version = 'Version 1.0.18',
  credit = 'Designed & built by Zeesh',
}: Props) {
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<number | null>(null);
  const [isImportingSave, setIsImportingSave] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const showSaveImport = isAndroidSaveTransferSurface() && !!onImportData;

  const handleImportSave = async () => {
    if (!onImportData || isImportingSave) return;
    setIsImportingSave(true);
    setImportNotice(null);
    try {
      const result = await onImportData();
      if (result) {
        setImportNotice(`Imported ${result.saveSlots} save slot${result.saveSlots === 1 ? '' : 's'}. Restarting.`);
      }
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : 'Import blocked.');
    } finally {
      setIsImportingSave(false);
    }
  };

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
        <div className="slot-actions">
          {showSaveImport && (
            <button
              type="button"
              className="slot-import"
              onClick={handleImportSave}
              disabled={isImportingSave}
            >
              <Upload size={13} />
              {isImportingSave ? 'Importing' : 'Import Save'}
            </button>
          )}
          <button className="back-link" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
      {importNotice && (
        <div className="slot-import-notice">
          {importNotice}
        </div>
      )}
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
                  <span className="slot-time" title="Total time played">
                    <Clock3 size={13} strokeWidth={2.5} aria-hidden="true" />
                    <b>{formatTotalPlayTime(slot.totalPlayTimeMs)}</b>
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
