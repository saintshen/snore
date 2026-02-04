import { useState, useRef, useCallback, useEffect } from 'react';


export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [currentDb, setCurrentDb] = useState(-100);
    const [maxDb, setMaxDb] = useState(-100);
    const [history, setHistory] = useState<number[]>(new Array(50).fill(-100)); // maintain a small history window

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameIdRef = useRef<number | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceRef.current = source;

            setIsRecording(true);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const update = () => {
                analyser.getByteTimeDomainData(dataArray);

                // Calculate RMS
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const v = (dataArray[i] - 128) / 128.0;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / bufferLength);

                // Convert to dB
                // dB = 20 * log10(rms). 
                // Note: RMS is between 0 and 1. log10(1) = 0dB (max). log10(0.001) = -60dB.
                // We'll treat very quiet as -100dB.
                const db = rms > 0 ? 20 * Math.log10(rms) : -100;

                // Normalize for display roughly between -60 and 0, 
                // or map it to a positive "Volume Level" if preferred by user.
                // But scientific dB is negative relative to full scale.
                // Let's display actual dB FS for now.

                // Smoothing could be applied here
                setCurrentDb(prev => {
                    const smoothed = prev * 0.8 + db * 0.2; // simple low-pass
                    return smoothed;
                });

                setMaxDb(prev => Math.max(prev, db));

                setHistory(prev => {
                    const newHistory = [...prev.slice(1), db];
                    return newHistory;
                });

                frameIdRef.current = requestAnimationFrame(update);
            };

            update();

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (frameIdRef.current) {
            cancelAnimationFrame(frameIdRef.current);
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        setIsRecording(false);
        // Optional: Reset stats or keep them? Keep them is better.
    }, []);

    const resetStats = useCallback(() => {
        setMaxDb(-100);
        setCurrentDb(-100);
        setHistory(new Array(50).fill(-100));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
        }
    }, [stopRecording]);

    return { isRecording, startRecording, stopRecording, currentDb, maxDb, resetStats, history };
};
