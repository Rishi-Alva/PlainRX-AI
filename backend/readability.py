"""
Flesch–Kincaid metrics without third-party deps (avoids textstat → pkg_resources).

Formulas match the usual U.S. definitions; syllables use a heuristic, so values are
approximate—fine for before/after comparison on English-like text.
"""

from __future__ import annotations

import re

_WORD = re.compile(r"[a-zA-Z']+")
_SENT_END = re.compile(r"[.!?]+(?:\s+|$)")


def _words(text: str) -> list[str]:
    return _WORD.findall(text)


def _sentence_count(text: str) -> int:
    t = text.strip()
    if not t:
        return 1
    n = len(_SENT_END.findall(t))
    if n > 0:
        return max(1, n)
    return 1


def _syllable_count(word: str) -> int:
    w = re.sub(r"[^a-zA-Z]", "", word.lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^aeiouy]es|ed|[^aeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    groups = re.findall(r"[aeiouy]+", w)
    return max(1, len(groups))


def flesch_kincaid_grade(text: str) -> float:
    words = _words(text)
    if not words:
        return 0.0
    sentences = _sentence_count(text)
    syllables = sum(_syllable_count(w) for w in words)
    wn, sn = len(words), max(sentences, 1)
    return 0.39 * (wn / sn) + 11.8 * (syllables / wn) - 15.59


def flesch_reading_ease(text: str) -> float:
    words = _words(text)
    if not words:
        return 0.0
    sentences = _sentence_count(text)
    syllables = sum(_syllable_count(w) for w in words)
    wn, sn = len(words), max(sentences, 1)
    return 206.835 - 1.015 * (wn / sn) - 84.6 * (syllables / wn)
