export function PrivacyNotice() {
    return (
        <section className="w-full max-w-2xl bg-slate-800/40 border border-slate-700 rounded-2xl p-5 text-sm text-slate-300 shadow-xl">
            <h2 className="text-base font-semibold text-slate-100 mb-3">Privacy notes</h2>
            <ul className="list-disc pl-5 space-y-2">
                <li>Recordings, noise curves, and selected clips are stored in Supabase for your account.</li>
                <li>Clip saving is optional and may capture speech or private household sounds.</li>
                <li>Operators may access account and Recording metadata for support and operations, but raw clips are not accessed by default.</li>
                <li>This app is not diagnostic.</li>
                <li>Deleting a Recording attempts to delete both metadata and associated clips.</li>
            </ul>
        </section>
    );
}
