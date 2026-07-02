import { readFileSync } from 'node:fs';

const desk = readFileSync('views/mobile/components/StudioAcquisitionDesk.tsx', 'utf8');
const forbes = readFileSync('views/mobile/ForbesApp.tsx', 'utf8');

const failures = [];

[
    ['completeStockControlAcquisition', 'Forbes should call the stock-control completion service'],
    ['onCompleteStockControl', 'Acquisition desk should receive a dedicated stock-control callback'],
].forEach(([needle, message]) => {
    if (!forbes.includes(needle) && !desk.includes(needle)) failures.push(message);
});

[
    ['stockControlMode', 'Desk should detect majority public-market stock control'],
    ['showStockControlReview', 'Desk should render a dedicated stock-control review state'],
    ['No seller counter', 'Desk copy should explain that no seller counter is needed'],
    ['Additional Price', 'Desk should label the added acquisition price separately'],
    ['formatMoney(0)', 'Desk should show a zero additional price for stock-control transfer'],
    ['Complete Control Transfer', 'Desk should expose a clear control-transfer completion action'],
].forEach(([needle, message]) => {
    if (!desk.includes(needle)) failures.push(message);
});

if (desk.indexOf('{showStockControlReview ?') > desk.indexOf(': responseOffer && sellerResponse ?')) {
    failures.push('Stock-control review should be checked before the stale seller-response branch.');
}

if (failures.length > 0) {
    console.error(failures.map(failure => `- ${failure}`).join('\n'));
    process.exit(1);
}

console.log('Stock control acquisition UI audit passed.');
