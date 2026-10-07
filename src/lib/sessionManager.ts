import { finishedPatch, newSessionRecord, progressPatch, type NoiseSample } from './sessionDraft';
import { profilesTable, sleepSessionsTable } from './supabase';

export const sessionManager = {
    async startSession(userId: string, startedAtMs: number): Promise<string> {
        if (!userId) throw new Error('User not logged in');

        // sleep_sessions.user_id references profiles; accounts created before the
        // signup trigger existed have no profile row, so the insert would 409.
        const { error: profileError } = await profilesTable()
            .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

        if (profileError) {
            console.error('Error ensuring profile:', profileError);
            throw profileError;
        }

        const { data, error } = await sleepSessionsTable()
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
        const { error } = await sleepSessionsTable()
            .update(progressPatch(noiseLog, snoreCount))
            .eq('id', sessionId);

        if (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    },

    async finishSession(sessionId: string, startedAtMs: number, endedAtMs: number, noiseLog: NoiseSample[], snoreCount: number) {
        const { error } = await sleepSessionsTable()
            .update(finishedPatch(startedAtMs, endedAtMs, noiseLog, snoreCount))
            .eq('id', sessionId);

        if (error) {
            console.error('Error finishing session:', error);
            throw error;
        }
    },
};
