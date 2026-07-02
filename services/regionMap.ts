import type { BoxOfficeRegionId, ScreeningStrategy } from '../types';
import { BOX_OFFICE_REGIONS } from './cinemaChains';

export interface RegionMapOverlay {
    id: BoxOfficeRegionId;
    label: string;
    shortLabel: string;
    path: string;
    labelX: number;
    labelY: number;
    accent: string;
    countryIds: string[];
}

export interface RegionMapSummary {
    regionCount: number;
    marketWeight: number;
    labels: string[];
    shortLabels: string[];
}

const regionMeta = Object.fromEntries(
    BOX_OFFICE_REGIONS.map(region => [region.id, region])
) as Record<BoxOfficeRegionId, typeof BOX_OFFICE_REGIONS[number]>;

const validRegionIds = new Set<BoxOfficeRegionId>(BOX_OFFICE_REGIONS.map(region => region.id));

const LEGACY_REGION_FOLD: Record<string, BoxOfficeRegionId> = {
    LATIN_AMERICA: 'SOUTH_AMERICA',
    UK_IRELAND: 'EUROPE',
    RUSSIA_CIS: 'EUROPE',
    CHINA: 'ASIA',
    JAPAN_KOREA: 'ASIA',
    INDIA_SOUTH_ASIA: 'ASIA',
    SOUTHEAST_ASIA: 'ASIA',
    MIDDLE_EAST_AFRICA: 'AFRICA'
};

const countryIds = (...ids: string[]): string[] => ids;

export const REGION_MAP_OVERLAYS: RegionMapOverlay[] = [
    {
        id: 'NORTH_AMERICA',
        label: regionMeta.NORTH_AMERICA.label,
        shortLabel: regionMeta.NORTH_AMERICA.shortLabel,
        path: 'M80 135 C103 96 163 72 230 82 C291 91 337 124 361 166 C379 198 361 225 319 226 C285 227 261 214 231 219 C190 226 158 216 123 196 C91 178 68 160 80 135 Z M62 111 C87 86 139 79 160 94 C138 111 106 127 76 135 C58 136 50 126 62 111 Z M232 223 C275 229 320 244 348 268 C367 284 359 304 326 299 C292 294 272 269 239 259 C218 252 212 232 232 223 Z M345 289 C369 291 390 302 400 317 C382 319 359 314 340 303 C331 298 333 290 345 289 Z',
        labelX: 218,
        labelY: 163,
        accent: '#49f2b0',
        countryIds: countryIds('124', '840', '484', '188', '222', '320', '340', '558', '591', '192', '214', '332', '388', '028', '052', '084', '212', '308', '630', '659', '662', '670', '780', '534', '060', '796', '850')
    },
    {
        id: 'SOUTH_AMERICA',
        label: regionMeta.SOUTH_AMERICA.label,
        shortLabel: regionMeta.SOUTH_AMERICA.shortLabel,
        path: 'M276 284 C307 286 331 315 322 356 C314 392 293 416 290 453 C286 487 257 498 238 469 C219 439 220 408 202 379 C184 348 194 319 203 298 C216 276 244 281 276 284 Z M256 249 C284 250 304 262 318 282 C291 281 260 276 235 265 C232 253 240 248 256 249 Z',
        labelX: 247,
        labelY: 355,
        accent: '#ffb86b',
        countryIds: countryIds('032', '068', '076', '152', '170', '218', '328', '600', '604', '740', '858', '862', '254')
    },
    {
        id: 'EUROPE',
        label: regionMeta.EUROPE.label,
        shortLabel: regionMeta.EUROPE.shortLabel,
        path: 'M421 130 C445 101 493 95 533 110 C569 124 602 139 616 167 C598 190 563 200 530 189 C507 181 488 197 464 188 C441 179 418 156 421 130 Z M505 73 C542 47 597 48 629 75 C600 91 553 95 511 90 C495 87 493 80 505 73 Z M388 147 C407 133 429 133 439 149 C429 166 405 166 389 157 C384 153 384 151 388 147 Z M452 190 C473 192 493 202 503 216 C481 219 458 214 444 202 C437 196 440 190 452 190 Z',
        labelX: 522,
        labelY: 165,
        accent: '#ffd166',
        countryIds: countryIds('008', '040', '056', '100', '112', '191', '196', '203', '208', '233', '246', '250', '276', '300', '304', '348', '352', '372', '380', '428', '440', '442', '470', '492', '498', '499', '528', '578', '616', '620', '642', '643', '674', '688', '703', '705', '724', '752', '756', '804', '807', '826', '020', '070')
    },
    {
        id: 'ASIA',
        label: regionMeta.ASIA.label,
        shortLabel: regionMeta.ASIA.shortLabel,
        path: 'M594 106 C661 72 788 66 880 96 C947 118 979 160 959 207 C938 257 866 268 812 286 C760 304 724 332 667 303 C620 279 589 229 585 175 C582 142 580 118 594 106 Z M703 282 C733 301 754 334 745 363 C719 347 698 319 684 294 C681 286 690 280 703 282 Z M766 292 C794 307 821 330 826 357 C796 349 767 328 750 306 C744 299 751 291 766 292 Z M904 268 C933 274 958 292 962 314 C934 318 904 304 888 285 C883 278 889 269 904 268 Z M965 219 C985 220 997 233 993 249 C978 255 960 250 952 236 C949 229 955 221 965 219 Z',
        labelX: 758,
        labelY: 205,
        accent: '#ff6b6b',
        countryIds: countryIds('004', '031', '050', '051', '064', '096', '104', '116', '144', '156', '268', '356', '360', '364', '368', '376', '392', '398', '400', '408', '410', '414', '417', '418', '422', '458', '462', '496', '512', '524', '586', '608', '626', '634', '682', '702', '704', '760', '762', '764', '784', '792', '795', '860', '887')
    },
    {
        id: 'AFRICA',
        label: regionMeta.AFRICA.label,
        shortLabel: regionMeta.AFRICA.shortLabel,
        path: 'M506 210 C553 190 612 207 646 258 C681 311 668 378 621 426 C585 462 535 432 507 380 C476 324 468 252 506 210 Z M585 423 C603 428 621 446 621 468 C598 466 579 451 573 432 C572 425 577 421 585 423 Z M654 246 C679 247 699 264 704 288 C678 289 658 277 646 256 C642 250 647 246 654 246 Z',
        labelX: 563,
        labelY: 319,
        accent: '#c4b5fd',
        countryIds: countryIds('012', '024', '072', '108', '120', '140', '148', '174', '178', '180', '204', '231', '232', '262', '266', '270', '275', '288', '324', '384', '404', '426', '430', '434', '450', '454', '466', '478', '504', '508', '516', '562', '566', '624', '646', '686', '694', '706', '710', '716', '728', '729', '732', '748', '768', '788', '800', '818', '894')
    },
    {
        id: 'OCEANIA',
        label: regionMeta.OCEANIA.label,
        shortLabel: regionMeta.OCEANIA.shortLabel,
        path: 'M781 364 C828 343 901 357 935 397 C963 432 935 466 879 470 C824 474 770 451 760 415 C754 392 761 373 781 364 Z M922 453 C944 452 967 464 978 481 C954 489 927 482 911 464 C907 458 913 454 922 453 Z M957 337 C973 336 986 345 988 359 C972 365 956 360 949 348 C947 342 951 338 957 337 Z',
        labelX: 846,
        labelY: 419,
        accent: '#93c5fd',
        countryIds: countryIds('036', '242', '296', '520', '554', '583', '584', '585', '598', '776', '798', '882', '090', '548')
    }
];

