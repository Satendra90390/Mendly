"""
Live medicine data via the openFDA Drug Label API (https://api.fda.gov/drug/label.json).
No API key required. Public, free, rate-limited to 240 req/min / 120,000 req/day.

We normalize the messy openFDA label fields into a consistent shape the frontend
already expects (name, brand, category, uses, side_effects, dosage, etc.), and
cache results in-memory for a while since the same medicine is looked up often
and openFDA labels don't change minute to minute.
"""
import time
import re
import httpx
from typing import Optional

OPENFDA_BASE = "https://api.fda.gov/drug/label.json"

# Simple in-memory TTL cache: { cache_key: (timestamp, data) }
_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL_SECONDS = 60 * 60 * 6  # 6 hours — label data is essentially static


def _cache_get(key: str) -> Optional[dict]:
    entry = _cache.get(key)
    if not entry:
        return None
    ts, data = entry
    if time.time() - ts > CACHE_TTL_SECONDS:
        _cache.pop(key, None)
        return None
    return data


def _cache_set(key: str, data: dict) -> None:
    _cache[key] = (time.time(), data)


def _first(field) -> str:
    """openFDA fields are usually arrays of strings; take the first sensibly."""
    if isinstance(field, list) and field:
        return str(field[0]).strip()
    if isinstance(field, str):
        return field.strip()
    return ""


def _clean_text(text: str, max_len: int = 1200) -> str:
    if not text:
        return ""
    # Strip common SPL boilerplate headers like "1 INDICATIONS AND USAGE" —
    # whether followed directly by a capitalized word or by a newline/space,
    # without eating the first letter of real content that runs on with no
    # separator (e.g. "...USAGEAdvil is...").
    text = re.sub(r"^\s*\d+(\.\d+)*\s+[A-Z][A-Z &/]{3,}(?=[A-Z][a-z])", "", text)
    text = re.sub(r"^\s*\d+(\.\d+)*\s+[A-Z][A-Z &/]{3,}[\s\n]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_len:
        text = text[:max_len].rsplit(" ", 1)[0] + "…"
    return text


def _split_list(text: str, limit: int = 6) -> list[str]:
    """Best-effort split of a label paragraph into bullet-style items."""
    if not text:
        return []
    # Try splitting on sentence boundaries or semicolons first
    parts = re.split(r"(?<=[.;])\s+(?=[A-Z])", text)
    parts = [p.strip().rstrip(".;") for p in parts if p.strip()]
    cleaned = [p for p in parts if 3 < len(p) < 200]
    return cleaned[:limit] if cleaned else ([text[:200]] if text else [])


def normalize_label(result: dict) -> dict:
    """Convert a raw openFDA label result into MediGuide's medicine shape."""
    openfda = result.get("openfda", {}) or {}

    brand_names = openfda.get("brand_name", [])
    generic_names = openfda.get("generic_name", [])
    manufacturer = openfda.get("manufacturer_name", [])
    pharm_class = openfda.get("pharm_class_epc", []) or openfda.get("pharm_class_cs", [])

    name = _first(generic_names) or _first(brand_names) or "Unknown"
    brand = ", ".join(brand_names[:5]) if brand_names else (generic_names[0] if generic_names else "Generic")

    uses_text = _clean_text(_first(result.get("indications_and_usage")))
    dosage_text = _clean_text(_first(result.get("dosage_and_administration")))
    warnings_text = _clean_text(_first(result.get("warnings")) or _first(result.get("warnings_and_cautions")))
    adverse_text = _clean_text(_first(result.get("adverse_reactions")))
    interactions_text = _clean_text(_first(result.get("drug_interactions")))
    pregnancy_text = _clean_text(_first(result.get("pregnancy")))
    contraindications_text = _clean_text(_first(result.get("contraindications")))
    storage_text = _clean_text(_first(result.get("storage_and_handling")))

    return {
        "id": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "medicine",
        "name": name.title() if name.isupper() else name,
        "brand": brand,
        "manufacturer": _first(manufacturer),
        "category": ", ".join(pharm_class[:2]) if pharm_class else "See label",
        "uses": _split_list(uses_text) or ["See full label for indications"],
        "symptoms_treated": _split_list(uses_text, limit=5),
        "dosage": {
            "adult": dosage_text or "Refer to package label / consult a pharmacist",
            "child": "Consult a pediatrician — pediatric dosing varies by product",
            "elderly": "Consult a doctor — dose adjustment may be needed",
        },
        "how_to_use": dosage_text[:300] if dosage_text else "Follow label instructions or pharmacist guidance.",
        "side_effects": {
            "common": _split_list(adverse_text, limit=5) or ["See full prescribing information"],
            "serious": _split_list(warnings_text, limit=4),
        },
        "precautions": _split_list(contraindications_text, limit=4) or _split_list(warnings_text, limit=3),
        "interactions": _split_list(interactions_text, limit=4) or ["No specific interactions listed in label"],
        "pregnancy": pregnancy_text or "Consult your doctor before use during pregnancy.",
        "breastfeeding": "Consult your doctor before use while breastfeeding.",
        "storage": storage_text,
        "source": "Verified medical database",
    }


async def _fda_search(search_expr: str, limit: int) -> list[dict]:
    """Execute a raw openFDA search and return normalized, deduped results."""
    params = {"search": search_expr, "limit": str(limit)}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(OPENFDA_BASE, params=params)
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError):
        return []

    raw = data.get("results", [])
    normalized = [normalize_label(r) for r in raw]
    seen = set()
    deduped = []
    for med in normalized:
        key = med["name"].lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(med)
    return deduped


