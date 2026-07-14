import { readFileSync } from 'node:fs';
import type { Business } from '../types';
import { calculateBusinessTrafficSnapshot } from '../services/businessLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeBusiness = (overrides: Partial<Business> = {}): Business => ({
    id: 'biz_capacity_test',
    name: 'Sunberry Test Cafe',
    type: 'RESTAURANT',
    subtype: 'FAST_FOOD',
    logo: 'store',
    color: '#f59e0b',
    foundedWeek: 1,
    balance: 1_000_000,
    isActive: true,
    config: {
        quality: 'STANDARD',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
    },
    stats: {
        weeklyRevenue: 0,
        weeklyExpenses: 0,
        weeklyProfit: 0,
        lifetimeRevenue: 0,
        valuation: 0,
        brandHealth: 90,
        customerSatisfaction: 100,
        riskLevel: 10,
        hype: 100,
        capacity: 75,
        locations: 300,
        inventory: 0,
    },
    staff: [
        { id: 'staff_1', name: 'Ash Wilder', role: 'STAFF', skill: 85, salary: 1400, morale: 90 },
        { id: 'staff_2', name: 'Kai Knight', role: 'STAFF', skill: 81, salary: 1300, morale: 88 },
        { id: 'staff_3', name: 'Luna Stone', role: 'MANAGER', skill: 88, salary: 2500, morale: 92 },
    ],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    ...overrides,
});

const scaled = makeBusiness();
const scaledSnapshot = calculateBusinessTrafficSnapshot(scaled, 100);

assert(scaledSnapshot.physicalSeats === 22_500, `expected 22.5k physical seats, got ${scaledSnapshot.physicalSeats}`);
assert(
    scaledSnapshot.physicalWeeklyCapacity >= 500_000,
    `weekly location throughput should scale beyond raw seats, got ${scaledSnapshot.physicalWeeklyCapacity}`,
);
assert(
    scaledSnapshot.effectiveCapacity > 300_000,
    `reasonable staff coverage should serve a large chain, got ${scaledSnapshot.effectiveCapacity}`,
);
assert(
    scaledSnapshot.bottleneck !== 'STAFF',
    `300 locations with trained staff should not be staff-bottlenecked by tiny per-worker math`,
);

const noStaffSnapshot = calculateBusinessTrafficSnapshot(makeBusiness({ staff: [] }), 100);
assert(noStaffSnapshot.effectiveCapacity === 0, 'service business with no staff should still be blocked');
assert(noStaffSnapshot.bottleneck === 'STAFF', `no-staff business should show staff bottleneck, got ${noStaffSnapshot.bottleneck}`);

const businessLogicSource = readFileSync('services/businessLogic.ts', 'utf8');
const dashboardSource = readFileSync('views/lifestyle/business/BusinessDashboard.tsx', 'utf8');

assert(!businessLogicSource.includes('workers.length * 35'), 'old weekly staff-capacity formula must not return');
assert(!dashboardSource.includes('workers.length * 20'), 'dashboard must not use its old separate capacity formula');
assert(
    dashboardSource.includes('calculateBusinessTrafficSnapshot'),
    'dashboard must render the same demand/capacity snapshot used by the weekly engine',
);

console.log('Business capacity audit passed', {
    demand: scaledSnapshot.demand,
    effectiveCapacity: scaledSnapshot.effectiveCapacity,
    physicalSeats: scaledSnapshot.physicalSeats,
    physicalWeeklyCapacity: scaledSnapshot.physicalWeeklyCapacity,
    staffCoverage: Math.round(scaledSnapshot.staffCoverage * 100),
});
