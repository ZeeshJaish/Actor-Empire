import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionGroup, AdaptiveHeader, ContentRegion, GameViewport, InformationGrid, SheetActionFooter } from '../ui-layout';
import { auditLayout } from '../ui-layout/diagnostics';
import '../ui-layout/layout.css';

declare global {
  interface Window {
    qaMounts: number;
    auditQaLayout: () => ReturnType<typeof auditLayout>;
  }
}

window.qaMounts = 0;

function MountedCard({ index }: { index: number; key?: number }) {
  useEffect(() => { window.qaMounts += 1; }, []);
  return <div className="qa-card" data-layout-id={`stat-${index}`}>Stat {index}</div>;
}

function Fixture() {
  useEffect(() => {
    const status = document.getElementById('native-layout-status');
    const statContainer = document.getElementById('stat-container');
    const actionContainer = document.getElementById('action-container');
    if (!status || !statContainer || !actionContainer) return;
    const measure = () => {
      const statWidth = statContainer.querySelector<HTMLElement>('[data-layout-columns]')?.getBoundingClientRect().width || 0;
      const actionWidth = actionContainer.querySelector<HTMLElement>('[data-layout-columns]')?.getBoundingClientRect().width || 0;
      const expectedStats = statWidth >= 408 ? 4 : statWidth >= 200 ? 2 : 1;
      const expectedActions = actionWidth >= 296 ? 2 : 1;
      const actualStats = Number(statContainer.querySelector<HTMLElement>('[data-layout-columns]')?.dataset.layoutColumns);
      const actualActions = Number(actionContainer.querySelector<HTMLElement>('[data-layout-columns]')?.dataset.layoutColumns);
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('#action-container button, .ae-layout-footer button'));
      const targetsReadable = buttons.length === 3 && buttons.every(button => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      });
      const noOverflow = document.documentElement.scrollWidth <= document.documentElement.clientWidth;
      const pass = noOverflow && targetsReadable && actualStats === expectedStats && actualActions === expectedActions;
      status.dataset.result = pass ? 'pass' : 'fail';
      status.textContent = `${pass ? 'PASS' : 'FAIL'} · native layout · ${Math.round(statWidth)}px stats ${actualStats}/${expectedStats} · ${Math.round(actionWidth)}px actions ${actualActions}/${expectedActions} · targets ${targetsReadable ? '44+' : 'small'} · overflow ${noOverflow ? 'none' : 'detected'}`;
    };
    let frame = requestAnimationFrame(measure);
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    observer?.observe(statContainer);
    observer?.observe(actionContainer);
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', schedule); };
  }, []);
  return <GameViewport>
    <AdaptiveHeader title="Responsive layout test" actions={<button>Menu</button>} />
    <ContentRegion>
      <div id="native-layout-status" role="status" data-result="pending" style={{ font: '12px system-ui', padding: 8, marginBottom: 8, border: '1px solid currentColor', overflowWrap: 'anywhere' }}>Measuring native layout…</div>
      <div id="stat-container" className="qa-resizable" style={{ width: '100%', maxWidth: 408 }}>
        <InformationGrid>{[1, 2, 3, 4].map(index => <MountedCard key={index} index={index} />)}</InformationGrid>
      </div>
      <div id="action-container" className="qa-resizable" style={{ width: '100%', maxWidth: 296 }}>
        <ActionGroup><button data-layout-id="action-one">Full-label action one</button><button data-layout-id="action-two">Full-label action two</button></ActionGroup>
      </div>
      <div id="diagnostics-target" data-layout-id="diagnostics-root" style={{ position: 'relative', minHeight: 200 }}>
        <button data-layout-id="diagnostics-button" style={{ width: 44, height: 44 }}>OK</button>
        <span data-layout-id="diagnostics-label" data-layout-primary-label style={{ display: 'block', width: 100, whiteSpace: 'nowrap' }}>OK</span>
        <div data-layout-id="diagnostics-region" data-layout-overflow-region style={{ width: 100 }}><span>OK</span></div>
        <button data-layout-id="diagnostics-primary" data-layout-primary-action style={{ position: 'absolute', top: 100, left: 0, width: 80, height: 44 }}>Next</button>
        <div data-layout-id="diagnostics-chrome" data-layout-fixed-chrome style={{ position: 'absolute', top: 160, left: 0, width: 80, height: 44 }} />
      </div>
    </ContentRegion>
    <SheetActionFooter><button data-layout-id="footer-button">Continue</button></SheetActionFooter>
  </GameViewport>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
window.auditQaLayout = () => auditLayout(document.getElementById('diagnostics-target')!);
