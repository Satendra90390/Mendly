"""
MediGuide Chatbot Engine — Powered by NVIDIA NIM / Google Gemini
================================================================
Priority order:
  0. Crisis language → emergency response (no AI delay)
  1. Enrich context with local KB + OpenFDA live data
  2. Pass enriched prompt to the active AI provider (NVIDIA or Gemini)
  3. Smart pattern-matching fallback when AI is unavailable
"""
from __future__ import annotations

import asyncio
import os
import re
from typing import Optional, List

import httpx

from .knowledge_base import DISEASE_KNOWLEDGE, SYMPTOM_TO_DISEASE, LOCAL_MEDICINES
from . import openfda_client

# ── AI provider setup ───────────────────────────────────────────────────────
CHATBOT_PROVIDER = os.getenv("CHATBOT_PROVIDER", "nvidia").strip().lower()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_API_URL = os.getenv("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "deepseek-ai/deepseek-v4-flash")
NVIDIA_MAX_RETRIES = int(os.getenv("NVIDIA_MAX_RETRIES", "2"))
NVIDIA_TIMEOUT = float(os.getenv("NVIDIA_TIMEOUT", "45"))

_gemini_model = None

def _is_placeholder_key(key: str) -> bool:
    k = key.strip().lower()
    return not k or "your_" in k or "gemini_api_key" in k or "nvidia_api_key" in k or k == "placeholder"


def _nvidia_is_configured() -> bool:
    return bool(
        NVIDIA_API_KEY
        and not _is_placeholder_key(NVIDIA_API_KEY)
        and NVIDIA_API_URL
    )


def _get_active_provider() -> Optional[str]:
    if CHATBOT_PROVIDER == "nvidia" and _nvidia_is_configured():
        return "nvidia"
    if CHATBOT_PROVIDER == "gemini" and _get_gemini() is not None:
        return "gemini"
    return None


def is_gemini_active() -> bool:
    return CHATBOT_PROVIDER == "gemini" and _get_gemini() is not None


def get_ai_provider() -> str:
    provider = _get_active_provider()
    return provider if provider else "local"


def _get_gemini():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    if not GEMINI_API_KEY or _is_placeholder_key(GEMINI_API_KEY):
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=_SYSTEM_PROMPT,
        )
        return _gemini_model
    except Exception as exc:
        print(f"[Mendly] Gemini init failed: {exc}")
        return None

_SYSTEM_PROMPT = """You are Elix, an expert medical information assistant built into the Mendly health platform. Your role is to provide accurate, helpful, and empathetic health guidance.

CORE RULES (never break these):
1. You ONLY answer health, medicine, wellness, fitness, nutrition, and medical questions.
2. If the user asks about anything non-medical, politely redirect to health topics.
3. Always end with a brief note reminding users to consult a healthcare professional.
4. Never provide a specific diagnosis or tell a user they definitely have a condition.
5. For crisis/suicidal messages — immediately provide emergency helplines (India: 9152987821, USA: 988, UK: 116 123).
6. When CONTEXT data is provided below, use it to give precise, accurate answers. Prioritise the provided data over general knowledge.

RESPONSE STYLE:
- Be warm, empathetic, and clear — like a knowledgeable friend, not a textbook.
- Use markdown formatting: **bold** headers, bullet points, emojis where helpful.
- Structure responses with clear sections (Causes, Symptoms, Treatment, Prevention, When to See a Doctor).
- Be comprehensive but concise — cover what the user actually needs.
- For medicines: include uses, dosage guidelines, side effects, precautions, interactions.
- For diseases: include symptoms, causes, treatment, prevention, emergency signs.
- For symptoms: list possible causes (most to least likely) and advise on severity.
- Always mention when something is an emergency requiring immediate care.
- You have access to the user's conversation history — use it for natural follow-ups.
- When data is provided, weave it naturally into your response rather than listing it raw.
- For follow-up questions, acknowledge the previous context and build on it naturally.
"""

# ── Crisis keywords ─────────────────────────────────────────────────────────
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die", "self harm",
    "self-harm", "i want to die", "ending my life", "no reason to live",
    "can't go on", "better off dead",
]

# ── Stop-words for drug name extraction ────────────────────────────────────
_STOP = {
    "what", "is", "the", "a", "an", "about", "me", "tell", "does", "how", "do",
    "are", "was", "my", "for", "to", "of", "and", "or", "in", "on", "at", "from",
    "with", "information", "medicine", "drug", "medication", "tablet", "pill",
    "capsule", "syrup", "injection", "please", "can", "you", "know", "give", "show",
    "which", "when", "that", "this", "there", "will", "would", "should", "could",
    "have", "has", "had", "been", "take", "taking", "used", "uses", "using",
    "safe", "good", "bad", "help", "need", "want", "more", "some", "any",
}


# ── Helpers ─────────────────────────────────────────────────────────────────

def _find_local_medicine(msg: str) -> Optional[dict]:
    for med in LOCAL_MEDICINES:
        if med["name"].lower() in msg:
            return med
    return None


def _extract_drug_candidate(msg: str) -> Optional[str]:
    for marker in ["about ", "regarding ", "on ", "for "]:
        if marker in msg:
            tail = msg.split(marker, 1)[1].strip()
            candidate = tail.split()[0].strip("?.,!;:") if tail else None
            if candidate and len(candidate) > 2 and candidate.lower() not in _STOP:
                return candidate
    words = [w.strip("?.,!;:") for w in msg.split()
             if len(w) > 3 and w.lower().strip("?.,!;:") not in _STOP]
    words.sort(key=len, reverse=True)
    return words[0] if words else None


async def _scan_fda(msg: str) -> Optional[dict]:
    """Try OpenFDA for every plausible drug-name word in the message."""
    tokens = [w.strip("?.,!;:") for w in msg.split()
              if len(w) > 3 and w.lower().strip("?.,!;:") not in _STOP]
    for tok in tokens:
        result = await openfda_client.get_medicine_detail_live(tok)
        if result:
            return result
    return None


