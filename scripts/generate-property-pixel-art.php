<?php

declare(strict_types=1);

$sourcePath = __DIR__ . '/../services/lifestyleLogic.ts';
$outputDir = __DIR__ . '/../assets/lifestyle/properties';

if (!is_dir($outputDir)) {
    mkdir($outputDir, 0777, true);
}

$source = file_get_contents($sourcePath);
if ($source === false) {
    fwrite(STDERR, "Could not read lifestyle catalog.\n");
    exit(1);
}

$start = strpos($source, 'export const PROPERTY_CATALOG');
$bodyStart = strpos($source, '[', $start);
$bodyEnd = strpos($source, "\n];", $bodyStart);
$body = substr($source, $bodyStart + 1, $bodyEnd - $bodyStart - 1);
preg_match_all('/\{[^\n]*id:\s*\'([^\']+)\'[^\n]*\}/', $body, $matches);

function field(string $entry, string $name): string
{
    if (preg_match('/' . preg_quote($name, '/') . ':\s*\'((?:\\\\\'|[^\'])*)\'/', $entry, $match)) {
        return str_replace("\\'", "'", $match[1]);
    }
    if (preg_match('/' . preg_quote($name, '/') . ':\s*"([^"]*)"/', $entry, $match)) {
        return $match[1];
    }
    return '';
}

function numberField(string $entry, string $name): int
{
    if (!preg_match('/' . preg_quote($name, '/') . ':\s*([0-9_]+)/', $entry, $match)) {
        return 0;
    }
    return (int) str_replace('_', '', $match[1]);
}

function color($image, string $hex): int
{
    $hex = ltrim($hex, '#');
    return imagecolorallocate($image, hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2)));
}

function rect($image, int $x, int $y, int $w, int $h, int $color): void
{
    imagefilledrectangle($image, $x, $y, $x + $w - 1, $y + $h - 1, $color);
}

function polygon($image, array $points, int $color): void
{
    imagefilledpolygon($image, $points, $color);
}

function seedFor(string $id): int
{
    return abs(crc32($id));
}

function paletteFor(string $location, int $seed): array
{
    $location = strtolower($location);
    if (str_contains($location, 'dubai') || str_contains($location, 'caribbean') || str_contains($location, 'miami')) {
        return ['#081923', '#1f6f8b', '#24d1c0', '#f8d37a', '#f8fafc'];
    }
    if (str_contains($location, 'paris') || str_contains($location, 'france') || str_contains($location, 'london')) {
        return ['#17111f', '#4c2f5e', '#a78bfa', '#f5d0fe', '#f8fafc'];
    }
    if (str_contains($location, 'tokyo') || str_contains($location, 'seoul')) {
        return ['#06121f', '#1d4ed8', '#22d3ee', '#f0abfc', '#f8fafc'];
    }
    if (str_contains($location, 'iceland') || str_contains($location, 'aspen')) {
        return ['#07111d', '#334155', '#93c5fd', '#f8fafc', '#dbeafe'];
    }
    $palettes = [
        ['#071a14', '#0f3f2f', '#34d399', '#a7f3d0', '#f8fafc'],
        ['#140d1f', '#34204d', '#a78bfa', '#f0abfc', '#f8fafc'],
        ['#0f172a', '#1e3a8a', '#38bdf8', '#bae6fd', '#f8fafc'],
        ['#1f1308', '#78350f', '#f59e0b', '#fde68a', '#f8fafc'],
    ];
    return $palettes[$seed % count($palettes)];
}

function propertyKind(string $name, int $price): string
{
    $lower = strtolower($name);
    if (str_contains($lower, 'island')) return 'island';
    if (str_contains($lower, 'tower') || str_contains($lower, 'penthouse') || str_contains($lower, 'high-rise') || str_contains($lower, 'condo') || str_contains($lower, 'apartment') || str_contains($lower, 'flat') || str_contains($lower, 'skyloft')) return 'tower';
    if (str_contains($lower, 'château') || str_contains($lower, 'chateau')) return 'chateau';
    if (str_contains($lower, 'cabin') || str_contains($lower, 'chalet')) return 'cabin';
    if (str_contains($lower, 'riad')) return 'riad';
    if ($price >= 80_000_000) return 'estate';
    if (str_contains($lower, 'villa') || str_contains($lower, 'estate') || str_contains($lower, 'mansion') || str_contains($lower, 'house')) return 'villa';
    return 'home';
}

