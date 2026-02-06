import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Recording {
    id: string;
    created_at: string;
    url: string; // public url or path
    max_db: number;
    duration_seconds: number;
}

export default function History() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetchRecordings();
    }, []);

    const fetchRecordings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('recordings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRecordings(data || []);
        } catch (error) {
            console.error('Error fetching recordings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = (url: string, id: string) => {
        if (playingId === id && audioElement) {
            audioElement.pause();
            setPlayingId(null);
        } else {
            if (audioElement) audioElement.pause();
            const audio = new Audio(url);
            audio.onended = () => setPlayingId(null);
            audio.play();
            setAudioElement(audio);
            setPlayingId(id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        History
                    </h1>
                </div>

                {loading ? (
                    <div className="text-center text-slate-400">Loading history...</div>
                ) : recordings.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 bg-slate-800/30 rounded-2xl">
                        No recordings found.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recordings.map((rec) => (
                            <div key={rec.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700 hover:border-emerald-500/50 transition">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handlePlay(rec.url, rec.id)}
                                        className="p-3 bg-emerald-600 rounded-full hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/20"
                                    >
                                        {playingId === rec.id ? <Pause size={20} /> : <Play size={20} />}
                                    </button>
                                    <div>
                                        <div className="font-semibold text-lg">
                                            {new Date(rec.created_at).toLocaleDateString()} {new Date(rec.created_at).toLocaleTimeString()}
                                        </div>
                                        <div className="text-slate-400 text-sm flex gap-4">
                                            <span>{rec.duration_seconds}s duration</span>
                                            <span>Max {rec.max_db.toFixed(1)} dB</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Add Delete button later */}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
