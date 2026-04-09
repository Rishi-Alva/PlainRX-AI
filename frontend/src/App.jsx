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

function triggerDownloadFromBase64({ filename, content_base64: b64 }) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function SectionTitle({ children, hint }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          className="h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-rx-700 via-rx-800 to-slate-400"
          aria-hidden
        />
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-600">{children}</h2>
      </div>
      {hint ? <p className="mt-2 pl-4 text-sm leading-relaxed text-slate-600">{hint}</p> : null}
    </div>
  );
}

function ScoreBlock({ label, scores }) {
  const g = scores?.flesch_kincaid_grade;
  const e = scores?.flesch_reading_ease;
  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-rx-50/40 px-4 py-3 text-sm shadow-sm ring-1 ring-slate-100/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rx-800/90">{label}</p>
      <dl className="mt-2 space-y-1.5 text-slate-800">
        <div className="flex justify-between gap-4 border-b border-slate-100/80 pb-1.5">
          <dt className="text-slate-600">Flesch-Kincaid grade</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-slate-900">
            {g != null ? g : "N/A"}
          </dd>
        </div>
        <div className="flex justify-between gap-4 pt-0.5">
          <dt className="text-slate-600">Reading ease</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-slate-900">
            {e != null ? e : "N/A"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-rx-700/40 focus:bg-white focus:ring-2 focus:ring-rx-700/15";

const panelClass =
  "rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-card backdrop-blur-sm transition-shadow duration-300 hover:shadow-card-hover sm:p-6";

export default function App() {
  const [inputMode, setInputMode] = useState("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [gradeLevel, setGradeLevel] = useState("8");
  const [language, setLanguage] = useState("en");
  const [outputFormat, setOutputFormat] = useState("txt");
  const [output, setOutput] = useState("");
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [downloadPayload, setDownloadPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setError("");
    setLoading(true);
    setOutput("");
    setBefore(null);
    setAfter(null);
    setDownloadPayload(null);
    setCopied(false);
    try {
      if (inputMode === "upload") {
        if (!file) {
          setError("Choose a file to upload.");
          setLoading(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("grade_level", gradeLevel);
        fd.append("language", language);
        fd.append("output_format", outputFormat);
        const res = await fetch(`${API_BASE}/rewrite-file`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = formatApiError(data.detail) || res.statusText || "Request failed";
          throw new Error(msg);
        }
        setOutput(data.rewritten_text || "");
        setBefore(data.scores_before);
        setAfter(data.scores_after);
        if (data.download) setDownloadPayload(data.download);
      } else {
        if (!text.trim()) {
          setError("Paste some text or switch to file upload.");
          setLoading(false);
          return;
        }
        const body = {
          text,
          grade_level: gradeLevel,
          language,
        };
        if (outputFormat) body.output_format = outputFormat;
        const res = await fetch(`${API_BASE}/rewrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = formatApiError(data.detail) || res.statusText || "Request failed";
          throw new Error(msg);
        }
        setOutput(data.rewritten_text || "");
        setBefore(data.scores_before);
        setAfter(data.scores_after);
        if (data.download) setDownloadPayload(data.download);
      }
    } catch (e) {
      const name = e?.name || "";
      const msg = e?.message || "Something went wrong";
      if (name === "TypeError" && /fetch|Load failed|NetworkError/i.test(msg)) {
        setError(
          `Unable to reach the service at ${API_BASE}. Confirm the API is running (see project documentation) or update VITE_API_URL if deployed.`
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadFile() {
    if (!downloadPayload) return;
    try {
      triggerDownloadFromBase64(downloadPayload);
    } catch {
      setError("Download failed. Try again or copy the text instead.");
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard access was blocked. Copy the text manually.");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="h-1 bg-gradient-to-r from-transparent via-rx-700/70 to-transparent" aria-hidden />

      <header className="border-b border-slate-200/60 bg-gradient-to-b from-white/95 to-slate-50/40 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:px-8">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem] sm:leading-tight">
                PlainRX{" "}
                <span className="bg-gradient-to-r from-rx-800 to-slate-800 bg-clip-text text-transparent">AI</span>
              </h1>
              <span className="rounded-full border border-rx-200/80 bg-rx-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-rx-900/90 shadow-sm">
                Draft writing aid
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Rewrite public health text to a target reading level in English or Spanish. Paste text or upload a
              .txt, .docx, or text-based .pdf, then download the draft as plain text, Word, or PDF. Readability
              scores are approximate. This is not a substitute for professional health communication review.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-rx-50/30 px-5 py-4 text-xs leading-relaxed text-slate-600 shadow-glow lg:max-w-[20rem]">
            <p className="flex items-center gap-2 font-semibold text-rx-900">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rx-700" aria-hidden />
              How your text is used
            </p>
            <ul className="mt-3 space-y-2 border-t border-slate-200/60 pt-3">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rx-600/50" aria-hidden />
                <span>Sent only to your configured API for rewriting.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rx-600/50" aria-hidden />
                <span>Not sold or used to train this application.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rx-600/50" aria-hidden />
                <span>Review all drafts before clinical, legal, or public use.</span>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <section className={panelClass}>
            <SectionTitle
              children="Source document"
              hint="Avoid unnecessary personal health identifiers. Scanned PDFs (images only) are not supported; use OCR elsewhere first if needed."
            />

            <fieldset className="mt-6">
              <legend className="sr-only">Input source</legend>
              <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-100/60 p-1 shadow-inner">
                <label
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    inputMode === "paste"
                      ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="inputMode"
                    value="paste"
                    className="sr-only"
                    checked={inputMode === "paste"}
                    onChange={() => setInputMode("paste")}
                  />
                  Paste text
                </label>
                <label
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    inputMode === "upload"
                      ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="inputMode"
                    value="upload"
                    className="sr-only"
                    checked={inputMode === "upload"}
                    onChange={() => setInputMode("upload")}
                  />
                  Upload file
                </label>
              </div>
            </fieldset>

            {inputMode === "paste" ? (
              <label className="mt-5 block">
                <span className="sr-only">Document text</span>
                <textarea
                  className={`${inputClass} mt-0 min-h-[220px] resize-y font-normal leading-relaxed`}
                  placeholder="Paste your text here…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  spellCheck
                />
              </label>
            ) : (
              <div className="mt-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">File (.txt, .md, .docx, .pdf)</span>
                  <input
                    type="file"
                    accept=".txt,.text,.md,.markdown,.docx,.pdf,application/pdf,text/plain"
                    className={`${inputClass} cursor-pointer py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-rx-100/80 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-rx-900`}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {file && (
                  <p className="mt-2 text-xs text-slate-500">
                    Selected: <span className="font-semibold text-rx-900">{file.name}</span>
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Target reading level</span>
                <select className={inputClass} value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
                  <option value="4">About 4th grade</option>
                  <option value="6">About 6th grade</option>
                  <option value="8">About 8th grade</option>
                  <option value="10">About 10th grade</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Output language</span>
                <select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="es">Español (Spanish)</option>
                </select>
              </label>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Download format</span>
              <select
                className={inputClass}
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
              >
                <option value="">Preview only (no file download)</option>
                <option value="txt">Plain text (.txt)</option>
                <option value="docx">Word (.docx)</option>
                <option value="pdf">PDF (.pdf)</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                Upload mode always produces a file. Paste mode can skip the file if you only need on-screen preview.
              </p>
            </label>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                loading ||
                (inputMode === "paste" && !text.trim()) ||
                (inputMode === "upload" && !file) ||
                (inputMode === "upload" && !outputFormat)
              }
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-rx-900 via-slate-800 to-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:from-slate-900 hover:via-slate-900 hover:to-black hover:shadow-xl disabled:cursor-not-allowed disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-400 disabled:shadow-none"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Generating plain language draft…
                </span>
              ) : (
                "Generate plain language draft"
              )}
            </button>

            {(before || after) && (
              <div className="mt-8 space-y-4 border-t border-slate-200/70 pt-6">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Readability (approximate)
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {before && <ScoreBlock label="Original" scores={before} />}
                  {after && <ScoreBlock label="Draft" scores={after} />}
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Flesch-Kincaid scores are estimates and are most meaningful for English-like text. They support
                  comparison, not compliance testing.
                </p>
              </div>
            )}
          </section>

          <section className={panelClass}>
            <SectionTitle
              children="Plain language draft"
              hint="Edit locally after copying if your program requires it."
            />

            <div className="mt-5 flex flex-wrap gap-2">
              {downloadPayload && (
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="rounded-xl border border-rx-800 bg-gradient-to-r from-rx-800 to-rx-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-rx-900 hover:to-slate-900"
                >
                  Download file
                </button>
              )}
              <button
                type="button"
                onClick={copyOutput}
                disabled={!output}
                className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? "Copied" : "Copy to clipboard"}
              </button>
            </div>

            {downloadPayload && (
              <p className="mt-3 text-xs text-slate-500">
                Ready: <span className="font-mono font-medium text-rx-900">{downloadPayload.filename}</span>
              </p>
            )}

            <div
              className={`mt-4 min-h-[260px] rounded-xl border p-5 text-sm leading-relaxed whitespace-pre-wrap ring-1 transition-colors ${
                output
                  ? "border-rx-200/60 bg-white/90 text-slate-900 ring-rx-700/10"
                  : "dot-grid border-dashed border-slate-300/80 bg-slate-50/40 text-slate-500 ring-slate-200/50"
              }`}
            >
              {output || (
                <span>
                  Your draft will appear here after you run the generator. Always compare against the source for
                  accuracy, especially numbers, dosing, and warnings.
                </span>
              )}
            </div>

            {error && (
              <div
                className="mt-4 rounded-xl border border-red-200/80 bg-gradient-to-br from-red-50 to-white px-4 py-3 text-sm text-red-900 shadow-sm ring-1 ring-red-100"
                role="alert"
              >
                <p className="font-semibold">Something went wrong</p>
                <p className="mt-1 text-red-800/90">{error}</p>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 ring-1 ring-slate-100/80">
              <p className="text-xs leading-relaxed text-slate-600">
                <strong className="font-semibold text-slate-800">Limitations.</strong> Language models can omit or
                misstate information. This tool produces drafts only. PlainRX AI is not medical advice, diagnosis,
                or treatment. Governance and sign-off remain your organization’s responsibility.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative mx-auto max-w-6xl border-t border-slate-200/60 px-4 py-10 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rx-700/25 to-transparent"
          aria-hidden
        />
        <p className="text-slate-600">
          PlainRX AI · Plain language support for public health teams · Inference via Groq (Llama-family models when
          configured)
        </p>
        <p className="mt-2 max-w-lg mx-auto leading-relaxed">
          If you deploy your own instance, host the API securely and never commit API keys to version control.
        </p>
        <a
          href="https://rishialva.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-block font-syne text-[11px] font-semibold tracking-[0.22em] text-slate-400 no-underline transition-all duration-200 hover:bg-gradient-to-r hover:from-rx-600 hover:via-rx-800 hover:to-slate-800 hover:bg-clip-text hover:text-transparent sm:text-xs sm:tracking-[0.26em]"
        >
          RISHI ALVA
        </a>
      </footer>
    </div>
  );
}
