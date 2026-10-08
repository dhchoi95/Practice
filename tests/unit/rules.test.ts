import { describe, expect, it } from 'vitest';
import {
  intervalsOverlap,
  parseWon,
  recommendOrder,
  saleNet,
} from '../../src/modules/rules';

describe('purchase recommendations', () => {
  it('rounds a below-minimum stock position up to a whole pack', () => {
    expect(recommendOrder(18, 20, 60, 20)).toBe(60);
  });

  it('subtracts outstanding incoming stock before rounding', () => {
    expect(recommendOrder(18, 20, 60, 20, 40)).toBe(20);
  });

  it('triggers when stock is exactly at its minimum and returns zero above it', () => {
    expect(recommendOrder(20, 20, 60, 20)).toBe(40);
    expect(recommendOrder(21, 20, 60, 20)).toBe(0);
  });
});

describe('won amounts and sale totals', () => {
  it('uses exact integer won arithmetic for a discounted, partly refunded sale', () => {
    expect(
      saleNet(10, parseWon('10000'), parseWon('5000'), parseWon('10000')),
    ).toBe(85000n);
    expect(85000n - parseWon('50000')).toBe(35000n);
  });

  it('rejects an adjustment greater than the gross sale', () => {
    expect(() => saleNet(1, 100n, 101n)).toThrow('adjustments exceed gross');
  });

  it('accepts only decimal digit strings for won amounts', () => {
    expect(parseWon('00042')).toBe(42n);
    expect(() => parseWon('1.5')).toThrow('invalid amount');
    expect(() => parseWon('-1')).toThrow('invalid amount');
  });
});

describe('reservation interval boundaries', () => {
  const time = (hour: number) =>
    new Date(`2026-10-07T${String(hour).padStart(2, '0')}:00:00.000Z`);

  it('rejects a real overlap but permits one booking to start at the previous end', () => {
    expect(intervalsOverlap(time(10), time(12), time(11), time(13))).toBe(true);
    expect(intervalsOverlap(time(10), time(12), time(12), time(13))).toBe(
      false,
    );
  });
});
