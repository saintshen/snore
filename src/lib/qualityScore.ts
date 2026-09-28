const MIN_DURATION_MS = 15 * 60 * 1000;

// Sessions under 15 minutes have no score. Otherwise 100 - 5 points per snore per hour, clamped to 0..100.
export function calculateQualityScore(snoreCount: number, durationMs: number): number | null {
    if (durationMs < MIN_DURATION_MS) return null;

    const hours = durationMs / 3_600_000;
    const penalty = (snoreCount / hours) * 5;
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
