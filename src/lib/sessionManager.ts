import { supabase } from './supabase';
import type { Database } from '../types/supabase';

type SleepSessionInsert = Database['public']['Tables']['sleep_sessions']['Insert'];

export const sessionManager = {
    async saveSession(userId: string, startTime: number, noiseLog: { timestamp: number; db: number }[], snoreCount: number) {
        if (!userId) throw new Error('User not logged in');

        const startTimeISO = new Date(startTime).toISOString();
        const endTimeISO = new Date().toISOString();

        // Insert session
        const sessionData: SleepSessionInsert = {
            user_id: userId,
            start_time: startTimeISO,
            end_time: endTimeISO,
            noise_log: noiseLog as any, // Cast to any to avoid strict Json type mismatch with specific object array
            snore_count: snoreCount,
            quality_score: calculateQualityScore(snoreCount, noiseLog.length),
        };

        const { data, error } = await supabase
            .from('sleep_sessions')
            .insert(sessionData)
            .select()
            .single();

        if (error) {
            console.error('Error saving session:', error);
            throw error;
        }

        return data;
    }
};

function calculateQualityScore(snoreCount: number, durationSeconds: number): number {
    if (durationSeconds === 0) return 100;
    const hours = durationSeconds / 3600;
    if (hours < 0.1) return 80;

    const penalty = (snoreCount / hours) * 5;
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
