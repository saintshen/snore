export const MIN_SNORE_MS = 500;
export const HYSTERESIS_DB = 6;

export interface ClosedSnore {
    startedAt: number;
    endedAt: number;
    peakDbfs: number;
}

export interface SnoreState {
    open: boolean;
    startedAt: number | null;
    peakDbfs: number;
    count: number;
}

export interface SnoreStep {
    state: SnoreState;
    closed: ClosedSnore | null;
}

export function createSnoreState(): SnoreState {
    return { open: false, startedAt: null, peakDbfs: -100, count: 0 };
}

function closeStretch(state: SnoreState, nowMs: number): SnoreStep {
    const startedAt = state.startedAt ?? nowMs;
    const idle: SnoreState = { open: false, startedAt: null, peakDbfs: -100, count: state.count };
    if (nowMs - startedAt <= MIN_SNORE_MS) {
        return { state: idle, closed: null };
    }
    return {
        state: { ...idle, count: state.count + 1 },
        closed: { startedAt, endedAt: nowMs, peakDbfs: state.peakDbfs },
    };
}

// A stretch starts above the threshold and ends only after it falls HYSTERESIS_DB below it.
export function reduceSnore(state: SnoreState, levelDbfs: number, nowMs: number, thresholdDbfs: number): SnoreStep {
    if (!state.open) {
        if (levelDbfs > thresholdDbfs) {
            return {
                state: { ...state, open: true, startedAt: nowMs, peakDbfs: levelDbfs },
                closed: null,
            };
        }
        return { state, closed: null };
    }

    const openState = { ...state, peakDbfs: Math.max(state.peakDbfs, levelDbfs) };
    if (levelDbfs < thresholdDbfs - HYSTERESIS_DB) {
        return closeStretch(openState, nowMs);
    }
    return { state: openState, closed: null };
}

export function flushSnore(state: SnoreState, nowMs: number): SnoreStep {
    if (!state.open || state.startedAt == null) {
        return { state: { ...state, open: false, startedAt: null }, closed: null };
    }
    return closeStretch(state, nowMs);
}
