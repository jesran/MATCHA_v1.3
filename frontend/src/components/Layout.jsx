import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/legacy-library", label: "Legacy Library" },
  { to: "/idea-evaluator", label: "Idea Evaluator" },
  { to: "/team-matcher", label: "Team Matcher" },
  { to: "/profile", label: "Profile" },
];

export default function Layout() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-r border-slate-200/80 bg-[linear-gradient(180deg,#f3f1f9_0%,#f7f4fb_100%)] px-7 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1f3ea7]">Matcha</h1>
          <p className="mt-1 text-sm uppercase tracking-[0.18em] text-slate-600">Creative Intelligence</p>
        </div>

        <nav className="mt-14 flex flex-col gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-4 rounded-2xl px-5 py-4 text-lg font-medium transition ${
                  isActive
                    ? "border border-[#cdd4ef] bg-[#eceaf3] text-[#1f3ea7] shadow-[inset_-5px_0_0_0_#2041b2]"
                    : "text-slate-600 hover:bg-white/60 hover:text-[#1f3ea7]"
                }`
              }
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 text-[#5d6683] group-hover:text-[#1f3ea7]">
                {item.label.slice(0, 1)}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="mt-14 w-full rounded-2xl bg-[#2444b6] px-6 py-5 text-left text-lg font-semibold text-white shadow-[0_18px_35px_rgba(32,65,178,0.28)] transition hover:bg-[#1c399d]">
          + New Initiative
        </button>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-slate-200/80 bg-white/55 px-5 py-5 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex max-w-3xl flex-1 items-center gap-3 rounded-2xl bg-[#f2f0f7] px-5 py-4 text-slate-500">
              <span className="text-xl">⌕</span>
              <input
                className="w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-500"
                placeholder="Search architecture, teams, or insights..."
              />
            </div>
            <div className="flex items-center gap-4 self-end xl:self-auto">
              <div className="flex items-center gap-2 text-xl text-slate-500">
                <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm">🔔</button>
                <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm">💬</button>
                <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm">⚙</button>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-white bg-[#e8edf9] text-xl shadow-sm">
                👨🏻‍💻
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
