/**
 * #190 (plan §22.4, §22.7 Q4): the company is sold. What it went for, what you were paid, and the road back: two years
 * after the sale a new streaming company can be founded, and the founding starts again.
 */
import { ArrowLeft } from 'lucide-react';
import type { Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { STREAMING_NEW_COMPANY_WEEKS, getStreamingNewCompanyWait, startNewStreamingCompany } from '../services/streamingCompanySale';
import '../styles/streaming-sold.css';

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(2).replace(/\.?0+$/, '')}B` : `$${Math.round(value / 1e6)}M`);
const weeks = (n: number) => `${n} week${n === 1 ? '' : 's'}`;

interface Props {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  onBack: () => void;
}

export default function StreamingSoldScreen({ player, onUpdatePlayer, onBack }: Props) {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const sale = platform.governance.sale || null;
  const bid = sale?.bids.find(item => item.id === sale.acceptedBidId) || null;
  const wait = getStreamingNewCompanyWait(player) ?? STREAMING_NEW_COMPANY_WEEKS;
  /* #205: you can also have left altogether: your last shares sold, and no office */
  const departure = platform.governance.departure || null;
  const soldAt = departure?.atAbsoluteWeek ?? sale?.soldAtAbsoluteWeek ?? null;
  const weeksAgo = soldAt === null ? 0 : Math.max(0, getAbsoluteWeek(player.age, player.currentWeek) - soldAt);
  const progress = Math.min(1, Math.max(0, (STREAMING_NEW_COMPANY_WEEKS - wait) / STREAMING_NEW_COMPANY_WEEKS));
  const name = platform.identity?.name || 'EMPIRE+';
  const buyer = bid?.buyerName || 'its new owner';
  const earlier = player.soldStreamingCompanies || [];

  return (
    <div className="sold-shell">
      <header className="sold-top">
        <button type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button>
        <span>EMPIRE<b>+</b> · STREAMING BUSINESS</span>
      </header>
      <main className="sold-main">
        <section className="sold-hero">
          <i className="sold-stamp" aria-hidden="true">{departure ? 'LEFT' : 'SOLD'}</i>
          <h1>{name}</h1>
          <p>{departure ? 'You hold no shares and no office' : `to ${buyer} for ${money(bid?.price || 0)}`} · {weeksAgo ? `${weeks(weeksAgo)} ago` : 'this week'}</p>
        </section>

        <section className="sold-card">
          <span>YOUR STAKE</span>
          <b>{money(departure ? departure.proceeds : sale?.founderCash || 0)}</b>
          <p>{departure ? 'What your last shares brought. The service carries on without you.' : `Paid in cash for your ${(sale?.founderPercentAtSale ?? 0).toFixed(1)}%; every holder was paid their share. The service carries on under ${buyer}.`}</p>
        </section>

        <section className="sold-card">
          <span>A NEW COMPANY</span>
          {wait > 0 ? (
            <>
              <b>in {weeks(wait)}</b>
              <p>Two years after {departure ? 'leaving' : 'a sale'} you may found a new streaming company.</p>
              <i className="sold-bar" aria-hidden="true"><em style={{ width: `${progress * 100}%` }} /></i>
            </>
          ) : (
            <>
              <b>Ready</b>
              <p>The founding starts again: a new name, a new plan, your own money.</p>
            </>
          )}
        </section>

        {earlier.length > 0 && (
          <section className="sold-card">
            <span>FOUNDED AND SOLD BEFORE</span>
            <ul className="sold-list">
              {earlier.map(item => (
                <li key={`${item.name}-${item.soldAtAbsoluteWeek}`}><b>{item.name}</b><em>to {item.buyerName} · {money(item.price)}</em></li>
              ))}
            </ul>
          </section>
        )}
      </main>
      {wait <= 0 && onUpdatePlayer && (
        <footer className="sold-foot">
          <button type="button" className="sold-go" onClick={() => {
            const result = startNewStreamingCompany(player);
            if (result.changed) onUpdatePlayer(result.player);
          }}>Found a new company</button>
        </footer>
      )}
    </div>
  );
}
