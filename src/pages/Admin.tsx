import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Mic, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { profilesTable, sleepSessionsTable, supabase } from '../lib/supabase';
import { DEFAULT_THRESHOLD_DBFS, THRESHOLD_MAX_DBFS, THRESHOLD_MIN_DBFS, thresholdFromSettings } from '../lib/threshold';
import { clipSavingDefaultFromSettings, withClipSavingDefault, withSnoreThresholdDbfs } from '../lib/profileSettings';

interface AdminSession {
    id: string;
    snore_count: number | null;
    quality_score: number | null;
    start_time: string;
    end_time: string | null;
}

export default function Admin() {
    const [stats, setStats] = useState({
        totalSessions: 0,
        totalSnores: 0,
        avgQuality: null as number | null,
        totalDuration: 0,
    });
    const [recentSessions, setRecentSessions] = useState<AdminSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD_DBFS);
    const [thresholdLoading, setThresholdLoading] = useState(false);
    const [thresholdSaved, setThresholdSaved] = useState(false);
    const [saveClipsDefault, setSaveClipsDefault] = useState(false);
    const [clipDefaultLoading, setClipDefaultLoading] = useState(false);
    const [clipDefaultSaved, setClipDefaultSaved] = useState(false);
    const settingsSaveInProgressRef = useRef(false);
    const settingsSaveInProgress = thresholdLoading || clipDefaultLoading;

    useEffect(() => {
        fetchStats();
        fetchSettings();
    }, []);

    const fetchStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: sessions, error } = await sleepSessionsTable()
                .select('id, snore_count, quality_score, start_time, end_time')
                .eq('user_id', user.id)
                .order('start_time', { ascending: false });

            if (error) throw error;

            const typedSessions: AdminSession[] = sessions ?? [];
            const totalSessions = typedSessions.length;
            const totalSnores = typedSessions.reduce((sum, s) => sum + (s.snore_count ?? 0), 0);
            const scores = typedSessions.map(s => s.quality_score).filter((s): s is number => s !== null && s !== undefined);
            const avgQuality = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
            const totalDuration = typedSessions.reduce((sum, s) => {
                if (!s.end_time || !s.start_time) return sum;
                return sum + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime());
            }, 0);

            setStats({ totalSessions, totalSnores, avgQuality, totalDuration });
            setRecentSessions(typedSessions.slice(0, 10));
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await profilesTable()
                .select('settings')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            setThreshold(thresholdFromSettings(data?.settings));
            setSaveClipsDefault(clipSavingDefaultFromSettings(data?.settings ?? null));
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const saveThreshold = async () => {
        if (settingsSaveInProgress || settingsSaveInProgressRef.current) return;

        settingsSaveInProgressRef.current = true;
        setThresholdLoading(true);
        setThresholdSaved(false);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile, error: fetchError } = await profilesTable()
                .select('settings')
                .eq('id', user.id)
                .single();

            if (fetchError) throw fetchError;

            const { error } = await profilesTable()
                .update({ settings: withSnoreThresholdDbfs(profile?.settings ?? null, threshold) })
                .eq('id', user.id);

            if (error) throw error;
            setThresholdSaved(true);
            setTimeout(() => setThresholdSaved(false), 2000);
        } catch (error) {
            console.error('Error saving threshold:', error);
            alert('Failed to save threshold.');
        } finally {
            settingsSaveInProgressRef.current = false;
            setThresholdLoading(false);
        }
    };

    const saveClipDefault = async () => {
        if (settingsSaveInProgress || settingsSaveInProgressRef.current) return;

        settingsSaveInProgressRef.current = true;
        setClipDefaultLoading(true);
        setClipDefaultSaved(false);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile, error: fetchError } = await profilesTable()
                .select('settings')
                .eq('id', user.id)
                .single();

            if (fetchError) throw fetchError;

            const { error } = await profilesTable()
                .update({ settings: withClipSavingDefault(profile?.settings ?? null, saveClipsDefault) })
                .eq('id', user.id);

            if (error) throw error;
            setClipDefaultSaved(true);
            setTimeout(() => setClipDefaultSaved(false), 2000);
        } catch (error) {
            console.error('Error saving clip preference:', error);
            alert('Failed to save clip preference.');
        } finally {
            settingsSaveInProgressRef.current = false;
            setClipDefaultLoading(false);
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
                        Personal Operations View
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
                                <span className="text-sm uppercase font-bold tracking-wider">Total Recordings</span>
                            </div>
                            <div className="text-4xl font-mono font-bold">{stats.totalSessions}</div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <Users size={18} />
                                <span className="text-sm uppercase font-bold tracking-wider">Possible Snore Events</span>
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
                    <h2 className="text-xl font-bold mb-4">Possible Snore Event Threshold</h2>
                    <p className="text-slate-400 text-sm mb-4">
                        Sounds above this level count as one Possible Snore Event until they fall 6 dBFS below it.
                        The meter is dBFS, relative to the microphone full scale, not a calibrated dBA reading.
                        Default: {DEFAULT_THRESHOLD_DBFS} dBFS. More negative is more sensitive.
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min={THRESHOLD_MIN_DBFS}
                            max={THRESHOLD_MAX_DBFS}
                            step={1}
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="flex-1 accent-emerald-400"
                        />
                        <span className="text-2xl font-mono font-bold text-emerald-400 w-32 text-right">{threshold} dBFS</span>
                        <button
                            onClick={saveThreshold}
                            disabled={settingsSaveInProgress}
                            aria-label="Save possible snore event threshold"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 rounded-lg font-medium transition"
                        >
                            {thresholdLoading ? 'Saving...' : thresholdSaved ? '✓ Saved' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Clip Saving Default */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
                    <h2 className="text-xl font-bold mb-4">Recording Clip Preference</h2>
                    <p className="text-slate-400 text-sm mb-4">
                        Clip saving is off by default for privacy. If enabled, future Recordings start with clip saving on,
                        but you can change it before starting each Recording. Sleep audio may capture speech or other
                        private household sounds.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-start gap-3 text-slate-100">
                            <input
                                type="checkbox"
                                checked={saveClipsDefault}
                                onChange={(event) => setSaveClipsDefault(event.target.checked)}
                                className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900 accent-emerald-400"
                            />
                            <span>
                                <span className="block font-semibold">Save clips by default</span>
                                <span className="block text-sm text-slate-400">Applies to future Recordings only.</span>
                            </span>
                        </label>
                        <button
                            onClick={saveClipDefault}
                            disabled={settingsSaveInProgress}
                            aria-label="Save clip preference"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 rounded-lg font-medium transition sm:self-start"
                        >
                            {clipDefaultLoading ? 'Saving...' : clipDefaultSaved ? '✓ Saved' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
                    <h2 className="text-xl font-bold mb-4">Recent Recordings</h2>
                    {recentSessions.length === 0 ? (
                        <p className="text-slate-500">No recordings yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentSessions.map((session) => (
                                <div key={session.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                                    <div>
                                        <span className="font-medium">{new Date(session.start_time).toLocaleDateString()}</span>
                                        <span className="text-slate-400 text-sm ml-3">
                                            {session.snore_count} Possible Snore Events
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
                        <strong>Operations Note:</strong> This is currently a personal operational view for the logged-in user only. Real cross-user admin features
                        require additional privacy controls, RLS policies, audit logging, and a server-side admin API.
                    </div>
                </div>
            </div>
        </div>
    );
}
