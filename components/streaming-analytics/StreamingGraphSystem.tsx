import React, { useId } from 'react';
import type {
  StreamingAnalyticsPoint,
  StreamingMarketShareEntry,
  StreamingSubscriberWaterfall,
} from '../../services/streamingAnalytics';

const WIDTH = 600;
const HEIGHT = 220;
const PAD_X = 28;
const PAD_Y = 24;

const formatCompact = (value: number): string => {
  const absolute = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (absolute >= 1_000_000_000) return `${sign}${(absolute / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toFixed(0)}K`;
  return `${sign}${Math.round(absolute).toLocaleString()}`;
};

interface LineGraphProps {
  points: StreamingAnalyticsPoint[];
  label: string;
  valueFormatter?: (value: number) => string;
  primaryLabel?: string;
  secondaryLabel?: string;
  tone?: 'CYAN' | 'GREEN' | 'AMBER' | 'VIOLET';
}

export function StreamingLineGraph({
  points,
  label,
  valueFormatter = formatCompact,
  primaryLabel = 'Actual',
  secondaryLabel,
  tone = 'CYAN',
}: LineGraphProps) {
  const gradientId = useId().replace(/:/g, '');
  const values = points.flatMap(point => [
    point.value,
    ...(point.secondaryValue === undefined ? [] : [point.secondaryValue]),
  ]);
  if (!points.length) {
    return <div className="sag-empty-graph" role="status">The first committed weekly result will start this graph.</div>;
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = Math.max(1, maximum - minimum);
  const x = (index: number) => points.length === 1
    ? WIDTH / 2
    : PAD_X + index / (points.length - 1) * (WIDTH - PAD_X * 2);
  const y = (value: number) => PAD_Y + (maximum - value) / spread * (HEIGHT - PAD_Y * 2);
  const primaryPoints = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const secondaryPoints = points
    .filter(point => point.secondaryValue !== undefined)
    .map((point, index) => `${x(index)},${y(point.secondaryValue!)}`)
    .join(' ');
  const areaPoints = `${x(0)},${HEIGHT - PAD_Y} ${primaryPoints} ${x(points.length - 1)},${HEIGHT - PAD_Y}`;

  return (
    <div className={`sag-line-wrap is-${tone.toLowerCase()}`}>
      <svg className="sag-line-graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map(index => (
          <line key={index} x1={PAD_X} x2={WIDTH - PAD_X} y1={PAD_Y + index * ((HEIGHT - PAD_Y * 2) / 3)} y2={PAD_Y + index * ((HEIGHT - PAD_Y * 2) / 3)} className="sag-grid-line" />
        ))}
        <polygon points={areaPoints} fill={`url(#${gradientId})`} />
        {secondaryPoints ? <polyline points={secondaryPoints} className="sag-secondary-line" /> : null}
        <polyline points={primaryPoints} className="sag-primary-line" />
        {points.map((point, index) => (
          <g key={`${point.absoluteWeek}:${index}`}>
            <circle cx={x(index)} cy={y(point.value)} r={point.isForecast ? 4 : 3.2} className={point.isForecast ? 'sag-dot is-forecast' : 'sag-dot'} />
            <title>{`${point.label}: ${valueFormatter(point.value)}${point.secondaryValue === undefined ? '' : ` • ${secondaryLabel || 'Reference'} ${valueFormatter(point.secondaryValue)}`}`}</title>
          </g>
        ))}
      </svg>
      <div className="sag-axis-labels" aria-hidden="true">
        {points.map((point, index) => (
          <span key={`${point.absoluteWeek}:label:${index}`}>{index === 0 || index === points.length - 1 || points.length <= 8 || index % 2 === 0 ? point.label : ''}</span>
        ))}
      </div>
      <div className="sag-legend">
        <span><i className="is-primary" />{primaryLabel}</span>
        {secondaryPoints ? <span><i className="is-secondary" />{secondaryLabel || 'Reference'}</span> : null}
      </div>
    </div>
  );
}

export function StreamingWaterfallGraph({ waterfall }: { waterfall: StreamingSubscriberWaterfall | null }) {
  if (!waterfall) {
    return <div className="sag-empty-graph" role="status">Audience movement is pending the first complete week.</div>;
  }
  const items = [
    { id: 'start', label: 'Opening', value: waterfall.startingSubscribers, tone: 'base' },
    { id: 'joins', label: 'Joined', value: waterfall.joinedSubscribers, tone: 'positive' },
    { id: 'returns', label: 'Returned', value: waterfall.reactivations, tone: 'positive' },
    { id: 'cancels', label: 'Cancelled', value: -waterfall.cancellations, tone: 'negative' },
    { id: 'end', label: 'Closing', value: waterfall.endingSubscribers, tone: 'base' },
  ];
  const maximum = Math.max(1, ...items.map(item => Math.abs(item.value)));
  return (
    <div className="sag-waterfall" role="img" aria-label="Subscriber joins, returns and cancellations waterfall">
      {items.map(item => (
        <div key={item.id} className={`sag-waterfall-item is-${item.tone}`}>
          <span className="sag-waterfall-value">{item.value > 0 && item.tone !== 'base' ? '+' : ''}{formatCompact(item.value)}</span>
          <div className="sag-waterfall-track"><i style={{ height: `${20 + Math.abs(item.value) / maximum * 80}%` }} /></div>
          <strong>{item.label}</strong>
        </div>
      ))}
    </div>
  );
}

export function StreamingMarketRing({
  entries,
  playerShare,
}: {
  entries: StreamingMarketShareEntry[];
  playerShare: number | null;
}) {
  const topEntries = entries.slice(0, 6);
  let offset = 0;
  return (
    <div className="sag-market">
      <div className="sag-market-ring" role="img" aria-label={`Modeled world subscriber share. Player share ${playerShare === null ? 'pending' : `${playerShare.toFixed(2)} percent`}`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="46" pathLength="100" className="sag-market-base" />
          {topEntries.map((entry, index) => {
            const start = offset;
            offset += entry.sharePercent;
            return (
              <circle
                key={entry.id}
                cx="60"
                cy="60"
                r="46"
                pathLength="100"
                className={`sag-market-segment ${entry.isPlayer ? 'is-player' : `is-rival-${index}`}`}
                strokeDasharray={`${entry.sharePercent} ${100 - entry.sharePercent}`}
                strokeDashoffset={-start}
              />
            );
          })}
        </svg>
        <span><small>WORLD MODEL</small><strong>{playerShare === null ? '—' : `${playerShare.toFixed(playerShare < 1 ? 2 : 1)}%`}</strong><em>Your share</em></span>
      </div>
      <div className="sag-market-list">
        {topEntries.map((entry, index) => (
          <div key={entry.id} className={entry.isPlayer ? 'is-player' : ''}>
            <i className={entry.isPlayer ? 'is-player' : `is-rival-${index}`} />
            <span>{entry.name}</span>
            <strong>{entry.sharePercent.toFixed(entry.sharePercent < 1 ? 2 : 1)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export { formatCompact as formatStreamingAnalyticsCompact };