def _build_kb_context(msg: str) -> str:
    """Return a compact knowledge-base snippet to include in the prompt."""
    lines: list[str] = []

    # Disease match (exact or partial)
    for disease, info in DISEASE_KNOWLEDGE.items():
        if disease in msg:
            lines.append(f"[KB Disease: {disease.title()}]")
            lines.append(f"Symptoms: {', '.join(info.get('symptoms', [])[:6])}")
            lines.append(f"Causes: {', '.join(info.get('causes', [])[:5])}")
            lines.append(f"Treatment: {', '.join(info.get('treatment', [])[:5])}")
            if info.get("prevention"):
                lines.append(f"Prevention: {', '.join(info['prevention'][:4])}")
            if info.get("emergency_signs"):
                lines.append(f"⚠️ Emergency signs: {', '.join(info['emergency_signs'][:4])}")
            if info.get("when_to_see_doctor"):
                lines.append(f"👨‍⚕️ See doctor: {info['when_to_see_doctor']}")
            break

    # Symptom match
    for symptom, diseases in SYMPTOM_TO_DISEASE.items():
        if symptom in msg and not lines:
            lines.append(f"[KB Symptom: {symptom}]")
            lines.append(f"Possible conditions: {', '.join(diseases[:6])}")
            # Add brief info for top 2 conditions
            for d in diseases[:2]:
                info = DISEASE_KNOWLEDGE.get(d, {})
                if info.get("symptoms"):
                    lines.append(f"  • {d.title()}: {', '.join(info['symptoms'][:3])}")
            break

    # Local medicine match
    med = _find_local_medicine(msg)
    if med:
        lines.append(f"[KB Medicine: {med['name']}]")
        lines.append(f"  Brand: {med.get('brand', 'Generic')}")
        lines.append(f"  Category: {med.get('category', 'General')}")
        lines.append(f"  Uses: {', '.join(med.get('uses', [])[:5])}")
        dosage = med.get('dosage', {})
        lines.append(f"  Adult dose: {dosage.get('adult', 'Consult label')}")
        lines.append(f"  Child dose: {dosage.get('child', 'Consult pediatrician')}")
        se = med.get("side_effects", {})
        if se.get("common"):
            lines.append(f"  Common side effects: {', '.join(se['common'][:4])}")
        if se.get("serious"):
            lines.append(f"  ⚠️ Serious: {', '.join(se['serious'][:3])}")
        if med.get("precautions"):
            lines.append(f"  Precautions: {'; '.join(med['precautions'][:4])}")
        if med.get("interactions"):
            lines.append(f"  Interactions: {'; '.join(med['interactions'][:4])}")
        if med.get("pregnancy"):
            lines.append(f"  Pregnancy: {med['pregnancy']}")

    return "\n".join(lines)


async def _build_fda_context(msg: str) -> str:
    """Return an OpenFDA snippet if we detect a drug name."""
    candidate = _extract_drug_candidate(msg)
    if candidate:
        live = await openfda_client.get_medicine_detail_live(candidate)
        if live:
            return (f"[FDA Drug Info: {live['name']}] "
                    f"Brand: {live.get('brand', '')} | "
                    f"Uses: {', '.join(live.get('uses', [])[:4])} | "
                    f"Adult dose: {live.get('dosage', {}).get('adult', 'see label')} | "
                    f"Common side effects: {', '.join(live.get('side_effects', {}).get('common', [])[:4])} | "
                    f"Precautions: {'; '.join(live.get('precautions', [])[:3])} | "
                    f"Pregnancy: {live.get('pregnancy', 'Consult doctor')}")
    return ""


# ── Main chatbot entry-point ─────────────────────────────────────────────────

async def chatbot_response(
    message: str,
    location: Optional[dict] = None,
    history: Optional[list] = None,
) -> str:
    msg = message.lower().strip()

    # 0. Crisis — always instant, no AI delay
    if any(phrase in msg for phrase in CRISIS_KEYWORDS):
        return _crisis_response()

    # 1. Try configured AI provider, then fall back through alternatives
    provider = _get_active_provider()

    if provider == "nvidia":
        try:
            return await _nvidia_answer(message, msg, location, history or [])
        except Exception as exc:
            print(f"[Mendly] NVIDIA call failed: {exc}")
            # Try Gemini as secondary fallback
            model = _get_gemini()
            if model:
                try:
                    return await _gemini_answer(model, message, msg, location, history or [])
                except Exception as exc2:
                    print(f"[Mendly] Gemini fallback also failed: {exc2}")

    elif provider == "gemini":
        model = _get_gemini()
        if model:
            try:
                return await _gemini_answer(model, message, msg, location, history or [])
            except Exception as exc:
                print(f"[Mendly] Gemini call failed: {exc}")
                # Try NVIDIA as secondary fallback
                if _nvidia_is_configured():
                    try:
                        return await _nvidia_answer(message, msg, location, history or [])
                    except Exception as exc2:
                        print(f"[Mendly] NVIDIA fallback also failed: {exc2}")

    # 2. Fallback: rule-based engine
    return _rule_based_response(msg, message, location)


# ── Gemini answer ────────────────────────────────────────────────────────────

async def _gemini_answer(
    model,
    original: str,
    msg_lower: str,
    location: Optional[dict],
    history: list,
) -> str:
    import google.generativeai as genai

    kb_ctx = _build_kb_context(msg_lower)
    fda_ctx = await _build_fda_context(msg_lower)

    context_block = ""
    if kb_ctx or fda_ctx:
        context_block = "\n\n[CONTEXT FROM MENDLY MEDICAL DATABASE]\n"
        if kb_ctx:
            context_block += kb_ctx + "\n"
        if fda_ctx:
            context_block += fda_ctx + "\n"
        context_block += "[END CONTEXT — use this data to enrich your answer]\n"

    location_hint = ""
    if location:
        location_hint = f"\n[User location: lat={location.get('lat')}, lng={location.get('lng')}. For hospital/pharmacy queries, mention they can click the Hospitals or Pharmacies tab in Mendly.]"

    chat_history = []
    for turn in history:
        role = "user" if turn.role == "user" else "model"
        chat_history.append({"role": role, "parts": [turn.content]})

    chat = model.start_chat(history=chat_history)
    full_prompt = f"{original}{context_block}{location_hint}"

    loop = asyncio.get_running_loop()
    response = await loop.run_in_executor(None, lambda: chat.send_message(full_prompt))

    text = response.text.strip()
    if not text:
        raise ValueError("Empty Gemini response")

    disclaimer = "\n\n*This is health information for awareness — not a diagnosis. Consult a qualified healthcare professional for personal medical advice.*"
    if "disclaimer" not in text.lower() and "consult" not in text.lower()[-200:]:
        text += disclaimer

    return text


