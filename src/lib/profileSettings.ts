import type { ProfileSettings } from './dbTypes';
import type { Json } from '../types/supabase';

export type ProfileSettingsJson = { [key: string]: Json | undefined };

const isSettingsObject = (value: Json): value is ProfileSettingsJson =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: Json | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value);

const settingsObjectOrEmpty = (value: Json): ProfileSettingsJson =>
    isSettingsObject(value) ? { ...value } : {};

export function profileSettingsFromJson(value: Json): ProfileSettings {
    if (!isSettingsObject(value)) {
        return {};
    }

    const settings: ProfileSettings = {};

    if (isFiniteNumber(value.sensitivity)) {
        settings.sensitivity = value.sensitivity;
    }

    if (typeof value.notify === 'boolean') {
        settings.notify = value.notify;
    }

    if (isFiniteNumber(value.snoreThresholdDbfs)) {
        settings.snoreThresholdDbfs = value.snoreThresholdDbfs;
    }

    if (typeof value.saveClipsDefault === 'boolean') {
        settings.saveClipsDefault = value.saveClipsDefault;
    }

    return settings;
}

export function clipSavingDefaultFromSettings(value: Json): boolean {
    return profileSettingsFromJson(value).saveClipsDefault === true;
}

export function withClipSavingDefault(value: Json, enabled: boolean): ProfileSettingsJson {
    return {
        ...settingsObjectOrEmpty(value),
        saveClipsDefault: enabled,
    };
}

export function withSnoreThresholdDbfs(value: Json, threshold: number): ProfileSettingsJson {
    const settings = settingsObjectOrEmpty(value);
    delete settings.snoreThreshold;

    return {
        ...settings,
        snoreThresholdDbfs: threshold,
    };
}
