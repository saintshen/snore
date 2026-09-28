import { describe, expect, it } from 'vitest';
import { DBFS_FLOOR, dbfsFromTimeDomain } from './level';

describe('dbfsFromTimeDomain', () => {
    it('clamps silence to the floor', () => {
        expect(dbfsFromTimeDomain(new Float32Array(16))).toBe(DBFS_FLOOR);
        expect(dbfsFromTimeDomain([])).toBe(DBFS_FLOOR);
    });

    it('maps full-scale samples to 0 dBFS', () => {
        expect(dbfsFromTimeDomain(Float32Array.from([1, -1, 1, -1]))).toBe(0);
    });

    it('converts amplitude 0.1 to -20 dBFS', () => {
        expect(dbfsFromTimeDomain(Float32Array.from([0.1, -0.1, 0.1, -0.1]))).toBe(-20);
    });

    it('clamps samples above full scale to 0 dBFS', () => {
        expect(dbfsFromTimeDomain(Float32Array.from([2, -2]))).toBe(0);
    });
});
