import { useEffect, useState } from "react";

import apiClient from "../api/client";
import FormInput from "../components/FormInput";
import SectionCard from "../components/SectionCard";
import TagList from "../components/TagList";

const initialForm = {
  bio: "",
  skills: "",
  interests: "",
  availability: 5,
  experience_level: "beginner",
  preferred_role: "fullstack",
  github: "",
};

const sampleProjects = [
  {
    title: "Aegis Neural Vault",
    category: "Security",
    description: "Decentralized encryption layer for multi-agent LLM systems and sensitive research workflows.",
    art: "bg-[radial-gradient(circle_at_20%_20%,#324b7f_0%,#12192b_30%,#0a0d15_100%)]",
  },
  {
    title: "Synesthesia.io",
    category: "AI Art",
    description: "Real-time code-to-visual art engine powered by generative pipelines and symbolic controls.",
    art: "bg-[radial-gradient(circle_at_50%_10%,#8d5cff_0%,#1e1137_28%,#090712_100%)]",
  },
  {
    title: "Core Route v4",
    category: "Infrastructure",
    description: "Optimized routing protocol for low-latency edge compute and resilient system orchestration.",
    art: "bg-[radial-gradient(circle_at_60%_25%,#d1d5db_0%,#5f6677_20%,#141820_58%,#0b0f15_100%)]",
  },
  {
    title: "Project Lens",
    category: "Data",
    description: "AI-driven sentiment analysis dashboard for large-scale project retrospectives and pattern tracking.",
    art: "bg-[radial-gradient(circle_at_75%_10%,#5f7fa9_0%,#18304d_28%,#0b1421_100%)]",
  },
];

