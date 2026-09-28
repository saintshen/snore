import { calculateQualityScore } from './qualityScore';

export const SESSION_FLUSH_MS = 60_000;

export interface NoiseSample {
    timestamp: number;
    db: number;
}

export function newSessionRecord(userId: string, startedAtMs: number) {
    return {
        user_id: userId,
        start_time: new Date(startedAtMs).toISOString(),
        end_time: null,
        noise_log: [] as NoiseSample[],
        snore_count: 0,
        quality_score: null,
    };
}

export function progressPatch(noiseLog: NoiseSample[], snoreCount: number) {
    return {
        noise_log: noiseLog,
        snore_count: snoreCount,
    };
}

export function finishedPatch(startedAtMs: number, endedAtMs: number, noiseLog: NoiseSample[], snoreCount: number) {
    return {
        end_time: new Date(endedAtMs).toISOString(),
        noise_log: noiseLog,
        snore_count: snoreCount,
        quality_score: calculateQualityScore(snoreCount, endedAtMs - startedAtMs),
    };
}
