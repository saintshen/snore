import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

    // Media Recorder Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);

    // Track maxDb in Ref to access inside closures without dependency issues
    const maxDbRef = useRef(-100);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 1. Setup Analysis (Visualizer)
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceRef.current = source;

            // 2. Setup Recording (File Capture)
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.start();
            startTimeRef.current = Date.now();
            maxDbRef.current = -100; // Reset for new recording

            setIsRecording(true);

            // 3. Start Analysis Loop
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const update = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteTimeDomainData(dataArray);

                // Calculate RMS
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const v = (dataArray[i] - 128) / 128.0;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / bufferLength);

                // Convert to dB
                const db = rms > 0 ? 20 * Math.log10(rms) : -100;

                // Smoothing
                setCurrentDb(prev => {
                    const smoothed = prev * 0.8 + db * 0.2;
                    return smoothed;
                });

                setMaxDb(prev => {
                    const newMax = Math.max(prev, db);
                    maxDbRef.current = newMax;
                    return newMax;
                });

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
            alert("Could not access microphone.");
        }
    }, []);

    const uploadRecording = async (blob: Blob, duration: number) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const filename = `${user.id}/${Date.now()}.webm`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('recordings')
                .upload(filename, blob);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                return;
            }

            // 2. Get Public URL 
            const { data: { publicUrl } } = supabase.storage
                .from('recordings')
                .getPublicUrl(filename);

            // 3. Insert into Database
            const { error: dbError } = await supabase
                .from('recordings')
                .insert({
                    user_id: user.id,
                    url: publicUrl,
                    duration_seconds: duration,
                    max_db: maxDbRef.current,
                });

            if (dbError) {
                console.error('DB Error:', dbError);
            } else {
                // Optional success message
                console.log('Recording saved successfully');
            }

        } catch (error) {
            console.error('Error saving recording:', error);
        }
    };

    const stopRecording = useCallback(async () => {
        // Stop Analysis
        if (frameIdRef.current) {
            cancelAnimationFrame(frameIdRef.current);
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        // Stop Recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {

            // We define onstop before calling stop to ensure it captures the event
            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const duration = (Date.now() - startTimeRef.current) / 1000; // seconds

                // Only save if it was a meaningful recording (> 1 second)
                if (duration > 1) {
                    await uploadRecording(blob, duration);
                }
            };

            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        setIsRecording(false);
    }, []);

    const resetStats = useCallback(() => {
        setMaxDb(-100);
        setCurrentDb(-100);
        maxDbRef.current = -100;
        setHistory(new Array(50).fill(-100));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // ensure cleanup
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        }
    }, []);

    return { isRecording, startRecording, stopRecording, currentDb, maxDb, resetStats, history };
};
