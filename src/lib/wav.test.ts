import { describe, expect, it } from 'vitest';
import { encodeWav } from './wav';

describe('encodeWav', () => {
    it('writes a 16-bit mono header and one sample per frame', async () => {
        const wav = encodeWav(Float32Array.from([0, 1, -1]), 16000);
        const bytes = new Uint8Array(await wav.arrayBuffer());
        const view = new DataView(bytes.buffer);

        expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF');
        expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('WAVE');
        expect(view.getUint32(24, true)).toBe(16000);
        expect(view.getUint16(22, true)).toBe(1);
        expect(bytes.length).toBe(44 + 6);
        expect(view.getInt16(44, true)).toBe(0);
        expect(view.getInt16(46, true)).toBe(32767);
        expect(view.getInt16(48, true)).toBe(-32768);
    });
});
