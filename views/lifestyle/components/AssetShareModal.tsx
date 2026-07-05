import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, Share2, X } from 'lucide-react';
import { ClothingItem, Player, Property, Vehicle } from '../../../types';
import { getLifestyleAssetImageInfo } from '../../../services/lifestyleAssetImages';
import { getPlayerLanguage, t } from '../../../services/i18n';

export type ShareableAsset = Property | Vehicle | ClothingItem;

interface AssetShareModalProps {
    player: Player;
    assets: ShareableAsset[];
    mode?: 'purchase' | 'portfolio';
    onClose: () => void;
    onChangeAssets?: () => void;
    resolveAssetValue?: (asset: ShareableAsset) => number;
    portfolioValue?: number;
    weeklyRent?: number;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

const moneyShort = (value: number) => {
    const abs = Math.abs(value);
    const formatUnit = (divisor: number, suffix: string) => {
        const scaled = value / divisor;
        const decimals = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
        return `$${scaled.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}${suffix}`;
    };
    if (abs >= 1_000_000_000_000) return formatUnit(1_000_000_000_000, 'T');
    if (abs >= 1_000_000_000) return formatUnit(1_000_000_000, 'B');
    if (abs >= 1_000_000) return formatUnit(1_000_000, 'M');
    if (abs >= 1_000) return formatUnit(1_000, 'K');
    return `$${Math.round(value).toLocaleString()}`;
};

const getAssetKind = (asset: ShareableAsset) => {
    if (asset.type === 'Property') return asset.location || 'Real Estate';
    if (asset.type === 'Vehicle') return asset.vehicleType;
    return asset.subCategory || asset.category || 'Wardrobe';
};

const getAssetSignal = (asset: ShareableAsset) => {
    if (asset.type === 'Property') return `+${asset.moodBonus} mood`;
    if (asset.type === 'Vehicle') return `+${asset.reputationBonus} rep`;
    return asset.style;
};

const getAssetFocusY = (asset: ShareableAsset) => (asset.type === 'Vehicle' ? 0.68 : 0.5);

const getPosterPalette = (asset?: ShareableAsset) => {
    if (asset?.type === 'Vehicle') {
        return {
            paper: '#F3F0E8',
            ink: '#101114',
            muted: '#706B63',
            accent: '#2658D9',
            accentAlt: '#E11D48',
            wash: 'rgba(38, 88, 217, 0.14)',
        };
    }
    if (asset?.type === 'Clothing') {
        return {
            paper: '#F5F1EA',
            ink: '#0C0C0D',
            muted: '#706B63',
            accent: '#E11D48',
            accentAlt: '#111827',
            wash: 'rgba(225, 29, 72, 0.13)',
        };
    }
    return {
        paper: '#F5F0E6',
        ink: '#111112',
        muted: '#746D60',
        accent: '#3459B8',
        accentAlt: '#D3A526',
        wash: 'rgba(52, 89, 184, 0.12)',
    };
};

const getPlayerHandle = (player: Player) => {
    const instagramHandle = player.instagram?.handle;
    const raw = instagramHandle || player.name || 'Actor';
    return `@${raw.replace(/^@/, '').replace(/\s+/g, '').toLowerCase()}`;
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
});

const roundedPath = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};

const fillRounded = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fillStyle: string | CanvasGradient) => {
    roundedPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
};

const strokeRounded = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, strokeStyle: string, lineWidth = 2) => {
    roundedPath(ctx, x, y, width, height, radius);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
};

const drawCover = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 0,
    focusY = 0.5,
) => {
    ctx.save();
    if (radius > 0) {
        roundedPath(ctx, x, y, width, height, radius);
        ctx.clip();
    }
    const scale = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) * focusY;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
};

const drawContain = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 0,
) => {
    ctx.save();
    if (radius > 0) {
        roundedPath(ctx, x, y, width, height, radius);
        ctx.clip();
    }
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
};

const drawCropZoom = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    sourceXRatio: number,
    sourceYRatio: number,
    zoom = 1.9,
) => {
    ctx.save();
    roundedPath(ctx, x, y, width, height, radius);
    ctx.clip();
    const sourceWidth = image.width / zoom;
    const sourceHeight = image.height / zoom;
    const sourceX = (image.width - sourceWidth) * Math.max(0, Math.min(1, sourceXRatio));
    const sourceY = (image.height - sourceHeight) * Math.max(0, Math.min(1, sourceYRatio));
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    ctx.restore();
};

