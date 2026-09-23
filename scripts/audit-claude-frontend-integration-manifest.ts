import assert from 'node:assert/strict';
import {
  CLAUDE_FRONTEND_INDEXED_SOURCES,
  CLAUDE_FRONTEND_INTEGRATION_DECISIONS,
  CLAUDE_FRONTEND_INTEGRATION_MANIFEST,
  CLAUDE_SOURCE_RECORD,
} from './fixtures/claude-frontend-integration-manifest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fingerprintClaudeFrontendSource } from './claudeFrontendSourceFingerprint';

const sorted = (values: Iterable<string>) => [...values].sort((a, b) => a.localeCompare(b));
const duplicatePaths = (paths: string[]) => sorted(new Set(paths.filter((path, index) => paths.indexOf(path) !== index)));

assert.equal(CLAUDE_SOURCE_RECORD.changelogLastEntry, '#125');
const sourceFingerprint = fingerprintClaudeFrontendSource(CLAUDE_SOURCE_RECORD.workspace);
assert.equal(sourceFingerprint.branch, CLAUDE_SOURCE_RECORD.branch, 'Claude source branch moved.');
assert.equal(sourceFingerprint.head, CLAUDE_SOURCE_RECORD.head, 'Claude source HEAD moved.');
assert.equal(
  sourceFingerprint.integrationSha256,
  CLAUDE_SOURCE_RECORD.workingTreeSha256,
  'Claude integration source changed; refresh Phase 0 before porting.',
);
assert.equal(sourceFingerprint.statusEntries, CLAUDE_SOURCE_RECORD.statusLines);
assert.equal(sourceFingerprint.untrackedFiles, CLAUDE_SOURCE_RECORD.untrackedFiles);
assert.equal(sourceFingerprint.pressFiles, CLAUDE_SOURCE_RECORD.pressFiles);
assert.equal(sourceFingerprint.pressSha256, CLAUDE_SOURCE_RECORD.pressSha256);
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const packageScripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts as Record<string, string>;
assert.equal(sha256(`${CLAUDE_SOURCE_RECORD.workspace}/CODEX-BRIEF.md`), CLAUDE_SOURCE_RECORD.codexBriefSha256);
assert.equal(sha256(`${CLAUDE_SOURCE_RECORD.workspace}/CHANGES-FOR-CODEX.md`), CLAUDE_SOURCE_RECORD.changesSha256);
assert.equal(
  CLAUDE_FRONTEND_INDEXED_SOURCES.length,
  CLAUDE_SOURCE_RECORD.expectedUniquePaths,
  'Every unique final-state path from the frozen cumulative index must be recorded.',
);

const sourcePaths = CLAUDE_FRONTEND_INDEXED_SOURCES.map(entry => entry.sourcePath);
assert.deepEqual(duplicatePaths(sourcePaths), [], 'The frozen source index must not contain duplicate paths.');

for (const source of CLAUDE_FRONTEND_INDEXED_SOURCES) {
  assert.ok(source.sourcePath.trim(), 'Every indexed source needs a path.');
  assert.ok(source.sourceEntries.length > 0, `${source.sourcePath} needs at least one exact changelog entry.`);
  assert.ok(
    source.tags.length > 0 || source.sourcePath === 'package.json',
    `${source.sourcePath} needs integration tags.`,
  );
}

const decisionPaths = Object.keys(CLAUDE_FRONTEND_INTEGRATION_DECISIONS);
assert.deepEqual(
  sorted(decisionPaths),
  sorted(sourcePaths),
  'Every indexed source needs exactly one disposition, with no extra decisions.',
);
assert.equal(CLAUDE_FRONTEND_INTEGRATION_MANIFEST.length, sourcePaths.length);

for (const entry of CLAUDE_FRONTEND_INTEGRATION_MANIFEST) {
  assert.ok(entry.disposition, `${entry.sourcePath} is missing its disposition.`);
  assert.ok(entry.reason?.trim(), `${entry.sourcePath} is missing its integration reason.`);
  assert.ok(entry.targetPaths?.length > 0, `${entry.sourcePath} must name its final target or replacement.`);
  for (const targetPath of entry.targetPaths) {
    assert.ok(existsSync(targetPath), `${entry.sourcePath} points to missing target ${targetPath}.`);
  }
  if (entry.disposition === 'REJECTED_WITH_APPROVAL') {
    assert.ok(entry.approvalRecord?.trim(), `${entry.sourcePath} was rejected without an approval record.`);
  }
  if (entry.sourceEntries.some(label => ['#77', '#78', '#79'].includes(label))) {
    assert.equal(entry.approvalGate, '#77-#79', `${entry.sourcePath} must retain the #77-#79 approval gate.`);
  }
  const affectedAudits = entry.affectedAudits;
  assert.ok(affectedAudits?.length, `${entry.sourcePath} must name its affected release audits.`);
  assert.ok(
    affectedAudits?.some(audit => audit !== 'audit:claude-frontend-integration-manifest'),
    `${entry.sourcePath} must have behavioral coverage beyond the manifest audit.`,
  );
  for (const audit of affectedAudits ?? []) {
    assert.ok(packageScripts[audit], `${entry.sourcePath} references missing package script ${audit}.`);
  }
}

const counts = CLAUDE_FRONTEND_INTEGRATION_MANIFEST.reduce<Record<string, number>>((result, entry) => {
  result[entry.disposition] = (result[entry.disposition] ?? 0) + 1;
  return result;
}, {});

const affectedAudits = sorted(new Set(
  CLAUDE_FRONTEND_INTEGRATION_MANIFEST.flatMap(entry => entry.affectedAudits),
));

if (process.argv.includes('--list-audits')) {
  console.log(JSON.stringify(affectedAudits));
} else {
  console.log(
    `Claude frontend integration manifest passed: ${sourcePaths.length} indexed paths; `
    + `${counts.PORT ?? 0} port, ${counts.REIMPLEMENT ?? 0} reimplement, `
    + `${counts.SUPERSEDED ?? 0} superseded, ${counts.REJECTED_WITH_APPROVAL ?? 0} rejected; `
    + `${affectedAudits.length} release audits.`,
  );
}
