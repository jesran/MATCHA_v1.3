import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client";
import { assetUrl, displayName } from "../utils/format";

export default function TeamMatcherPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [matchesResponse, connectionsResponse] = await Promise.all([
        apiClient.get("/matches/"),
        apiClient.get("/connections/status/"),
      ]);
      setMatches(matchesResponse.data);
      setConnections(connectionsResponse.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load teammate matches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const connectionMap = useMemo(() => {
    // Lookups by user id keep every card from repeatedly scanning connections.
    const map = new Map();
    connections.forEach((connection) => {
      map.set(connection.counterpart.id, connection);
    });
    return map;
  }, [connections]);

  const filteredMatches = useMemo(() => {
    // Search across profile fields because people may remember a skill or role
    // before they remember the exact username.
    const query = search.trim().toLowerCase();
    if (!query) {
      return matches;
    }

    return matches.filter((match) =>
      [
        displayName(match.user),
        match.user.email,
        match.user.mobile_number,
        match.user.github,
        match.user.bio,
        match.user.preferred_role,
        ...(match.user.skills || []),
        ...(match.user.interests || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [matches, search]);

  async function handleConnect(userId) {
    setMessage("");
    try {
      await apiClient.post("/connections/send/", { receiver_id: userId });
      setMessage("Connection request sent.");
      window.dispatchEvent(new Event("connections:updated"));
      await loadData();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not send connection request.");
    }
  }

  async function handleAction(requestId, status) {
    setMessage("");
    try {
      await apiClient.patch(`/connections/${requestId}/action/`, { status });
      setMessage(status === "accepted" ? "Connection accepted." : "Connection rejected.");
      window.dispatchEvent(new Event("connections:updated"));
      await loadData();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not update request.");
    }
  }

  function renderAction(match) {
    // The action area mirrors the current connection state for this specific user.
    const connection = connectionMap.get(match.user.id);

    if (!connection) {
      return (
        <button type="button" onClick={() => handleConnect(match.user.id)} className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">
          Connect
        </button>
      );
    }

    if (connection.status === "pending" && connection.direction === "sent") {
      return <span className="rounded-full bg-[var(--surface-high)] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Pending</span>;
    }

    if (connection.status === "pending" && connection.direction === "received") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => handleAction(connection.id, "accepted")} className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">
            Accept
          </button>
          <button type="button" onClick={() => handleAction(connection.id, "rejected")} className="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--text-soft)]">
            Reject
          </button>
        </div>
      );
    }

    if (connection.status === "accepted") {
      return <span className="rounded-full bg-[var(--secondary-soft)] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Contact Revealed</span>;
    }

    return <span className="rounded-full bg-[var(--surface-high)] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Rejected</span>;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--primary)] lg:text-5xl">Your Perfect Teammate Matches</h1>
          <p className="mt-2 max-w-2xl text-lg text-[var(--text-soft)]">
            Review ranked collaborators, search for a specific person, and send requests from one place.
          </p>
        </div>
        <div className="min-w-[220px] rounded-[24px] bg-[var(--surface-low)] p-5">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-[var(--primary)]">
            <span>Match Analysis</span>
            <span>100% Complete</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-high)]">
            <div className="h-2 w-full rounded-full bg-[var(--primary)]" />
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-[var(--surface-low)] p-5">
        <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Search People</label>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find by name, skill, role, GitHub, or interest"
          className="w-full rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none"
        />
      </section>

      {loading ? <p className="text-sm text-[var(--text-muted)]">Calculating teammate matches...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--primary)]">{message}</p> : null}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredMatches.map((match) => {
          const connection = connectionMap.get(match.user.id);
          const contactVisible = connection?.status === "accepted";
          const visibleContact = contactVisible
            ? [match.user.email, match.user.mobile_number].filter(Boolean).join(" | ")
            : "Email and phone stay hidden until accepted.";

          return (
            <article key={match.id} className="flex min-h-[420px] flex-col rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_18px_36px_rgba(69,98,45,0.07)]">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {match.user.photo ? (
                    <img src={assetUrl(match.user.photo)} alt={displayName(match.user)} className="h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--surface-low)] text-3xl font-bold text-[var(--primary)]">
                      {displayName(match.user).slice(0, 1)}
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 grid h-12 w-12 place-items-center rounded-full border-4 border-white bg-[var(--tertiary-soft)] text-[10px] font-bold text-[var(--tertiary)]">
                    {match.score}%
                  </div>
                </div>
                <button type="button" onClick={() => navigate(`/profiles/${match.user.id}`)} className="mt-5 text-xl font-bold text-[var(--text)]">
                  {displayName(match.user)}
                </button>
                <p className="mt-1 text-sm font-medium text-[var(--text-soft)]">{match.user.preferred_role || "Collaborator"}</p>
                <p className="mt-3 min-h-[40px] text-sm leading-6 text-[var(--text-soft)]">{visibleContact}</p>
              </div>

              <div className="mt-5 flex min-h-[30px] flex-wrap justify-center gap-2">
                {(match.user.skills || []).slice(0, 3).map((skill) => (
                  <span key={skill} className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex-1 rounded-[20px] border border-[var(--line)] bg-[var(--surface-low)] p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  AI Explanation
                </div>
                <p className="text-sm leading-6 text-[var(--text-soft)]">{match.explanation}</p>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {renderAction(match)}
                <button type="button" onClick={() => navigate(`/profiles/${match.user.id}`)} className="rounded-lg border-2 border-[rgba(85,99,72,0.2)] px-5 py-3 text-sm font-bold text-[var(--text-soft)]">
                  View Profile
                </button>
                {match.user.github ? (
                  <a href={match.user.github} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--line)] px-5 py-3 text-center text-sm font-bold text-[var(--tertiary)]">
                    GitHub
                  </a>
                ) : null}
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Last updated {new Date(match.updated_at).toLocaleDateString()}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {!loading && !filteredMatches.length ? <p className="text-sm text-[var(--text-muted)]">No teammates matched yet.</p> : null}
    </div>
  );
}
