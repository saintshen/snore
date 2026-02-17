import { useEffect, useState } from 'react';
import { Activity, LogOut, History as HistoryIcon, Shield } from 'lucide-react';
import { Recorder } from '../components/Recorder';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function RecordPage() {
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
            <p className="text-slate-400 mb-8">Monitor your sleep noise levels {userEmail ? `(${userEmail})` : ''}</p>

            {/* Recorder Component */}
            <div className="w-full max-w-2xl bg-slate-800/30 p-8 rounded-3xl backdrop-blur-sm border border-slate-700 shadow-2xl">
                <Recorder />
            </div>

        </div>
    );
}
