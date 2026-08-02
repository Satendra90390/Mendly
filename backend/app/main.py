import httpx
import math
import os
import logging
import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from . import schemas, chatbot, openfda_client
from .database import (
    get_profile, get_profile_by_email, get_profile_by_phone,
    insert_profile, update_profile, delete_profile,
    get_activity_logs, delete_activity_logs, count_rows,
    insert_chat_message, get_chat_history, get_recent_chat_messages, delete_chat_messages,
    insert_saved_search, get_saved_searches, delete_saved_search,
    init_indexes, users,
)
from .knowledge_base import DISEASE_KNOWLEDGE, LOCAL_MEDICINES, EMERGENCY_CONTACTS, DRUG_ALIASES, SYMPTOM_TO_DISEASE
from .auth import (
    signup_route, login_route, guest_login_route, guest_upgrade_route,
    update_profile_route, change_password as change_pw, get_account_stats as get_stats,
    delete_account, get_activity_log, clear_activity_log,
    block_user, unblock_user,
    get_current_user_profile, get_optional_user_profile, get_admin_user, _log_activity,
)

logger = logging.getLogger("mendly")

app = FastAPI(title="Mendly - Medicine & Health Information Platform", version="4.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_origins_env = os.getenv("FRONTEND_ORIGINS", "http://localhost:5500")
if _origins_env.strip() == "*":
    import warnings
    warnings.warn("FRONTEND_ORIGINS is set to '*' — insecure in production.", stacklevel=2)
    allow_origins = ["*"]
    _allow_credentials = False
else:
    allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
    allow_origins = list(dict.fromkeys(allow_origins))
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


def _now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup_event():
    await init_indexes()
    logger.info("Database indexes initialized")


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


# ============================================================
# AUTH ROUTES
# ============================================================

@app.post("/api/auth/signup", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
async def signup(request: Request, payload: schemas.SignupRequest):
    return await signup_route(payload, request)


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: schemas.LoginRequest):
    return await login_route(payload, request)


@app.post("/api/auth/guest", response_model=schemas.TokenResponse)
@limiter.limit("10/minute")
async def guest_login(request: Request):
    return await guest_login_route(request)


@app.post("/api/auth/guest/upgrade", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
async def guest_upgrade(request: Request, payload: schemas.GuestUpgradeRequest, current_user: dict = Depends(get_current_user_profile)):
    return await guest_upgrade_route(payload, request, current_user)


@app.get("/api/auth/me", response_model=schemas.UserOut)
async def get_me_endpoint(current_user: dict = Depends(get_current_user_profile)):
    return current_user


@app.put("/api/profile", response_model=schemas.UserOut)
async def update_profile_endpoint(payload: schemas.ProfileUpdateRequest, request: Request, current_user: dict = Depends(get_current_user_profile)):
    return await update_profile_route(payload, request, current_user)


@app.post("/api/profile/change-password")
async def change_password_endpoint(payload: schemas.PasswordChangeRequest, request: Request, current_user: dict = Depends(get_current_user_profile)):
    return await change_pw(payload, request, current_user)


@app.get("/api/profile/stats", response_model=schemas.AccountStats)
async def get_account_stats_endpoint(current_user: dict = Depends(get_current_user_profile)):
    return await get_stats(current_user)


@app.delete("/api/profile")
async def delete_account_endpoint(request: Request, current_user: dict = Depends(get_current_user_profile)):
    return await delete_account(request, current_user)


# ============================================================
# ACTIVITY LOG
# ============================================================

@app.get("/api/activity", response_model=List[schemas.ActivityLogOut])
async def list_activity_log(limit: int = 50, current_user: dict = Depends(get_current_user_profile)):
    return await get_activity_log(min(limit, 200), current_user)


@app.delete("/api/activity")
async def clear_activity_log_endpoint(current_user: dict = Depends(get_current_user_profile)):
    return await clear_activity_log(current_user)


# ============================================================
# ADMIN — BLOCK / UNBLOCK USERS
# ============================================================

@app.post("/api/admin/users/{user_id}/block")
async def block_user_endpoint(user_id: str, request: Request, admin_user: dict = Depends(get_admin_user)):
    return await block_user(user_id, request, admin_user)


@app.post("/api/admin/users/{user_id}/unblock")
async def unblock_user_endpoint(user_id: str, request: Request, admin_user: dict = Depends(get_admin_user)):
    return await unblock_user(user_id, request, admin_user)


# ============================================================
# CHAT (persisted per-user)
# ============================================================

@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat_endpoint(
    request: Request,
    payload: schemas.ChatRequest,
    current_user: dict = Depends(get_optional_user_profile),
):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(payload.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters).")

    user_id = current_user["id"] if current_user else None
    history = []
    if user_id:
        recent = await get_recent_chat_messages(user_id, 10)
        history = [schemas.ConversationMessage(role=m["role"], content=m["content"]) for m in recent]
    if not history and payload.history:
        history = payload.history[-10:]

    reply = await chatbot.chatbot_response(payload.message, payload.location, history, user_profile=current_user)

    if user_id:
        now = _now()
        await insert_chat_message({"user_id": user_id, "role": "user", "content": payload.message[:2000], "created_at": now})
        await insert_chat_message({"user_id": user_id, "role": "bot", "content": reply[:5000], "created_at": now})

    return {"reply": reply, "response": reply}


@app.post("/api/chat/upload")
@limiter.limit("15/minute")
async def chat_upload_endpoint(
    request: Request,
    message: str = Form(""),
    history: str = Form("[]"),
    files: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user_profile),
):
    if not message.strip() and not files:
        raise HTTPException(status_code=400, detail="Message or files required.")

    image_b64_list = []
    file_descriptions = []
    for f in files[:5]:
        content = await f.read()
        if len(content) > 10 * 1024 * 1024:
            continue
        ct = f.content_type or ""
        logger.info(f"[Mendly] Upload file: {f.filename}, content_type={ct}, size={len(content)}")
        # If it's an image, encode as base64 for vision model
        if ct.startswith("image/"):
            import base64
            b64 = base64.b64encode(content).decode("utf-8")
            image_b64_list.append(b64)
            file_descriptions.append(f"[Attached image: {f.filename} ({ct})]")
        else:
            file_descriptions.append(f"[Attached file: {f.filename} ({ct}, {len(content)} bytes)]")

    logger.info(f"[Mendly] Upload: {len(image_b64_list)} image(s), {len(file_descriptions)} file(s) total")

    full_message = message
    if file_descriptions:
        full_message = (message + "\n\n" + "\n".join(file_descriptions)).strip()

    recent = await get_recent_chat_messages(current_user["id"], 10)
    hist = [schemas.ConversationMessage(role=m["role"], content=m["content"]) for m in recent]
    if not hist:
        try:
            import json
            hist = [schemas.ConversationMessage(**m) for m in json.loads(history)]
        except Exception:
            pass

    reply = await chatbot.chatbot_response(full_message, None, hist[-10:], images=image_b64_list or None, user_profile=current_user)

    now = _now()
    await insert_chat_message({"user_id": current_user["id"], "role": "user", "content": full_message[:2000], "created_at": now})
    await insert_chat_message({"user_id": current_user["id"], "role": "bot", "content": reply[:5000], "created_at": now})

    return {"reply": reply, "response": reply}


@app.get("/api/chat/status")
async def get_chat_status(current_user: dict = Depends(get_current_user_profile)):
    return {"provider": chatbot.get_ai_provider(), "racing": True}


@app.get("/api/chat/history", response_model=List[schemas.ChatMessageOut])
async def list_chat_history(current_user: dict = Depends(get_current_user_profile), limit: int = 100):
    return await get_chat_history(current_user["id"], min(limit, 500))


@app.delete("/api/chat/history")
async def clear_chat_history(current_user: dict = Depends(get_current_user_profile)):
    await delete_chat_messages(current_user["id"])
    return {"status": "cleared"}


# ============================================================
# MEDICINES
# ============================================================

@app.get("/api/medicines")
async def get_medicines():
    return LOCAL_MEDICINES


@app.get("/api/medicines/{medicine_id}")
async def get_medicine(medicine_id: str):
    med = next((m for m in LOCAL_MEDICINES if m["id"] == medicine_id), None)
    if med:
        return med
    live = await openfda_client.get_medicine_detail_live(medicine_id.replace("-", " "))
    if live:
        return live
    raise HTTPException(status_code=404, detail="Medicine not found")


@app.post("/api/medicines/search")
@limiter.limit("20/minute")
async def search_medicines(request: Request, payload: schemas.MedicineSearch):
    q = payload.query.lower().strip()
    if not q:
        return {"results": [], "count": 0}

    resolved = DRUG_ALIASES.get(q, q)
    alias_match = q
    for alias, real in DRUG_ALIASES.items():
        if q == alias or alias in q.split() or q in alias.split():
            alias_match = real
            break

    search_terms = list(dict.fromkeys([q, resolved, alias_match]))

    local_results = []
    for m in LOCAL_MEDICINES:
        name_l = m["name"].lower()
        brand_l = m.get("brand", "").lower()
        if any(
            term in name_l or term in brand_l
            or any(term in use.lower() for use in m.get("uses", []))
            or any(term in s.lower() for s in m.get("symptoms_treated", []))
            for term in search_terms
        ):
            if m not in local_results:
                local_results.append(m)

    live_results = await openfda_client.search_medicines_live(resolved, limit=10)
    local_names = {m["name"].lower() for m in local_results}
    merged = local_results + [m for m in live_results if m["name"].lower() not in local_names]

    if not merged:
        # Try disease/condition knowledge base
        for disease_name, info in DISEASE_KNOWLEDGE.items():
            if q in disease_name or disease_name in q or any(q in sym.lower() for sym in info.get("symptoms", [])):
                for med_name in info.get("treatment", []):
                    found = next((m for m in LOCAL_MEDICINES if m["name"].lower() in med_name.lower()), None)
                    if not found:
                        found = await openfda_client.get_medicine_detail_live(med_name)
                    if found and found["name"].lower() not in local_names:
                        merged.append(found)
                        local_names.add(found["name"].lower())
                break

    return {"results": merged, "count": len(merged)}


@app.post("/api/medicines/conditions")
async def search_by_condition(payload: schemas.MedicineSearch):
    q = payload.query.lower()
    results = []
    q_resolved = DRUG_ALIASES.get(q, q)

    for m in LOCAL_MEDICINES:
        matches = any(
            term in s.lower() for term in [q, q_resolved]
            for s in m.get("symptoms_treated", [])
        ) or any(
            term in u.lower() for term in [q, q_resolved]
            for u in m.get("uses", [])
        )
        if matches:
            results.append({
                "name": m["name"], "brand": m["brand"],
                "uses": m.get("uses", []),
                "dosage": m.get("dosage", {}).get("adult", "Consult doctor"),
                "category": m.get("category", "General"),
            })

    if len(results) < 3:
        try:
            live = await openfda_client.search_medicines_live(q, limit=5)
            existing_names = {r["name"].lower() for r in results}
            for med in live:
                if med["name"].lower() not in existing_names:
                    results.append({
                        "name": med["name"], "brand": med.get("brand", ""),
                        "uses": med.get("uses", []),
                        "dosage": med.get("dosage", {}).get("adult", "Consult doctor"),
                        "category": med.get("category", ""),
                    })
        except Exception as e:
            logger.warning(f"openFDA condition search failed: {e}")

    return {"condition": payload.query, "possible_medicines": results, "count": len(results)}


@app.post("/api/medicines/interactions")
async def check_interactions(payload: schemas.InteractionCheck):
    med_names = [name.strip() for name in payload.medication.split(",") if name.strip()]
    if not med_names:
        return {"error": "Please enter at least one medication."}

    resolved_meds = []
    warnings: List[str] = []
    recommendations: List[str] = []

    resolved = []
    for m_name in med_names:
        lower = m_name.lower()
        resolved_name = DRUG_ALIASES.get(lower, lower)
        if resolved_name == lower:
            for alias, real in DRUG_ALIASES.items():
                if alias == lower or lower.startswith(alias + " ") or lower.endswith(" " + alias):
                    resolved_name = real
                    break
        if "+" in resolved_name:
            parts = [p.strip() for p in resolved_name.split("+") if p.strip()]
            resolved.extend(parts)
        else:
            resolved.append(resolved_name)
    med_names = resolved

    for m_name in med_names:
        med = next((m for m in LOCAL_MEDICINES if m["name"].lower() == m_name.lower()), None)
        if not med:
            live = await openfda_client.get_medicine_detail_live(m_name)
            if live:
                med = live
        if med:
            resolved_meds.append(med)
        else:
            warnings.append(f"Medication '{m_name}' could not be resolved. Check spelling.")

    resolved_names = [m["name"].lower() for m in resolved_meds]

    nsaids = ["ibuprofen", "aspirin", "naproxen", "diclofenac", "meloxicam"]
    detected_nsaids = [n for n in nsaids if any(n in name for name in resolved_names)]
    if len(detected_nsaids) > 1:
        warnings.append(f"Combination of {', '.join(detected_nsaids).title()} significantly increases risk of stomach ulcers and GI bleeding.")

    thinners = ["warfarin", "clopidogrel", "apixaban", "rivaroxaban", "heparin"]
    has_thinner = any(t in name for t in thinners for name in resolved_names)
    has_nsaid = any(n in name for n in nsaids if n != "aspirin" for name in resolved_names)
    if has_thinner and has_nsaid:
        warnings.append("Combining blood thinners with NSAIDs greatly increases risk of severe internal bleeding.")

    depressants = ["alcohol", "ethanol", "xanax", "diazepam", "lorazepam", "gabapentin", "tramadol", "codeine"]
    has_depressant = any(d in name for d in depressants for name in resolved_names)
    has_antihistamine = any(a in name for a in ["cetirizine", "loratadine", "diphenhydramine", "fexofenadine"] for name in resolved_names)
    if has_depressant and has_antihistamine:
        warnings.append("Combining alcohol/sedatives with antihistamines can cause severe drowsiness and impaired coordination.")

    has_nitrate = any(n in name for n in ["nitroglycerin", "isosorbide", "nitrate"] for name in resolved_names)
    has_sildenafil = any(s in name for s in ["sildenafil", "viagra", "tadalafil", "cialis"] for name in resolved_names)
    if has_nitrate and has_sildenafil:
        warnings.append("DANGEROUS: Combining nitrates and PDE5 inhibitors can cause a life-threatening drop in blood pressure.")

    for med in resolved_meds:
        med_name = med["name"].lower()
        for condition in payload.conditions:
            c = condition.lower()
            if any(w in c for w in ["liver", "hepatic"]):
                if "paracetamol" in med_name or "acetaminophen" in med_name:
                    warnings.append(f"{med['name']}: High risk of liver damage with liver disease.")
                if "metformin" in med_name:
                    warnings.append(f"{med['name']}: Metformin with liver disease increases lactic acidosis risk.")
            if any(w in c for w in ["kidney", "renal"]):
                if "ibuprofen" in med_name or "naproxen" in med_name:
                    warnings.append(f"{med['name']}: NSAIDs can worsen kidney function.")
                if "amoxicillin" in med_name:
                    warnings.append(f"{med['name']}: Amoxicillin dose adjustment may be needed for kidney impairment.")
            if any(w in c for w in ["stomach", "ulcer", "gastritis"]):
                if "ibuprofen" in med_name or "aspirin" in med_name or "naproxen" in med_name:
                    warnings.append(f"{med['name']}: High risk of stomach bleeding/irritation. Take with food.")
            if "pregnan" in c or "breastfeed" in c:
                if "ibuprofen" in med_name or "aspirin" in med_name:
                    warnings.append(f"{med['name']}: Should be avoided in the third trimester of pregnancy.")
                recommendations.append(f"{med['name']}: Consult obstetrician before taking during pregnancy/breastfeeding.")
            if "allerg" in c:
                if "penicillin" in med_name or "amoxicillin" in med_name:
                    warnings.append(f"{med['name']}: Penicillin allergy warning — do NOT use Amoxicillin/Penicillin.")

    if not warnings:
        recommendations.append("No critical interactions detected for this combination.")
    else:
        recommendations.append("Please consult a qualified pharmacist or doctor before taking this combination.")

    resolved_display_names = ", ".join([m["name"] for m in resolved_meds]) or payload.medication
    return {
        "medication": resolved_display_names,
        "warnings": warnings,
        "recommendations": list(set(recommendations)),
    }


# ============================================================
# DISEASES
# ============================================================

@app.get("/api/diseases")
async def get_diseases():
    return [{"name": name, **info} for name, info in DISEASE_KNOWLEDGE.items()]


@app.get("/api/diseases/{disease_name}")
async def get_disease(disease_name: str):
    key = disease_name.lower().replace("-", " ")
    info = DISEASE_KNOWLEDGE.get(key)
    if not info:
        raise HTTPException(status_code=404, detail="Disease not found")
    return {"name": key, **info}


@app.post("/api/diseases/search")
async def search_diseases(payload: schemas.MedicineSearch):
    q = payload.query.lower().strip()
    results = [
        {"name": name, **info}
        for name, info in DISEASE_KNOWLEDGE.items()
        if q in name or any(q in s.lower() for s in info.get("symptoms", []))
    ]
    return {"results": results, "count": len(results)}


# ============================================================
# SAVED SEARCHES
# ============================================================

@app.post("/api/saved-searches", response_model=schemas.SavedSearchOut)
async def create_saved_search(
    payload: schemas.SavedSearchCreate,
    req: Request,
    current_user: dict = Depends(get_current_user_profile),
):
    item = await insert_saved_search({
        "user_id": current_user["id"],
        "query_type": payload.query_type,
        "query_value": payload.query_value,
    })
    await _log_activity(current_user["id"], "bookmark_added", f"Bookmarked {payload.query_type}: {payload.query_value}", req)
    return item


@app.get("/api/saved-searches", response_model=List[schemas.SavedSearchOut])
async def list_saved_searches(current_user: dict = Depends(get_current_user_profile)):
    return await get_saved_searches(current_user["id"])


@app.delete("/api/saved-searches/{item_id}")
async def delete_saved_search_route(item_id: str, current_user: dict = Depends(get_current_user_profile)):
    await delete_saved_search(item_id, current_user["id"])
    return {"status": "deleted"}


# ============================================================
# EMERGENCY & LOCATION
# ============================================================

demo_hospitals = [
    {"name": "City General Hospital", "address": "123 Health Avenue, Downtown", "phone": "+91 9876543210", "distance": 1.2, "types": ["Hospital"], "available": True, "lat": 40.7580, "lng": -73.9855},
    {"name": "Apollo Medical Center", "address": "456 Wellness Road, Medical District", "phone": "+91 9876543211", "distance": 2.5, "types": ["Hospital"], "available": True, "lat": 40.7505, "lng": -73.9934},
    {"name": "MediHeal Clinic", "address": "789 Care Street, Central", "phone": "+91 9876543212", "distance": 1.8, "types": ["Clinic"], "available": True, "lat": 40.7614, "lng": -73.9776},
    {"name": "National Institute of Health", "address": "321 Research Boulevard, West End", "phone": "+91 9876543213", "distance": 3.0, "types": ["Hospital"], "available": True, "lat": 40.7549, "lng": -73.9840},
]

demo_pharmacies = [
    {"name": "MediPharm Pharmacy", "address": "123 Health Avenue, Downtown", "phone": "+91 9876543220", "distance": 0.5, "services": ["Home Delivery"], "lat": 40.7580, "lng": -73.9855},
    {"name": "Wellness Drug Store", "address": "456 Wellness Road, Medical District", "phone": "+91 9876543221", "distance": 1.0, "services": ["Home Delivery"], "lat": 40.7505, "lng": -73.9934},
    {"name": "24-Hour Health Plus", "address": "789 Care Street, Central", "phone": "+91 9876543222", "distance": 1.5, "services": ["24/7 Service", "Home Delivery"], "lat": 40.7614, "lng": -73.9776},
    {"name": "GoodLife Medical Supplies", "address": "321 Research Boulevard, West End", "phone": "+91 9876543223", "distance": 2.0, "services": ["Medical Equipment"], "lat": 40.7549, "lng": -73.9840},
]


def _haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _build_osm_viewbox(lat: float, lng: float, radius_km: float) -> str:
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / max(1e-6, 111.0 * math.cos(math.radians(lat)))
    return f"{lng - lng_delta},{lat - lat_delta},{lng + lng_delta},{lat + lat_delta}"


async def _query_osm_places(lat: float, lng: float, place_type: str, radius_km: int = 10):
    # Use Overpass API for proper radius-based search
    amenity_map = {
        "hospital": ["hospital", "clinic"],
        "pharmacy": ["pharmacy"],
        "clinic": ["clinic"],
        "all": ["hospital", "clinic", "pharmacy"],
    }
    amenities = amenity_map.get(place_type, [place_type])
    amenity_filter = "".join(f'["amenity"="{a}"]' for a in amenities)
    # Build Overpass query for nearby places within radius
    overpass_query = f"""
    [out:json][timeout:8];
    (
      node{amenity_filter}(around:{radius_km * 1000},{lat},{lng});
      way{amenity_filter}(around:{radius_km * 1000},{lat},{lng});
      relation{amenity_filter}(around:{radius_km * 1000},{lat},{lng});
    );
    out center 30;
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": overpass_query},
                headers={"User-Agent": "MendlyHealthPlatform/1.0"}
            )
            response.raise_for_status()
            data = response.json()
            elements = data.get("elements", [])
            if elements:
                results = []
                for el in elements:
                    el_lat = el.get("lat") or el.get("center", {}).get("lat")
                    el_lon = el.get("lon") or el.get("center", {}).get("lon")
                    if not el_lat or not el_lon:
                        continue
                    tags = el.get("tags", {})
                    name = tags.get("name", tags.get("name:en", ""))
                    if not name:
                        continue
                    street = tags.get("addr:street", "")
                    city = tags.get("addr:city", "")
                    display = ", ".join(filter(None, [name, street, city]))
                    osm_type = tags.get("amenity", place_type)
                    results.append({
                        "lat": str(el_lat),
                        "lon": str(el_lon),
                        "display_name": display,
                        "address": {"name": name, "street": street, "city": city},
                        "osm_value": osm_type,
                        "opening_hours": tags.get("opening_hours", ""),
                        "phone": tags.get("phone", tags.get("contact:phone", "")),
                    })
                return results
    except Exception as e:
        logger.warning(f"Overpass search failed for {place_type}: {e}")

    # Fallback to Photon
    headers = {"User-Agent": "MendlyHealthPlatform/1.0 (contact@mendlyhealth.com)", "Accept-Language": "en"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                "https://photon.komoot.io/api/",
                params={"q": place_type, "lat": lat, "lon": lng, "limit": 50, "lang": "en"},
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            features = data.get("features", [])
            if features:
                results = []
                for f in features:
                    props = f.get("properties", {})
                    coords = f.get("geometry", {}).get("coordinates", [0, 0])
                    results.append({
                        "lat": str(coords[1]),
                        "lon": str(coords[0]),
                        "display_name": ", ".join(filter(None, [
                            props.get("name", ""),
                            props.get("street", ""),
                            props.get("city", ""),
                            props.get("state", ""),
                            props.get("country", "")
                        ])),
                        "address": props,
                        "osm_value": props.get("osm_value", props.get("type", "")),
                    })
                return results
    except Exception as e:
        logger.warning(f"Photon nearby search failed: {e}")
    
    # Fallback to Nominatim
    viewbox = _build_osm_viewbox(lat, lng, radius_km)
    params = {"format": "json", "q": place_type, "addressdetails": 1, "limit": 50, "bounded": 1, "viewbox": viewbox}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
        response.raise_for_status()
        return response.json()


async def _search_osm_by_name(query: str, place_type: str):
    headers = {"User-Agent": "MendlyHealthPlatform/1.0 (contact@mendlyhealth.com)", "Accept-Language": "en"}
    search_variants = {
        "hospital": [f"{query} hospital", f"{query} clinic", f"{query} healthcare", f"{query} medical center", f"{query} medical store", f"{query} pharmacy"],
        "pharmacy": [f"{query} pharmacy", f"{query} chemist", f"{query} drugstore", f"{query} medical store", f"{query} hospital", f"{query} medical centre"],
        "all": [f"{query} hospital", f"{query} clinic", f"{query} pharmacy", f"{query} chemist", f"{query} medical store", f"{query} drugstore", f"{query} healthcare", f"{query} medical center"],
    }
    queries = search_variants.get(place_type, [f"{query} {place_type}"])
    
    # Try Photon first
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            all_places = []
            seen = set()
            for q in queries:
                try:
                    response = await client.get(
                        "https://photon.komoot.io/api/",
                        params={"q": q, "limit": 10, "lang": "en"},
                        headers=headers
                    )
                    response.raise_for_status()
                    data = response.json()
                    for f in data.get("features", []):
                        props = f.get("properties", {})
                        coords = f.get("geometry", {}).get("coordinates", [0, 0])
                        key = f"{coords[1]},{coords[0]}"
                        if key in seen:
                            continue
                        seen.add(key)
                        raw_address = ", ".join(filter(None, [
                            props.get("name", ""),
                            props.get("street", ""),
                            props.get("city", ""),
                            props.get("state", ""),
                            props.get("country", "")
                        ]))
                        address = ", ".join(raw_address.split(",")[:3]) if raw_address else "Address not available"
                        all_places.append({
                            "name": props.get("name", place_type).split(",")[0],
                            "address": address, "phone": "N/A", "distance": None,
                            "lat": coords[1], "lng": coords[0],
                            "types": [place_type.capitalize()], "available": True, "services": ["Name search"],
                        })
                except Exception:
                    continue
            if all_places:
                return all_places[:20]
    except Exception as e:
        logger.warning(f"Photon name search failed, trying Nominatim: {e}")
    
    # Fallback to Nominatim
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            all_places = []
            seen = set()
            for q in queries:
                params = {"format": "json", "q": q, "addressdetails": 1, "limit": 10}
                try:
                    response = await client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
                    response.raise_for_status()
                    for item in response.json():
                        key = f"{item.get('lat','')},{item.get('lon','')}"
                        if key in seen:
                            continue
                        seen.add(key)
                        raw_address = item.get("display_name", "")
                        address = ", ".join(raw_address.split(",")[:3]) if raw_address else "Address not available"
                        all_places.append({
                            "name": item.get("display_name", place_type).split(",")[0],
                            "address": address, "phone": "N/A", "distance": None,
                            "lat": float(item.get("lat", 0)), "lng": float(item.get("lon", 0)),
                            "types": [place_type.capitalize()], "available": True, "services": ["Name search"],
                        })
                except Exception:
                    continue
            if all_places:
                return all_places[:20]
    except Exception as e:
        logger.warning(f"OSM name search failed: {e}")
    return []


async def get_nearby_places(lat: float, lng: float, place_type: str, radius: int = 50):
    type_query = "hospital" if place_type == "hospital" else ("pharmacy" if place_type == "pharmacy" else "all")
    search_terms = {
        "hospital": ["hospital", "clinic", "healthcare", "medical center", "health centre", "medical store", "pharmacy", "drugstore", "chemist"],
        "pharmacy": ["pharmacy", "chemist", "drugstore", "medical store", "pharmacy centre", "hospital", "clinic", "medical centre"],
        "all": ["hospital", "clinic", "healthcare", "medical center", "health centre", "pharmacy", "chemist", "drugstore", "medical store", "pharmacy centre", "medical centre"],
    }
    terms = search_terms.get(type_query, [type_query])
    try:
        # Search all terms and merge results (deduplicate by coordinates)
        seen = set()
        all_results = []
        for term in terms:
            osm_results = await _query_osm_places(lat, lng, term, radius)
            if isinstance(osm_results, list):
                for item in osm_results:
                    key = f"{item.get('lat','')},{item.get('lon','')}"
                    if key not in seen:
                        seen.add(key)
                        all_results.append(item)
        places = []
        for item in all_results:
            distance = _haversine_distance(lat, lng, float(item.get("lat", lat)), float(item.get("lon", lng)))
            raw_address = item.get("display_name", "")
            address = ", ".join(raw_address.split(",")[:3]) if raw_address else "Address not available"
            osm_val = str(item.get("osm_value", "")).lower()
            # Extract opening hours from OSM properties
            hours = item.get("opening_hours") or item.get("address", {}).get("opening_hours") if isinstance(item.get("address"), dict) else None
            if place_type == "all":
                if any(k in osm_val for k in ("pharmacy", "chemist", "drugstore", "medical_shop", "pharmacy_centre")):
                    facility_type = "Pharmacy"
                elif any(k in osm_val for k in ("hospital", "clinic", "healthcare", "medical_centre", "medical_center", "health_centre")):
                    facility_type = "Hospital"
                else:
                    facility_type = "Medical"
            else:
                facility_type = place_type.capitalize()
            places.append({
                "name": item.get("display_name", type_query).split(",")[0],
                "address": address, "phone": "N/A", "distance": round(distance, 1),
                "types": [facility_type], "available": True, "services": ["Near you"],
                "osm_value": osm_val,
                "opening_hours": hours,
                "lat": float(item.get("lat", lat)),
                "lng": float(item.get("lon", lng)),
            })
        places.sort(key=lambda x: x["distance"])
        return places[:25]
    except Exception as e:
        logger.warning(f"Nearby places search failed: {e}")
    return []


@app.get("/api/emergency/contacts")
async def get_emergency_contacts(country: Optional[str] = None):
    if country:
        found = next((c for c in EMERGENCY_CONTACTS if c["country"].lower() == country.lower()), None)
        if found:
            return found
    return EMERGENCY_CONTACTS


@app.post("/api/emergency/hospitals/nearby")
async def get_nearby_hospitals(location: schemas.LocationRequest):
    radius = location.radius if location.radius is not None else 35
    if location.lat != 0 and location.lng != 0:
        hospitals = await get_nearby_places(location.lat, location.lng, "hospital", radius if radius > 0 else 100)
        if hospitals:
            return {"hospitals": hospitals, "count": len(hospitals)}
    return {"hospitals": demo_hospitals, "count": len(demo_hospitals)}


@app.get("/api/emergency/hospitals")
async def get_hospitals():
    return demo_hospitals


@app.post("/api/emergency/hospitals/search")
async def search_hospitals(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    radius = request.radius if request.radius is not None else 35
    hospitals = []
    if request.lat != 0 and request.lng != 0:
        hospitals = await get_nearby_places(request.lat, request.lng, "hospital", radius if radius > 0 else 100)
    if q:
        hospitals = [h for h in hospitals if q in h["name"].lower() or q in h["address"].lower()]
        if not hospitals:
            name_results = await _search_osm_by_name(request.query, "hospital")
            hospitals = name_results
    elif not hospitals:
        hospitals = demo_hospitals
    return {"hospitals": hospitals, "count": len(hospitals)}


@app.post("/api/emergency/pharmacies/nearby")
async def get_nearby_pharmacies(location: schemas.LocationRequest):
    radius = location.radius if location.radius is not None else 35
    if location.lat != 0 and location.lng != 0:
        pharmacies = await get_nearby_places(location.lat, location.lng, "pharmacy", radius if radius > 0 else 100)
        if pharmacies:
            return {"pharmacies": pharmacies, "count": len(pharmacies)}
    return {"pharmacies": demo_pharmacies, "count": len(demo_pharmacies)}


@app.get("/api/emergency/pharmacies")
async def get_pharmacies():
    return demo_pharmacies


@app.post("/api/emergency/pharmacies/search")
async def search_pharmacies(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    radius = request.radius if request.radius is not None else 35
    pharmacies = []
    if request.lat != 0 and request.lng != 0:
        pharmacies = await get_nearby_places(request.lat, request.lng, "pharmacy", radius if radius > 0 else 100)
    if q:
        pharmacies = [p for p in pharmacies if q in p["name"].lower() or q in p["address"].lower()]
        if not pharmacies:
            name_results = await _search_osm_by_name(request.query, "pharmacy")
            pharmacies = name_results
    elif not pharmacies:
        pharmacies = demo_pharmacies
    return {"pharmacies": pharmacies, "count": len(pharmacies)}


@app.post("/api/emergency/nearby")
async def get_nearby_medical(location: schemas.LocationRequest):
    radius = location.radius if location.radius is not None else 35
    if location.lat != 0 and location.lng != 0:
        places = await get_nearby_places(location.lat, location.lng, "all", radius if radius > 0 else 100)
        if places:
            return {"places": places, "count": len(places)}
    return {"places": demo_hospitals + demo_pharmacies, "count": len(demo_hospitals) + len(demo_pharmacies)}


@app.post("/api/emergency/search")
async def search_medical(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    radius = request.radius if request.radius is not None else 35
    places = []
    if request.lat != 0 and request.lng != 0:
        places = await get_nearby_places(request.lat, request.lng, "all", radius if radius > 0 else 100)
    if q:
        places = [p for p in places if q in p["name"].lower() or q in p["address"].lower()]
        if not places:
            name_results = await _search_osm_by_name(request.query, "all")
            places = name_results
    elif not places:
        places = demo_hospitals + demo_pharmacies
    return {"places": places, "count": len(places)}


@app.get("/api/health")
async def health_check():
    try:
        await users.find_one({}, {"_id": 1})
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "service": "Mendly API", "version": "4.0.0", "database": "connected" if db_ok else "disconnected"}


# ============================================================
# HELPERS
# ============================================================