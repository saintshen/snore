import { clipObjectPath } from './snoreClips';
import type { SnoreClip } from './snoreClips';
import type { SnoreEventInsert } from './dbTypes';
import { snoreEventsTable, supabase } from './supabase';

export async function uploadSnoreClip(userId: string, sessionId: string, clip: SnoreClip) {
    const eventId = crypto.randomUUID();
    const path = clipObjectPath(userId, sessionId, eventId);
    const { error: uploadError } = await supabase.storage.from('snore-clips').upload(path, clip.blob, {
        contentType: 'audio/wav',
        upsert: false,
    });
    if (uploadError) throw uploadError;

    const event: SnoreEventInsert = {
        id: eventId,
        session_id: sessionId,
        user_id: userId,
        timestamp: new Date(clip.startedAt).toISOString(),
        audio_path: path,
        duration_seconds: clip.durationSeconds,
        peak_db: Math.round(clip.peakDbfs),
        confidence_score: null,
    };

    const { error } = await snoreEventsTable().insert(event);
    if (error) {
        await supabase.storage.from('snore-clips').remove([path]);
        throw error;
    }
}

export async function deleteSleepSession(userId: string, sessionId: string) {
    const folder = `${userId}/${sessionId}`;
    const { data, error: listError } = await supabase.storage.from('snore-clips').list(folder);
    if (listError) throw listError;

    const paths = (data ?? [])
        .map((file) => file.name)
        .filter((name) => name && !name.startsWith('.'))
        .map((name) => `${folder}/${name}`);

    if (paths.length > 0) {
        const { error: removeError } = await supabase.storage.from('snore-clips').remove(paths);
        if (removeError) throw removeError;
    }

    const { error: deleteError } = await supabase.from('sleep_sessions').delete().eq('id', sessionId);
    if (deleteError) throw deleteError;
}
