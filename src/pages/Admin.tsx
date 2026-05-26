import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Mic, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Admin() {
    const [stats, setStats] = useState({
        totalSessions: 0,
        totalSnores: 0,
        avgQuality: null as number | null,
        totalDuration: 0,
    });
    const [recentSessions, setRecentSessions] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(45);
    const [thresholdLoading, setThresholdLoading] = useState(false);
    const [thresholdSaved, setThresholdSaved] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchThreshold();
    }, []);

    const fetchStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: sessions, error } = await (supabase
                .from('sleep_sessions') as any)
                .select('snore_count, quality_score, start_time, end_time')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            const typedSessions: Array<{ snore_count?: number; quality_score?: number; end_time?: string | null; start_time?: string }> = sessions ?? [];
            const totalSessions = typedSessions.length;
            const totalSnores = typedSessions.reduce((sum, s) => sum + (s.snore_count ?? 0), 0);
            const scores = typedSessions.map(s => s.quality_score).filter((s): s is number => s !== null);
            const avgQuality = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
            const totalDuration = typedSessions.reduce((sum, s) => {
                if (!s.end_time || !s.start_time) return sum;
                return sum + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime());
            }, 0);

            setStats({ totalSessions, totalSnores, avgQuality, totalDuration });
            setRecentSessions(sessions ?? []);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchThreshold = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await (supabase
                .from('profiles') as any)
                .select('settings')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            if (data?.settings && typeof data.settings === 'object') {
                const settings = data.settings as Record<string, unknown>;
                if (typeof settings.snoreThreshold === 'number') {
                    setThreshold(settings.snoreThreshold as number);
                }
            }
        } catch (error) {
            console.error('Error fetching threshold:', error);
        }
    };

    const saveThreshold = async () => {
        setThresholdLoading(true);
        setThresholdSaved(false);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile, error: fetchError } = await (supabase
                .from('profiles') as any)
                .select('settings')
                .eq('id', user.id)
                .single();

            if (fetchError) throw fetchError;

            const currentSettings = (profile?.settings && typeof profile.settings === 'object')
                ? (profile.settings as Record<string, unknown>)
                : {};

            const { error } = await (supabase
                .from('profiles') as any)
                .update({ settings: { ...currentSettings, snoreThreshold: threshold } })
                .eq('id', user.id);

            if (error) throw error;
            setThresholdSaved(true);
            setTimeout(() => setThresholdSaved(false), 2000);
        } catch (error) {
            console.error('Error saving threshold:', error);
            alert('Failed to save threshold.');
        } finally {
            setThresholdLoading(false);
        }
    };

    const formatDuration = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Admin Dashboard
                    </h1>
                </div>

                {/* Stats Cards */}
                {loading ? (
                    <div className="text-slate-400 mb-8">Loading stats...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <Mic size={18} />
                                <span className="text-sm uppercase font-bold tracking-wider">Total Sessions</span>
                            </div>
                            <div className="text-4xl font-mono font-bold">{stats.totalSessions}</div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <Users size={18} />
                                <span className="text-sm uppercase font-bold tracking-wider">Total Snores</span>
                            </div>
                            <div className="text-4xl font-mono font-bold text-red-400">{stats.totalSnores}</div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <TrendingUp size={18} />
                                <span className="text-sm uppercase font-bold tracking-wider">Avg Quality</span>
                            </div>
                            <div className={`text-4xl font-mono font-bold ${stats.avgQuality && stats.avgQuality >= 60 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                {stats.avgQuality !== null ? `${stats.avgQuality}%` : 'N/A'}
                            </div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <Clock size={18} />
                                <span className="text-sm uppercase font-bold tracking-wider">Total Time</span>
                            </div>
                            <div className="text-4xl font-mono font-bold">{formatDuration(stats.totalDuration)}</div>
                        </div>
                    </div>
                )}

                {/* Snore Threshold Config */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
                    <h2 className="text-xl font-bold mb-4">Snore Detection Threshold</h2>
                    <p className="text-slate-400 text-sm mb-4">
                        Configure the decibel threshold for snore detection. Sounds above this level (in dB) will be flagged as potential snores.
                        Default: 45 dB. Lower = more sensitive.
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="20"
                            max="80"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="flex-1 accent-emerald-400"
                        />
                        <span className="text-2xl font-mono font-bold text-emerald-400 w-16 text-right">{threshold} dB</span>
                        <button
                            onClick={saveThreshold}
                            disabled={thresholdLoading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 rounded-lg font-medium transition"
                        >
                            {thresholdLoading ? 'Saving...' : thresholdSaved ? '✓ Saved' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
                    <h2 className="text-xl font-bold mb-4">Recent Sessions</h2>
                    {recentSessions.length === 0 ? (
                        <p className="text-slate-500">No sessions recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentSessions.map((session: any) => (
                                <div key={session.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                                    <div>
                                        <span className="font-medium">{new Date(session.start_time).toLocaleDateString()}</span>
                                        <span className="text-slate-400 text-sm ml-3">
                                            {session.snore_count} snores
                                        </span>
                                    </div>
                                    <div className={`font-mono text-sm ${(session.quality_score ?? 0) >= 60 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                        {session.quality_score !== null ? `Quality: ${session.quality_score}%` : 'N/A'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RLS Note */}
                <div className="bg-amber-900/20 p-4 rounded-xl border border-amber-700/30 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-200">
                        <strong>Admin Note:</strong> Multi-user admin features (viewing all users, cross-user analytics) require additional RLS policies
                        and a server-side admin API. Currently showing data for the logged-in user only.
                    </div>
                </div>
            </div>
        </div>
    );
}
