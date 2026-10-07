import { useState, useRef, useEffect, useCallback, type RefObject } from 'react';
import { DBFS_FLOOR, dbfsFromTimeDomain } from '../lib/level';
import { PcmRing } from '../lib/pcmRing';
import { clipWindow, POST_ROLL_MS, type SnoreClip } from '../lib/snoreClips';
import { createSnoreState, flushSnore, reduceSnore, type ClosedSnore } from '../lib/snoreTracker';
import { type NoiseSample } from '../lib/sessionDraft';
import { DEFAULT_THRESHOLD_DBFS } from '../lib/threshold';
import { encodeWav } from '../lib/wav';

export interface RecordingSnapshot {
    noiseLog: NoiseSample[];
    snoreCount: number;
    startedAt: number | null;
}

export interface UseRecorderReturn {
    isRecording: boolean;
    decibels: number;
    decibelsRef: RefObject<number>;
    thresholdRef: RefObject<number>;
    noiseLogRef: RefObject<NoiseSample[]>;
    snoreCountRef: RefObject<number>;
    startRecording: () => Promise<number | null>;
    stopRecording: () => RecordingSnapshot | null;
    error: string | null;
    formatTime: (seconds: number) => string;
    duration: number;
    snoreCount: number;
}

export interface UseRecorderOptions {
    snoreThreshold?: number;
    onClip?: (clip: SnoreClip) => void;
}

type BrowserWindowWithAudioContext = Window &
    typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
    };

