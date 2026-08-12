import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, extname, join, resolve } from 'node:path';

const root = process.cwd();
const sourceDir = resolve(root, 'assets/streaming/source');
const archiveDir = resolve(root, 'assets/streaming/scenes');
const runtimeDir = resolve(root, 'public/assets/streaming/scenes');
const cwebp = process.env.CWEBP_PATH || '/opt/homebrew/bin/cwebp';
const supportedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

await Promise.all([
    mkdir(archiveDir, { recursive: true }),
    mkdir(runtimeDir, { recursive: true }),
]);

const sourceFiles = (await readdir(sourceDir))
    .filter(file => supportedExtensions.has(extname(file).toLowerCase()))
    .sort();

if (!sourceFiles.length) {
    throw new Error(`No streaming source art found in ${sourceDir}`);
}

for (const sourceFile of sourceFiles) {
    const stem = basename(sourceFile, extname(sourceFile));
    const sourcePath = join(sourceDir, sourceFile);
    const archivePath = join(archiveDir, `${stem}.webp`);
    const runtimePath = join(runtimeDir, `${stem}.webp`);
    const result = spawnSync(cwebp, [
        '-quiet',
        '-q', '84',
        '-m', '6',
        '-resize', '1400', '788',
        sourcePath,
        '-o', archivePath,
    ], { stdio: 'inherit' });

    if (result.status !== 0) {
        throw new Error(`Failed to process ${sourceFile} with ${cwebp}`);
    }

    await copyFile(archivePath, runtimePath);
    process.stdout.write(`streaming-art: ${sourceFile} -> ${stem}.webp\n`);
}

process.stdout.write(`streaming-art: processed ${sourceFiles.length} scene${sourceFiles.length === 1 ? '' : 's'}\n`);
