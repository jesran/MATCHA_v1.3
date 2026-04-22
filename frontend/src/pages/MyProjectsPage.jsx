import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client";
import { displayName } from "../utils/format";

export default function MyProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [drafts, setDrafts] = useState({});

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/projects/mine/");
      setProjects(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load your projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function startEditing(project) {
    setEditingId(project.id);
    // Editing needs the full project body, so open the card before filling drafts.
    setExpandedIds((current) => new Set([...current, project.id]));
    setDrafts((current) => ({
      ...current,
      [project.id]: {
        title: project.title,
        description: project.description,
        domain: project.domain,
        github_repo: project.github_repo || "",
        status: project.status,
      },
    }));
  }

  function toggleProject(projectId) {
    // Store expanded cards in a Set so multiple projects can stay open at once.
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  function cancelEditing(projectId) {
    setEditingId(null);
    setDrafts((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });
  }

  function handleDraftChange(projectId, event) {
    const { name, value } = event.target;
    setDrafts((current) => ({
      ...current,
      [projectId]: {
        ...current[projectId],
        [name]: value,
      },
    }));
  }

  async function saveProject(projectId) {
    const draft = drafts[projectId];
    setMessage("");
    try {
      await apiClient.put(`/projects/${projectId}/`, draft);
      setMessage("Project updated.");
      setEditingId(null);
      await loadProjects();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not update the project.");
    }
  }

  async function deleteProject(projectId) {
    if (!window.confirm("Delete this project permanently?")) {
      return;
    }
    setMessage("");
    try {
      await apiClient.delete(`/projects/${projectId}/`);
      setMessage("Project deleted.");
      await loadProjects();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not delete the project.");
    }
  }

  async function removeMember(projectId, userId) {
    setMessage("");
    try {
      await apiClient.post(`/projects/${projectId}/members/${userId}/remove/`);
      setMessage("Teammate removed.");
      await loadProjects();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not remove teammate.");
    }
  }

  async function leaveProject(projectId) {
    setMessage("");
    try {
      await apiClient.post(`/projects/${projectId}/leave/`);
      setMessage("You left the project.");
      await loadProjects();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not leave the project.");
    }
  }

  async function handleJoinRequestAction(requestId, status) {
    setMessage("");
    try {
      await apiClient.patch(`/project-join-requests/${requestId}/action/`, { status });
      setMessage(status === "accepted" ? "Collaborator added to project." : "Join request rejected.");
      await loadProjects();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not update join request.");
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--primary)]">My Projects</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--text-soft)]">
          Track the projects you created or joined, manage collaborators, and update project details from one place.
        </p>
      </section>

      {loading ? <p className="text-sm text-[var(--text-muted)]">Loading your projects...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--primary)]">{message}</p> : null}

      <section className="grid gap-6 xl:grid-cols-2">
        {projects.map((project) => {
          const isEditing = editingId === project.id;
          const isExpanded = expandedIds.has(project.id) || isEditing;
          const draft = drafts[project.id] || {};

          return (
            <article key={project.id} className="rounded-[32px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  {isEditing ? (
                    <input
                      name="title"
                      value={draft.title || ""}
                      onChange={(event) => handleDraftChange(project.id, event)}
                      className="w-full rounded-lg bg-[var(--surface-low)] px-3 py-2 text-2xl font-bold text-[var(--primary)]"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-[var(--primary)]">{project.title}</h2>
                  )}
                  <p className="mt-2 text-sm font-medium text-[var(--text-soft)]">
                    Owner:{" "}
                    <button type="button" onClick={() => navigate(`/profiles/${project.created_by.id}`)} className="font-bold text-[var(--primary)]">
                      {displayName(project.created_by)}
                    </button>
                  </p>
                </div>
                <span className="rounded-full bg-[var(--tertiary-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--tertiary)]">
                  {project.status}
                </span>
              </div>

              {!isExpanded ? (
                <div className="space-y-4">
                  {/* Collapsed cards keep only the high-signal project summary and actions. */}
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Team Members</p>
                    <div className="flex flex-wrap gap-2">
                      {(project.team_members || []).map((member) => (
                        <span key={member.id} className="inline-flex items-center gap-2 rounded-full bg-[var(--secondary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
                          <button type="button" onClick={() => navigate(`/profiles/${member.id}`)}>
                            {displayName(member)}
                          </button>
                          {project.is_owner && member.id !== project.created_by.id ? (
                            <button
                              type="button"
                              onClick={() => removeMember(project.id, member.id)}
                              className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[var(--tertiary)]"
                            >
                              Remove
                            </button>
                          ) : null}
                        </span>
                      ))}
                      {!project.team_members?.length ? <span className="text-sm text-[var(--text-muted)]">No teammates yet.</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleProject(project.id)}
                      className="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--primary)]"
                    >
                      Expand Details
                    </button>
                    {project.is_owner ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(project)}
                          className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"
                        >
                          Edit Project
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProject(project.id)}
                          className="rounded-lg border border-[var(--tertiary-soft)] bg-white px-5 py-3 text-sm font-bold text-[var(--tertiary)]"
                        >
                          Delete
                        </button>
                      </>
                    ) : project.is_team_member ? (
                      <button
                        type="button"
                        onClick={() => leaveProject(project.id)}
                        className="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--tertiary)]"
                      >
                        Leave Project
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
              <div className="space-y-4">
                {/* Expanded cards show the full project record, edit form, AI results, and owner requests. */}
                {isEditing ? (
                  <>
                    <textarea
                      name="description"
                      value={draft.description || ""}
                      onChange={(event) => handleDraftChange(project.id, event)}
                      className="min-h-[120px] w-full rounded-lg bg-[var(--surface-low)] px-3 py-3 text-sm text-[var(--text-soft)]"
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        name="domain"
                        value={draft.domain || ""}
                        onChange={(event) => handleDraftChange(project.id, event)}
                        className="rounded-lg bg-[var(--surface-low)] px-3 py-3 text-sm"
                      />
                      <input
                        name="github_repo"
                        value={draft.github_repo || ""}
                        onChange={(event) => handleDraftChange(project.id, event)}
                        placeholder="GitHub repo link"
                        className="rounded-lg bg-[var(--surface-low)] px-3 py-3 text-sm"
                      />
                      <select
                        name="status"
                        value={draft.status || "open"}
                        onChange={(event) => handleDraftChange(project.id, event)}
                        className="rounded-lg bg-[var(--surface-low)] px-3 py-3 text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm leading-7 text-[var(--text-soft)]">{project.description}</p>
                    {project.github_repo ? (
                      <a
                        href={project.github_repo}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit rounded-lg bg-[var(--surface-low)] px-3 py-2 text-xs font-bold text-[var(--tertiary)]"
                      >
                        GitHub repo
                      </a>
                    ) : null}
                  </>
                )}

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Team Members</p>
                  <div className="flex flex-wrap gap-2">
                    {(project.team_members || []).map((member) => (
                      <span key={member.id} className="inline-flex items-center gap-2 rounded-full bg-[var(--secondary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
                        <button type="button" onClick={() => navigate(`/profiles/${member.id}`)}>
                          {displayName(member)}
                        </button>
                        {project.is_owner && member.id !== project.created_by.id ? (
                          <button
                            type="button"
                            onClick={() => removeMember(project.id, member.id)}
                            className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[var(--tertiary)]"
                          >
                            Remove
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>

                {project.evaluation_result && Object.keys(project.evaluation_result).length ? (
                  <div className="rounded-2xl bg-[var(--surface-low)] p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">AI Idea Evaluation</p>
                    <div className="grid gap-3 text-sm text-[var(--text-soft)] md:grid-cols-2">
                      <p><span className="font-bold text-[var(--primary)]">Feasibility:</span> {project.evaluation_result.feasibility}</p>
                      <p><span className="font-bold text-[var(--primary)]">Estimated:</span> {project.evaluation_result.estimated_hours}</p>
                    </div>
                    {project.evaluation_result.brutal_feedback ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{project.evaluation_result.brutal_feedback}</p>
                    ) : null}
                    {project.evaluation_result.execution_phases?.length ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Basic Execution Phases</p>
                        {project.evaluation_result.execution_phases.map((phase) => (
                          <div key={phase.name} className="rounded-xl border border-[var(--line)] bg-white p-3">
                            <p className="text-sm font-bold text-[var(--primary)]">{phase.name}</p>
                            <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--text-soft)]">
                              {(phase.steps || []).map((step) => (
                                <li key={step}>- {step}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Suggested Teammates</p>
                  <div className="space-y-2">
                    {(project.teammate_suggestions || []).slice(0, 3).map((suggestion) => (
                      <div key={suggestion.user.id} className="flex items-center justify-between rounded-2xl bg-[var(--surface-low)] px-4 py-3">
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate(`/profiles/${suggestion.user.id}`)}
                            className="text-left text-sm font-semibold text-[var(--text)]"
                          >
                            {displayName(suggestion.user)}
                          </button>
                          <p className="text-xs text-[var(--text-soft)]">{suggestion.github || "No GitHub link yet"}</p>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">{suggestion.score}%</span>
                      </div>
                    ))}
                    {!project.teammate_suggestions?.length ? (
                      <p className="text-xs text-[var(--text-muted)]">No strong teammate suggestions yet.</p>
                    ) : null}
                  </div>
                </div>

                {project.pending_join_requests?.length ? (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Pending Join Requests</p>
                    <div className="space-y-3">
                      {project.pending_join_requests.map((request) => (
                        <div key={request.id} className="rounded-2xl bg-[var(--surface-low)] p-4">
                          <button
                            type="button"
                            onClick={() => navigate(`/profiles/${request.sender.id}`)}
                            className="text-left text-sm font-semibold text-[var(--text)]"
                          >
                            {displayName(request.sender)}
                          </button>
                          <p className="mt-1 text-xs text-[var(--text-soft)]">{request.sender.email || "No email"}</p>
                          {request.message ? <p className="mt-2 text-sm text-[var(--text-soft)]">{request.message}</p> : null}
                          <div className="mt-3 flex gap-3">
                            <button
                              type="button"
                              onClick={() => handleJoinRequestAction(request.id, "accepted")}
                              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleJoinRequestAction(request.id, "rejected")}
                              className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--text-soft)]"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleProject(project.id)}
                    className="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--primary)]"
                  >
                    Collapse
                  </button>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveProject(project.id)}
                        className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelEditing(project.id)}
                        className="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--text-soft)]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {project.is_owner ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(project)}
                            className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"
                          >
                            Edit Project
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProject(project.id)}
                            className="rounded-lg border border-[var(--tertiary-soft)] bg-white px-5 py-3 text-sm font-bold text-[var(--tertiary)]"
                          >
                            Delete
                          </button>
                        </>
                      ) : project.is_team_member ? (
                        <button
                          type="button"
                          onClick={() => leaveProject(project.id)}
                          className="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--tertiary)]"
                        >
                          Leave Project
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
              )}
            </article>
          );
        })}
      </section>

      {!loading && !projects.length ? <p className="text-sm text-[var(--text-muted)]">You do not have any projects yet.</p> : null}
    </div>
  );
}
