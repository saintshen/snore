import { finishedPatch, newSessionRecord, progressPatch, type NoiseSample } from './sessionDraft';
import { supabase } from './supabase';

export const sessionManager = {
    async startSession(userId: string, startedAtMs: number): Promise<string> {
        if (!userId) throw new Error('User not logged in');

        const { data, error } = await (supabase
            .from('sleep_sessions') as any)
            .insert(newSessionRecord(userId, startedAtMs))
            .select('id')
            .single();

        if (error) {
            console.error('Error starting session:', error);
            throw error;
        }

        return data.id as string;
    },

    async updateProgress(sessionId: string, noiseLog: NoiseSample[], snoreCount: number) {
        const { error } = await (supabase
            .from('sleep_sessions') as any)
            .update(progressPatch(noiseLog, snoreCount))
            .eq('id', sessionId);

        if (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    },

    async finishSession(sessionId: string, startedAtMs: number, endedAtMs: number, noiseLog: NoiseSample[], snoreCount: number) {
        const { error } = await (supabase
            .from('sleep_sessions') as any)
            .update(finishedPatch(startedAtMs, endedAtMs, noiseLog, snoreCount))
            .eq('id', sessionId);

        if (error) {
            console.error('Error finishing session:', error);
            throw error;
        }
    },
};
