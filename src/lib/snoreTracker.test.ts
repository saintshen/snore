import { describe, expect, it } from 'vitest';
import { createSnoreState, flushSnore, reduceSnore, type ClosedSnore, type SnoreState } from './snoreTracker';

const THRESHOLD = -28;

function run(levels: Array<[number, number]>, flushAt?: number): SnoreState & { closed: ClosedSnore[] } {
    let state = createSnoreState();
    const closed: ClosedSnore[] = [];
    for (const [time, level] of levels) {
        const step = reduceSnore(state, level, time, THRESHOLD);
        state = step.state;
        if (step.closed) closed.push(step.closed);
    }
    if (flushAt != null) {
        const step = flushSnore(state, flushAt);
        state = step.state;
        if (step.closed) closed.push(step.closed);
    }
    return { ...state, closed };
}

describe('reduceSnore', () => {
    it('ignores a stretch shorter than 500ms', () => {
        expect(run([[0, -10], [400, -40]]).count).toBe(0);
    });

    it('counts one continuous stretch once', () => {
        const state = run([
            [0, -10],
            [400, -10],
            [900, -20],
            [1200, -40],
        ]);
        expect(state.count).toBe(1);
        expect(state.open).toBe(false);
    });

    it('does not end an event inside the 6 dBFS hysteresis band', () => {
        const state = run([
            [0, -10],
            [600, -30],
            [900, -31],
            [1400, -40],
        ]);
        expect(state.count).toBe(1);
    });

    it('does not start a new event inside the hysteresis band', () => {
        expect(run([[0, -30], [800, -31]]).count).toBe(0);
        expect(run([[0, -30], [800, -31]]).open).toBe(false);
    });

    it('counts a stretch that is still open when recording stops', () => {
        expect(run([[0, -10], [800, -10]], 800).count).toBe(1);
        expect(run([[0, -10]], 200).count).toBe(0);
    });

    it('reports the peak of a closed stretch', () => {
        const result = run([[0, -20], [700, -10], [1200, -40]]);
        expect(result.closed).toEqual([{ startedAt: 0, endedAt: 1200, peakDbfs: -10 }]);
    });
});
