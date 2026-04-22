import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client";

function StatCard({ label, value, hint, tone = "primary", onClick }) {
  const toneClass =
    tone === "tertiary"
      ? "text-[var(--tertiary)]"
      : tone === "soft"
        ? "text-[var(--text-soft)]"
        : "text-[var(--primary)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-44 flex-col justify-between rounded-[28px] bg-[var(--surface-low)] p-8 text-left shadow-[0_20px_40px_rgba(69,98,45,0.06)] transition hover:bg-[var(--surface-mid)]"
    >
      <div>
        <p className="text-sm font-medium text-[var(--text-soft)]">{label}</p>
        <p className={`mt-2 text-4xl font-extrabold ${toneClass}`}>{value}</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--text-soft)]">
        <span>{hint}</span>
        <span className="material-symbols-outlined text-[18px] transition group-hover:translate-x-1">arrow_forward</span>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    matches: 0,
    projects: 0,
    requests: 0,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      const hasAuth = Boolean(localStorage.getItem("accessToken"));
      try {
        const requests = [apiClient.get("/legacy-library/")];
        if (hasAuth) {
          requests.push(apiClient.get("/matches/"), apiClient.get("/connections/status/"));
        }

        const responses = await Promise.allSettled(requests);
        if (!active) {
          return;
        }

        const projects = responses[0].status === "fulfilled" ? responses[0].value.data.length : 0;
        const matches = hasAuth && responses[1]?.status === "fulfilled" ? responses[1].value.data.length : 0;
        const connectionsIndex = hasAuth ? 2 : -1;
        const requestsCount =
          connectionsIndex >= 0 && responses[connectionsIndex]?.status === "fulfilled"
            ? responses[connectionsIndex].value.data.filter((item) => item.status === "pending").length
            : 0;

        setStats({ matches, projects, requests: requestsCount });
      } catch {
        if (active) {
          setStats({ matches: 0, projects: 0, requests: 0 });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--primary)] lg:text-5xl">
          Welcome back to Matcha
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-[var(--text-soft)]">
          Manage your projects, evaluate ideas, connect with teammates, and track everything in one place.        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard
          label="New Matches"
          value={stats.matches}
          hint="View your matches"
          onClick={() => navigate("/team-matcher")}
        />
        <StatCard
          label="Active Projects"
          value={stats.projects}
          hint="Browse projects"
          tone="soft"
          onClick={() => navigate("/legacy-library")}
        />
        <StatCard
          label="Pending Requests"
          value={stats.requests}
          hint="Manage requests"
          tone="tertiary"
          onClick={() => navigate("/connections")}
        />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] bg-[var(--surface-low)] p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text)]">Next Best Moves</h2>
              <p className="mt-2 text-sm text-[var(--text-soft)]"></p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Explore Projects", "/legacy-library", "Browse stored initiatives and reusable skill patterns."],
              ["Evaluate Idea", "/idea-evaluator", "Run Ollama-backed feasibility feedback on a new concept."],
              ["Find Matches", "/team-matcher", "See AI-generated teammate matches and send requests."],
              ["Edit Profile", "/profile", "Update skills, availability, role, and GitHub profile."],
            ].map(([label, route, copy]) => (
              <button
                key={route}
                type="button"
                onClick={() => navigate(route)}
                className="rounded-[24px] bg-[var(--surface)] p-5 text-left shadow-[0_12px_24px_rgba(69,98,45,0.05)] transition hover:-translate-y-0.5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--text-muted)]">Workspace</p>
                <p className="mt-3 text-xl font-bold text-[var(--primary)]">{label}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{copy}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-soft)] p-8 text-white shadow-[0_24px_50px_rgba(69,98,45,0.18)]">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">Studio Note</p>
          <h2 className="mt-4 text-3xl font-extrabold">Manage your projects, evaluate ideas, connect with teammates, and track everything in one place.</h2>
          <p className="mt-4 text-sm leading-7 text-white/80">
            Move from planning to collaboration faster with one workspace for project discovery, AI feedback, teammate matching, and ongoing coordination.
          </p>
          <button
            type="button"
            onClick={() => navigate("/idea-evaluator")}
            className="mt-8 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[var(--primary)]"
          >
            Launch Idea Evaluator
          </button>
        </div>
      </section>
    </div>
  );
}
