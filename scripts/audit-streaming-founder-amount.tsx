import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER } from '../types';
import { getStreamingStudioFinanceData } from '../services/streamingStudioFinance';
import * as capitalView from '../components/studio-finance/components/CapitalView';
import { money } from '../components/studio-finance/finance/format';

test('founder capital amount is an editable field for the native mobile number keyboard', () => {
  const data = getStreamingStudioFinanceData(INITIAL_PLAYER);
  const markup = renderToStaticMarkup(
    <capitalView.CapitalView
      data={data}
      handlers={{}}
      initialRoute="founder"
      onCashMoved={() => {}}
    />,
  );
  assert.match(markup, /aria-label="Founder capital amount"/);
  assert.match(markup, /inputMode="numeric"|inputmode="numeric"/);
});

test('a small personal balance still offers a usable quarter-balance starting amount', () => {
  const data = getStreamingStudioFinanceData(INITIAL_PLAYER);
  const markup = renderToStaticMarkup(
    <capitalView.CapitalView data={data} handlers={{}} initialRoute="founder" onCashMoved={() => {}} />,
  );
  assert.match(markup, /Transfer \$500</);
  assert.match(markup, /Exact transfer: \$500/);
  assert.match(markup, /aria-describedby="sf-founder-amount-help" value="500"/);
  assert.match(markup, /max="1000" step="1"[^>]*aria-label="Injection amount"[^>]*value="250"/);
});

test('custom founder amount accepts exact whole dollars but rejects invalid and unaffordable input', () => {
  const parse = (capitalView as unknown as {
    parseFounderCapitalAmount?: (raw: string, max: number) => number | null;
  }).parseFounderCapitalAmount;
  assert.equal(typeof parse, 'function');
  assert.equal(parse!('25,000,001', 50_000_000), 25_000_001);
  assert.equal(parse!('50,000,001', 50_000_000), null);
  assert.equal(parse!('0', 50_000_000), null);
  assert.equal(parse!('1.5', 50_000_000), null);
  assert.equal(parse!('1e6', 50_000_000), null);
  assert.equal(parse!('9,007,199,254,740,993', 10_000_000_000_000_000), null);
});

test('large slider values remain transferable when their whole-dollar value is exactly representable', () => {
  const parse = capitalView.parseFounderCapitalAmount;
  const balance = 20_000_000_000_000_000;
  assert.equal(parse('15,487,227,759,610,520', balance), 15_487_227_759_610_520);
  assert.equal(parse('16,000,000,000,000,000', balance), 16_000_000_000_000_000);
  assert.equal(parse('20,000,000,000,000,000', balance), balance);
  assert.equal(parse('15,487,227,759,610,521', balance), null);
});

test('slider position maps large balances without putting quadrillion-dollar values into the native range', () => {
  assert.equal(capitalView.founderCapitalSliderAmount(20_000_000_000_000_000, 800), 16_000_000_000_000_000);
  assert.equal(capitalView.founderCapitalSliderAmount(20_000_000_000_000_000, 1000), 20_000_000_000_000_000);
  assert.equal(capitalView.founderCapitalSliderPosition(16_000_000_000_000_000, 20_000_000_000_000_000), 800);
  assert.equal(capitalView.founderCapitalSliderAmount(1_000_000, 333), 333_000);
});

test('the finance amount readout scales trillion-dollar balances instead of a long billion figure', () => {
  assert.equal(money(500_000_000_000_000), '$500T');
});
