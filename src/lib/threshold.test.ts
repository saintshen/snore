import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLD_DBFS, thresholdFromSettings } from './threshold';

describe('thresholdFromSettings', () => {
    it('uses the default when the new field is missing', () => {
        expect(thresholdFromSettings(null)).toBe(DEFAULT_THRESHOLD_DBFS);
        expect(thresholdFromSettings({ snoreThreshold: 45 })).toBe(DEFAULT_THRESHOLD_DBFS);
    });

    it('reads snoreThresholdDbfs', () => {
        expect(thresholdFromSettings({ snoreThreshold: 45, snoreThresholdDbfs: -36 })).toBe(-36);
    });
});
