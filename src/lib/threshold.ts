export const DEFAULT_THRESHOLD_DBFS = -28;
export const THRESHOLD_MIN_DBFS = -60;
export const THRESHOLD_MAX_DBFS = -6;

// Reads the dBFS threshold only. Older `snoreThreshold` values are a different scale and are ignored.
export function thresholdFromSettings(settings: unknown): number {
    if (!settings || typeof settings !== 'object') return DEFAULT_THRESHOLD_DBFS;

    const value = (settings as Record<string, unknown>).snoreThresholdDbfs;
    if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_THRESHOLD_DBFS;

    return Math.round(Math.min(THRESHOLD_MAX_DBFS, Math.max(THRESHOLD_MIN_DBFS, value)));
}
