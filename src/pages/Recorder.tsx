import { useMemo, useEffect, useState } from 'react';
import { Mic, Square, Trash2, Activity, LogOut, History as HistoryIcon, Shield } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Recorder() {
    const { isRecording, startRecording, stopRecording, currentDb, maxDb, resetStats, history } = useAudioRecorder();
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUserEmail(data.user.email || '');
            } else {
                navigate('/login');
            }
        });
    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    // Format dB for display
    const displayDb = useMemo(() => isFinite(currentDb) ? Math.max(currentDb, -100).toFixed(1) : '--', [currentDb]);
    const displayMaxDb = useMemo(() => isFinite(maxDb) ? Math.max(maxDb, -100).toFixed(1) : '--', [maxDb]);

    // Normalize history for visualization
    const normalizedHistory = history.map(db => {
        const min = -60;
        const max = 0;
        const val = Math.max(min, Math.min(max, db));
        return ((val - min) / (max - min)) * 100;
    });

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-6 md:p-12 font-sans transition-colors duration-500">

            {/* Navigation Bar */}
            <div className="w-full max-w-4xl flex justify-between items-center mb-12">
                <div className="flex items-center gap-2">
                    <Activity className="text-emerald-400 w-6 h-6" />
                    <span className="font-bold text-lg hidden md:block">Snore Record</span>
                </div>
                <div className="flex gap-4">
                    <Link to="/history" className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                        <HistoryIcon size={18} /> <span className="hidden md:inline">History</span>
                    </Link>
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                        <Shield size={18} /> <span className="hidden md:inline">Admin</span>
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition">
                        <LogOut size={18} /> <span className="hidden md:inline">Logout</span>
                    </button>
                </div>
            </div>

            {/* Header */}
            <h1 className="text-3xl md:text-5xl font-bold mb-2 flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tighter">
                Snore Recorder
            </h1>
            <p className="text-slate-400 mb-12">Monitor your sleep noise levels {userEmail ? `(${userEmail})` : ''}</p>

            {/* Main Display Card */}
            <div className="bg-slate-800/50 p-8 rounded-3xl backdrop-blur-sm border border-slate-700 shadow-2xl w-full max-w-md relative overflow-hidden">

                {/* Recording Status Indicator */}
                <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-700/50 text-slate-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                    {isRecording ? 'Rec' : 'Idle'}
                </div>

                {/* dB Meters */}
                <div className="text-center py-6">
                    <div className="mb-2 text-slate-400 text-sm uppercase tracking-wide">Current Volume</div>
                    <div className={`text-7xl font-mono font-bold transition-all duration-100 ${currentDb > -10 ? 'text-red-500' :
                        currentDb > -30 ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                        {displayDb} <span className="text-2xl text-slate-500 font-normal">dB</span>
                    </div>
                </div>

                <div className="flex justify-between items-end mt-8 px-4 py-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <div className="text-left">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Peak Level</p>
                        <p className="text-2xl font-mono text-white">{displayMaxDb} dB</p>
                    </div>
                    <button
                        onClick={resetStats}
                        className="p-2 hover:bg-slate-700 text-slate-500 hover:text-white rounded-lg transition-colors"
                        title="Reset Max"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* Visualizer */}
                <div className="mt-8 flex items-end justify-between h-24 gap-1">
                    {normalizedHistory.map((h, i) => <div
                        key={i}
                        className="flex-1 bg-emerald-500 rounded-t-sm transition-all duration-75 ease-out"
                        style={{
                            height: `${Math.max(5, h)}%`,
                            opacity: 0.5 + (i / normalizedHistory.length) * 0.5
                        }}         ></div>
                    )}
                </div>

            </div>

            {/* Controls */}
            <div className="mt-12 flex gap-6">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        className="group relative flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Mic className="w-6 h-6" />
                        Start Monitoring
                        <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 animate-ping opacity-0 group-hover:opacity-100"></div>
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-lg shadow-lg shadow-red-900/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Square className="w-6 h-6 fill-current" />
                        Stop
                    </button>
                )}
            </div>

        </div>
    );
}
