import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";

import apiClient from "../api/client";
import useFetch from "../hooks/useFetch";
import { assetUrl, displayName } from "../utils/format";

export default function LegacyLibraryPage() {
  const navigate = useNavigate();
  const { data: projects, loading, error, setData } = useFetch(() => apiClient.get("/legacy-library/"), []);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    domain: "",
    status: "",
    minimumSkillMatch: 0,
  });

  const domains = useMemo(
    // Domain filter options come from the live project list.
    () => Array.from(new Set(projects.map((project) => project.domain).filter(Boolean))).sort(),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    // One search box covers the fields people naturally remember: title,
    // creator, domain, repo, and required skills.
    const query = filters.search.trim().toLowerCase();
    return projects.filter((project) => {
      const bestSkillMatch = Math.max(0, ...(project.teammate_suggestions || []).map((item) => item.score || 0));
      const haystack = [
        project.title,
        project.description,
        project.domain,
        project.status,
        project.github_repo,
        displayName(project.created_by),
        ...(project.required_skills || []),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || haystack.includes(query)) &&
        (!filters.domain || project.domain === filters.domain) &&
        (!filters.status || project.status === filters.status) &&
        bestSkillMatch >= Number(filters.minimumSkillMatch)
      );
    });
  }, [filters, projects]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters({ search: "", domain: "", status: "", minimumSkillMatch: 0 });
  }

  async function requestToJoin(projectId) {
    // Refresh the card after requesting so the button changes to pending.
    setMessage("");
    try {
      await apiClient.post(`/projects/${projectId}/join-request/`, { message: "I'd like to contribute to this project." });
      const response = await apiClient.get("/legacy-library/");
      setData(response.data);
      setMessage("Project join request sent.");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not send the join request.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--primary)] lg:text-5xl">Explore Projects</h1>
          <p className="mt-2 max-w-2xl text-lg text-[var(--text-soft)]">
            Join high-impact missions and use the legacy library as a real backend-powered project directory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/idea-evaluator")}
          className="rounded-xl bg-[var(--tertiary)] px-6 py-4 text-sm font-bold text-white shadow-[0_16px_28px_rgba(152,61,42,0.16)]"
        >
          Create Project
        </button>
      </section>

      <section className="grid gap-4 rounded-[28px] bg-[var(--surface-low)] p-6 md:grid-cols-[1.2fr_180px_180px_1fr_auto]">
        <div>
          <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Search</label>
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Find a project, skill, creator, or repo"
            className="w-full rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Domain</label>
          <select
            name="domain"
            value={filters.domain}
            onChange={handleFilterChange}
            className="w-full rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-soft)] outline-none"
          >
            <option value="">All Domains</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-soft)] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Skill Match</label>
          <input
            name="minimumSkillMatch"
            type="range"
            min="0"
            max="100"
            value={filters.minimumSkillMatch}
            onChange={handleFilterChange}
            className="mt-3 w-full accent-[var(--primary)]"
          />
          <p className="mt-2 text-xs font-bold text-[var(--text-soft)]">{filters.minimumSkillMatch}% minimum teammate fit</p>
        </div>
        <button type="button" onClick={resetFilters} className="self-end rounded-xl bg-[var(--surface-high)] px-5 py-3 text-sm font-bold text-[var(--primary)]">
          Reset
        </button>
      </section>

      {loading ? <p className="text-sm text-[var(--text-muted)]">Loading projects...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--primary)]">{message}</p> : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredProjects.map((project) => (
          <article
            key={project.id}
            className="flex flex-col rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_20px_40px_rgba(69,98,45,0.06)] transition hover:-translate-y-1"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <span className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
                {project.domain}
              </span>
              <span className="rounded-full bg-[var(--tertiary-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--tertiary)]">
                {project.status}
              </span>
            </div>

            <h3 className="text-2xl font-bold text-[var(--primary)]">{project.title}</h3>
            <button
              type="button"
              onClick={() => navigate(`/profiles/${project.created_by.id}`)}
              className="mt-4 flex w-fit items-center gap-3 text-left"
            >
              {project.created_by.photo ? (
                <img
                  src={assetUrl(project.created_by.photo)}
                  alt={displayName(project.created_by)}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--secondary-soft)] text-sm font-bold text-[var(--primary)]">
                  {displayName(project.created_by).slice(0, 1)}
                </span>
              )}
              <span className="text-sm font-semibold text-[var(--text-soft)]">Created by {displayName(project.created_by)}</span>
            </button>
            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{project.description}</p>
            {project.github_repo ? (
              <a
                href={project.github_repo}
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-fit rounded-lg bg-[var(--surface-low)] px-3 py-2 text-xs font-bold text-[var(--tertiary)]"
              >
                GitHub repo
              </a>
            ) : null}

            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Team</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {(project.team_members || []).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => navigate(`/profiles/${member.id}`)}
                    className="rounded-lg bg-[var(--secondary-soft)] px-3 py-2 text-xs font-medium text-[var(--primary)]"
                  >
                    {displayName(member)}
                  </button>
                ))}
              </div>

              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {(project.required_skills || []).map((skill) => (
                  <span key={skill} className="rounded-lg bg-[var(--surface-mid)] px-3 py-2 text-xs font-medium text-[var(--text-soft)]">
                    {skill}
                  </span>
                ))}
                {!project.required_skills?.length ? (
                  <span className="text-xs text-[var(--text-muted)]">No skills listed</span>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => requestToJoin(project.id)}
                disabled={project.join_request_status === "pending" || project.join_request_status === "accepted"}
                className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {project.join_request_status === "accepted"
                  ? "Joined"
                  : project.join_request_status === "pending"
                    ? "Request Pending"
                    : "Request to Join"}
              </button>
            </div>
          </article>
        ))}
      </section>

      {!loading && !filteredProjects.length ? <p className="text-sm text-[var(--text-muted)]">No projects found.</p> : null}
    </div>
  );
}
