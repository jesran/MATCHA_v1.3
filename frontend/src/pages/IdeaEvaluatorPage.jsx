import { useState } from "react";

import apiClient from "../api/client";
import FormInput from "../components/FormInput";
import SectionCard from "../components/SectionCard";
import TagList from "../components/TagList";

const initialForm = {
  title: "",
  domain: "",
  idea: "",
  hours: 10,
  team_size: 2,
};

export default function IdeaEvaluatorPage() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    // Number fields are stored as numbers so the backend evaluator receives
    // the same shape it validates.
    setForm((current) => ({
      ...current,
      [name]: name === "hours" || name === "team_size" ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // Submitting an idea creates both the project and the saved evaluation result.
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/ideas/submit/", form);
      setResult(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session expired. Please sign in again from the Profile page.");
      } else {
        setError(err.response?.data?.detail || "Idea submission failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Idea Evaluator" description="Submit a project concept and get a structured feasibility assessment.">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput label="Project Title" name="title" value={form.title} onChange={handleChange} placeholder="Campus collaboration portal" />
          <FormInput label="Domain" name="domain" value={form.domain} onChange={handleChange} placeholder="EdTech" />
          <FormInput
            label="Idea Description"
            name="idea"
            value={form.idea}
            onChange={handleChange}
            placeholder="Describe the problem, users, and the MVP you want to build."
            textarea
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Hours / Week" name="hours" type="number" min="1" value={form.hours} onChange={handleChange} />
            <FormInput label="Team Size" name="team_size" type="number" min="1" value={form.team_size} onChange={handleChange} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-soft)]"
            disabled={loading}
          >
            {loading ? "Evaluating..." : "Evaluate Idea"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </SectionCard>

      <SectionCard title="Result" description="Saved into My Projects with the generated project.">
        {!result ? <p className="text-sm text-[var(--text-muted)]">Submit an idea to see the evaluation response.</p> : null}
        {result ? (
          <div className="space-y-5">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-low)] p-5 shadow-[0_14px_30px_rgba(69,98,45,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--primary)]">Feasibility</p>
              <p className="mt-3 text-4xl font-bold capitalize text-[var(--primary)]">{result.evaluation.feasibility}</p>
              <p className="mt-3 text-base text-[var(--text-soft)]">Estimated Hours: {result.evaluation.estimated_hours}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--text-soft)]">Required Skills</p>
              <TagList items={result.evaluation.required_skills} tone="accent" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--text-soft)]">Recommended Features</p>
              <TagList items={result.evaluation.features} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--text-soft)]">Challenges</p>
              <TagList items={result.evaluation.challenges} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--text-soft)]">Basic Execution Phases</p>
              <div className="space-y-3">
                {(result.evaluation.execution_phases || []).map((phase) => (
                  <div key={phase.name} className="rounded-[20px] border border-[var(--line)] bg-white p-4">
                    <p className="text-sm font-bold text-[var(--primary)]">{phase.name}</p>
                    <ul className="mt-2 space-y-1 text-sm text-[var(--text-soft)]">
                      {(phase.steps || []).map((step) => (
                        <li key={step}>- {step}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--tertiary-soft)] bg-[var(--surface-low)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--tertiary)]">Brutal Feedback</p>
              <p className="mt-3 text-base leading-8 text-[var(--text-soft)]">{result.evaluation.brutal_feedback}</p>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
