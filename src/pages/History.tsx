import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Trash2, Clock, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SleepSession {
    id: string;
    created_at: string;
    start_time: string;
    end_time: string | null;
    snore_count: number;
    quality_score: number | null;
    noise_log: unknown;
}

export default function History() {
    const [sessions, setSessions] = useState<SleepSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('sleep_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this session? This cannot be undone.')) return;

        setDeletingId(id);
        try {
            const { error } = await supabase
                .from('sleep_sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSessions(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Failed to delete session.');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return '--';
        const ms = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${mins}m`;
    };

    const qualityLabel = (score: number | null): { label: string; color: string } => {
        if (score === null) return { label: 'N/A', color: 'text-slate-400' };
        if (score >= 80) return { label: 'Excellent', color: 'text-emerald-400' };
        if (score >= 60) return { label: 'Good', color: 'text-blue-400' };
        if (score >= 40) return { label: 'Fair', color: 'text-yellow-400' };
        return { label: 'Poor', color: 'text-red-400' };
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
                ) : sessions.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 bg-slate-800/30 rounded-2xl">
                        No sessions recorded yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => {
                            const ql = qualityLabel(session.quality_score);
                            return (
                                <div
                                    key={session.id}
                                    className="bg-slate-800 p-5 rounded-xl flex items-center justify-between border border-slate-700 hover:border-emerald-500/50 transition group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-700 rounded-xl">
                                            <Activity size={22} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-lg">
                                                {new Date(session.created_at).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                                {' '}
                                                <span className="text-slate-400 text-sm font-normal">
                                                    {new Date(session.created_at).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="text-slate-400 text-sm flex items-center gap-4 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={13} />
                                                    {formatDuration(session.start_time, session.end_time)}
                                                </span>
                                                <span>Snores: <span className="text-blue-400 font-medium">{session.snore_count}</span></span>
                                                <span className={`font-medium ${ql.color}`}>
                                                    Quality: {ql.label} {session.quality_score !== null ? `(${session.quality_score})` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        disabled={deletingId === session.id}
                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                        title="Delete session"
                                    >
                                        {deletingId === session.id ? (
                                            <span className="text-xs">...</span>
                                        ) : (
                                            <Trash2 size={18} />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
