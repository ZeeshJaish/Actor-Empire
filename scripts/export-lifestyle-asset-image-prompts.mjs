import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('services/lifestyleLogic.ts');
const outPath = path.resolve('assets/lifestyle/image-prompts.json');
const csvPath = path.resolve('assets/lifestyle/asset-image-generation-sheet.csv');
const referenceImagePath = '/Users/zeesh/Downloads/ChatGPT Image Jul 3, 2026, 12_02_43 AM.png';
const source = fs.readFileSync(sourcePath, 'utf8');

const catalogNames = [
    'PROPERTY_CATALOG',
    'CAR_CATALOG',
    'MOTORCYCLE_CATALOG',
    'BOAT_CATALOG',
    'AIRCRAFT_CATALOG',
    'CLOTHING_CATALOG',
];

const getCatalogBody = (catalogName) => {
    const start = source.indexOf(`export const ${catalogName}`);
    if (start < 0) return '';
    const bodyStart = source.indexOf('[', start);
    const bodyEnd = source.indexOf('\n];', bodyStart);
    return bodyStart >= 0 && bodyEnd >= 0 ? source.slice(bodyStart + 1, bodyEnd) : '';
};

const getStringField = (entry, field) => {
    const single = entry.match(new RegExp(`${field}:\\s*'([^']*)'`));
    if (single) return single[1];
    const double = entry.match(new RegExp(`${field}:\\s*"([^"]*)"`));
    return double ? double[1] : '';
};

const getNumberField = (entry, field) => {
    const match = entry.match(new RegExp(`${field}:\\s*([0-9_]+)`));
    return match ? Number(match[1].replace(/_/g, '')) : 0;
};

const getFolder = (asset) => {
    if (asset.type === 'Property') return 'properties';
    if (asset.type === 'Vehicle') return 'vehicles';
    return 'clothing';
};

const getKind = (asset) => {
    if (asset.type === 'Property') return 'property';
    if (asset.type === 'Vehicle') return (asset.vehicleType || 'vehicle').toLowerCase();
    return (asset.subCategory || asset.category || 'fashion').toLowerCase();
};

const getLocationTexture = (location = '') => {
    const city = location.toLowerCase();
    if (city.includes('los angeles') || city.includes('malibu') || city.includes('beverly')) {
        return 'Southern California street scene, palm trees, blue sky, sunlit stucco, low hills in the distance';
    }
    if (city.includes('new york')) {
        return 'dense New York street scene, stone facades, traffic lights, narrow sidewalks, layered city background';
    }
    if (city.includes('london')) {
        return 'London street scene, refined brick and stone, old lamps, overcast premium city atmosphere';
    }
    if (city.includes('paris')) {
        return 'Paris street scene, elegant stonework, iron balconies, cafe frontage, soft daylight';
    }
    if (city.includes('dubai')) {
        return 'Dubai luxury district, clean modern skyline, bright sky, polished pavement, desert-glass atmosphere';
    }
    if (city.includes('tokyo') || city.includes('seoul')) {
        return 'modern Asian city scene, clean signage shapes without readable text, neon hints, compact urban depth';
    }
    if (city.includes('aspen') || city.includes('iceland') || city.includes('swiss') || city.includes('alps')) {
        return 'mountain luxury setting, crisp air, pine trees, dramatic natural background';
    }
    if (city.includes('caribbean') || city.includes('island') || city.includes('monaco')) {
        return 'coastal luxury setting, waterline, bright sky, marina or resort details';
    }
    return 'rich environmental background with street, sky, trees, depth, and local atmosphere';
};

const getVehicleSetting = (asset) => {
    const kind = getKind(asset);
    if (kind.includes('boat') || kind.includes('yacht')) {
        return 'at a luxury marina with water, docks, sunlight, background shoreline, and subtle reflections';
    }
    if (kind.includes('aircraft') || kind.includes('jet') || kind.includes('helicopter')) {
        return 'on a private runway or hangar apron with sky, tarmac, lights, and distant airport details';
    }
    if (kind.includes('motorcycle')) {
        return 'on a cinematic city boulevard or garage forecourt, full side view, premium street atmosphere';
    }
    return 'on a luxury street, studio driveway, or garage forecourt, full side view with cinematic environment';
};