async def _nvidia_answer(
    original: str,
    msg_lower: str,
    location: Optional[dict],
    history: list,
) -> str:
    kb_ctx = _build_kb_context(msg_lower)
    fda_ctx = await _build_fda_context(msg_lower)

    context_block = ""
    if kb_ctx or fda_ctx:
        context_block = "\n\n[CONTEXT FROM MENDLY MEDICAL DATABASE]\n"
        if kb_ctx:
            context_block += kb_ctx + "\n"
        if fda_ctx:
            context_block += fda_ctx + "\n"
        context_block += "[END CONTEXT — use this data to enrich your answer]\n"

    location_hint = ""
    if location:
        lat = location.get("lat", "")
        lng = location.get("lng", "")
        location_hint = (
            f"\n[User location: lat={lat}, lng={lng}. "
            "For hospital/pharmacy queries, mention the Hospitals or Pharmacies tab in Mendly.]"
        )

    system_msg = _SYSTEM_PROMPT
    if context_block:
        system_msg += context_block

    messages = [{"role": "system", "content": system_msg}]
    for turn in history:
        role = "user" if turn.role == "user" else "assistant"
        messages.append({"role": role, "content": turn.content})

    user_msg = original
    if location_hint:
        user_msg += location_hint
    messages.append({"role": "user", "content": user_msg})

    payload = {
        "messages": messages,
        "temperature": 0.3,
        "top_p": 0.9,
        "max_tokens": 2048,
    }
    if NVIDIA_MODEL:
        payload["model"] = NVIDIA_MODEL
    if "deepseek" in NVIDIA_MODEL.lower():
        payload["temperature"] = 0.3
        payload["top_p"] = 0.95
        payload["max_tokens"] = 4096

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }

    last_error = None
    for attempt in range(1 + NVIDIA_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=NVIDIA_TIMEOUT) as client:
                response = await client.post(NVIDIA_API_URL, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
            break
        except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.ConnectError) as exc:
            last_error = exc
            print(f"[Mendly] NVIDIA API attempt {attempt + 1} failed: {exc}")
            if attempt < NVIDIA_MAX_RETRIES:
                await asyncio.sleep(1.0 * (attempt + 1))
    else:
        raise last_error or ValueError("NVIDIA API failed after retries")

    text = _parse_nvidia_response(data)

    text = (text or "").strip()
    if not text:
        raise ValueError(f"Empty NVIDIA AI response: {data}")

    disclaimer = "\n\n*This is health information for awareness — not a diagnosis. Consult a qualified healthcare professional for personal medical advice.*"
    if "disclaimer" not in text.lower() and "consult" not in text.lower()[-200:]:
        text += disclaimer

    return text


def _parse_nvidia_response(data: dict) -> str:
    """Extract text from NVIDIA NIM response, handling multiple formats."""
    if not isinstance(data, dict):
        return ""

    if data.get("choices"):
        choice = data["choices"][0]
        if isinstance(choice, dict):
            if isinstance(choice.get("message"), dict):
                text = choice["message"].get("content", "") or ""
                if text:
                    return text
            text = choice.get("text", "") or ""
            if text:
                return text
            if isinstance(choice.get("delta"), dict):
                text = choice["delta"].get("content", "") or ""
                if text:
                    return text

    if isinstance(data.get("output_text"), str):
        return data["output_text"]
    if isinstance(data.get("response"), str):
        return data["response"]
    if isinstance(data.get("output"), list) and data["output"]:
        item = data["output"][0]
        if isinstance(item, dict):
            return item.get("text", "") or item.get("content", "") or str(item)
        return str(item)
    if isinstance(data.get("output"), str):
        return data["output"]

    return ""


# ── Rule-based fallback ──────────────────────────────────────────────────────

