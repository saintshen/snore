export const PRE_ROLL_MS = 2_000;
export const POST_ROLL_MS = 1_000;
export const CLIP_LIMIT = 50;

export interface SnoreClip {
    blob: Blob;
    startedAt: number;
    endedAt: number;
    peakDbfs: number;
    durationSeconds: number;
}

export function clipWindow(startedAt: number, endedAt: number, postRollMs = POST_ROLL_MS) {
    return {
        startMs: startedAt - PRE_ROLL_MS,
        endMs: endedAt + postRollMs,
    };
}

export function clipObjectPath(userId: string, sessionId: string, eventId: string) {
    return `${userId}/${sessionId}/${eventId}.wav`;
}
