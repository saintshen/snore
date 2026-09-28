import { describe, expect, it } from 'vitest';
import { calculateQualityScore } from './qualityScore';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

describe('calculateQualityScore', () => {
    it('returns null under 15 minutes', () => {
        expect(calculateQualityScore(0, FIFTEEN_MINUTES - 1)).toBeNull();
    });

    it('scores a 15 minute session', () => {
        expect(calculateQualityScore(0, FIFTEEN_MINUTES)).toBe(100);
    });

    it('subtracts 5 points per snore per hour', () => {
        expect(calculateQualityScore(12, 60 * 60 * 1000)).toBe(40);
    });

    it('clamps the score to 0..100', () => {
        expect(calculateQualityScore(0, 8 * 60 * 60 * 1000)).toBe(100);
        expect(calculateQualityScore(100, 60 * 60 * 1000)).toBe(0);
    });
});