def _rule_based_response(msg: str, original: str, location: Optional[dict]) -> str:
    """Comprehensive keyword-driven responses used when Gemini is unavailable."""

    # Location
    if any(w in msg for w in ["hospital", "pharmacy", "nearby", "clinic", "chemist"]):
        return _location_response(location)

    # Emergency
    if any(w in msg for w in ["emergency", "ambulance", "911", "sos", "urgent help"]):
        return _emergency_contacts()

    # Interactions
    if any(w in msg for w in ["interact", "combine", "mix with", "take with", "safe with"]):
        med = _find_local_medicine(msg)
        return _interaction_info(med)

    # Dosage
    if any(w in msg for w in ["dosage", "dose", "how much", "how many", "mg", "how often"]):
        med = _find_local_medicine(msg)
        return _dosage_info(med)

    # Pregnancy
    if any(w in msg for w in ["pregnant", "pregnancy", "breastfeeding", "nursing", "trimester"]):
        med = _find_local_medicine(msg)
        return _pregnancy_info(med)

    # Disease knowledge
    for disease, info in DISEASE_KNOWLEDGE.items():
        if disease in msg:
            return _disease_detail(disease, info)

    # Symptom
    for symptom, diseases in SYMPTOM_TO_DISEASE.items():
        if symptom in msg:
            return _symptom_detail(symptom, diseases)

    # Local medicine
    med = _find_local_medicine(msg)
    if med:
        return _medicine_detail(med)

    # Health categories
    if any(w in msg for w in ["heart", "blood pressure", "hypertension", "cholesterol", "cardiac"]):
        return _heart_guide()
    if any(w in msg for w in ["diabetes", "blood sugar", "insulin", "glucose", "diabetic"]):
        return _diabetes_guide()
    if any(w in msg for w in ["mental", "anxiety", "depression", "stress", "sleep", "insomnia"]):
        return _mental_health_guide(msg)
    if any(w in msg for w in ["vitamin", "supplement", "mineral", "zinc", "omega", "iron", "calcium"]):
        return _supplement_guide(msg)
    if any(w in msg for w in ["exercise", "fitness", "workout", "diet", "nutrition", "weight loss"]):
        return _lifestyle_guide(msg)
    if any(w in msg for w in ["fever", "cough", "cold", "flu", "infection", "viral"]):
        return _infection_guide(msg)
    if any(w in msg for w in ["pain", "headache", "ache", "sore", "hurt"]):
        return _pain_guide(msg)
    if any(w in msg for w in ["skin", "rash", "acne", "eczema", "allergy", "allergic"]):
        return _skin_allergy_guide(msg)
    if any(w in msg for w in ["first aid", "cut", "burn", "fracture", "choking", "cpr", "wound"]):
        return _first_aid_guide(msg)
    if any(w in msg for w in ["cancer", "tumor", "oncology", "chemotherapy"]):
        return _cancer_guide()
    if any(w in msg for w in ["vaccine", "vaccination", "immunization", "booster"]):
        return _vaccine_guide()
    if any(w in msg for w in ["child", "baby", "infant", "pediatric", "toddler"]):
        return _pediatric_guide(msg)
    if any(w in msg for w in ["pregnant", "period", "menstrual", "pcos", "menopause", "womens health"]):
        return _womens_health_guide(msg)
    if any(w in msg for w in ["elderly", "senior", "aging", "old age", "dementia"]):
        return _geriatric_guide()
    if any(w in msg for w in ["eye", "vision", "dental", "tooth", "teeth"]):
        return _sensory_health_guide(msg)

    # Generic health guidance
    return _generic_health_response(original)


# ── Response builders ────────────────────────────────────────────────────────

def _crisis_response() -> str:
    return (
        "💚 **I hear that you're going through something really difficult right now. "
        "You are not alone, and help is available.**\n\n"
        "🚨 **Please reach out right now:**\n"
        "• 🇮🇳 India: **iCall** 9152987821 | **Vandrevala** 1860-2662-345\n"
        "• 🇺🇸 USA: **988** (Suicide & Crisis Lifeline)\n"
        "• 🇬🇧 UK: **Samaritans** 116 123\n"
        "• 🇨🇦 Canada: **988**\n"
        "• 🇦🇺 Australia: **Lifeline** 13 11 14\n"
        "• 🌐 Worldwide: https://www.findahelpline.com\n\n"
        "🌿 **Grounding Exercise (right now — 5-4-3-2-1):**\n"
        "• Name **5** things you can see\n"
        "• Name **4** things you can physically feel\n"
        "• Name **3** things you can hear\n"
        "• Name **2** things you can smell\n"
        "• Name **1** thing you can taste\n\n"
        "🫁 **Breathing:** Breathe in for 4 counts → hold for 4 → out for 6 counts. Repeat.\n\n"
        "💬 I'm here to talk too. What's on your mind?"
    )


def _location_response(location: Optional[dict]) -> str:
    if location and location.get("lat") and location.get("lng"):
        return (
            "📍 **Finding Nearby Medical Facilities**\n\n"
            f"Your location is detected (lat {location.get('lat'):.3f}, lng {location.get('lng'):.3f}).\n\n"
            "➡️ Click **Hospitals** in the sidebar to see nearby hospitals\n"
            "➡️ Click **Pharmacies** in the sidebar to see nearby pharmacies\n\n"
            "**🏥 Go to a hospital immediately for:**\n"
            "• Chest pain, difficulty breathing, stroke signs (FAST)\n"
            "• Severe injury, uncontrolled bleeding\n"
            "• Loss of consciousness\n\n"
            "**💊 A pharmacy can help with:**\n"
            "• OTC medicines, prescription refills, medication advice\n\n"
            "**📞 Emergency:** Dial **112** (India/Europe) or **911** (USA/Canada)"
        )
    return (
        "📍 **Medical Facilities Finder**\n\n"
        "Enable location access and use the **Hospitals** or **Pharmacies** tab for real-time nearby results.\n\n"
        "**Emergency Contacts:**\n"
        "• India: 102 (Ambulance), 100 (Police), 104 (Health Helpline)\n"
        "• USA: 911 | UK: 999/111 | Australia: 000"
    )


def _emergency_contacts() -> str:
    return (
        "🚨 **Emergency & Crisis Contacts**\n\n"
        "**Medical Emergency:**\n"
        "• 🇮🇳 India: 102 (Ambulance) | 100 (Police) | 104 (Health)\n"
        "• 🇺🇸 USA: 911\n"
        "• 🇬🇧 UK: 999 (Emergency) | 111 (NHS advice)\n"
        "• 🇦🇺 Australia: 000\n\n"
        "**Mental Health Crisis:**\n"
        "• India: 9152987821 (iCall)\n"
        "• USA: 988\n"
        "• UK: 116 123 (Samaritans)\n\n"
        "**Poison Control:**\n"
        "• India: 1800-116-117\n"
        "• USA: 1-800-222-1222"
    )


def _disease_detail(disease: str, info: dict) -> str:
    r = f"📚 **{disease.title()} — Complete Health Guide**\n\n"
    r += "**📋 Symptoms:**\n" + "".join(f"• {s}\n" for s in info.get("symptoms", []))
    r += "\n**🔍 Causes & Risk Factors:**\n" + "".join(f"• {c}\n" for c in info.get("causes", []))
    r += "\n**💊 Treatment & Management:**\n" + "".join(f"• {t}\n" for t in info.get("treatment", []))
    if info.get("prevention"):
        r += "\n**🛡️ Prevention:**\n" + "".join(f"• {p}\n" for p in info["prevention"][:6])
    if info.get("complications"):
        r += "\n**⚠️ Possible Complications:**\n" + "".join(f"• {c}\n" for c in info["complications"])
    if info.get("emergency_signs"):
        r += "\n**🚨 Seek Emergency Care If:**\n" + "".join(f"• {e}\n" for e in info["emergency_signs"])
    if info.get("when_to_see_doctor"):
        r += f"\n**👨‍⚕️ See a Doctor:** {info['when_to_see_doctor']}\n"
    r += "\n\n*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    return r


