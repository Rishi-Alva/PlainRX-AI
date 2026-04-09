# PlainRX AI

Plain language rewriter for **public health** materials. Paste or upload text, choose a target U.S. reading level (4th through 10th grade) and English or Spanish output, and get a draft back with approximate **Flesch-Kincaid** scores before and after. Built on **Groq** (OpenAI-compatible chat API) and a small **FastAPI** backend.

**Important:** Outputs are **drafts only**. Always have qualified staff review clinical, legal, or public-facing content before use.

## Who it is for

- Local health department communications
- Community health workers
- Public health students and researchers
- Small clinics without dedicated health literacy staff

## Features

- **Paste** or **upload** `.txt`, `.md`, `.docx`, or text-based `.pdf` (scanned PDFs are not supported)
- Reading level targets: **4, 6, 8, 10** (approximate grade)
- **English** and **Spanish** output
- **Download** rewritten text as `.txt`, `.docx`, or `.pdf` (or preview on screen only when pasting)
- Readability metrics: **Flesch-Kincaid grade** and **reading ease** (heuristic-based; best for English-like text)

## Tech stack

| Layer    | Stack |
| -------- | ----- |
| Frontend | React 18, Vite 6, Tailwind CSS |
| Backend  | FastAPI, httpx, python-dotenv |
| LLM      | Groq (`GROQ_API_KEY`, OpenAI-compatible `/v1/chat/completions`) |
| Files    | `pypdf`, `python-docx`, `fpdf2` |
| Metrics  | Local Flesch-Kincaid helpers in `backend/readability.py` (no `textstat`) |

## Repository layout

```
clearread/
├── backend/           # FastAPI app
│   ├── main.py        # Routes: /health, /rewrite, /rewrite-file
│   ├── documents.py   # Extract text from uploads; build txt/docx/pdf
│   ├── readability.py # Flesch-Kincaid estimates
│   ├── requirements.txt
│   └── .env.example
├── frontend/          # Vite + React UI
│   ├── src/App.jsx
│   └── ...
└── README.md
```

## Prerequisites

- **Python** 3.10+ recommended
- **Node.js** 18+ (for the frontend)
- A **Groq API key** from [console.groq.com/keys](https://console.groq.com/keys)

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit **`backend/.env`** and set:

```env
GROQ_API_KEY=your_key_here
```

Optional: `GROQ_MODEL`, `GROQ_BASE_URL`, `CORS_ORIGINS` (comma-separated, for production).

Run the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Check [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health).

## Frontend setup

```bash
cd frontend
npm install
```

For a local API on port 8000, the default is already `http://127.0.0.1:8000`. To override, create **`frontend/.env`**:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Run the dev server:

```bash
npm run dev
```

Open the URL Vite prints (usually [http://127.0.0.1:5173](http://127.0.0.1:5173)).

Production build:

```bash
npm run build
```

Static files land in **`frontend/dist/`** (serve behind any static host; set `VITE_API_URL` at build time for your deployed API).

## API overview

### `POST /rewrite`

JSON body:

- `text` (string, required, max 50k chars)
- `grade_level`: `"4"` | `"6"` | `"8"` | `"10"`
- `language`: `"en"` | `"es"`
- `output_format` (optional): `"txt"` | `"docx"` | `"pdf"`; if set, response includes a base64 `download` payload

Response: `rewritten_text`, `scores_before`, `scores_after`, optional `download` (`filename`, `media_type`, `content_base64`).

### `POST /rewrite-file`

`multipart/form-data`:

- `file`: upload
- `grade_level`, `language`, `output_format` (same values as above; `output_format` required)

Same JSON shape as `/rewrite`; `download` is always populated for the chosen format.

### `GET /health`

Returns `{"status":"ok","llm":"groq"}` when the app is up.

## Security and privacy

- **Never commit `backend/.env`** or real API keys. The repo is set up to ignore `.env` under `backend/` and `frontend/`.
- Uploaded text is sent to **your** backend and then to **Groq** per your configuration. Run your own instance if you need organizational control.
- This project is **not** HIPAA-ready by default; do not paste PHI unless your environment and agreements allow it.

## Deploying (high level)

1. Deploy the **backend** (e.g. Render, Railway, Fly.io) with env vars: `GROQ_API_KEY`, and `CORS_ORIGINS` set to your real frontend origin(s).
2. Build the **frontend** with `VITE_API_URL` pointing at that API.
3. Host **`frontend/dist`** (e.g. Vercel, Netlify, GitHub Pages with the correct `base` if needed).

---

**PlainRX AI** is a drafting aid, not medical advice. Use responsibly.
