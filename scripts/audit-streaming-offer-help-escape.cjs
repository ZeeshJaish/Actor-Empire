// A focused capture/target event harness: runs the actual dialog listener and
// disclosure handler without a browser or career storage. Controller also checks
// the real keyboard path in its one visual confirmation pass.
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'offer-help-escape-'));
const paths = ['components/AccessibleDialog.tsx', 'content-market-exact/OfferControls.tsx'];
const entryPoints = paths.map(file => {
  if (!process.argv.includes('--baseline')) return { in: file, out: file.replace(/\.tsx$/, '') };
  // Reproduce the reviewed pre-correction handlers without reverting workspace files.
  const baseline = execFileSync('git', ['show', `4f32a30:${file}`], { encoding: 'utf8' })
    .replace("from './model'", `from '${path.resolve('content-market-exact/model')}'`)
    .replace("from './ContentMarket.module.css'", `from '${path.resolve('content-market-exact/ContentMarket.module.css')}'`);
  const input = path.join(dir, `baseline-${path.basename(file)}`);
  fs.writeFileSync(input, baseline);
  return { in: input, out: file.replace(/\.tsx$/, '') };
});
esbuild.buildSync({ entryPoints, bundle: true, platform: 'node', format: 'cjs', jsx: 'transform', tsconfigRaw: { compilerOptions: { jsx: 'react' } }, external: ['react'], nodePaths: [path.resolve('node_modules')], loader: { '.css': 'empty' }, outdir: dir, logLevel: 'silent' });
const listeners = new Map();
const cleanups = [];
let open = false, closedMarket = 0, stopped = false, prevented = false;
let draft = '123456789';
const dialog = { contains: target => target === buttonTarget, isConnected: true };
let buttonProps;
global.Element = class {};
const buttonTarget = Object.assign(new Element(), {
  closest: selector => selector === '[data-dialog-escape-owner="true"]' && buttonProps['data-dialog-escape-owner'] === 'true' ? buttonTarget : null,
});
global.HTMLElement = class {};
global.document = { activeElement: null, addEventListener: (type, callback, capture) => { listeners.set(type, { callback, capture }); }, removeEventListener() {} };
global.window = { requestAnimationFrame: () => 1, cancelAnimationFrame() {} };
const stubReact = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useEffect: effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
  useRef: value => ({ current: value === null ? dialog : value }),
  useId: () => 'help-id',
  useState: () => [open, value => { open = typeof value === 'function' ? value(open) : value; }],
  forwardRef: value => value,
};
const originalLoad = Module._load;
Module._load = function (request, ...args) { return request === 'react' ? stubReact : originalLoad.call(this, request, ...args); };
try {
  const AccessibleDialog = require(path.join(dir, 'components/AccessibleDialog.js')).default;
  const { OfferClauseHelp } = require(path.join(dir, 'content-market-exact/OfferControls.js'));
  AccessibleDialog({ onEscape: () => { closedMarket++; draft = ''; }, children: null });
  const capture = listeners.get('keydown');
  assert.equal(capture.capture, true, 'Exercise the real document capture listener');
  const renderHelp = () => { const tree = OfferClauseHelp({ label: 'Sublicensing' }); buttonProps = tree.props.children[0].props; };
  const escape = () => {
    stopped = false; prevented = false;
    const event = { key: 'Escape', target: buttonTarget, preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } };
    capture.callback(event);
    if (!stopped) buttonProps.onKeyDown(event);
  };
  renderHelp(); buttonProps.onClick(); renderHelp();
  assert.equal(buttonProps['aria-expanded'], true);
  escape();
  assert.equal(closedMarket, 0, 'Escape on expanded help must never close the market');
  assert.equal(open, false, 'Escape closes the local disclosure');
  assert.equal(stopped, true); assert.equal(prevented, true);
  assert.equal(draft, '123456789', 'No editor remount/discard path ran');
  renderHelp(); escape();
  assert.equal(closedMarket, 1, 'Escape with help closed retains the ordinary dialog exit');
  console.log('PASS expanded help consumes Escape before dialog dismissal; next Escape exits normally');
} finally {
  for (const cleanup of cleanups) cleanup();
  Module._load = originalLoad;
  fs.rmSync(dir, { recursive: true, force: true });
}
