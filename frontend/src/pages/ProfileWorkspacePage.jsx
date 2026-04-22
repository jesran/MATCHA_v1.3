import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client";
import { capitalizeWord, displayName } from "../utils/format";

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  mobile_number: "",
  bio: "",
  skills: "",
  interests: "",
  availability: 5,
  experience_level: "beginner",
  preferred_role: "fullstack",
  github: "",
  photo: null,
};

const initialAuth = {
  username: "",
  email: "",
  mobile_number: "",
  password: "",
};

const experienceOptions = ["beginner", "intermediate", "advanced"];
const roleOptions = ["frontend", "backend", "fullstack", "designer", "pm", "ai", "other"];

function parseError(err, fallback) {
  const data = err.response?.data;
  if (!data) {
    return fallback;
  }
  if (typeof data === "string") {
    return data;
  }
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
    .join(" | ");
}

export default function ProfileWorkspacePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [draftForm, setDraftForm] = useState(initialForm);
  const [authForm, setAuthForm] = useState(initialAuth);
  const [authMode, setAuthMode] = useState("login");
  const [profileStatus, setProfileStatus] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem("accessToken")));
  const [isEditing, setIsEditing] = useState(false);
  const [savedSkills, setSavedSkills] = useState([]);
  const [savedInterests, setSavedInterests] = useState([]);
  const [photoPreview, setPhotoPreview] = useState("");

  const fullName = useMemo(
    () => displayName({ first_name: form.first_name, last_name: form.last_name, username: authForm.username }) || "Your profile",
    [form.first_name, form.last_name, authForm.username]
  );

  async function loadProfile() {
    if (!localStorage.getItem("accessToken")) {
      setForm(initialForm);
      setDraftForm(initialForm);
      setSavedSkills([]);
      setSavedInterests([]);
      setPhotoPreview("");
      setIsEditing(false);
      return;
    }

    try {
      const response = await apiClient.get("/profile/");
      const data = response.data;
      const normalized = {
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || data.user?.email || "",
        mobile_number: data.mobile_number || data.user?.mobile_number || "",
        bio: data.bio || "",
        skills: (data.skills || []).join(", "),
        interests: (data.interests || []).join(", "),
        availability: data.availability || 5,
        experience_level: data.experience_level || "beginner",
        preferred_role: data.preferred_role || "fullstack",
        github: data.github || "",
        photo: null,
      };
      setForm(normalized);
      setDraftForm(normalized);
      setSavedSkills(data.skills || []);
      setSavedInterests(data.interests || []);
      setPhotoPreview(data.photo || "");
      setProfileStatus("");
      setIsEditing(false);
      window.dispatchEvent(new Event("profile:updated"));
    } catch (err) {
      setProfileStatus(parseError(err, "Profile could not be loaded."));
    }
  }

  useEffect(() => {
    loadProfile();
  }, [isAuthenticated]);

  useEffect(() => {
    function handleExpiredAuth() {
      setIsAuthenticated(false);
      setAuthStatus("Your session expired. Please sign in again.");
      setProfileStatus("Signed out because the token became invalid.");
      setForm(initialForm);
      setDraftForm(initialForm);
      setPhotoPreview("");
    }

    window.addEventListener("auth:expired", handleExpiredAuth);
    return () => window.removeEventListener("auth:expired", handleExpiredAuth);
  }, []);

  function handleChange(event) {
    const { name, value, files } = event.target;
    if (name === "photo") {
      const file = files?.[0] || null;
      setDraftForm((current) => ({ ...current, photo: file }));
      if (file) {
        setPhotoPreview(URL.createObjectURL(file));
      }
      return;
    }

    setDraftForm((current) => ({
      ...current,
      [name]: name === "availability" ? Number(value) : value,
    }));
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  }

  async function handleLogin() {
    setAuthStatus("");
    try {
      const response = await apiClient.post("/auth/login/", {
        username: authForm.username.trim().toLowerCase(),
        password: authForm.password,
      });
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      setIsAuthenticated(true);
      setAuthStatus("Signed in successfully.");
      window.dispatchEvent(new Event("profile:updated"));
      navigate("/dashboard");
    } catch (err) {
      setAuthStatus(parseError(err, "Login failed."));
    }
  }

  async function handleRegister() {
    setAuthStatus("");
    try {
      await apiClient.post("/auth/register/", {
        username: authForm.username.trim().toLowerCase(),
        email: authForm.email,
        mobile_number: authForm.mobile_number,
        password: authForm.password,
      });
      setAuthMode("login");
      setAuthStatus("Account created. Sign in to start editing your profile.");
    } catch (err) {
      setAuthStatus(parseError(err, "Registration failed."));
    }
  }

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsAuthenticated(false);
    setForm(initialForm);
    setDraftForm(initialForm);
    setSavedSkills([]);
    setSavedInterests([]);
    setPhotoPreview("");
    setProfileStatus("");
    setAuthStatus("");
    setIsEditing(false);
    window.dispatchEvent(new Event("profile:updated"));
    navigate("/");
  }

  function handleCancel() {
    setDraftForm({ ...form, photo: null });
    setPhotoPreview(photoPreview || "");
    setIsEditing(false);
    setProfileStatus("Changes discarded.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setProfileStatus("");

    if (!localStorage.getItem("accessToken")) {
      setProfileStatus("Sign in first to edit your profile.");
      return;
    }

    const payload = new FormData();
    payload.append("first_name", capitalizeWord(draftForm.first_name));
    payload.append("last_name", capitalizeWord(draftForm.last_name));
    payload.append("email", draftForm.email);
    payload.append("mobile_number", draftForm.mobile_number);
    payload.append("bio", draftForm.bio);
    payload.append("availability", String(draftForm.availability));
    payload.append("experience_level", draftForm.experience_level);
    payload.append("preferred_role", draftForm.preferred_role);
    payload.append("github", draftForm.github);
    payload.append("skills", JSON.stringify(draftForm.skills.split(",").map((item) => item.trim()).filter(Boolean)));
    payload.append("interests", JSON.stringify(draftForm.interests.split(",").map((item) => item.trim()).filter(Boolean)));
    if (draftForm.photo) {
      payload.append("photo", draftForm.photo);
    }

    try {
      const response = await apiClient.put("/profile/", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const normalized = {
        first_name: response.data.first_name || "",
        last_name: response.data.last_name || "",
        email: response.data.email || response.data.user?.email || "",
        mobile_number: response.data.mobile_number || response.data.user?.mobile_number || "",
        bio: response.data.bio || "",
        skills: (response.data.skills || []).join(", "),
        interests: (response.data.interests || []).join(", "),
        availability: response.data.availability || 5,
        experience_level: response.data.experience_level || "beginner",
        preferred_role: response.data.preferred_role || "fullstack",
        github: response.data.github || "",
        photo: null,
      };
      setForm(normalized);
      setDraftForm(normalized);
      setSavedSkills(response.data.skills || []);
      setSavedInterests(response.data.interests || []);
      setPhotoPreview(response.data.photo || photoPreview);
      setProfileStatus("Profile saved successfully.");
      setIsEditing(false);
      window.dispatchEvent(new Event("profile:updated"));
    } catch (err) {
      setProfileStatus(parseError(err, "Profile save failed."));
    }
  }

  return (
    <div className="space-y-8">
      {!isAuthenticated ? (
        <section className="mx-auto max-w-[560px] space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-[var(--primary)]">Matcha</h1>
            <p className="mt-2 text-sm tracking-wide text-[var(--text-soft)]">Build Bold Ideas Together</p>
          </div>

          <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-low)] p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
            <div className="mb-8 flex rounded-xl bg-[var(--surface-high)] p-1">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-lg py-3 text-sm font-semibold transition ${authMode === "login" ? "bg-white text-[var(--primary)] shadow-sm" : "text-[var(--text-soft)]"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 rounded-lg py-3 text-sm font-semibold transition ${authMode === "register" ? "bg-white text-[var(--primary)] shadow-sm" : "text-[var(--text-soft)]"}`}
              >
                Sign Up
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Username</span>
                <input
                  name="username"
                  value={authForm.username}
                  onChange={handleAuthChange}
                  className="w-full rounded-xl border-none bg-white px-4 py-3.5 outline-none ring-0"
                  placeholder="alexchen"
                />
              </label>

              {authMode === "register" ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Email</span>
                    <input
                      name="email"
                      type="email"
                      value={authForm.email}
                      onChange={handleAuthChange}
                      className="w-full rounded-xl border-none bg-white px-4 py-3.5 outline-none ring-0"
                      placeholder="alex@matcha.app"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Mobile Number</span>
                    <input
                      name="mobile_number"
                      value={authForm.mobile_number}
                      onChange={handleAuthChange}
                      className="w-full rounded-xl border-none bg-white px-4 py-3.5 outline-none ring-0"
                      placeholder="+91 98765 43210"
                    />
                  </label>
                </>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Password</span>
                <input
                  name="password"
                  type="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  className="w-full rounded-xl border-none bg-white px-4 py-3.5 outline-none ring-0"
                  placeholder="••••••••"
                />
              </label>

              <button
                type="button"
                onClick={authMode === "login" ? handleLogin : handleRegister}
                className="w-full rounded-xl bg-gradient-to-r from-[var(--tertiary)] to-[#b7553f] px-5 py-4 text-sm font-bold text-white shadow-[0_16px_28px_rgba(152,61,42,0.18)]"
              >
                {authMode === "login" ? "Sign In" : "Create Account"}
              </button>

              {authStatus ? <p className="text-sm text-[var(--primary)]">{authStatus}</p> : null}
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-[28px] bg-[var(--surface-low)] p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)] md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-end">
              <div className="relative">
                <div className="grid h-36 w-36 place-items-center overflow-hidden rounded-full border-4 border-white bg-[var(--surface)] text-4xl font-bold text-[var(--primary)] shadow-lg">
                  {photoPreview ? (
                    <img src={photoPreview} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    fullName.slice(0, 1)
                  )}
                </div>
                {isEditing ? (
                  <label className="absolute bottom-2 right-2 rounded-full bg-white p-2 shadow">
                    <span className="material-symbols-outlined text-[var(--primary)]">photo_camera</span>
                    <input type="file" name="photo" accept="image/*" onChange={handleChange} className="hidden" />
                  </label>
                ) : null}
              </div>

              <div className="flex-1">
                <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text)]">{fullName}</h1>
                <p className="mt-2 text-[15px] font-medium text-[var(--text-soft)]">
                  {capitalizeWord(form.preferred_role)} • {capitalizeWord(form.experience_level)} • {form.availability} hours/week
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftForm({ ...form, photo: null });
                        setIsEditing(true);
                        setProfileStatus("");
                      }}
                      className="rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-soft)] px-5 py-3 text-sm font-bold text-white"
                    >
                      Edit Profile
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--text-soft)]"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-8">
              <div className="rounded-[28px] bg-white p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[var(--primary)]">Profile Details</h2>
                  {isEditing ? <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--tertiary)]">Editing</span> : null}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <input name="first_name" value={draftForm.first_name} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3" placeholder="First name" />
                      <input name="last_name" value={draftForm.last_name} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3" placeholder="Last name" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input name="email" value={draftForm.email} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3" placeholder="Email" />
                      <input name="mobile_number" value={draftForm.mobile_number} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3" placeholder="Mobile number" />
                    </div>
                    <textarea name="bio" value={draftForm.bio} onChange={handleChange} className="min-h-[140px] w-full rounded-xl bg-[var(--surface-low)] px-4 py-4" placeholder="Tell people about yourself" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <input name="skills" value={draftForm.skills} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3" placeholder="React, Django, Product Design" />
                      <input name="interests" value={draftForm.interests} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3" placeholder="AI, ClimateTech, Education" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <input name="availability" type="number" min="1" value={draftForm.availability} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3" />
                      <select name="experience_level" value={draftForm.experience_level} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3">
                        {experienceOptions.map((option) => (
                          <option key={option} value={option}>{capitalizeWord(option)}</option>
                        ))}
                      </select>
                      <select name="preferred_role" value={draftForm.preferred_role} onChange={handleChange} className="rounded-xl bg-[var(--surface-low)] px-4 py-3">
                        {roleOptions.map((option) => (
                          <option key={option} value={option}>{capitalizeWord(option)}</option>
                        ))}
                      </select>
                    </div>
                    <input name="github" value={draftForm.github} onChange={handleChange} className="w-full rounded-xl bg-[var(--surface-low)] px-4 py-3" placeholder="https://github.com/username" />
                    <div className="flex flex-wrap gap-3">
                      <button type="submit" className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">
                        Save
                      </button>
                      <button type="button" onClick={handleCancel} className="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--text-soft)]">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">About</p>
                      <p className="mt-2 text-sm leading-8 text-[var(--text-soft)]">{form.bio || "No bio added yet."}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Email</p>
                        <p className="mt-2 text-sm text-[var(--text-soft)]">{form.email || "Not added"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Mobile Number</p>
                        <p className="mt-2 text-sm text-[var(--text-soft)]">{form.mobile_number || "Not added"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">GitHub</p>
                      <p className="mt-2 text-sm text-[var(--text-soft)]">{form.github || "Not added"}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[28px] bg-white p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
                <h2 className="text-xl font-bold text-[var(--primary)]">Skills</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {savedSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-[var(--secondary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
                <h2 className="text-xl font-bold text-[var(--primary)]">Interests</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {savedInterests.map((interest) => (
                    <span key={interest} className="rounded-full bg-[var(--surface-low)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="rounded-[28px] bg-[var(--surface-low)] p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
                <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--text-soft)]">Availability</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-4xl font-extrabold text-[var(--primary)]">{form.availability}</span>
                  <span className="rounded bg-[var(--secondary-soft)] px-2 py-1 text-xs font-bold text-[var(--primary)]">hours/week</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-[var(--surface-high)]">
                  <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, (form.availability / 40) * 100)}%` }} />
                </div>
              </div>

              <div className="rounded-[28px] bg-[var(--primary)] p-8 text-white shadow-[0_20px_40px_rgba(69,98,45,0.18)]">
                <h3 className="text-2xl font-bold">Profile Snapshot</h3>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/70">Role</p>
                    <p className="mt-2 text-lg font-semibold">{capitalizeWord(form.preferred_role)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/70">Experience</p>
                    <p className="mt-2 text-lg font-semibold">{capitalizeWord(form.experience_level)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {profileStatus ? <p className="text-sm text-[var(--primary)]">{profileStatus}</p> : null}
        </>
      )}
    </div>
  );
}
