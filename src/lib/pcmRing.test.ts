import { describe, expect, it } from 'vitest';
import { PcmRing } from './pcmRing';

describe('PcmRing', () => {
    it('slices a time range out of the buffered audio', () => {
        const ring = new PcmRing(1000, 30);
        ring.write(Float32Array.from({ length: 1000 }, (_, i) => i), 1000);

        const secondHalf = ring.slice(500, 1000);
        expect(secondHalf.length).toBe(500);
        expect(secondHalf[0]).toBe(500);
        expect(secondHalf[499]).toBe(999);
    });

    it('drops audio older than the ring', () => {
        const ring = new PcmRing(1000, 1);
        ring.write(Float32Array.from({ length: 1000 }, () => 1), 1000);
        ring.write(Float32Array.from({ length: 1000 }, () => 2), 2000);

        expect(ring.slice(0, 1000).length).toBe(0);
        expect(ring.slice(1000, 2000)[0]).toBe(2);
    });
});
