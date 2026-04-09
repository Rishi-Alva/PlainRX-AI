import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function formatApiError(detail) {
  if (detail == null) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join("; ");
  }
  if (typeof detail === "object" && detail.message) return String(detail.message);
  return JSON.stringify(detail);
}

function ScoreBlock({ label, scores }) {
  const g = scores?.flesch_kincaid_grade;
  const e = scores?.flesch_reading_ease;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-600">{label}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-800">
        <dt className="text-slate-500">Flesch–Kincaid grade</dt>
        <dd className="font-mono tabular-nums">{g != null ? g : "—"}</dd>
        <dt className="text-slate-500">Reading ease</dt>
        <dd className="font-mono tabular-nums">{e != null ? e : "—"}</dd>
      </dl>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [gradeLevel, setGradeLevel] = useState("8");
  const [language, setLanguage] = useState("en");
  const [output, setOutput] = useState("");
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRewrite() {
    setError("");
    setLoading(true);
    setOutput("");
    setBefore(null);
    setAfter(null);
    try {
      const res = await fetch(`${API_BASE}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          grade_level: gradeLevel,
          language,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = formatApiError(data.detail) || res.statusText || "Request failed";
        throw new Error(msg);
      }
      setOutput(data.rewritten_text || "");
      setBefore(data.scores_before);
      setAfter(data.scores_after);
    } catch (e) {
      const name = e?.name || "";
      const msg = e?.message || "Something went wrong";
      if (name === "TypeError" && /fetch|Load failed|NetworkError/i.test(msg)) {
        setError(
          `Could not reach the API at ${API_BASE}. Start the Groq backend (uvicorn in clearread/backend on port 8000), or set VITE_API_URL.`
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <p className="font-display text-3xl font-bold tracking-tight text-teal-900 sm:text-4xl">
          ClearRead AI
        </p>
        <p className="mt-1 text-sm font-medium text-slate-500">Plain language for public health · powered by Groq</p>
        <p className="mt-2 text-lg text-slate-600">
          Paste a document, pick a reading level, get a simpler version in English or Spanish—with before/after readability scores.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Document</span>
            <textarea
              className="min-h-[280px] w-full rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm outline-none ring-teal-500/30 focus:border-teal-500 focus:ring-2"
              placeholder="Paste your flyer, FAQ, or patient handout here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-4">
            <label className="block flex-1 min-w-[140px]">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Reading level</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                <option value="4">4th grade</option>
                <option value="6">6th grade</option>
                <option value="8">8th grade</option>
                <option value="10">10th grade</option>
              </select>
            </label>
            <label className="block flex-1 min-w-[140px]">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Language</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={handleRewrite}
            disabled={loading || !text.trim()}
            className="w-full rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Rewriting with Groq…" : "Rewrite"}
          </button>

          {(before || after) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {before && <ScoreBlock label="Before" scores={before} />}
              {after && <ScoreBlock label="After" scores={after} />}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">Plain language output</span>
            <button
              type="button"
              onClick={copyOutput}
              disabled={!output}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy
            </button>
          </div>
          <div className="min-h-[280px] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm whitespace-pre-wrap">
            {output || (
              <span className="text-slate-400">
                Your rewritten text will appear here. Scores use Flesch–Kincaid (approximate; best for English-like text).
              </span>
            )}
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-slate-500">
            Rewrites are generated by a Groq-hosted model. Have a qualified professional review clinical or legal content before publishing.
          </p>
        </section>
      </div>
    </div>
  );
}