function drawPixelFrame($image, array $palette): void
{
    [$bg, $deep, $accent, $light, $white] = array_map(fn($hex) => color($image, $hex), $palette);
    rect($image, 0, 0, 512, 512, $bg);
    for ($y = 0; $y < 512; $y += 32) {
        $shade = imagecolorallocatealpha($image, 255, 255, 255, 122);
        imageline($image, 0, $y, 512, $y, $shade);
    }
    for ($x = 0; $x < 512; $x += 32) {
        $shade = imagecolorallocatealpha($image, 255, 255, 255, 124);
        imageline($image, $x, 0, $x, 512, $shade);
    }
    rect($image, 24, 24, 464, 464, imagecolorallocatealpha($image, 0, 0, 0, 72));
    imagerectangle($image, 24, 24, 487, 487, $accent);
    imagerectangle($image, 32, 32, 479, 479, imagecolorallocatealpha($image, 255, 255, 255, 112));
    rect($image, 56, 398, 400, 34, imagecolorallocatealpha($image, 0, 0, 0, 50));
    rect($image, 72, 432, 368, 18, $deep);
}

function drawWindows($image, int $x, int $y, int $cols, int $rows, int $window, int $gap, int $color): void
{
    for ($row = 0; $row < $rows; $row++) {
        for ($col = 0; $col < $cols; $col++) {
            rect($image, $x + $col * ($window + $gap), $y + $row * ($window + $gap), $window, $window, $color);
        }
    }
}

function drawTower($image, array $palette, int $seed, int $price): void
{
    [$bg, $deepHex, $accentHex, $lightHex, $whiteHex] = $palette;
    $deep = color($image, $deepHex);
    $accent = color($image, $accentHex);
    $light = color($image, $lightHex);
    $white = color($image, $whiteHex);
    $body = $price > 50_000_000 ? $accent : $deep;
    rect($image, 162, 92, 188, 306, $body);
    rect($image, 190, 56, 132, 54, $deep);
    rect($image, 132, 164, 56, 234, imagecolorallocatealpha($image, 255, 255, 255, 106));
    rect($image, 324, 146, 48, 252, imagecolorallocatealpha($image, 0, 0, 0, 60));
    drawWindows($image, 186, 130, 5, 8, 18, 12, $light);
    drawWindows($image, 145, 190, 2, 5, 16, 10, $white);
    rect($image, 232, 344, 48, 54, color($image, '#050505'));
    rect($image, 150, 80, 212, 18, $light);
}

function drawVilla($image, array $palette, int $seed, int $price): void
{
    [$bg, $deepHex, $accentHex, $lightHex, $whiteHex] = $palette;
    $deep = color($image, $deepHex);
    $accent = color($image, $accentHex);
    $light = color($image, $lightHex);
    $white = color($image, $whiteHex);
    rect($image, 94, 194, 324, 178, $deep);
    rect($image, 132, 142, 250, 74, $accent);
    polygon($image, [70, 204, 256, 88, 442, 204], $accent);
    rect($image, 124, 226, 58, 54, $light);
    rect($image, 228, 226, 58, 54, $light);
    rect($image, 330, 226, 58, 54, $light);
    rect($image, 224, 300, 64, 72, color($image, '#050505'));
    rect($image, 76, 372, 360, 24, $accent);
    if ($price >= 25_000_000) {
        rect($image, 86, 402, 340, 22, color($image, '#38bdf8'));
        rect($image, 96, 408, 320, 8, imagecolorallocatealpha($image, 255, 255, 255, 90));
    }
    rect($image, 48, 332, 54, 64, imagecolorallocatealpha($image, 0, 0, 0, 58));
    rect($image, 410, 328, 44, 68, imagecolorallocatealpha($image, 0, 0, 0, 68));
}

function drawCabin($image, array $palette, int $seed): void
{
    [$bg, $deepHex, $accentHex, $lightHex, $whiteHex] = $palette;
    $deep = color($image, $deepHex);
    $accent = color($image, $accentHex);
    $light = color($image, $lightHex);
    $white = color($image, $whiteHex);
    rect($image, 84, 108, 344, 64, $white);
    rect($image, 108, 214, 296, 166, $deep);
    polygon($image, [74, 218, 256, 96, 438, 218], $accent);
    rect($image, 132, 248, 56, 48, $light);
    rect($image, 324, 248, 56, 48, $light);
    rect($image, 224, 304, 64, 76, color($image, '#050505'));
    rect($image, 54, 386, 404, 22, $white);
}