const overlayById = Object.fromEntries(
    REGION_MAP_OVERLAYS.map(region => [region.id, region])
) as Record<BoxOfficeRegionId, RegionMapOverlay>;

export const getRegionMapOverlay = (regionId: BoxOfficeRegionId): RegionMapOverlay | undefined => overlayById[regionId];

export const normalizeReleaseRegionIds = (
    selectedRegionIds: Array<BoxOfficeRegionId | string | null | undefined>
): BoxOfficeRegionId[] => {
    const normalizedRegionIds: BoxOfficeRegionId[] = [];

    selectedRegionIds.forEach(regionId => {
        if (!regionId) return;
        const nextRegionId = validRegionIds.has(regionId as BoxOfficeRegionId)
            ? regionId as BoxOfficeRegionId
            : LEGACY_REGION_FOLD[regionId];

        if (nextRegionId && !normalizedRegionIds.includes(nextRegionId)) {
            normalizedRegionIds.push(nextRegionId);
        }
    });

    return normalizedRegionIds;
};

export const getDefaultReleaseRegionIds = (strategy: ScreeningStrategy): BoxOfficeRegionId[] => {
    if (strategy === 'REGIONAL') {
        return ['NORTH_AMERICA'];
    }

    if (strategy === 'NATIONAL') {
        return ['NORTH_AMERICA', 'EUROPE', 'ASIA'];
    }

    return BOX_OFFICE_REGIONS.map(region => region.id);
};

export const getRegionMapSummary = (selectedRegionIds: Array<BoxOfficeRegionId | string>): RegionMapSummary => {
    const uniqueRegionIds = normalizeReleaseRegionIds(selectedRegionIds);
    const selectedRegions = uniqueRegionIds
        .map(regionId => regionMeta[regionId])
        .filter(Boolean);

    return {
        regionCount: selectedRegions.length,
        marketWeight: Number(selectedRegions.reduce((sum, region) => sum + region.marketWeight, 0).toFixed(2)),
        labels: selectedRegions.map(region => region.label),
        shortLabels: selectedRegions.map(region => region.shortLabel)
    };
};
