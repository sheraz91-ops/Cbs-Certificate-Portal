export default function AdminPage() {
  return (
    <section className="flex min-h-[60vh] flex-col justify-center rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.13),transparent_40%),#0f172a] p-8 sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">CBS Certificate Portal</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Welcome, Admin</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Use the sidebar to manage workshops or add participants.</p>
    </section>
  );
}