const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let next = text;
    while (next.length > 4 && ctx.measureText(`${next}...`).width > maxWidth) {
        next = next.slice(0, -1);
    }
    return `${next.trim()}...`;
};

const drawPosterTexture = (ctx: CanvasRenderingContext2D, ink = '#111112', subtle = false) => {
    ctx.save();
    ctx.globalAlpha = subtle ? 0.06 : 0.12;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    for (let x = 58; x < CANVAS_WIDTH - 40; x += 82) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, CANVAS_HEIGHT - 40);
        ctx.stroke();
    }
    for (let y = 58; y < CANVAS_HEIGHT - 40; y += 82) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(CANVAS_WIDTH - 40, y);
        ctx.stroke();
    }
    ctx.globalAlpha = subtle ? 0.08 : 0.18;
    ctx.fillStyle = ink;
    for (let y = 38; y < CANVAS_HEIGHT; y += 41) {
        for (let x = 34; x < CANVAS_WIDTH; x += 47) {
            if ((x * 17 + y * 13) % 7 === 0) {
                ctx.fillRect(x, y, 3, 3);
            }
        }
    }
    ctx.restore();
};

const drawSticker = (
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: { fill: string | CanvasGradient; color: string; stroke?: string; rotation?: number; fontSize?: number },
) => {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(options.rotation || 0);
    fillRounded(ctx, -width / 2, -height / 2, width, height, height / 2, options.fill);
    if (options.stroke) {
        strokeRounded(ctx, -width / 2, -height / 2, width, height, height / 2, options.stroke, 3);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${options.fontSize || 27}px Arial Black, Inter, Arial, sans-serif`;
    ctx.fillStyle = options.color;
    ctx.fillText(truncateText(ctx, label, width - 36), 0, 2);
    ctx.restore();
};

const getWrappedLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    words.forEach(word => {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width <= maxWidth) {
            line = next;
        } else {
            if (line) lines.push(line);
            line = word;
        }
    });
    if (line) lines.push(line);
    return lines.slice(0, maxLines).map((part, index) => (
        index === maxLines - 1 && lines.length > maxLines ? truncateText(ctx, part, maxWidth) : part
    ));
};

const drawBigTitle = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    maxLines: number,
    maxFontSize: number,
    options: { fill?: string; stroke?: string; minFontSize?: number; lineHeight?: number } = {},
) => {
    let fontSize = maxFontSize;
    let lines: string[] = [];
    while (fontSize >= (options.minFontSize || 58)) {
        ctx.font = `900 ${fontSize}px Arial Black, Inter, Arial, sans-serif`;
        lines = getWrappedLines(ctx, text.toUpperCase(), maxWidth, maxLines);
        const fits = lines.length <= maxLines && lines.every(line => ctx.measureText(line).width <= maxWidth);
        if (fits) break;
        fontSize -= 5;
    }
    const lineHeight = fontSize * (options.lineHeight || 0.9);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    lines.forEach((line, index) => {
        const lineY = y + index * lineHeight;
        ctx.lineWidth = Math.max(8, fontSize * 0.1);
        ctx.strokeStyle = options.stroke || 'rgba(0,0,0,0.92)';
        ctx.strokeText(line, x, lineY);
        ctx.fillStyle = options.fill || '#FFFFFF';
        ctx.fillText(line, x, lineY);
    });
    return y + lines.length * lineHeight;
};

const drawStatBlock = (
    ctx: CanvasRenderingContext2D,
    label: string,
    value: string,
    x: number,
    y: number,
    width: number,
    accent = '#66F1C1',
) => {
    fillRounded(ctx, x, y, width, 112, 28, 'rgba(2,4,8,0.78)');
    strokeRounded(ctx, x, y, width, 112, 28, 'rgba(255,255,255,0.12)', 2);
    ctx.textAlign = 'left';
    ctx.font = '900 17px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(label.toUpperCase(), x + 24, y + 36);
    ctx.font = '900 37px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(truncateText(ctx, value.toUpperCase(), width - 48), x + 24, y + 82);
};

const drawPosterLabel = (
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number,
    fill: string,
    color: string,
    width?: number,
) => {
    ctx.font = '900 24px Arial Black, Inter, Arial, sans-serif';
    const computedWidth = width || ctx.measureText(label.toUpperCase()).width + 48;
    fillRounded(ctx, x, y, computedWidth, 54, 4, fill);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(truncateText(ctx, label.toUpperCase(), computedWidth - 28), x + computedWidth / 2, y + 37);
    return computedWidth;
};

const drawWatermark = (ctx: CanvasRenderingContext2D, ink = '#111112', accent = '#E11D48') => {
    ctx.save();
    ctx.font = '900 23px Arial Black, Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = ink;
    ctx.fillText('ACTOR EMPIRE', CANVAS_WIDTH - 58, CANVAS_HEIGHT - 54);
    ctx.font = '900 16px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(17,17,18,0.48)';
    ctx.fillText('MADE FROM GAMEPLAY', CANVAS_WIDTH - 58, CANVAS_HEIGHT - 84);
    ctx.fillStyle = accent;
    ctx.fillRect(CANVAS_WIDTH - 236, CANVAS_HEIGHT - 36, 84, 5);
    ctx.fillStyle = ink;
    ctx.fillRect(CANVAS_WIDTH - 146, CANVAS_HEIGHT - 36, 88, 5);
    ctx.restore();
};

const drawProfile = (ctx: CanvasRenderingContext2D, player: Player) => {
    const initial = (player.name || 'A').trim().slice(0, 1).toUpperCase();
    fillRounded(ctx, 52, 52, 420, 96, 48, 'rgba(3, 5, 12, 0.72)');
    strokeRounded(ctx, 52, 52, 420, 96, 48, 'rgba(255,255,255,0.16)', 2);
    ctx.beginPath();
    ctx.arc(108, 100, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.font = '900 30px Arial Black, Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0B0B10';
    ctx.fillText(initial, 108, 111);
    ctx.textAlign = 'left';
    ctx.font = '900 26px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(truncateText(ctx, player.name || 'Actor', 252), 158, 94);
    ctx.font = '900 17px Inter, Arial, sans-serif';
    ctx.fillStyle = '#66F1C1';
    ctx.fillText(truncateText(ctx, getPlayerHandle(player), 250), 158, 124);
};

const drawSinglePoster = (
    ctx: CanvasRenderingContext2D,
    asset: ShareableAsset,
    image: HTMLImageElement,
    player: Player,
    value: number,
    mode: 'purchase' | 'portfolio',
) => {
    const palette = getPosterPalette(asset);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = palette.wash;
    ctx.fillRect(0, 0, CANVAS_WIDTH, 360);
    drawPosterTexture(ctx, palette.ink);

    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 44, CANVAS_WIDTH - 88, CANVAS_HEIGHT - 88);
    ctx.strokeStyle = 'rgba(17,17,18,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 64, CANVAS_WIDTH - 128, CANVAS_HEIGHT - 128);

    const nameParts = asset.name.split(/\s+/).filter(Boolean);
    const headline = nameParts.slice(0, 2).join(' ') || asset.name;
    const subhead = nameParts.slice(2).join(' ');

    ctx.textAlign = 'left';
    ctx.font = '900 31px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = palette.accent;
    ctx.fillText('ACTOR EMPIRE ASSET FILE', 76, 116);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(76, 136, 388, 8);
    ctx.fillStyle = palette.accentAlt;
    ctx.fillRect(478, 136, 162, 8);

    drawBigTitle(ctx, headline, 72, 252, 920, 2, 156, {
        fill: palette.accent,
        stroke: 'rgba(255,255,255,0.86)',
        minFontSize: 82,
        lineHeight: 0.82,
    });
    if (subhead) {
        drawBigTitle(ctx, subhead, 74, 388, 900, 1, 74, {
            fill: palette.ink,
            stroke: 'rgba(255,255,255,0.8)',
            minFontSize: 46,
        });
    }

    const panelY = 430;
    const panels = [
        { x: 76, w: 254, sx: 0.08 },
        { x: 356, w: 254, sx: 0.5 },
        { x: 636, w: 368, sx: 0.92 },
    ];
    panels.forEach((panel, index) => {
        fillRounded(ctx, panel.x + 10, panelY + 12, panel.w, 288, 8, 'rgba(0,0,0,0.18)');
        drawCropZoom(ctx, image, panel.x, panelY, panel.w, 288, 6, panel.sx, getAssetFocusY(asset), index === 2 ? 1.45 : 2.25);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 10;
        ctx.strokeRect(panel.x, panelY, panel.w, 288);
        ctx.strokeStyle = 'rgba(17,17,18,0.24)';
        ctx.lineWidth = 2;
        ctx.strokeRect(panel.x, panelY, panel.w, 288);
    });

    const heroY = 720;
    fillRounded(ctx, 68, heroY + 26, 944, 376, 10, 'rgba(0,0,0,0.18)');
    fillRounded(ctx, 58, heroY, 964, 408, 8, '#FFFFFF');
    if (asset.type === 'Vehicle') {
        drawContain(ctx, image, 74, heroY + 26, 932, 356, 4);
    } else {
        drawCover(ctx, image, 74, heroY + 24, 932, 360, 4, getAssetFocusY(asset));
    }
    const heroFade = ctx.createLinearGradient(0, heroY + 170, 0, heroY + 408);
    heroFade.addColorStop(0, 'rgba(0,0,0,0)');
    heroFade.addColorStop(1, 'rgba(0,0,0,0.44)');
    ctx.fillStyle = heroFade;
    ctx.fillRect(74, heroY + 24, 932, 360);

    drawPosterLabel(ctx, mode === 'purchase' ? 'OWNED' : 'FEATURED', 76, 1152, palette.ink, '#FFFFFF', 182);
    drawPosterLabel(ctx, getAssetKind(asset), 276, 1152, palette.accent, '#FFFFFF', 278);
    drawPosterLabel(ctx, getAssetSignal(asset), 572, 1152, palette.accentAlt, palette.ink, 260);

    ctx.save();
    ctx.translate(985, 334);
    ctx.rotate(Math.PI / 2);
    ctx.font = '900 24px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = palette.ink;
    ctx.fillText(`${getPlayerHandle(player)} / ${moneyShort(value)} / ACTOR EMPIRE`, 0, 0);
    ctx.restore();

    ctx.font = '900 29px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = palette.ink;
    ctx.fillText('OWN IT. FLEX IT. BUILD THE EMPIRE.', 76, 1250);
    drawWatermark(ctx, palette.ink, palette.accent);
};

const drawPortfolioPoster = (
    ctx: CanvasRenderingContext2D,
    assets: ShareableAsset[],
    images: HTMLImageElement[],
    player: Player,
    totalValue: number,
    weeklyRent: number,
) => {
    const palette = getPosterPalette(assets[0]);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = palette.wash;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawPosterTexture(ctx, palette.ink, true);
    ctx.strokeStyle = palette.accentAlt;
    ctx.lineWidth = 4;
    ctx.strokeRect(44, 44, CANVAS_WIDTH - 88, CANVAS_HEIGHT - 88);

    ctx.textAlign = 'left';
    ctx.font = '900 28px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = palette.accent;
    ctx.fillText('ACTOR EMPIRE PORTFOLIO', 72, 112);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(72, 134, 422, 8);
    ctx.fillStyle = palette.accentAlt;
    ctx.fillRect(510, 134, 142, 8);
    drawSticker(ctx, moneyShort(totalValue), 738, 70, 284, 104, {
        fill: palette.ink,
        color: '#FFFFFF',
        stroke: palette.accent,
        fontSize: 42,
    });
    drawBigTitle(ctx, 'EMPIRE DROP', 68, 278, 940, 2, 138, {
        fill: palette.ink,
        stroke: 'rgba(255,255,255,0.78)',
        minFontSize: 78,
        lineHeight: 0.82,
    });

    const collageY = 390;
    const gap = 20;
    if (assets.length <= 2) {
        const tileWidth = assets.length === 1 ? 940 : 458;
        images.forEach((image, index) => {
            const x = 70 + index * (tileWidth + gap);
            fillRounded(ctx, x + 12, collageY + 12, tileWidth, 530, 6, 'rgba(0,0,0,0.18)');
            drawCover(ctx, image, x, collageY, tileWidth, 530, 8, getAssetFocusY(assets[index]));
            strokeRounded(ctx, x, collageY, tileWidth, 530, 8, '#FFFFFF', 10);
        });
    } else if (assets.length <= 4) {
        drawCover(ctx, images[0], 72, collageY, 574, 560, 8, getAssetFocusY(assets[0]));
        strokeRounded(ctx, 72, collageY, 574, 560, 8, '#FFFFFF', 10);
        const tileWidth = 314;
        const tileHeight = 172;
        images.slice(0, 4).forEach((image, index) => {
            if (index === 0) return;
            const x = 688;
            const y = collageY + (index - 1) * (tileHeight + gap);
            drawCover(ctx, image, x, y, tileWidth, tileHeight, 8, getAssetFocusY(assets[index]));
            strokeRounded(ctx, x, y, tileWidth, tileHeight, 8, '#FFFFFF', 8);
        });
    } else {
        drawCover(ctx, images[0], 70, collageY, 536, 552, 8, getAssetFocusY(assets[0]));
        strokeRounded(ctx, 70, collageY, 536, 552, 8, '#FFFFFF', 10);
        const tileWidth = 178;
        const tileHeight = 167;
        images.slice(0, 8).forEach((image, index) => {
            if (index === 0) return;
            const column = (index - 1) % 2;
            const row = Math.floor((index - 1) / 2);
            const x = 646 + column * (tileWidth + gap);
            const y = collageY + row * (tileHeight + gap);
            drawCover(ctx, image, x, y, tileWidth, tileHeight, 8, getAssetFocusY(assets[index]));
            strokeRounded(ctx, x, y, tileWidth, tileHeight, 8, '#FFFFFF', 7);
        });
    }

    drawSticker(ctx, `${assets.length} ASSETS`, 72, 878, 244, 76, {
        fill: palette.accent,
        color: '#FFFFFF',
        stroke: '#FFFFFF',
        rotation: -0.06,
        fontSize: 30,
    });

    ctx.font = '900 38px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = palette.ink;
    ctx.fillText(truncateText(ctx, `${player.name || 'Actor'} portfolio`, 620), 72, 1010);
    ctx.font = '900 24px Arial Black, Inter, Arial, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.fillText(getPlayerHandle(player), 72, 1050);

    const statY = 1092;
    const stats = [
        ['ASSETS', String(assets.length)],
        ['VALUE', moneyShort(totalValue)],
        ['RENT / WEEK', moneyShort(weeklyRent)],
    ];
    stats.forEach(([label, value], index) => {
        const x = 72 + index * 310;
        fillRounded(ctx, x, statY, 278, 126, 6, index === 1 ? palette.accent : palette.ink);
        ctx.fillStyle = index === 1 ? '#FFFFFF' : palette.paper;
        ctx.font = '900 18px Arial Black, Inter, Arial, sans-serif';
        ctx.fillText(label, x + 24, statY + 42);
        ctx.font = '900 40px Arial Black, Inter, Arial, sans-serif';
        ctx.fillText(truncateText(ctx, value, 220), x + 24, statY + 92);
    });

    drawWatermark(ctx, palette.ink, palette.accent);
};

export const AssetShareModal: React.FC<AssetShareModalProps> = ({
    player,
    assets,
    mode = 'portfolio',
    onClose,
    onChangeAssets,
    resolveAssetValue,
    portfolioValue,
    weeklyRent = 0,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [status, setStatus] = useState<'idle' | 'rendering' | 'ready' | 'saved' | 'copied' | 'error'>('rendering');
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const shareMode: NonNullable<AssetShareModalProps['mode']> = mode === 'purchase' ? 'purchase' : 'portfolio';

    const visibleAssets = useMemo(() => assets.filter(Boolean).slice(0, 8), [assets]);
    const totalValue = portfolioValue ?? visibleAssets.reduce((sum, asset) => sum + (resolveAssetValue ? resolveAssetValue(asset) : asset.price), 0);
    const primaryAsset = visibleAssets[0];
    const title = shareMode === 'purchase' ? tr('assetShare.title.purchase') : tr('assetShare.title.portfolio');
    const caption = shareMode === 'purchase' && primaryAsset
        ? tr('assetShare.caption.purchase', { name: player.name, asset: primaryAsset.name })
        : tr('assetShare.caption.portfolio', { name: player.name, count: visibleAssets.length, value: moneyShort(totalValue) });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || visibleAssets.length === 0) return;
        let cancelled = false;

        const draw = async () => {
            setStatus('rendering');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            ctx.imageSmoothingEnabled = false;

            try {
                const images = await Promise.all(visibleAssets.map(async asset => {
                    const info = getLifestyleAssetImageInfo(asset);
                    try {
                        return await loadImage(info.src);
                    } catch {
                        return loadImage(info.fallbackSrc);
                    }
                }));
                if (cancelled) return;
                if (visibleAssets.length === 1) {
                    drawSinglePoster(ctx, visibleAssets[0], images[0], player, totalValue, shareMode);
                } else {
                    drawPortfolioPoster(ctx, visibleAssets, images, player, totalValue, weeklyRent);
                }
                setStatus('ready');
            } catch {
                setStatus('error');
            }
        };

        draw();
        return () => {
            cancelled = true;
        };
    }, [visibleAssets, player, totalValue, shareMode, weeklyRent]);

    const getBlob = () => new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob(blob => resolve(blob), 'image/png', 0.95);
    });

    const downloadImage = async () => {
        const blob = await getBlob();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `actor-empire-${shareMode}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatus('saved');
    };

    const shareImage = async () => {
        const blob = await getBlob();
        if (!blob) return;
        const file = new File([blob], `actor-empire-${shareMode}.png`, { type: 'image/png' });
        const nav = navigator as Navigator & {
            canShare?: (data: { files?: File[] }) => boolean;
            share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
        };
        if (nav.share && nav.canShare?.({ files: [file] })) {
            await nav.share({ title: tr('assetShare.nativeTitle'), text: caption, files: [file] });
            return;
        }
        await downloadImage();
    };

    const copyCaption = async () => {
        await navigator.clipboard?.writeText(caption);
        setStatus('copied');
    };

    if (!primaryAsset) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/92 p-4 backdrop-blur-2xl animate-in fade-in duration-200">
            <div className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-[2.1rem] border border-fuchsia-300/20 bg-zinc-950 shadow-2xl shadow-fuchsia-950/30">
                <div className="h-2 bg-gradient-to-r from-rose-500 via-cyan-300 to-emerald-300" />
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-br from-white/[0.08] via-transparent to-rose-500/10 px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-2 text-cyan-100 shadow-lg shadow-cyan-950/40">
                            {shareMode === 'purchase' ? <Check size={18} /> : <ImageIcon size={18} />}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200">Post Studio</div>
                            <div className="truncate text-xl font-black text-white">{title}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-2xl border border-white/10 bg-black/45 p-2 text-zinc-300 transition hover:bg-white/10">
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <div className="relative overflow-hidden rounded-[1.85rem] border border-white/10 bg-black shadow-2xl shadow-black">
                        <canvas ref={canvasRef} className="block aspect-[4/5] w-full" />
                        {status === 'rendering' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/75 text-xs font-black uppercase tracking-[0.24em] text-cyan-100">
                                Rendering drop
                            </div>
                        )}
                    </div>
                    <div className="mt-3 rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/10 via-white/[0.03] to-rose-500/10 p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">Caption</div>
                        <div className="mt-1 text-sm font-bold leading-relaxed text-zinc-300">{caption}</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-black/45 p-4">
                    <button onClick={shareImage} disabled={status === 'rendering'} className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-black shadow-lg shadow-cyan-950/40 disabled:opacity-40">
                        <Share2 size={15} /> Share
                    </button>
                    <button onClick={downloadImage} disabled={status === 'rendering'} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-black disabled:opacity-40">
                        <Download size={15} /> Save
                    </button>
                    <button onClick={copyCaption} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-200">
                        <Copy size={15} /> Copy
                    </button>
                    {onChangeAssets && (
                        <button onClick={onChangeAssets} className="col-span-3 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-3 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100">
                            Change Assets
                        </button>
                    )}
                    {(status === 'saved' || status === 'copied') && (
                        <div className="col-span-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                            {status === 'saved' ? 'Image saved' : 'Caption copied'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
