import { describe, expect, it } from 'vitest';
import { CLIP_LIMIT, clipObjectPath, clipWindow } from './snoreClips';

describe('snore clip window', () => {
    it('keeps two seconds before the snore and one second after it', () => {
        expect(clipWindow(10_000, 12_500)).toEqual({ startMs: 8_000, endMs: 13_500 });
    });

    it('stores the file under the user and session folders', () => {
        expect(clipObjectPath('user', 'session', 'event')).toBe('user/session/event.wav');
    });

    it('caps a night at 50 clips', () => {
        expect(CLIP_LIMIT).toBe(50);
    });
});