export const useRecorder = (options: UseRecorderOptions = {}): UseRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [decibels, setDecibels] = useState(DBFS_FLOOR);
    const decibelsRef = useRef(DBFS_FLOOR);
    const [error, setError] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [snoreCount, setSnoreCount] = useState(0);
    const noiseLogRef = useRef<NoiseSample[]>([]);
    const snoreCountRef = useRef(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const lastLogTimeRef = useRef<number>(0);

    const trackerRef = useRef(createSnoreState());
    const timeDomainRef = useRef<Float32Array<ArrayBuffer> | null>(null);
    const pcmRef = useRef<PcmRing | null>(null);
    const captureRef = useRef<AudioWorkletNode | null>(null);
    const muteRef = useRef<GainNode | null>(null);
    const clipTimersRef = useRef<number[]>([]);
    const waitingClipsRef = useRef<ClosedSnore[]>([]);
    const onClipRef = useRef(options.onClip);
    onClipRef.current = options.onClip;
    // Captured when recording starts so a profile load cannot change the threshold mid-session.
    const thresholdRef = useRef(DEFAULT_THRESHOLD_DBFS);
    const stoppedRef = useRef(false);
    const runIdRef = useRef(0);
    const stopRecordingRef = useRef<() => void>(() => {});
    const analyzeRef = useRef<() => void>(() => {});

    const emitClip = useCallback((closed: ClosedSnore, postRollMs: number) => {
        const pcm = pcmRef.current;
        if (!pcm) return;
        const window = clipWindow(closed.startedAt, closed.endedAt, postRollMs);
        const samples = pcm.slice(window.startMs, window.endMs);
        if (samples.length === 0) {
            console.warn('snore clip had no audio samples');
            return;
        }
        onClipRef.current?.({
            blob: encodeWav(samples, pcm.sampleRate),
            startedAt: closed.startedAt,
            endedAt: closed.endedAt,
            peakDbfs: closed.peakDbfs,
            durationSeconds: Math.max(1, Math.round(samples.length / pcm.sampleRate)),
        });
    }, []);

    const scheduleClip = useCallback((closed: ClosedSnore) => {
        waitingClipsRef.current.push(closed);
        const timer = window.setTimeout(() => {
            waitingClipsRef.current = waitingClipsRef.current.filter((item) => item !== closed);
            emitClip(closed, POST_ROLL_MS);
        }, POST_ROLL_MS);
        clipTimersRef.current.push(timer);
    }, [emitClip]);

    const scheduleAnalyzeFrame = useCallback(() => {
        requestRef.current = requestAnimationFrame(() => analyzeRef.current());
    }, []);

    const analyze = useCallback(() => {
        if (stoppedRef.current || !analyserRef.current) return;

        const samples = timeDomainRef.current;
        if (!samples) return;
        analyserRef.current.getFloatTimeDomainData(samples);
        const db = dbfsFromTimeDomain(samples);

        decibelsRef.current = db;
        setDecibels(db);

        const now = Date.now();

        // Update Duration & Log Data (1Hz)
        if (startTimeRef.current) {
            setDuration(Math.floor((now - startTimeRef.current) / 1000));

            // Throttle logging to once per second
            if (now - lastLogTimeRef.current >= 1000) {
                noiseLogRef.current = [...noiseLogRef.current, { timestamp: now, db }];
                lastLogTimeRef.current = now;
            }
        }

        const step = reduceSnore(trackerRef.current, db, now, thresholdRef.current);
        if (step.closed) scheduleClip(step.closed);
        if (step.state.count !== trackerRef.current.count) {
            snoreCountRef.current = step.state.count;
            setSnoreCount(step.state.count);
        }
        trackerRef.current = step.state;

        if (!stoppedRef.current) {
            scheduleAnalyzeFrame();
        }
    }, [scheduleAnalyzeFrame, scheduleClip]);

    analyzeRef.current = analyze;

    const startRecording = async () => {
        const runId = ++runIdRef.current;
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (runId !== runIdRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return null;
            }
            streamRef.current = stream;

            const browserWindow = window as BrowserWindowWithAudioContext;
            const AudioContextConstructor = window.AudioContext ?? browserWindow.webkitAudioContext;
            if (!AudioContextConstructor) {
                throw new Error('AudioContext is not supported in this browser.');
            }
            const audioContext = new AudioContextConstructor();
            audioContextRef.current = audioContext;
            await audioContext.resume();

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyserRef.current = analyser;
            timeDomainRef.current = new Float32Array(new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT));

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            source.connect(analyser);

            await audioContext.audioWorklet.addModule(new URL('../worklets/pcmCapture.js', import.meta.url));
            const capture = new AudioWorkletNode(audioContext, 'pcm-capture');
            const mute = audioContext.createGain();
            mute.gain.value = 0;
            pcmRef.current = new PcmRing(audioContext.sampleRate);
            capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
                pcmRef.current?.write(event.data, Date.now());
            };
            source.connect(capture);
            capture.connect(mute);
            mute.connect(audioContext.destination);
            captureRef.current = capture;
            muteRef.current = mute;

            const startedAt = Date.now();
            startTimeRef.current = startedAt;
            lastLogTimeRef.current = startedAt;
            stoppedRef.current = false;
            thresholdRef.current = options.snoreThreshold ?? DEFAULT_THRESHOLD_DBFS;
            trackerRef.current = createSnoreState();
            noiseLogRef.current = [];
            snoreCountRef.current = 0;
            waitingClipsRef.current = [];
            clipTimersRef.current.forEach((timer) => window.clearTimeout(timer));
            clipTimersRef.current = [];

            setSnoreCount(0);
            setIsRecording(true);

            scheduleAnalyzeFrame();
            return startedAt;

        } catch (err: unknown) {
            console.error('Error accessing microphone:', err);
            setError('Could not access microphone. Please allow permissions.');
            return null;
        }
    };

    const stopRecording = () => {
        const active = requestRef.current !== null || audioContextRef.current !== null || streamRef.current !== null || trackerRef.current.open;
        runIdRef.current += 1;
        if (!active) return null;

        stoppedRef.current = true;
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }

        const flushed = flushSnore(trackerRef.current, Date.now());
        trackerRef.current = createSnoreState();
        snoreCountRef.current = flushed.state.count;
        setSnoreCount(flushed.state.count);
        clipTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        clipTimersRef.current = [];
        const waiting = waitingClipsRef.current;
        waitingClipsRef.current = [];
        for (const closed of waiting) emitClip(closed, POST_ROLL_MS);
        if (flushed.closed) emitClip(flushed.closed, POST_ROLL_MS);
        const snapshot: RecordingSnapshot = {
            noiseLog: noiseLogRef.current,
            snoreCount: flushed.state.count,
            startedAt: startTimeRef.current,
        };

        captureRef.current?.disconnect();
        muteRef.current?.disconnect();
        captureRef.current = null;
        muteRef.current = null;

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsRecording(false);
        decibelsRef.current = DBFS_FLOOR;
        setDecibels(DBFS_FLOOR);
        startTimeRef.current = null;
        return snapshot;
    };

    stopRecordingRef.current = stopRecording;

    useEffect(() => {
        return () => {
            stopRecordingRef.current();
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        isRecording,
        decibels,
        decibelsRef,
        thresholdRef,
        noiseLogRef,
        snoreCountRef,
        startRecording,
        stopRecording,
        error,
        formatTime,
        duration,
        snoreCount
    };
};
