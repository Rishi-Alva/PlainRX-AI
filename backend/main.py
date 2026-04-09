"""
ClearRead AI API — public-health plain language rewriter powered by Groq (OpenAI-compatible chat).
"""

from __future__ import annotations

import os
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from readability import flesch_kincaid_grade, flesch_reading_ease

load_dotenv()

app = FastAPI(
    title="ClearRead AI API",
    description="Groq LLM + Flesch–Kincaid readability",
    version="0.2.0",
)

_default_origins = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:5174,http://127.0.0.1:5174,"
    "http://localhost:4173,http://127.0.0.1:4173"
)
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GradeLevel = Literal["4", "6", "8", "10"]
Language = Literal["en", "es"]


class RewriteRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50_000)
    grade_level: GradeLevel
    language: Language = "en"


class ReadabilityScores(BaseModel):
    flesch_kincaid_grade: float | None
    flesch_reading_ease: float | None


class RewriteResponse(BaseModel):
    rewritten_text: str
    scores_before: ReadabilityScores
    scores_after: ReadabilityScores


def _scores_for(text: str) -> ReadabilityScores:
    t = text.strip()
    if not t:
        return ReadabilityScores(flesch_kincaid_grade=None, flesch_reading_ease=None)
    try:
        return ReadabilityScores(
            flesch_kincaid_grade=round(flesch_kincaid_grade(t), 2),
            flesch_reading_ease=round(flesch_reading_ease(t), 2),
        )
    except Exception:
        return ReadabilityScores(flesch_kincaid_grade=None, flesch_reading_ease=None)


def _system_prompt(grade_level: str, language: Language) -> str:
    lang = "English" if language == "en" else "Spanish"
    return f"""You are a public health communications specialist. Rewrite the user's document in {lang}.

Requirements:
- Target approximate U.S. school reading grade: {grade_level}th grade.
- Use plain language: short sentences, common words, active voice where natural.
- Preserve all medically important facts, numbers, dosing, and warnings. Do not add new medical claims.
- If the source is not medical, still keep facts accurate and do not invent details.
- Output ONLY the rewritten document text, with no preamble or explanation."""


async def _groq_rewrite(text: str, grade_level: str, language: Language) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not set. Add it to backend/.env (see .env.example).",
        )

    base = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
    url = f"{base}/chat/completions"
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    system = _system_prompt(grade_level, language)

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": text},
                ],
                "temperature": 0.3,
            },
        )

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq error: {r.text[:500]}")

    data = r.json()
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Unexpected Groq response shape.")


@app.get("/health")
async def health():
    return {"status": "ok", "llm": "groq"}


@app.post("/rewrite", response_model=RewriteResponse)
async def rewrite(body: RewriteRequest):
    before = _scores_for(body.text)
    rewritten = await _groq_rewrite(body.text, body.grade_level, body.language)
    after = _scores_for(rewritten)
    return RewriteResponse(
        rewritten_text=rewritten,
        scores_before=before,
        scores_after=after,
    )
