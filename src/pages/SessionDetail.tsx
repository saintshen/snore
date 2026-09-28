import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { deleteSleepSession } from '../lib/clipStore';
import { DBFS_FLOOR } from '../lib/level';
import { supabase } from '../lib/supabase';

interface NoisePoint {
    timestamp: number;
    db: number;
}

interface SnoreEventRow {
    id: string;
    timestamp: string;
    audio_path: string;
    duration_seconds: number | null;
    peak_db: number | null;
    url: string | null;
}

function asNoiseLog(value: unknown): NoisePoint[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is NoisePoint => {
        if (!item || typeof item !== 'object') return false;
        const point = item as NoisePoint;
        return typeof point.timestamp === 'number' && typeof point.db === 'number';
    });
}

function LevelCurve({ log }: { log: NoisePoint[] }) {
    if (log.length < 2) {
        return <p className="text-slate-500">No level curve was saved for this session.</p>;
    }

    const start = log[0].timestamp;
    const span = Math.max(1, log[log.length - 1].timestamp - start);
    const width = 800;
    const height = 160;
    const points = log.map((point) => {
        const x = ((point.timestamp - start) / span) * width;
        const y = ((DBFS_FLOOR - point.db) / DBFS_FLOOR) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 bg-slate-950 rounded-xl">
            <polyline fill="none" stroke="#34d399" strokeWidth="2" points={points} />
        </svg>
    );
}

export default function SessionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [log, setLog] = useState<NoisePoint[]>([]);
    const [events, setEvents] = useState<SnoreEventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [missing, setMissing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: session, error } = await (supabase.from('sleep_sessions') as any)
                .select('id, created_at, noise_log')
                .eq('id', id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (error || !session) {
                setMissing(true);
                setLoading(false);
                return;
            }

            setTitle(new Date(session.created_at).toLocaleString());
            setLog(asNoiseLog(session.noise_log));

            const { data: rows } = await (supabase.from('snore_events') as any)
                .select('id, timestamp, audio_path, duration_seconds, peak_db')
                .eq('session_id', id)
                .order('timestamp', { ascending: true });

            const withUrls: SnoreEventRow[] = [];
            for (const row of rows ?? []) {
                const { data: file } = await supabase.storage.from('snore-clips').download(row.audio_path);
                withUrls.push({ ...row, url: file ? URL.createObjectURL(file) : null });
            }
            setEvents(withUrls);
            setLoading(false);
        };

        void load();
        return () => {
            setEvents((current) => {
                for (const event of current) {
                    if (event.url) URL.revokeObjectURL(event.url);
                }
                return current;
            });
        };
    }, [id]);

    const handleDelete = async () => {
        if (!id || !confirm('Delete this session? This cannot be undone.')) return;
        setDeleting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            await deleteSleepSession(user.id, id);
            navigate('/history');
        } catch (error) {
            console.error(error);
            alert('Failed to delete session. Its audio is still stored, so the session was kept.');
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link to="/history" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-bold truncate">{title || 'Session'}</h1>
                    </div>
                    <button
                        onClick={() => void handleDelete()}
                        disabled={deleting || missing}
                        aria-label="Delete"
                        className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                    >
                        <Trash2 size={18} />
                        <span className="hidden md:inline">Delete</span>
                    </button>
                </div>

                {loading ? (
                    <p className="text-slate-400">Loading session...</p>
                ) : missing ? (
                    <p className="text-slate-500">This session is not available.</p>
                ) : (
                    <div className="space-y-8">
                        <LevelCurve log={log} />
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Snore clips</h2>
                            {events.length === 0 ? (
                                <p className="text-slate-500">No clips were saved for this session.</p>
                            ) : events.map((event, index) => (
                                <div key={event.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400 mb-3">
                                        <span>Clip {index + 1}</span>
                                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                        <span>{event.duration_seconds ?? '--'}s</span>
                                        <span>Peak {event.peak_db ?? '--'} dBFS</span>
                                    </div>
                                    {event.url ? (
                                        <audio controls preload="none" src={event.url} className="w-full" />
                                    ) : (
                                        <p className="text-sm text-slate-500">Audio unavailable.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