const getFashionSetting = (asset) => {
    const kind = getKind(asset);
    if (kind.includes('watch') || kind.includes('jewelry') || kind.includes('accessory')) {
        return 'a luxury dressing-table still life with soft spotlights, velvet tray, mirror depth, and boutique atmosphere';
    }
    if (kind.includes('suit') || kind.includes('dress') || kind.includes('gown')) {
        return 'a red-carpet fitting room scene with a mannequin, garment rack, mirror, soft studio lighting, and polished floor';
    }
    if (kind.includes('shoe') || kind.includes('sneaker') || kind.includes('boot')) {
        return 'a boutique display scene with the footwear on a low pedestal, shelves, reflective floor, and dressing-room depth';
    }
    return 'a premium boutique or dressing-room scene with the fashion item presented as the hero object';
};

const baseSceneDirection = [
    'Create a full-scene retro pixel-art game image in the same feel as the provided reference image',
    'crisp high-detail 2D side-view pixel art, modern polished pixel clusters, layered foreground and background',
    'bright cinematic lighting, real environment, not an inventory icon, not a UI card, not a boxed object',
    'no border, no frame, no text, no readable logos, no watermark',
    'keep the main subject fully visible, readable, centered, and uncropped',
].join(', ');

const getPrompt = (asset) => {
    const kind = getKind(asset);
    if (asset.type === 'Property') {
        return `${baseSceneDirection}. Subject: ${asset.name}, a ${asset.location || 'premium'} property. Make it a full exterior establishing shot like a retro side-scrolling game background: ${getLocationTexture(asset.location)}. Show the architecture with detailed facade pixels, windows, entry, sidewalk or driveway, and enough sky/background around it. Wide 16:9 composition, PNG-ready.`;
    }
    if (asset.type === 'Vehicle') {
        return `${baseSceneDirection}. Subject: ${asset.name}, ${kind}. Show the complete vehicle ${getVehicleSetting(asset)}. Use a clean side-view or slight three-quarter view, detailed bodywork, believable scale, and environmental shadows. It should feel like a playable game scene asset, not a showroom icon. Wide 16:9 composition, PNG-ready.`;
    }
    return `${baseSceneDirection}. Subject: ${asset.name}, ${kind} fashion item. Make it ${getFashionSetting(asset)}. The item should be the clear hero, fully visible, detailed, and elegant, with a real room/background around it. No model face focus, no readable brand marks. Wide 16:9 composition, PNG-ready.`;
};

const getCategory = (asset) => {
    if (asset.type === 'Property') return asset.location || 'Property';
    if (asset.type === 'Vehicle') return asset.vehicleType || 'Vehicle';
    return asset.subCategory || asset.category || 'Fashion';
};

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const writeCsv = (assets) => {
    const rows = [
        [
            'asset_id',
            'asset_type',
            'asset_name',
            'category',
            'price',
            'expected_output_path',
            'reference_image_path',
            'generated_image_upload',
            'status',
            'prompt',
        ],
        ...assets.map((asset) => [
            asset.id,
            asset.type,
            asset.name,
            getCategory(asset),
            asset.price,
            asset.output,
            referenceImagePath,
            '',
            'TODO',
            asset.prompt,
        ]),
    ];
    fs.writeFileSync(csvPath, `${rows.map((row) => row.map(escapeCsv).join(',')).join('\n')}\n`);
};

const assets = catalogNames.flatMap((catalogName) => {
    const body = getCatalogBody(catalogName);
    return body
        .split(/\n\s*\{/)
        .map((chunk) => (chunk.startsWith('{') ? chunk : `{${chunk}`))
        .filter((entry) => entry.includes("id: '") || entry.includes('id: "'))
        .map((entry) => {
            const type = getStringField(entry, 'type');
            const asset = {
                id: getStringField(entry, 'id'),
                name: getStringField(entry, 'name'),
                type,
                vehicleType: getStringField(entry, 'vehicleType') || undefined,
                category: getStringField(entry, 'category') || undefined,
                subCategory: getStringField(entry, 'subCategory') || undefined,
                location: getStringField(entry, 'location') || undefined,
                price: getNumberField(entry, 'price'),
                catalog: catalogName,
            };
            return {
                ...asset,
                output: `assets/lifestyle/${getFolder(asset)}/${asset.id}.webp`,
                prompt: getPrompt(asset),
            };
        });
});

fs.writeFileSync(outPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), count: assets.length, assets }, null, 2)}\n`);
writeCsv(assets);
console.log(`Wrote ${assets.length} lifestyle asset image prompts to ${outPath}`);
console.log(`Wrote CSV image generation sheet to ${csvPath}`);