def _build_exact_expr(query: str) -> str:
    return (
        f'(openfda.brand_name:"{query}"^2 OR openfda.generic_name:"{query}"^2 '
        f'OR openfda.substance_name:"{query}")'
    )


def _build_wildcard_expr(query: str) -> str:
    return (
        f'(openfda.brand_name:"{query}" OR openfda.generic_name:"{query}" '
        f'OR openfda.substance_name:"{query}" '
        f'OR openfda.brand_name:{query}* OR openfda.generic_name:{query}*)'
    )


async def search_medicines_live(query: str, limit: int = 10) -> list[dict]:
    """
    Search openFDA for medicines whose brand or generic name matches the query.
    Tries exact match first, then wildcard, then individual words.
    Falls back gracefully (returns []) on network errors so the caller can
    blend in local data instead of hard-failing.
    """
    query = query.strip()
    if not query:
        return []

    cache_key = f"search:{query.lower()}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached.get("results", [])

    # Strategy 1: exact match (best results, fastest)
    results = await _fda_search(_build_exact_expr(query), limit)
    if results:
        _cache_set(cache_key, {"results": results})
        return results

    # Strategy 2: try wildcard (matches partial names)
    results = await _fda_search(_build_wildcard_expr(query), limit)
    if results:
        _cache_set(cache_key, {"results": results})
        return results

    # Strategy 3: try each word separately and merge
    words = [w.strip() for w in query.replace(",", " ").split() if len(w.strip()) > 1]
    if len(words) > 1:
        seen_names = set()
        merged = []
        for word in words:
            word_results = await _fda_search(_build_wildcard_expr(word), limit)
            for med in word_results:
                key = med["name"].lower()
                if key not in seen_names:
                    seen_names.add(key)
                    merged.append(med)
        if merged:
            merged = merged[:limit]
            _cache_set(cache_key, {"results": merged})
            return merged

    _cache_set(cache_key, {"results": []})
    return []


async def get_medicine_detail_live(name: str) -> Optional[dict]:
    results = await search_medicines_live(name, limit=3)
    if not results:
        return None
    # Prefer an exact (case-insensitive) name match if present.
    for med in results:
        if med["name"].lower() == name.lower():
            return med
    return results[0]
