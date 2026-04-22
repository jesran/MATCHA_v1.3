import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import apiClient from "../api/client";
import MatchaLogo from "./MatchaLogo";
import { capitalizeWord, displayName } from "../utils/format";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/legacy-library", label: "Projects", icon: "folder_open" },
  { to: "/my-projects", label: "My Projects", icon: "deployed_code" },
  { to: "/idea-evaluator", label: "Idea Evaluator", icon: "auto_awesome" },
  { to: "/team-matcher", label: "Matching", icon: "group" },
  { to: "/connections", label: "Connections", icon: "mail" },
  { to: "/profile", label: "Profile", icon: "person" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const [profileBadge, setProfileBadge] = useState({
    label: localStorage.getItem("accessToken") ? "U" : "G",
    photo: "",
    name: "",
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadProfileBadge() {
      // The header badge is intentionally lightweight; it only needs enough data
      // to make the current session feel personal without loading a full profile page.
      if (!localStorage.getItem("accessToken")) {
        if (active) {
          setProfileBadge({ label: "G", photo: "", name: "" });
        }
        return;
      }

      try {
        const response = await apiClient.get("/profile/");
        if (!active) {
          return;
        }
        const data = response.data;
        const name = displayName(data.user || { username: data.user?.username || "" }) || displayName(data);
        const label = capitalizeWord(name || data.user?.username || "U").slice(0, 1) || "U";
        setProfileBadge({
          label,
          photo: data.photo || "",
          name,
        });
      } catch {
        if (active) {
          setProfileBadge({ label: "U", photo: "", name: "" });
        }
      }
    }

    function handleRefresh() {
      loadProfileBadge();
    }

    loadProfileBadge();
    window.addEventListener("profile:updated", handleRefresh);
    window.addEventListener("connections:updated", handleRefresh);
    window.addEventListener("auth:expired", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("profile:updated", handleRefresh);
      window.removeEventListener("connections:updated", handleRefresh);
      window.removeEventListener("auth:expired", handleRefresh);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      // Notifications combine direct connection requests with project join requests
      // so owners do not have to check My Projects to notice a new applicant.
      if (!localStorage.getItem("accessToken")) {
        if (active) {
          setNotifications([]);
        }
        return;
      }

      try {
        const [connectionsResponse, projectsResponse] = await Promise.all([
          apiClient.get("/connections/status/"),
          apiClient.get("/projects/mine/"),
        ]);
        if (!active) {
          return;
        }
        const pendingConnections = connectionsResponse.data
          .filter((item) => item.direction === "received" && item.status === "pending")
          .map((item) => ({ ...item, type: "connection" }));
        // Project join requests are nested under the projects owned by this user.
        // Flattening them gives the dropdown one simple list to render.
        const pendingProjectRequests = projectsResponse.data.flatMap((project) =>
          (project.pending_join_requests || []).map((request) => ({
            ...request,
            type: "project_join",
            project_title: project.title,
          }))
        );
        setNotifications([...pendingConnections, ...pendingProjectRequests]);
      } catch {
        if (active) {
          setNotifications([]);
        }
      }
    }

    function handleRefresh() {
      loadNotifications();
    }

    loadNotifications();
    window.addEventListener("profile:updated", handleRefresh);
    window.addEventListener("connections:updated", handleRefresh);
    window.addEventListener("projects:updated", handleRefresh);
    window.addEventListener("auth:expired", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("profile:updated", handleRefresh);
      window.removeEventListener("connections:updated", handleRefresh);
      window.removeEventListener("projects:updated", handleRefresh);
      window.removeEventListener("auth:expired", handleRefresh);
    };
  }, []);

  useEffect(() => {
    function handleOutside(event) {
      // Keep the dropdown feeling like a normal menu by closing it when the user
      // clicks anywhere outside the header controls.
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }

    if (notificationsOpen) {
      document.addEventListener("mousedown", handleOutside);
    }

    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notificationsOpen]);

  function openConnections() {
    setNotificationsOpen(false);
    navigate("/connections");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)] lg:pl-72">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-[var(--line)] bg-[var(--surface-low)] shadow-[0_20px_40px_rgba(69,98,45,0.06)] lg:flex">
        <div className="flex h-full flex-col gap-2 p-6">
          <button type="button" onClick={() => navigate("/dashboard")} className="mb-8 flex items-center gap-3 px-2 pt-4 text-left">
            <MatchaLogo />
            <div>
              <p className="font-headline text-lg font-bold text-[var(--primary)]">Matcha</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                Build Bold Ideas Together
              </p>
            </div>
          </button>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--surface-high)] text-[var(--primary)]"
                      : "text-[var(--text-soft)] hover:bg-[var(--surface-high)] hover:text-[var(--primary)]"
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => navigate("/team-matcher")}
            className="mt-auto rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-soft)] px-4 py-4 text-sm font-bold text-white shadow-[0_16px_30px_rgba(69,98,45,0.18)] transition hover:opacity-95"
          >
            Find a Match
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(251,249,243,0.92)] px-5 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-4">
            <button
              type="button"
              className="flex items-center gap-3 font-headline text-2xl font-black tracking-tight text-[var(--primary)] lg:hidden"
              onClick={() => navigate("/dashboard")}
            >
              <MatchaLogo compact />
              <span>Matcha</span>
            </button>

            <div className="ml-auto flex items-center gap-4" ref={panelRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((current) => !current)}
                  className="relative text-[var(--text-soft)] transition hover:text-[var(--tertiary)]"
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {notifications.length ? (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--tertiary)] px-1 text-[10px] font-bold text-white">
                      {notifications.length}
                    </span>
                  ) : null}
                </button>

                {notificationsOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-80 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_20px_40px_rgba(69,98,45,0.12)]">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
                      <div>
                        <p className="font-headline text-sm font-bold text-[var(--primary)]">Notifications</p>
                        <p className="text-xs text-[var(--text-soft)]">Recent collaboration updates</p>
                      </div>
                      <button
                        type="button"
                        onClick={openConnections}
                        className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--tertiary)]"
                      >
                        View all
                      </button>
                    </div>

                    <div className="mt-3 space-y-3">
                      {notifications.length ? (
                        notifications.slice(0, 4).map((item) => (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            onClick={openConnections}
                            className="flex w-full items-start gap-3 rounded-2xl bg-[var(--surface-low)] p-3 text-left transition hover:bg-[var(--surface-mid)]"
                          >
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--secondary-soft)] font-bold text-[var(--primary)]">
                              {capitalizeWord(item.type === "project_join" ? item.sender.username : item.counterpart.username).slice(0, 1)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--text)]">
                                {item.type === "project_join"
                                  ? `${capitalizeWord(item.sender.username)} asked to join ${item.project_title}`
                                  : `${capitalizeWord(item.counterpart.username)} sent you a request`}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-soft)]">
                                {new Date(item.updated_at).toLocaleString()}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-[var(--surface-low)] p-4 text-sm text-[var(--text-soft)]">
                          No new notifications yet. When teammates send you requests, they will show up here.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5"
              >
                <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[var(--surface-low)] font-semibold text-[var(--primary)]">
                  {profileBadge.photo ? (
                    <img src={profileBadge.photo} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    profileBadge.label
                  )}
                </span>
                {profileBadge.name ? (
                  <span className="hidden pr-2 text-sm font-semibold text-[var(--primary)] md:block">
                    {profileBadge.name}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-2xl px-5 py-8 md:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
