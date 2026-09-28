export const DBFS_FLOOR = -100;

// Integer dBFS from time-domain samples. 0 is full scale. Silence clamps to DBFS_FLOOR.
export function dbfsFromTimeDomain(samples: ArrayLike<number>): number {
    const count = samples.length;
    if (count === 0) return DBFS_FLOOR;

    let sum = 0;
    for (let i = 0; i < count; i++) {
        const sample = samples[i];
        sum += sample * sample;
    }

    const rms = Math.sqrt(sum / count);
    if (!(rms > 0)) return DBFS_FLOOR;

    const db = 20 * Math.log10(rms);
    if (!Number.isFinite(db)) return DBFS_FLOOR;
    return Math.round(Math.min(0, Math.max(DBFS_FLOOR, db)));
}
