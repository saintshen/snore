import { describe, expect, it } from 'vitest';
import { finishedPatch, newSessionRecord, progressPatch, SESSION_FLUSH_MS } from './sessionDraft';

describe('session drafts', () => {
    it('opens a session without an end time', () => {
        const row = newSessionRecord('user-1', Date.parse('2026-09-27T00:00:00Z'));
        expect(row.end_time).toBeNull();
        expect(row.noise_log).toEqual([]);
        expect(row.snore_count).toBe(0);
        expect(row.quality_score).toBeNull();
    });

    it('progress updates do not close the session', () => {
        expect(progressPatch([{ timestamp: 1, db: -20 }], 2)).toEqual({
            noise_log: [{ timestamp: 1, db: -20 }],
            snore_count: 2,
        });
    });

    it('finishes a short session with no quality score', () => {
        const started = Date.parse('2026-09-27T00:00:00Z');
        const patch = finishedPatch(started, started + 60_000, [], 1);
        expect(patch.end_time).toBe(new Date(started + 60_000).toISOString());
        expect(patch.quality_score).toBeNull();
        expect(patch.snore_count).toBe(1);
    });

    it('flushes once a minute', () => {
        expect(SESSION_FLUSH_MS).toBe(60_000);
    });
});
