import React, { useEffect, useRef } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { Mic, Square, AlertCircle, Save } from 'lucide-react';
import { sessionManager } from '../lib/sessionManager';
import { supabase } from '../lib/supabase';

export const Recorder: React.FC = () => {
    const { isRecording, decibels, startRecording, stopRecording, error, formatTime, duration, snoreCount, noiseLog } = useRecorder();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    // Simple visualizer
    useEffect(() => {
        if (!canvasRef.current || !isRecording) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas on start
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#1f2937'; // gray-800
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            // Shift image left
            const imageData = ctx.getImageData(1, 0, width - 1, height);
            ctx.putImageData(imageData, 0, 0);

            // Clear right edge
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(width - 1, 0, 1, height);

            // Draw new bar
            const barHeight = (decibels / 100) * height;

            // Color based on intensity
            if (decibels > 60) ctx.fillStyle = '#ef4444'; // red-500
            else if (decibels > 40) ctx.fillStyle = '#eab308'; // yellow-500
            else ctx.fillStyle = '#22c55e'; // green-500

            ctx.fillRect(width - 2, height - barHeight, 2, barHeight);

            if (isRecording) {
                animationRef.current = requestAnimationFrame(draw);
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };

    }, [isRecording, decibels]);

    const handleSave = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Please log in to save sessions. (Auth not fully implemented in MVP UI yet)');
                // For MVP testing, if no user, we can't save to DB due to RLS.
                return;
            }

            const startTime = noiseLog.length > 0 ? noiseLog[0].timestamp : Date.now();

            await sessionManager.saveSession(user.id, startTime, noiseLog, snoreCount);
            alert(`Session saved! Snores: ${snoreCount}, Points: ${noiseLog.length}`);
        } catch (err) {
            console.error(err);
            alert('Failed to save session');
        }
    };

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
                    Noise: <span className={decibels > 50 ? 'text-red-500' : 'text-green-500'}>{isRecording ? `${decibels} dB` : '--'}</span>
                </div>
                <div className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                    Snores: <span className="text-blue-500">{snoreCount}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
                {!isRecording ? (
                    <div className="flex flex-col gap-2 items-center">
                        <button
                            onClick={startRecording}
                            className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                        >
                            <Mic size={28} />
                            Start Sleep
                        </button>
                        {noiseLog.length > 0 && (
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-lg font-bold shadow-md"
                            >
                                <Save size={20} />
                                Save Last Session
                            </button>
                        )}
                    </div>

                ) : (
                    <button
                        onClick={stopRecording}
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
        </div>
    );
};
