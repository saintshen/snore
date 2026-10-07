import React, { useEffect, useRef, useState } from 'react';
import { useRecorder, type RecordingSnapshot } from '../hooks/useRecorder';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { DBFS_FLOOR } from '../lib/level';
import { uploadSnoreClip } from '../lib/clipStore';
import { CLIP_LIMIT, type SnoreClip } from '../lib/snoreClips';
import { SESSION_FLUSH_MS } from '../lib/sessionDraft';
import { sessionManager } from '../lib/sessionManager';
import { profilesTable, supabase } from '../lib/supabase';
import { DEFAULT_THRESHOLD_DBFS, thresholdFromSettings } from '../lib/threshold';
import { clipSavingDefaultFromSettings } from '../lib/profileSettings';

const PROGRESS_ERROR = "Couldn't save progress. Recording continues.";
const SAVE_ERROR = "Couldn't save this recording.";
const STOP_RETRY_DELAYS_MS = [0, 2_000, 5_000];

export const Recorder: React.FC = () => {
    const [snoreThreshold, setSnoreThreshold] = useState(DEFAULT_THRESHOLD_DBFS);
    const [saveClipsForRecording, setSaveClipsForRecording] = useState(false);
    const [profileSettingsLoading, setProfileSettingsLoading] = useState(true);

    useEffect(() => {
        const loadProfileSettings = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await profilesTable()
                    .select('settings')
                    .eq('id', user.id)
                    .single();

                setSnoreThreshold(thresholdFromSettings(data?.settings));
                setSaveClipsForRecording(clipSavingDefaultFromSettings(data?.settings ?? null));
            } catch (err) {
                console.error('Failed to load profile settings:', err);
            } finally {
                setProfileSettingsLoading(false);
            }
        };
        loadProfileSettings();
    }, []);

    const clipHandlerRef = useRef<(clip: SnoreClip) => void>(() => {});
    const { isRecording, decibels, decibelsRef, thresholdRef, noiseLogRef, snoreCountRef, startRecording, stopRecording, error, formatTime, duration, snoreCount } = useRecorder({
        snoreThreshold,
        onClip: (clip) => clipHandlerRef.current(clip),
    });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sessionIdRef = useRef<string | null>(null);
    const startPendingRef = useRef(false);
    const recordingStartedAtRef = useRef<number | null>(null);
    const stopRequestedRef = useRef(false);
    const earlyStopRef = useRef<RecordingSnapshot | null>(null);
    const cancelledRef = useRef(false);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [wakeWarning, setWakeWarning] = useState(false);
    const [clipLimitReached, setClipLimitReached] = useState(false);
    const clipQueueRef = useRef<SnoreClip[]>([]);
    const savedClipsRef = useRef(0);
    const saveClipsForRecordingRef = useRef(false);
    const userIdRef = useRef<string | null>(null);

    const saveClip = async (sessionId: string, clip: SnoreClip) => {
        if (savedClipsRef.current >= CLIP_LIMIT) {
            setClipLimitReached(true);
            return;
        }
        savedClipsRef.current += 1;
        try {
            await uploadSnoreClip(userIdRef.current ?? '', sessionId, clip);
            if (savedClipsRef.current >= CLIP_LIMIT) setClipLimitReached(true);
        } catch (err) {
            savedClipsRef.current -= 1;
            console.error('Failed to save snore clip:', err);
        }
    };

    const handleClip = (clip: SnoreClip) => {
        if (!saveClipsForRecordingRef.current) return;

        if (savedClipsRef.current >= CLIP_LIMIT) {
            setClipLimitReached(true);
            return;
        }
        const sessionId = sessionIdRef.current;
        if (!sessionId) {
            clipQueueRef.current.push(clip);
            return;
        }
        void saveClip(sessionId, clip);
    };
    clipHandlerRef.current = handleClip;

    // Scroll the waveform from a ref so decibel updates do not restart (and clear) the canvas.
    useEffect(() => {
        if (!canvasRef.current || !isRecording) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, width, height);

        let frame = 0;
        const draw = () => {
            const level = decibelsRef.current;
            const threshold = thresholdRef.current;
            const imageData = ctx.getImageData(1, 0, width - 1, height);
            ctx.putImageData(imageData, 0, 0);

            ctx.fillStyle = '#1f2937';
            ctx.fillRect(width - 1, 0, 1, height);

            const barHeight = Math.max(0, Math.min(height, ((level - DBFS_FLOOR) / -DBFS_FLOOR) * height));
            if (level > threshold + 10) ctx.fillStyle = '#ef4444';
            else if (level > threshold) ctx.fillStyle = '#eab308';
            else ctx.fillStyle = '#22c55e';

            ctx.fillRect(width - 2, height - barHeight, 2, barHeight);
            frame = requestAnimationFrame(draw);
        };

        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, [decibelsRef, isRecording, thresholdRef]);

    const createSession = async (startedAt: number): Promise<string> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not logged in');
        userIdRef.current = user.id;
        return sessionManager.startSession(user.id, startedAt);
    };

    const flushQueuedClips = (sessionId: string) => {
        const queued = clipQueueRef.current;
        clipQueueRef.current = [];
        if (!saveClipsForRecordingRef.current) return;
        for (const clip of queued) void saveClip(sessionId, clip);
    };

    // Saves a stopped Recording, creating its row first if the start never succeeded.
    // Retries a few times because this is the last chance to keep the night's data.
    const saveStopped = async (snapshot: RecordingSnapshot) => {
        let sessionId = sessionIdRef.current;
        sessionIdRef.current = null;
        const startedAt = snapshot.startedAt ?? Date.now();

        for (const delay of STOP_RETRY_DELAYS_MS) {
            if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
            try {
                sessionId ??= await createSession(startedAt);
                await sessionManager.finishSession(sessionId, startedAt, Date.now(), snapshot.noiseLog, snapshot.snoreCount);
                flushQueuedClips(sessionId);
                setSaveError(null);
                return;
            } catch (err) {
                console.error(err);
            }
        }
        setSaveError(SAVE_ERROR);
    };
    const saveStoppedRef = useRef(saveStopped);
    saveStoppedRef.current = saveStopped;

    // Creates the session row while recording. On failure the row stays missing and the
    // progress timer (or Wake Up) tries again, so a failed start never drops the Recording.
    const openSession = async (startedAt: number) => {
        if (startPendingRef.current) return;
        startPendingRef.current = true;
        let opened = false;
        try {
            sessionIdRef.current = await createSession(startedAt);
            opened = true;
        } catch (err) {
            console.error(err);
        }
        startPendingRef.current = false;

        if (stopRequestedRef.current || cancelledRef.current) {
            const snap = earlyStopRef.current ?? {
                startedAt,
                noiseLog: noiseLogRef.current,
                snoreCount: snoreCountRef.current,
            };
            earlyStopRef.current = null;
            stopRequestedRef.current = false;
            await saveStopped(snap);
            return;
        }

        if (!opened || !sessionIdRef.current) {
            setSaveError(PROGRESS_ERROR);
            return;
        }
        flushQueuedClips(sessionIdRef.current);
        setSaveError((current) => current === PROGRESS_ERROR ? null : current);
    };
    const openSessionRef = useRef(openSession);
    openSessionRef.current = openSession;

    const handleStart = async () => {
        if (profileSettingsLoading) return;

        setSaveError(null);
        setClipLimitReached(false);
        saveClipsForRecordingRef.current = saveClipsForRecording;
        savedClipsRef.current = 0;
        clipQueueRef.current = [];
        sessionIdRef.current = null;
        earlyStopRef.current = null;
        stopRequestedRef.current = false;
        const startedAt = await startRecording();
        if (startedAt == null) return;

        recordingStartedAtRef.current = startedAt;
        await openSession(startedAt);
    };

    const handleStop = async () => {
        const snapshot = stopRecording();
        if (!snapshot) return;
        recordingStartedAtRef.current = null;
        if (startPendingRef.current) {
            // openSession finishes the Recording once its in-flight start settles.
            earlyStopRef.current = snapshot;
            stopRequestedRef.current = true;
            return;
        }
        await saveStopped(snapshot);
    };

    useEffect(() => {
        if (!isRecording) return;

        const timer = window.setInterval(() => {
            const sessionId = sessionIdRef.current;
            if (!sessionId) {
                const startedAt = recordingStartedAtRef.current;
                if (startedAt != null) void openSessionRef.current(startedAt);
                return;
            }
            sessionManager.updateProgress(sessionId, noiseLogRef.current, snoreCountRef.current)
                .then(() => setSaveError((current) => current === PROGRESS_ERROR ? null : current))
                .catch((err) => {
                    console.error(err);
                    setSaveError(PROGRESS_ERROR);
                });
        }, SESSION_FLUSH_MS);

        return () => window.clearInterval(timer);
    }, [isRecording, noiseLogRef, snoreCountRef]);

    const stopRecordingRef = useRef(stopRecording);
    stopRecordingRef.current = stopRecording;

    useEffect(() => {
        cancelledRef.current = false;
        return () => {
            cancelledRef.current = true;
            // An in-flight start sees cancelledRef and saves the Recording itself.
            if (startPendingRef.current) return;
            const snap = stopRecordingRef.current();
            if (!snap?.startedAt) return;
            void saveStoppedRef.current(snap);
        };
    }, []);

    useEffect(() => {
        if (!isRecording) return;

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isRecording]);

    useEffect(() => {
        if (!isRecording) {
            wakeLockRef.current?.release().catch(() => {});
            wakeLockRef.current = null;
            return;
        }

        let cancelled = false;
        const requestLock = async () => {
            if (!('wakeLock' in navigator)) {
                setWakeWarning(true);
                return;
            }
            try {
                const lock = await navigator.wakeLock.request('screen');
                if (cancelled) {
                    await lock.release();
                    return;
                }
                wakeLockRef.current = lock;
                setWakeWarning(false);
            } catch {
                if (!cancelled) setWakeWarning(true);
            }
        };

        void requestLock();
        const onVisible = () => {
            if (document.visibilityState === 'visible') void requestLock();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
            wakeLockRef.current?.release().catch(() => {});
            wakeLockRef.current = null;
        };
    }, [isRecording]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 space-y-8">

            {/* Timer Display */}
            <div className="text-6xl font-mono font-bold text-gray-800 dark:text-gray-100">
                {formatTime(duration)}
            </div>

            {/* Visualizer Canvas */}
            <div className="w-full max-w-md bg-gray-900 rounded-lg overflow-hidden shadow-inner h-32 relative">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={128}
                    className="w-full h-full"
                />
                {!isRecording && duration === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                        Ready to record
                    </div>
                )}
            </div>

            {/* Stats Display */}
            <div className="flex gap-8">
                <div className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                    Noise: <span className={decibels > snoreThreshold ? 'text-red-500' : 'text-green-500'}>{isRecording ? `${decibels} dBFS` : '--'}</span>
                    <span className="text-xs text-slate-500 ml-1">(threshold: {snoreThreshold} dBFS)</span>
                </div>
                <div className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                    Possible Snore Events: <span className="text-blue-500">{snoreCount}</span>
                </div>
            </div>
            <p className="text-xs text-slate-500 -mt-4 text-center">A continuous stretch above the threshold counts as one Possible Snore Event. The meter is dBFS (full scale), not dBA.</p>

            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left">
                <label htmlFor="save-clips-for-recording" className="flex items-start gap-3 text-sm font-medium text-slate-100">
                    <input
                        id="save-clips-for-recording"
                        type="checkbox"
                        checked={saveClipsForRecording}
                        disabled={isRecording || profileSettingsLoading}
                        aria-describedby="save-clips-privacy"
                        onChange={(event) => setSaveClipsForRecording(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <span>Save possible snore audio clips for this Recording</span>
                </label>
                <p id="save-clips-privacy" className="mt-2 pl-7 text-xs text-slate-400">
                    Sleep audio may capture speech or other private household sounds.
                </p>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
                {!isRecording ? (
                    <div className="flex flex-col gap-2 items-center">
                        <button
                            onClick={handleStart}
                            disabled={profileSettingsLoading}
                            className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:bg-blue-600"
                        >
                            <Mic size={28} />
                            {profileSettingsLoading ? 'Loading settings...' : 'Start Sleep'}
                        </button>
                    </div>

                ) : (
                    <button
                        onClick={handleStop}
                        className="flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full text-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 animate-pulse"
                    >
                        <Square size={28} />
                        Wake Up
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-md">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}
            {saveError && (
                <div className="flex items-center gap-2 text-amber-300 bg-amber-950/40 px-4 py-2 rounded-md text-sm">
                    <AlertCircle size={20} />
                    <span>{saveError}</span>
                </div>
            )}
            {wakeWarning && isRecording && (
                <p className="text-xs text-amber-300 text-center">The screen may sleep, and recording may stop.</p>
            )}
            {clipLimitReached && (
                <p className="text-xs text-amber-300 text-center">Clip limit reached ({CLIP_LIMIT}). Later Possible Snore Events are counted but not saved as clips.</p>
            )}
        </div>
    );
};