export default function ProfilePage() {
  const [form, setForm] = useState(initialForm);
  const [savedSkills, setSavedSkills] = useState([]);
  const [savedInterests, setSavedInterests] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await apiClient.get("/profile/");
        const data = response.data;
        setForm({
          bio: data.bio || "",
          skills: (data.skills || []).join(", "),
          interests: (data.interests || []).join(", "),
          availability: data.availability || 5,
          experience_level: data.experience_level || "beginner",
          preferred_role: data.preferred_role || "fullstack",
          github: data.github || "",
        });
        setSavedSkills(data.skills || []);
        setSavedInterests(data.interests || []);
      } catch (err) {
        setStatus(err.response?.data?.detail || "Profile could not be loaded.");
      }
    }

    loadProfile();
  }, []);

  const displayName = "Elena Vance";
  const displayRole = "Lead Systems Architect & AI Ethicist";
  const availabilityWidth = `${Math.min(100, Math.max(12, (form.availability / 20) * 100))}%`;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "availability" ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");

    const payload = {
      ...form,
      skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean),
      interests: form.interests.split(",").map((item) => item.trim()).filter(Boolean),
    };

    try {
      const response = await apiClient.put("/profile/", payload);
      setSavedSkills(response.data.skills || []);
      setSavedInterests(response.data.interests || []);
      setStatus("Profile saved successfully.");
    } catch (err) {
      setStatus(err.response?.data?.detail || "Profile save failed.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-slate-200/80 bg-white/65 p-6 shadow-[0_18px_48px_rgba(132,122,173,0.08)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="grid h-36 w-36 place-items-center rounded-full border-[6px] border-white bg-[radial-gradient(circle_at_50%_20%,#f6d4ca_0%,#c8a090_18%,#3d3b50_48%,#1d2030_76%,#11131f_100%)] text-5xl shadow-[0_12px_30px_rgba(110,68,255,0.22)]">
              👩🏼
            </div>
            <div className="pt-2">
              <h2 className="text-5xl font-bold tracking-tight text-[#1f3ea7]">{displayName}</h2>
              <p className="mt-2 text-2xl text-slate-700">{displayRole}</p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-lg text-slate-500">
                <span>📍 Berlin, Germany</span>
                <span>🔗 {form.github || "github.com/vance-sys"}</span>
                <span>🕒 Open for Collab</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="rounded-2xl border border-[#cad3f2] bg-white px-8 py-4 text-xl font-semibold text-[#1f3ea7] shadow-sm transition hover:bg-[#f5f7ff]"
          >
            Edit Profile
          </button>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <SectionCard title="Professional Experience" description="A profile narrative shaped to feel like the creative systems dashboard in your reference.">
            <div className="space-y-6">
              <p className="max-w-4xl text-[1.08rem] leading-9 text-slate-700">
                {form.bio ||
                  'A decade spent bridging the gap between high-level architectural theory and practical machine learning implementation. Previously at Nexus Core where I pioneered the "Ethical-First" neural routing protocol. Currently focused on modular intelligent systems that adapt to human creative intent.'}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Preferred Role</span>
                <span className="rounded-full bg-[#e8ebfb] px-5 py-3 text-base font-semibold text-[#2444b6]">
                  {form.preferred_role.replace("-", " ")}
                </span>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-8 lg:grid-cols-2">
            <SectionCard title="Core Expertise">
              <TagList items={savedSkills.length ? savedSkills : ["Neural Architectures", "LLM Tuning", "System Design", "Rust", "Product Strategy"]} tone="accent" />
            </SectionCard>

            <SectionCard title="Creative Interests">
              <TagList items={savedInterests.length ? savedInterests : ["Generative Art", "Brutalist UI", "Cybernetics", "Sourdough"]} />
            </SectionCard>
          </div>

          <SectionCard
            title="Profile Editor"
            description="The layout is visual first, but editing still stays accessible directly on the page."
          >
            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormInput label="Bio" name="bio" value={form.bio} onChange={handleChange} placeholder="Short intro about your background." textarea />
              <FormInput label="Skills" name="skills" value={form.skills} onChange={handleChange} placeholder="React, Django, PostgreSQL" />
              <FormInput label="Interests" name="interests" value={form.interests} onChange={handleChange} placeholder="AI, EdTech, Open Source" />
              <div className="grid gap-4 md:grid-cols-3">
                <FormInput label="Availability" name="availability" type="number" min="1" value={form.availability} onChange={handleChange} />
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">Experience</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-[#faf9fd] px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#6e44ff]/40"
                    name="experience_level"
                    value={form.experience_level}
                    onChange={handleChange}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">Preferred Role</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-[#faf9fd] px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#6e44ff]/40"
                    name="preferred_role"
                    value={form.preferred_role}
                    onChange={handleChange}
                  >
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                    <option value="fullstack">Full Stack</option>
                    <option value="designer">Designer</option>
                    <option value="pm">Product Manager</option>
                    <option value="ai">AI Engineer</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
              <FormInput label="GitHub" name="github" value={form.github} onChange={handleChange} placeholder="https://github.com/username" />
              <button type="submit" className="rounded-2xl bg-[#2444b6] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(32,65,178,0.24)] transition hover:bg-[#1b389d]">
                Save Profile
              </button>
              {status ? <p className="text-sm text-slate-500">{status}</p> : null}
            </form>
          </SectionCard>
        </div>

        <div className="space-y-7">
          <div className="rounded-[28px] border border-[#d9ccff] bg-[linear-gradient(180deg,#f6f1ff_0%,#f2ecff_100%)] p-8">
            <h3 className="text-2xl font-semibold text-[#6e44ff]">Availability</h3>
            <p className="mt-6 text-slate-600">Weekly Capacity</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-4xl font-bold text-[#1d2140]">{form.availability} hrs</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-[#d8cbff]">
              <div className="h-2 rounded-full bg-[#6e44ff]" style={{ width: availabilityWidth }} />
            </div>
            <p className="mt-5 text-sm italic text-slate-500">Next window for deep collaboration starts this week.</p>
          </div>

          <div className="rounded-[28px] bg-[#2444b6] p-8 text-white shadow-[0_18px_42px_rgba(32,65,178,0.3)]">
            <h3 className="text-2xl font-semibold">GitHub Pulse</h3>
            <div className="mt-8 space-y-4">
              <div className="rounded-2xl bg-white/10 px-5 py-5">
                <p className="text-4xl font-bold">1.2k</p>
                <p className="mt-1 text-sm uppercase tracking-[0.18em] text-white/70">Commits this year</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-5">
                <p className="text-4xl font-bold">48</p>
                <p className="mt-1 text-sm uppercase tracking-[0.18em] text-white/70">Active repos</p>
              </div>
            </div>
            <button className="mt-7 w-full rounded-2xl border border-white/25 px-5 py-4 text-lg font-semibold transition hover:bg-white/10">
              View Public Profile
            </button>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="text-4xl font-bold tracking-tight text-[#1f3ea7]">Recent Initiatives</h3>
          <button className="text-lg font-medium text-[#6e44ff]">View Portfolio</button>
        </div>
        <div className="grid gap-6 xl:grid-cols-4 md:grid-cols-2">
          {sampleProjects.map((project) => (
            <article key={project.title} className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(132,122,173,0.08)]">
              <div className={`h-48 ${project.art} p-5 text-sm font-semibold uppercase tracking-[0.22em] text-white/80`}>
                {project.category}
              </div>
              <div className="p-6">
                <h4 className="text-3xl font-semibold tracking-tight text-[#1d2140]">{project.title}</h4>
                <p className="mt-3 text-base leading-7 text-slate-600">{project.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