def _symptom_detail(symptom: str, diseases: list) -> str:
    r = f"🔍 **'{symptom.title()}' — Possible Conditions**\n\n"
    r += "This symptom is associated with several conditions:\n\n"
    for i, disease in enumerate(diseases[:6], 1):
        info = DISEASE_KNOWLEDGE.get(disease, {})
        r += f"**{i}. {disease.title()}**\n"
        if info.get("symptoms"):
            r += f"   Other symptoms: {', '.join(info['symptoms'][:3])}\n"
        if info.get("treatment"):
            r += f"   Common treatment: {', '.join(info['treatment'][:2])}\n"
        r += "\n"
    r += "**🚨 Seek immediate care if:**\n"
    r += "• Severe or sudden onset symptoms\n"
    r += "• Chest pain, difficulty breathing, or loss of consciousness\n"
    r += "• High fever (>39.4°C / 103°F)\n"
    r += "\n*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    return r


def _medicine_detail(med: dict) -> str:
    r = f"💊 **{med['name']}** ({med.get('brand', 'Generic')})\n\n"
    r += f"**Category:** {med.get('category', 'General')}\n"
    r += f"**Uses:** {', '.join(med.get('uses', [])[:5])}\n\n"
    dosage = med.get("dosage", {})
    r += "**Dosage:**\n"
    r += f"• Adult: {dosage.get('adult', 'See label')}\n"
    r += f"• Child: {dosage.get('child', 'Consult pediatrician')}\n"
    r += f"• Elderly: {dosage.get('elderly', 'Lower dose — consult doctor')}\n\n"
    se = med.get("side_effects", {})
    if se.get("common"):
        r += f"**Common Side Effects:** {', '.join(se['common'][:4])}\n"
    if se.get("serious"):
        r += f"**Serious (stop & seek help):** {', '.join(se['serious'][:3])}\n"
    if med.get("precautions"):
        r += f"\n**Precautions:** {'; '.join(med['precautions'][:4])}\n"
    if med.get("interactions"):
        r += f"**Interactions:** {'; '.join(med['interactions'][:4])}\n"
    if med.get("pregnancy"):
        r += f"\n**Pregnancy:** {med['pregnancy']}\n"
    r += "\n*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    return r


