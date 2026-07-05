import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const xlsxPath = process.argv[2];

if (!xlsxPath) {
    console.error('Usage: node scripts/import-lifestyle-asset-images-from-xlsx.mjs <workbook.xlsx>');
    process.exit(1);
}

const assetPromptPath = path.resolve('assets/lifestyle/image-prompts.json');
const manifestPath = path.resolve('assets/lifestyle/imported-image-manifest.json');
const assetData = JSON.parse(fs.readFileSync(assetPromptPath, 'utf8'));
const assets = assetData.assets || [];
const maxWidth = Number(process.env.ASSET_IMAGE_MAX_WIDTH || 1400);
const quality = Number(process.env.ASSET_IMAGE_WEBP_QUALITY || 82);

const unzipText = (entry) => execFileSync('unzip', ['-p', xlsxPath, entry], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const unzipBuffer = (entry) => execFileSync('unzip', ['-p', xlsxPath, entry], { maxBuffer: 64 * 1024 * 1024 });
const requireTool = (name) => {
    try {
        return execFileSync('which', [name], { encoding: 'utf8' }).trim();
    } catch {
        console.error(`Missing required image optimizer: ${name}`);
        process.exit(1);
    }
};
const cwebpPath = requireTool('cwebp');

const withWebpExtension = (filePath) => filePath.replace(/\.[a-z0-9]+$/i, '.webp');
const extFromMediaPath = (mediaPath) => path.extname(mediaPath) || '.png';
const formatBytes = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${bytes}B`;
};

const optimizeToWebp = (imageBuffer, mediaPath, outputPath) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actor-asset-image-'));
    const inputPath = path.join(tmpDir, `source${extFromMediaPath(mediaPath)}`);
    const tempOutputPath = path.join(tmpDir, 'optimized.webp');
    fs.writeFileSync(inputPath, imageBuffer);

    try {
        execFileSync(cwebpPath, [
            '-quiet',
            '-q', String(quality),
            '-m', '6',
            '-af',
            '-sharp_yuv',
            '-resize', String(maxWidth), '0',
            inputPath,
            '-o', tempOutputPath,
        ], { stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 });
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.copyFileSync(tempOutputPath, outputPath);
        return fs.statSync(outputPath).size;
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
};

const relXml = unzipText('xl/drawings/_rels/drawing1.xml.rels');
const drawingXml = unzipText('xl/drawings/drawing1.xml');

const relationships = new Map(
    [...relXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((match) => {
        const target = match[2].replace(/^\.\.\//, 'xl/');
        return [match[1], target];
    }),
);

const anchors = [...drawingXml.matchAll(/<xdr:oneCellAnchor>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?r:embed="([^"]+)"[\s\S]*?<\/xdr:oneCellAnchor>/g)]
    .map((match) => ({
        col: Number(match[1]),
        row: Number(match[2]),
        relationshipId: match[3],
    }))
    .filter((anchor) => anchor.col === 7);

const imported = [];
const skipped = [];

for (const anchor of anchors) {
    const assetIndex = anchor.row - 1;
    const asset = assets[assetIndex];
    const mediaPath = relationships.get(anchor.relationshipId);

    if (!asset || !mediaPath) {
        skipped.push({ row: anchor.row + 1, relationshipId: anchor.relationshipId });
        continue;
    }

    const output = withWebpExtension(asset.output);
    const outputPath = path.resolve(output);
    const publicOutputPath = path.resolve('public', output);
    const imageBuffer = unzipBuffer(mediaPath);
    fs.mkdirSync(path.dirname(publicOutputPath), { recursive: true });
    const optimizedBytes = optimizeToWebp(imageBuffer, mediaPath, outputPath);
    fs.copyFileSync(outputPath, publicOutputPath);
    imported.push({
        row: anchor.row + 1,
        assetId: asset.id,
        name: asset.name,
        type: asset.type,
        output,
        publicOutput: path.relative(process.cwd(), publicOutputPath),
        source: mediaPath,
        originalBytes: imageBuffer.length,
        optimizedBytes,
        savedBytes: Math.max(0, imageBuffer.length - optimizedBytes),
    });
}

fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({
        sourceWorkbook: xlsxPath,
        importedAt: new Date().toISOString(),
        optimizer: {
            format: 'webp',
            maxWidth,
            quality,
            tool: cwebpPath,
        },
        count: imported.length,
        skipped,
        imported,
    }, null, 2)}\n`,
);

console.log(`Imported ${imported.length} lifestyle asset images.`);
for (const item of imported) {
    console.log(`${item.row}: ${item.assetId} -> ${item.output} + ${item.publicOutput} (${formatBytes(item.originalBytes)} -> ${formatBytes(item.optimizedBytes)})`);
}
if (skipped.length) {
    console.warn(`Skipped ${skipped.length} embedded images without a matching asset row.`);
}
