import type { Database } from '../types/supabase';

type PublicTables = Database['public']['Tables'];

export type ProfileRow = PublicTables['profiles']['Row'];
export type ProfileSettings = {
    sensitivity?: number;
    notify?: boolean;
    snoreThresholdDbfs?: number;
    saveClipsDefault?: boolean;
};

export type SleepSessionRow = PublicTables['sleep_sessions']['Row'];
export type SleepSessionInsert = PublicTables['sleep_sessions']['Insert'];
export type SleepSessionUpdate = PublicTables['sleep_sessions']['Update'];

export type SnoreEventRow = PublicTables['snore_events']['Row'];
export type SnoreEventInsert = PublicTables['snore_events']['Insert'];
