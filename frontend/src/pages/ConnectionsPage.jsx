import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client";
import { assetUrl, daysAgo, displayName } from "../utils/format";

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [projectRequests, setProjectRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("received");

  async function loadConnections() {
    setLoading(true);
    setError("");
    try {
      // Connections and project join requests are separate API resources, but this page
      // is the single inbox for both kinds of collaboration requests.
      const [connectionsResponse, projectsResponse] = await Promise.all([
        apiClient.get("/connections/status/"),
        apiClient.get("/projects/mine/"),
      ]);
      setConnections(connectionsResponse.data);
      setProjectRequests(
        projectsResponse.data.flatMap((project) =>
          (project.pending_join_requests || []).map((request) => ({
            ...request,
            project_title: project.title,
          }))
        )
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load your connection requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
  }, []);

  const received = useMemo(() => connections.filter((item) => item.direction === "received"), [connections]);
  const sent = useMemo(() => connections.filter((item) => item.direction === "sent"), [connections]);
  const activeList = tab === "received" ? received : sent;

  async function handleAction(requestId, status) {
    setMessage("");
    try {
      await apiClient.patch(`/connections/${requestId}/action/`, { status });
      setMessage(status === "accepted" ? "Request accepted." : "Request rejected.");
      window.dispatchEvent(new Event("connections:updated"));
      await loadConnections();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not update the request.");
    }
  }

  async function handleProjectRequestAction(requestId, status) {
    setMessage("");
    try {
      // Project join requests are owned by the project, so refresh both this inbox
      // and any project cards that may be open elsewhere.
      await apiClient.patch(`/project-join-requests/${requestId}/action/`, { status });
      setMessage(status === "accepted" ? "Project teammate added." : "Project join request rejected.");
      window.dispatchEvent(new Event("projects:updated"));
      await loadConnections();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not update project request.");
    }
  }

  function Avatar({ user, size = "h-20 w-20" }) {
    // Use the saved profile photo when available and fall back to an initial so
    // every request still has a stable visual anchor.
    if (user.photo) {
      return <img src={assetUrl(user.photo)} alt={displayName(user)} className={`${size} rounded-full object-cover`} />;
    }

    return (
      <div className={`${size} grid place-items-center rounded-full bg-[var(--surface-mid)] text-2xl font-bold text-[var(--primary)]`}>
        {displayName(user).slice(0, 1)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--primary)]">Connections</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--text-soft)]">
          Manage incoming collaboration requests and keep track of the people you have already reached out to.
        </p>
      </section>

      <section className="rounded-[28px] bg-[var(--surface-low)] p-6 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
        <div className="flex gap-8 border-b border-[var(--line)]">
          <button
            type="button"
            onClick={() => setTab("received")}
            className={`pb-4 font-headline text-sm font-bold transition ${tab === "received" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--text-soft)]"}`}
          >
            Received Requests
            <span className="ml-2 rounded-full bg-[var(--tertiary-soft)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--tertiary)]">
              {received.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("sent")}
            className={`pb-4 font-headline text-sm font-bold transition ${tab === "sent" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--text-soft)]"}`}
          >
            Sent Requests
            <span className="ml-2 rounded-full bg-[var(--secondary-soft)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--primary)]">
              {sent.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("projects")}
            className={`pb-4 font-headline text-sm font-bold transition ${tab === "projects" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--text-soft)]"}`}
          >
            Project Requests
            <span className="ml-2 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--primary)]">
              {projectRequests.length}
            </span>
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? <p className="text-sm text-[var(--text-muted)]">Loading requests...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-[var(--primary)]">{message}</p> : null}

          {tab !== "projects"
            ? activeList.map((item) => (
                <article key={item.id} className="flex flex-col gap-5 rounded-[24px] bg-[var(--surface)] p-6 shadow-[0_16px_32px_rgba(69,98,45,0.06)] md:flex-row md:items-center">
                  <Avatar user={item.counterpart} />
                  <div className="flex-1">
                    <button type="button" onClick={() => navigate(`/profiles/${item.counterpart.id}`)} className="text-left text-xl font-bold text-[var(--text)]">
                      {displayName(item.counterpart)}
                    </button>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {[item.counterpart.email, item.counterpart.mobile_number].filter(Boolean).join(" | ") || "Contact hidden"}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      {item.status} | {daysAgo(item.created_at) || new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {tab === "received" && item.status === "pending" ? (
                      <>
                        <button type="button" onClick={() => handleAction(item.id, "accepted")} className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">
                          Accept
                        </button>
                        <button type="button" onClick={() => handleAction(item.id, "rejected")} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-bold text-[var(--text-soft)]">
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-[var(--surface-mid)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                        {item.status}
                      </span>
                    )}
                  </div>
                </article>
              ))
            : projectRequests.map((item) => (
                <article key={item.id} className="flex flex-col gap-5 rounded-[24px] bg-[var(--surface)] p-6 shadow-[0_16px_32px_rgba(69,98,45,0.06)] md:flex-row md:items-center">
                  <Avatar user={item.sender} />
                  <div className="flex-1">
                    <button type="button" onClick={() => navigate(`/profiles/${item.sender.id}`)} className="text-left text-xl font-bold text-[var(--text)]">
                      {displayName(item.sender)}
                    </button>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      Asked to join <span className="font-bold text-[var(--primary)]">{item.project_title}</span>
                    </p>
                    {item.message ? <p className="mt-2 text-sm text-[var(--text-soft)]">{item.message}</p> : null}
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      pending | {daysAgo(item.created_at) || new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => handleProjectRequestAction(item.id, "accepted")} className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">
                      Accept
                    </button>
                    <button type="button" onClick={() => handleProjectRequestAction(item.id, "rejected")} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-bold text-[var(--text-soft)]">
                      Reject
                    </button>
                  </div>
                </article>
              ))}

          {!loading && tab !== "projects" && !activeList.length ? <p className="text-sm text-[var(--text-muted)]">No requests in this view yet.</p> : null}
          {!loading && tab === "projects" && !projectRequests.length ? <p className="text-sm text-[var(--text-muted)]">No pending project join requests yet.</p> : null}
        </div>
      </section>

    </div>
  );
}
