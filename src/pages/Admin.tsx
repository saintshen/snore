import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Database } from 'lucide-react';

export default function Admin() {
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-3 mb-2 text-slate-400">
                            <Users size={20} />
                            <span className="text-sm uppercase font-bold tracking-wider">Total Users</span>
                        </div>
                        <div className="text-4xl font-mono font-bold">--</div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-3 mb-2 text-slate-400">
                            <Database size={20} />
                            <span className="text-sm uppercase font-bold tracking-wider">Total Recordings</span>
                        </div>
                        <div className="text-4xl font-mono font-bold">--</div>
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                    <p className="text-slate-500">Feature coming soon (Requires RLS policies update)</p>
                </div>
            </div>
        </div>
    );
}
