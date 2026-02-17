import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseRecorderReturn {
    isRecording: boolean;
    decibels: number;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    error: string | null;
    formatTime: (seconds: number) => string;
    duration: number;
    noiseLog: { timestamp: number; db: number }[];
    snoreCount: number;
}

export const useRecorder = (): UseRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [decibels, setDecibels] = useState(-100);
    const [error, setError] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [noiseLog, setNoiseLog] = useState<{ timestamp: number; db: number }[]>([]);
    const [snoreCount, setSnoreCount] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const lastLogTimeRef = useRef<number>(0);

    // Snore detection refs
    const isSnoringRef = useRef(false);
    const snoreStartTimeRef = useRef<number>(0);

    const analyze = useCallback(() => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS (Root Mean Square)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);

        // Simple mapping for UI: value between 0 and 100
        // Real snore detection would use a calibrated dBA calculation
        const db = Math.round((rms / 255) * 100);

        setDecibels(db);

        const now = Date.now();

        // Update Duration & Log Data (1Hz)
        if (startTimeRef.current) {
            setDuration(Math.floor((now - startTimeRef.current) / 1000));

            // Throttle logging to once per second
            if (now - lastLogTimeRef.current >= 1000) {
                setNoiseLog(prev => [...prev, { timestamp: now, db }]);
                lastLogTimeRef.current = now;
            }
        }

        // Simple Snore Detection Threshold Logic
        // Threshold: > 45 (arbitrary for demo/MVP, needs calibration)
        const SNORE_THRESHOLD = 45;

        if (db > SNORE_THRESHOLD) {
            if (!isSnoringRef.current) {
                // Snore started
                isSnoringRef.current = true;
                snoreStartTimeRef.current = now;
                console.log('Snore detected start', now);
            }
        } else {
            if (isSnoringRef.current) {
                // Snore ended
                // Debounce: verify minimal duration > 0.5s to count as snore
                if (now - snoreStartTimeRef.current > 500) {
                    setSnoreCount(prev => prev + 1);
                    console.log('Snore event confirmed');
                }
                isSnoringRef.current = false;
            }
        }

        requestRef.current = requestAnimationFrame(analyze);
    }, []);

    const startRecording = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            source.connect(analyser);

            startTimeRef.current = Date.now();
            lastLogTimeRef.current = Date.now();

            // Reset session data
            setNoiseLog([]);
            setSnoreCount(0);
            setIsRecording(true);

            // Start analysis loop
            requestRef.current = requestAnimationFrame(analyze);

        } catch (err: any) {
            console.error('Error accessing microphone:', err);
            setError('Could not access microphone. Please allow permissions.');
        }
    };

    const stopRecording = () => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsRecording(false);
        setDecibels(-100);
        // Note: We keep noiseLog and snoreCount populated so we can do something with them (like upload)
        startTimeRef.current = null;
    };

    useEffect(() => {
        return () => {
            // Cleanup on unmount, but don't reset state if just re-rendering
            if (isRecording) stopRecording();
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
        startRecording,
        stopRecording,
        error,
        formatTime,
        duration,
        noiseLog,
        snoreCount
    };
};