def _interaction_info(med: Optional[dict]) -> str:
    if med:
        r = f"🔗 **{med['name']} — Interactions & Safety**\n\n"
        if med.get("precautions"):
            r += "**Precautions:**\n" + "".join(f"• {p}\n" for p in med["precautions"][:5])
        if med.get("interactions"):
            r += "\n**Known Interactions:**\n" + "".join(f"• {i}\n" for i in med["interactions"][:6])
        r += "\n**Always tell your pharmacist about ALL medications you take.**\n"
        r += "\n*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
        return r
    return (
        "🔗 **Drug Interaction Guide**\n\n"
        "Please mention the medicine name to check interactions. Example:\n"
        "• 'Does Ibuprofen interact with blood thinners?'\n\n"
        "**General Interaction Rules:**\n"
        "• NSAIDs + blood thinners → increased bleeding risk\n"
        "• Alcohol + sedatives/opioids → dangerous respiratory depression\n"
        "• Statins + some antibiotics → muscle damage risk\n"
        "• St. John's Wort → interacts with many prescription drugs\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _dosage_info(med: Optional[dict]) -> str:
    if med:
        d = med.get("dosage", {})
        return (
            f"💊 **{med['name']} — Dosage**\n\n"
            f"• Adult: {d.get('adult', 'See label')}\n"
            f"• Child: {d.get('child', 'Consult pediatrician')}\n"
            f"• Elderly: {d.get('elderly', 'Consult doctor')}\n\n"
            f"**How to use:** {med.get('how_to_use', 'Follow label instructions.')}\n\n"
            "⚠️ Your dose may differ based on weight, kidney/liver function, and other medications.\n\n"
            "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
        )
    return (
        "💊 **Dosage Information**\n\n"
        "Please mention the medicine name for dosage details.\n\n"
        "**General Rules:**\n"
        "• Start with the lowest effective dose\n"
        "• Never exceed the daily maximum\n"
        "• Children's doses are weight-based\n"
        "• Never double up on a missed dose\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _pregnancy_info(med: Optional[dict]) -> str:
    if med:
        return (
            f"🤰 **{med['name']} — Pregnancy & Breastfeeding**\n\n"
            f"**Pregnancy:** {med.get('pregnancy', 'Consult your OB-GYN.')}\n"
            f"**Breastfeeding:** {med.get('breastfeeding', 'Consult your doctor.')}\n\n"
            "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
        )
    return (
        "🤰 **Medication Safety in Pregnancy**\n\n"
        "**Generally safe:** Paracetamol (recommended dose)\n"
        "**Avoid:** Ibuprofen (especially 3rd trimester), Aspirin (high dose)\n"
        "**Essential:** Folic acid 400–800 mcg/day from before conception\n\n"
        "Always confirm any medicine with your OB-GYN before taking it during pregnancy.\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _heart_guide() -> str:
    return (
        "❤️ **Heart & Cardiovascular Health**\n\n"
        "**Know Your Numbers:**\n"
        "• Blood Pressure: <120/80 mmHg (normal)\n"
        "• LDL Cholesterol: <100 mg/dL (optimal)\n"
        "• Blood Sugar (fasting): <100 mg/dL (normal)\n"
        "• BMI: 18.5–24.9 (healthy range)\n\n"
        "**🚨 Heart Attack Signs — Call 911/102 IMMEDIATELY:**\n"
        "• Chest pain/pressure/tightness\n"
        "• Pain radiating to arm, jaw, or back\n"
        "• Shortness of breath, cold sweat, nausea\n"
        "• Women may have: unusual fatigue, upper back pain\n\n"
        "**Stroke Signs — FAST:**\n"
        "• **F**ace drooping • **A**rm weakness • **S**peech difficulty • **T**ime to call\n\n"
        "**Prevention:**\n"
        "• Don't smoke — #1 risk factor\n"
        "• Exercise 150 min/week\n"
        "• DASH/Mediterranean diet\n"
        "• Limit salt, saturated fat, alcohol\n"
        "• Manage BP, cholesterol, blood sugar\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _diabetes_guide() -> str:
    return (
        "🩸 **Diabetes — Complete Guide**\n\n"
        "**Types:**\n"
        "• Type 1: Immune system destroys insulin-producing cells (requires insulin)\n"
        "• Type 2: Body resists insulin or doesn't make enough (lifestyle + medication)\n"
        "• Gestational: During pregnancy\n\n"
        "**Symptoms:** Excessive thirst/urination, fatigue, blurred vision, slow healing, frequent infections\n\n"
        "**Diagnosis:** Fasting glucose ≥126 mg/dL | HbA1c ≥6.5% | Random glucose ≥200 mg/dL\n\n"
        "**Management:**\n"
        "• Monitor blood sugar regularly (target HbA1c <7%)\n"
        "• Healthy diet (low GI foods, portion control)\n"
        "• Exercise 150 min/week\n"
        "• Medications: Metformin (first-line T2D), insulin, SGLT2 inhibitors, GLP-1 agonists\n\n"
        "**🚨 Emergencies:**\n"
        "• Hypoglycemia (<70 mg/dL): Eat 15g fast sugar (juice, glucose tabs), recheck in 15 min\n"
        "• DKA (Type 1): Fruity breath, confusion, vomiting → Emergency room\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _mental_health_guide(msg: str) -> str:
    r = "🧠 **Mental Health & Wellbeing**\n\n"
    if any(w in msg for w in ["anxiety", "anxious", "panic", "worried"]):
        r += "**😰 Anxiety & Panic:**\n• Breathing: 4 in → 4 hold → 6 out\n• Grounding: 5-4-3-2-1 senses\n• CBT therapy is gold standard\n• Medications: SSRIs, SNRIs (doctor-prescribed)\n\n"
    if any(w in msg for w in ["depression", "depressed", "sad", "low mood"]):
        r += "**😔 Depression:**\n• Exercise is as effective as medication for mild-moderate depression\n• CBT therapy proven effective\n• Medications: SSRIs (Fluoxetine, Sertraline)\n• Social connection is crucial — don't isolate\n\n"
    if any(w in msg for w in ["sleep", "insomnia"]):
        r += "**😴 Sleep:**\n• 7–9 hours nightly for adults\n• Consistent sleep/wake times\n• No screens 1 hr before bed\n• CBT-I (Cognitive Behavioural Therapy for Insomnia) is more effective than sleeping pills long-term\n\n"
    if any(w in msg for w in ["stress"]):
        r += "**🌿 Stress:**\n• Mindfulness 10–15 min/day reduces cortisol\n• Exercise is the best acute stress reliever\n• Limit caffeine and alcohol\n• Set boundaries; learn to say no\n\n"
    r += "**📞 Mental Health Support:**\n• India: iCall 9152987821\n• USA: 988 (Suicide & Crisis Lifeline)\n• UK: 116 123 (Samaritans)\n\n"
    r += "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    return r


def _supplement_guide(msg: str) -> str:
    r = "💊 **Vitamins, Minerals & Supplements**\n\n"
    items = {
        "vitamin d": "☀️ **Vitamin D:** Bone health & immunity. Sun (15–20 min/day), fatty fish. 600–800 IU/day. Test: 25-OH Vitamin D.",
        "vitamin c": "🍊 **Vitamin C:** Immunity & collagen. Citrus, peppers, broccoli. 75–90 mg/day.",
        "vitamin b12": "💉 **B12:** Nerve & red blood cells. Meat, dairy (vegans must supplement). Deficiency: fatigue, numbness, anemia.",
        "iron": "🩸 **Iron:** Oxygen transport. Red meat, spinach, lentils. Take with Vitamin C. Test before supplementing.",
        "calcium": "🦴 **Calcium:** Bone strength. Dairy, leafy greens. 1000 mg/day; take with Vitamin D.",
        "omega": "🐟 **Omega-3:** Heart & brain. Fatty fish (2×/week) or fish oil. 250–500 mg EPA+DHA/day.",
        "zinc": "⚡ **Zinc:** Immunity, wound healing. Meat, shellfish, nuts. 8–11 mg/day.",
        "magnesium": "🌿 **Magnesium:** Muscles, sleep, BP. Nuts, seeds, greens. 310–420 mg/day.",
        "folic": "🥬 **Folic Acid:** Cell division & DNA. Essential in pregnancy (400–800 mcg/day).",
        "probiotic": "🦠 **Probiotics:** Gut health & immunity. Yogurt, kefir, kimchi. Helpful for IBS & antibiotic recovery.",
    }
    shown = False
    for key, info in items.items():
        if key in msg:
            r += info + "\n\n"
            shown = True
    if not shown:
        r += "\n".join(list(items.values())[:5]) + "\n\n"
    r += "**⚠️ Supplement Safety:** Test first (blood work) for Vitamin D, B12, Iron. Food sources > pills when possible.\n\n"
    r += "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    return r


def _lifestyle_guide(msg: str) -> str:
    if any(w in msg for w in ["exercise", "fitness", "workout"]):
        return (
            "💪 **Exercise & Fitness**\n\n"
            "**WHO Recommendations:**\n"
            "• 150–300 min moderate cardio/week (walking, cycling, swimming)\n"
            "• OR 75–150 min vigorous cardio/week (running, HIIT)\n"
            "• 2+ days strength training/week\n\n"
            "**Benefits:** Reduces risk of heart disease, diabetes, depression, dementia, and some cancers by 30–50%\n\n"
            "**Getting Started:** Walk 20–30 min daily → gradually increase. Consistency beats intensity.\n\n"
            "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
        )
    return (
        "🥗 **Nutrition & Diet**\n\n"
        "**Balanced Plate (each meal):**\n"
        "• ½ plate: Non-starchy vegetables\n"
        "• ¼ plate: Whole grains (brown rice, quinoa, oats)\n"
        "• ¼ plate: Lean protein (fish, legumes, chicken, eggs)\n"
        "• Add: Healthy fats (olive oil, avocado, nuts)\n\n"
        "**Limit:** Added sugar, salt (>2300mg/day), saturated fat, ultra-processed foods\n\n"
        "**Stay Hydrated:** 8+ glasses water daily (more with exercise or heat)\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _infection_guide(msg: str) -> str:
    r = "🦠 **Infections & Fever Guide**\n\n"
    if any(w in msg for w in ["fever", "temperature"]):
        r += "**🌡️ Fever Treatment:**\n• Paracetamol 500–1000mg every 4–6 hrs (max 4g/day)\n• Ibuprofen 400mg every 6–8 hrs with food\n• Rest, fluids, tepid sponge bath\n• Seek care: fever >39.4°C (103°F), lasts >3 days, or with stiff neck/rash\n\n"
    if any(w in msg for w in ["cold", "cough", "sore throat"]):
        r += "**🤧 Cold & Cough:**\nViral — antibiotics won't help. Treat symptoms: rest, fluids, honey + warm water, throat lozenges, decongestant nasal spray.\n\n"
    r += "**🧫 Antibiotic Reminder:**\n• Only work for BACTERIAL infections\n• Complete the full course\n• Never share or self-prescribe antibiotics\n• Antibiotic resistance is a global crisis\n\n"
    r += "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    return r


def _pain_guide(msg: str) -> str:
    r = "💊 **Pain Management**\n\n"
    if any(w in msg for w in ["headache", "migraine"]):
        r += "**🤕 Headache:**\nTension: Paracetamol/Ibuprofen, rest, neck massage. Migraine: Triptans, dark quiet room. 🚨 Thunderclap/worst headache of life = Emergency.\n\n"
    if any(w in msg for w in ["back", "spine"]):
        r += "**🦴 Back Pain:**\nAcute: Ice first 48hrs → heat. Gentle movement + Ibuprofen. Chronic: physio, core strengthening, posture.\n\n"
    r += "**Pain Ladder:**\n• Mild: Paracetamol, Ibuprofen, Naproxen\n• Moderate: Tramadol, Codeine\n• Severe: Opioids (doctor-only)\n\n"
    r += "**Non-Drug Options:** Heat/ice, TENS, physiotherapy, mindfulness, acupuncture\n\n"
    r += "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    return r


def _skin_allergy_guide(msg: str) -> str:
    r = "🧴 **Skin & Allergy Guide**\n\n"
    if any(w in msg for w in ["acne", "pimple"]):
        r += "**🔴 Acne:**\nOTC: Benzoyl peroxide, Salicylic acid, Adapalene. Prescription: Retinoids, Antibiotics, Hormonal therapy. Avoid picking. Use SPF daily.\n\n"
    if any(w in msg for w in ["allergy", "allergic", "anaphylaxis"]):
        r += "**🤧 Allergy:**\nAntihistamines: Cetirizine, Loratadine, Fexofenadine. Nasal: Fluticasone. 🚨 Anaphylaxis (throat swelling, can't breathe) = EpiPen + 911 IMMEDIATELY.\n\n"
    if any(w in msg for w in ["eczema", "rash", "itch"]):
        r += "**🌡️ Eczema/Rash:**\nMoisturise after bathing. Hydrocortisone cream for flares. Avoid triggers (soap, synthetic fabric, stress). See dermatologist if severe.\n\n"
    r += "**General Skincare:** Gentle cleanser, SPF 30+ daily (most important), moisturiser, stay hydrated\n\n"
    r += "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    return r


def _first_aid_guide(msg: str) -> str:
    r = "🩹 **First Aid Guide**\n\n"
    if any(w in msg for w in ["cut", "wound", "bleeding"]):
        r += "**🩸 Cuts/Wounds:** Apply pressure 10–15 min → rinse with water → antiseptic → sterile bandage. 🚨 Seek ER if: won't stop, deep/gaping, signs of infection.\n\n"
    if any(w in msg for w in ["burn"]):
        r += "**🔥 Burns:** Cool under running water 20 min. Do NOT use ice/butter/toothpaste. Cover loosely. 🚨 ER if: large area, face/hands, blistering, chemical burn.\n\n"
    if any(w in msg for w in ["fracture", "broken"]):
        r += "**🦴 Fracture:** Immobilise the limb. Ice for swelling. Do not try to straighten. 🚨 ER for all suspected fractures.\n\n"
    if any(w in msg for w in ["choking"]):
        r += "**😮 Choking:** 5 back blows → 5 Heimlich thrusts. Repeat. Call 911 if unresolved.\n\n"
    if any(w in msg for w in ["cpr", "not breathing", "unconscious"]):
        r += "**💗 CPR:** Call 911 → 30 chest compressions (hard & fast) → 2 rescue breaths → repeat. Use AED if available.\n\n"
    r += "*Health information for awareness — call emergency services for any serious situation.*"
    return r


def _cancer_guide() -> str:
    return (
        "🎗️ **Cancer Awareness**\n\n"
        "**⚠️ Warning Signs (CAUTION):**\n"
        "• Change in bowel/bladder habits\n"
        "• A sore that doesn't heal\n"
        "• Unusual bleeding or discharge\n"
        "• Thickening or lump anywhere\n"
        "• Indigestion or difficulty swallowing\n"
        "• Obvious change in mole/wart\n"
        "• Nagging cough or hoarseness\n\n"
        "**Recommended Screenings:**\n"
        "• Breast: Mammogram annually from 40–45\n"
        "• Cervical: Pap smear from 21 (every 3 yrs)\n"
        "• Colorectal: Colonoscopy from 45 (every 10 yrs)\n"
        "• Lung: Low-dose CT for heavy smokers 50–80\n"
        "• Skin: Annual dermatologist check + ABCDE mole rule\n\n"
        "**Prevention:** Don't smoke, maintain healthy weight, limit alcohol, SPF daily, HPV & Hep B vaccines\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _vaccine_guide() -> str:
    return (
        "💉 **Vaccines & Immunization**\n\n"
        "**How vaccines work:** Train immune system using weakened/killed pathogen → creates memory cells → fast response on real exposure\n\n"
        "**Adult Vaccines:**\n"
        "• Flu: Annually (October/November)\n"
        "• COVID-19: Primary series + recommended boosters\n"
        "• Tetanus (Td/Tdap): Every 10 years\n"
        "• Hepatitis B: 3-dose series if not immune\n"
        "• HPV: Up to age 26 (prevents cervical cancer)\n"
        "• Shingles (Shingrix): 50+ years, 2 doses\n"
        "• Pneumococcal: 65+ or high-risk\n\n"
        "**Vaccine Safety:** Common side effects (sore arm, mild fever) are normal — sign your immune system is responding. Serious adverse events are extremely rare.\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _pediatric_guide(msg: str) -> str:
    return (
        "👶 **Child Health Guide**\n\n"
        "**🌡️ Fever in Children:**\n"
        "• <3 months: ANY fever = emergency room\n"
        "• 3–6 months: fever >38°C → call doctor\n"
        "• >6 months: Paracetamol or Ibuprofen (weight-based dose)\n\n"
        "**Development Milestones:**\n"
        "• 2 months: Social smile, lifts head\n"
        "• 6 months: Sits with support, babbles\n"
        "• 12 months: Walks with support, first words\n"
        "• 2 years: Runs, 50+ words\n\n"
        "**Essentials:** Complete vaccinations, breastfeed 6+ months, solids at 6 months, regular well-child checks\n\n"
        "**🚨 Emergency Signs:** Difficulty breathing, seizure, severe dehydration, blue/purple rash\n\n"
        "*Health information for awareness — consult a pediatrician for your child's health.*"
    )


def _womens_health_guide(msg: str) -> str:
    return (
        "👩 **Women's Health Guide**\n\n"
        "**Preventive Screenings:**\n"
        "• Pap smear: Start 21, every 3 years\n"
        "• Mammogram: Annual from 40–45\n"
        "• Bone density: Post-menopause or 65+\n"
        "• Cholesterol & BP: Every 1–2 years\n\n"
        "**PCOS:** Irregular periods, weight gain, acne, excess hair. Treatment: lifestyle, Metformin, hormonal contraceptives.\n\n"
        "**Menopause (45–55):** Hot flashes, mood changes, sleep issues. Management: HRT, lifestyle, non-hormonal options.\n\n"
        "**Pregnancy:** Folic acid 400–800 mcg before conception. Avoid NSAIDs, alcohol, smoking. Regular OB-GYN checkups.\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _geriatric_guide() -> str:
    return (
        "👴 **Elderly Health Guide**\n\n"
        "**Fall Prevention:** Exercise for balance (Tai Chi), grab bars in bathroom, good lighting, review medications causing dizziness, calcium + Vitamin D\n\n"
        "**Medication Safety:** Older adults metabolise drugs slower → Start Low, Go Slow. Review all meds regularly (polypharmacy risk). Use pill organiser.\n\n"
        "**Annual Screenings:** BP, blood sugar, cholesterol, kidney, thyroid, bone density, hearing, vision, colorectal, cognitive assessment\n\n"
        "**Brain Health:** Mental stimulation (puzzles, reading), social engagement, exercise, manage cardiovascular risk factors\n\n"
        "*This is health information for awareness — not a diagnosis. Consult a healthcare professional for personal advice.*"
    )


def _sensory_health_guide(msg: str) -> str:
    if any(w in msg for w in ["eye", "vision"]):
        return (
            "👁️ **Eye Health**\n\n"
            "Eye exams every 1–2 years (annually if diabetic or 60+). Wear UV sunglasses. 20-20-20 rule for screen use. Control BP & blood sugar to protect retina.\n\n"
            "🚨 **Immediate care for:** Sudden vision loss, new floaters/flashes, severe eye pain, chemical splash\n\n"
            "*Health information for awareness — consult an ophthalmologist for eye health.*"
        )
    return (
        "🦷 **Dental Health**\n\n"
        "Brush twice daily (2 min) with fluoride toothpaste. Floss daily. Dental check-up every 6 months. Limit sugar and acidic drinks.\n\n"
        "🚨 **Urgent care for:** Severe toothache, jaw swelling (abscess), knocked-out permanent tooth (keep in milk, dentist in 1 hour)\n\n"
        "*Health information for awareness — consult a dentist for oral health.*"
    )


def _generic_health_response(original: str) -> str:
    return (
        "👋 **Elix Health Assistant**\n\n"
        f"I received: *\"{original}\"*\n\n"
        "I can answer detailed questions on any of these health topics:\n\n"
        "| Topic | Example question |\n"
        "|-------|------------------|\n"
        "| 💊 Medicines | 'Tell me about Metformin' |\n"
        "| 🩺 Diseases | 'What is diabetes?' |\n"
        "| 🔍 Symptoms | 'What causes chest pain?' |\n"
        "| ❤️ Heart health | 'How to lower blood pressure?' |\n"
        "| 🧠 Mental health | 'How to manage anxiety?' |\n"
        "| 💪 Fitness | 'Best exercise for weight loss' |\n"
        "| 🥗 Nutrition | 'What vitamins do I need?' |\n"
        "| 🩹 First Aid | 'How to treat a burn?' |\n"
        "| 💉 Vaccines | 'What vaccines do adults need?' |\n"
        "| 🤰 Pregnancy | 'Safe medicines in pregnancy?' |\n"
        "| 🏥 Hospitals | 'Find a hospital near me' |\n\n"
        "**Try rephrasing your question** and I'll give you a comprehensive answer!\n\n"
        "*Health information for awareness — consult a qualified healthcare professional for personal advice.*"
    )
