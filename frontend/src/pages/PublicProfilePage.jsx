import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import apiClient from "../api/client";
import { capitalizeWord, displayName } from "../utils/format";

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get(`/profiles/${userId}/`);
        if (active) {
          setProfile(response.data);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.detail || "Could not load this profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading profile...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const fullName = displayName(profile);

  return (
    <div className="space-y-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm font-bold text-[var(--tertiary)]">
        Back
      </button>

      <section className="rounded-[32px] bg-[var(--surface-low)] p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
        <div className="flex flex-col gap-8 md:flex-row md:items-end">
          <div className="grid h-36 w-36 place-items-center overflow-hidden rounded-full border-4 border-white bg-[var(--surface)] text-4xl font-bold text-[var(--primary)]">
            {profile.photo ? <img src={profile.photo} alt={fullName} className="h-full w-full object-cover" /> : fullName.slice(0, 1)}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold text-[var(--text)]">{fullName}</h1>
            <p className="mt-2 text-[15px] font-medium text-[var(--text-soft)]">
              {capitalizeWord(profile.preferred_role)} • {capitalizeWord(profile.experience_level)} • {profile.availability} hours/week
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.github ? (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"
                >
                  Open GitHub
                </a>
              ) : null}
              {profile.email ? (
                <span className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[var(--text-soft)]">{profile.email}</span>
              ) : (
                <span className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[var(--text-soft)]">Email hidden until connection is accepted</span>
              )}
              {profile.mobile_number ? (
                <span className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[var(--text-soft)]">{profile.mobile_number}</span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[28px] bg-white p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
          <h2 className="text-2xl font-bold text-[var(--primary)]">About</h2>
          <p className="mt-4 text-sm leading-8 text-[var(--text-soft)]">{profile.bio || "No bio added yet."}</p>
        </div>

        <div className="space-y-8">
          <div className="rounded-[28px] bg-white p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
            <h2 className="text-xl font-bold text-[var(--primary)]">Skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile.skills || []).map((skill) => (
                <span key={skill} className="rounded-full bg-[var(--secondary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-8 shadow-[0_20px_40px_rgba(69,98,45,0.06)]">
            <h2 className="text-xl font-bold text-[var(--primary)]">Interests</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile.interests || []).map((interest) => (
                <span key={interest} className="rounded-full bg-[var(--surface-low)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
