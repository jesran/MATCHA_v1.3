import { useNavigate } from "react-router-dom";

import MatchaLogo from "../components/MatchaLogo";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--text)] md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MatchaLogo />
            <div>
              <p className="font-headline text-2xl font-black text-[var(--primary)]">Matcha</p>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                Build Bold Ideas Together
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"
          >
            Login
          </button>
        </header>

        <section className="grid gap-10 rounded-[36px] bg-[var(--surface-low)] p-8 shadow-[0_24px_50px_rgba(69,98,45,0.08)] lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[var(--tertiary)]">Collaborate Smarter</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-extrabold leading-tight text-[var(--primary)]">
              Launch projects, evaluate ideas, and find the right teammates from one workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-soft)]">
              Matcha brings project discovery, AI idea evaluation, teammate matching, and profile-driven collaboration into one calm, focused product.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="rounded-xl bg-[var(--primary)] px-6 py-4 text-sm font-bold text-white"
              >
                Get Started
              </button>
              <button
                type="button"
                onClick={() => navigate("/legacy-library")}
                className="rounded-xl border border-[var(--line)] bg-white px-6 py-4 text-sm font-bold text-[var(--primary)]"
              >
                Explore Projects
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              ["Projects", "Browse active opportunities and see who is building what."],
              ["AI Evaluator", "Get feasibility feedback, required skills, and starter phases."],
              ["Matching", "Find teammates with shared skills, interests, and availability."],
              ["My Projects", "Track your own projects, requests, and accepted collaborators."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[28px] bg-white p-6 shadow-[0_16px_28px_rgba(69,98,45,0.05)]">
                <h2 className="text-xl font-bold text-[var(--primary)]">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
