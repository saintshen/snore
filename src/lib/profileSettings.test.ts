import { describe, expect, it } from 'vitest';
import {
    clipSavingDefaultFromSettings,
    profileSettingsFromJson,
    withClipSavingDefault,
    withSnoreThresholdDbfs,
} from './profileSettings';

describe('profile settings', () => {
    it('defaults clip saving to false when settings are absent', () => {
        expect(clipSavingDefaultFromSettings(null)).toBe(false);
        expect(profileSettingsFromJson(null)).toEqual({});
    });

    it('defaults clip saving to false when settings are invalid', () => {
        expect(clipSavingDefaultFromSettings(true)).toBe(false);
        expect(clipSavingDefaultFromSettings(['saveClipsDefault', true])).toBe(false);
        expect(clipSavingDefaultFromSettings({ saveClipsDefault: 'true' })).toBe(false);
    });

    it('reads an explicit false clip saving default', () => {
        expect(clipSavingDefaultFromSettings({ saveClipsDefault: false })).toBe(false);
        expect(profileSettingsFromJson({ saveClipsDefault: false })).toEqual({ saveClipsDefault: false });
    });

    it('reads an explicit true clip saving default', () => {
        expect(clipSavingDefaultFromSettings({ saveClipsDefault: true })).toBe(true);
        expect(profileSettingsFromJson({ saveClipsDefault: true })).toEqual({ saveClipsDefault: true });
    });

    it('preserves existing settings when writing the clip saving default', () => {
        expect(
            withClipSavingDefault(
                {
                    sensitivity: 5,
                    notify: false,
                    snoreThresholdDbfs: -35,
                    saveClipsDefault: false,
                    ignored: 'value',
                },
                true,
            ),
        ).toEqual({
            sensitivity: 5,
            notify: false,
            snoreThresholdDbfs: -35,
            saveClipsDefault: true,
            ignored: 'value',
        });

        expect(
            withClipSavingDefault(
                {
                    sensitivity: 5,
                    notify: false,
                    snoreThresholdDbfs: -35,
                    saveClipsDefault: true,
                    ignored: 'value',
                },
                false,
            ),
        ).toEqual({
            sensitivity: 5,
            notify: false,
            snoreThresholdDbfs: -35,
            saveClipsDefault: false,
            ignored: 'value',
        });
    });

    it('preserves clip saving default and unrelated settings when writing the threshold', () => {
        expect(
            withSnoreThresholdDbfs(
                {
                    snoreThreshold: -50,
                    snoreThresholdDbfs: -35,
                    saveClipsDefault: true,
                    ignored: 'value',
                },
                -42,
            ),
        ).toEqual({
            snoreThresholdDbfs: -42,
            saveClipsDefault: true,
            ignored: 'value',
        });
    });

    it('drops settings with invalid value types', () => {
        expect(
            profileSettingsFromJson({
                sensitivity: Number.NaN,
                notify: 'false',
                snoreThresholdDbfs: Number.POSITIVE_INFINITY,
                saveClipsDefault: 1,
            }),
        ).toEqual({});
    });
});
