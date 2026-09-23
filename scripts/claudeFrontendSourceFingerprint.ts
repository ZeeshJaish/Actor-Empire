import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const runGit = (workspace: string, args: string[]): Buffer => execFileSync(
  'git',
  ['-C', workspace, ...args],
  { maxBuffer: 64 * 1024 * 1024 },
);

const addFramed = (hash: ReturnType<typeof createHash>, label: string, value: Buffer | string): void => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  hash.update(`${label}\0${bytes.length}\0`);
  hash.update(bytes);
  hash.update('\0');
};

export interface ClaudeSourceFingerprint {
  branch: string;
  head: string;
  integrationSha256: string;
  statusEntries: number;
  untrackedFiles: number;
  pressFiles: number;
  pressSha256: string;
}

/**
 * Fingerprint the integration source without letting generated press captures
 * make the code freeze move. Press files are still inventoried under their own
 * digest, while every tracked diff and every other untracked byte remains in
 * the integration digest.
 */
export function fingerprintClaudeFrontendSource(workspace: string): ClaudeSourceFingerprint {
  const branch = runGit(workspace, ['branch', '--show-current']).toString('utf8').trim();
  const head = runGit(workspace, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const statusEntries = runGit(workspace, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  const integrationEntries = statusEntries
    .filter(entry => !entry.startsWith('?? press/'))
    .sort();
  const untracked = integrationEntries
    .filter(entry => entry.startsWith('?? '))
    .map(entry => entry.slice(3))
    .sort();
  const trackedDiff = runGit(workspace, ['diff', '--binary', '--no-ext-diff', '--no-textconv']);

  const integrationHash = createHash('sha256');
  addFramed(integrationHash, 'format', 'claude-integration-source-v2');
  addFramed(integrationHash, 'branch', branch);
  addFramed(integrationHash, 'head', head);
  addFramed(integrationHash, 'status', `${integrationEntries.join('\0')}\0`);
  addFramed(integrationHash, 'diff', trackedDiff);
  for (const relativePath of untracked) {
    addFramed(integrationHash, 'path', relativePath);
    addFramed(integrationHash, 'bytes', readFileSync(path.join(workspace, relativePath)));
  }

  const press = statusEntries
    .filter(entry => entry.startsWith('?? press/'))
    .map(entry => entry.slice(3))
    .sort();
  const pressHash = createHash('sha256');
  for (const relativePath of press) {
    pressHash.update(`${relativePath}\0`);
    pressHash.update(readFileSync(path.join(workspace, relativePath)));
    pressHash.update('\0');
  }

  return {
    branch,
    head,
    integrationSha256: integrationHash.digest('hex'),
    statusEntries: integrationEntries.length,
    untrackedFiles: untracked.length,
    pressFiles: press.length,
    pressSha256: pressHash.digest('hex'),
  };
}
