import React from 'react';
import { Sheet } from '../ui';

export interface BuildMetricInfo {
  title: string;
  value?: string;
  summary: string;
  impact: string;
  guidance: string;
  status?: 'good' | 'warn' | 'bad' | 'flat';
}

const STATUS_COPY: Record<NonNullable<BuildMetricInfo['status']>, string> = {
  good: 'Good fit',
  warn: 'Worth watching',
  bad: 'Build risk',
  flat: 'For context',
};

export function BuildMetricSheet({ info, onClose }: { info: BuildMetricInfo | null; onClose: () => void }) {
  const status = info?.status ?? 'flat';
  return (
    <Sheet open={Boolean(info)} onClose={onClose} eyebrow="Build guide" title={info?.title ?? ''}>
      {info && (
        <div className="bw-metric-sheet">
          {info.value && (
            <div className="bw-metric-sheet-value">
              <b>{info.value}</b>
              <span className={`is-${status}`}>{STATUS_COPY[status]}</span>
            </div>
          )}
          <p>{info.summary}</p>
          <section>
            <em>Why it matters</em>
            <p>{info.impact}</p>
          </section>
          <section>
            <em>What you can do</em>
            <p>{info.guidance}</p>
          </section>
        </div>
      )}
    </Sheet>
  );
}