function drawChateau($image, array $palette, int $seed): void
{
    [$bg, $deepHex, $accentHex, $lightHex, $whiteHex] = $palette;
    $deep = color($image, $deepHex);
    $accent = color($image, $accentHex);
    $light = color($image, $lightHex);
    $white = color($image, $whiteHex);
    rect($image, 112, 172, 288, 198, $deep);
    rect($image, 82, 134, 62, 236, $deep);
    rect($image, 368, 134, 62, 236, $deep);
    polygon($image, [70, 134, 113, 72, 156, 134], $accent);
    polygon($image, [356, 134, 399, 72, 442, 134], $accent);
    polygon($image, [96, 174, 256, 92, 416, 174], $accent);
    drawWindows($image, 154, 206, 4, 4, 24, 22, $light);
    rect($image, 230, 304, 54, 66, color($image, '#050505'));
}

function drawIsland($image, array $palette, int $seed): void
{
    [$bg, $deepHex, $accentHex, $lightHex, $whiteHex] = $palette;
    $deep = color($image, $deepHex);
    $accent = color($image, $accentHex);
    $light = color($image, $lightHex);
    $water = color($image, '#22d3ee');
    rect($image, 42, 300, 428, 110, $water);
    polygon($image, [82, 330, 224, 272, 420, 330, 386, 390, 116, 390], color($image, '#facc15'));
    rect($image, 170, 214, 178, 86, $deep);
    polygon($image, [142, 218, 256, 138, 370, 218], $accent);
    rect($image, 206, 240, 36, 34, $light);
    rect($image, 270, 240, 36, 34, $light);
    rect($image, 242, 274, 32, 26, color($image, '#050505'));
    rect($image, 96, 238, 18, 80, color($image, '#854d0e'));
    polygon($image, [104, 206, 58, 238, 118, 240], color($image, '#22c55e'));
    polygon($image, [110, 196, 118, 248, 164, 218], color($image, '#16a34a'));
}

function drawRiad($image, array $palette, int $seed): void
{
    [$bg, $deepHex, $accentHex, $lightHex, $whiteHex] = $palette;
    $deep = color($image, $deepHex);
    $accent = color($image, $accentHex);
    $light = color($image, $lightHex);
    rect($image, 104, 152, 304, 222, $deep);
    rect($image, 128, 128, 256, 40, $accent);
    rect($image, 150, 198, 56, 66, $light);
    rect($image, 306, 198, 56, 66, $light);
    imagefilledarc($image, 178, 198, 56, 56, 180, 360, $light, IMG_ARC_PIE);
    imagefilledarc($image, 334, 198, 56, 56, 180, 360, $light, IMG_ARC_PIE);
    rect($image, 226, 284, 60, 90, color($image, '#050505'));
    imagefilledarc($image, 256, 284, 60, 70, 180, 360, color($image, '#050505'), IMG_ARC_PIE);
}

function renderProperty(array $property, string $outputDir): void
{
    $seed = seedFor($property['id']);
    $palette = paletteFor($property['location'], $seed);
    $image = imagecreatetruecolor(512, 512);
    imagealphablending($image, true);
    imagesavealpha($image, true);
    drawPixelFrame($image, $palette);
    $kind = propertyKind($property['name'], $property['price']);
    if ($kind === 'tower') {
        drawTower($image, $palette, $seed, $property['price']);
    } elseif ($kind === 'chateau') {
        drawChateau($image, $palette, $seed);
    } elseif ($kind === 'cabin') {
        drawCabin($image, $palette, $seed);
    } elseif ($kind === 'island') {
        drawIsland($image, $palette, $seed);
    } elseif ($kind === 'riad') {
        drawRiad($image, $palette, $seed);
    } else {
        drawVilla($image, $palette, $seed, $property['price']);
    }
    $sparkle = color($image, '#fef3c7');
    for ($i = 0; $i < 6; $i++) {
        $x = 58 + (($seed >> ($i * 3)) % 392);
        $y = 54 + (($seed >> ($i * 4)) % 122);
        rect($image, $x, $y, 8, 8, $sparkle);
        rect($image, $x + 2, $y - 2, 4, 12, $sparkle);
    }
    imagepng($image, $outputDir . '/' . $property['id'] . '.png', 8);
}

$properties = [];
foreach ($matches[0] as $entry) {
    $properties[] = [
        'id' => field($entry, 'id'),
        'name' => field($entry, 'name'),
        'price' => numberField($entry, 'price'),
        'location' => field($entry, 'location'),
    ];
}

foreach ($properties as $property) {
    renderProperty($property, $outputDir);
}

echo 'Generated ' . count($properties) . " property pixel assets in {$outputDir}\n";
