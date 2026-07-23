import httpx
import math
import os
import logging
import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Request
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
    get_me as get_me_route, change_password, get_account_stats,
    delete_account, get_activity_log, clear_activity_log,
    block_user, unblock_user,
    get_current_user_profile, get_admin_user, _log_activity,
    oauth_google_login, oauth_google_callback,
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
    allow_origins += [
        "https://localhost",
    ]
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


# ============================================================
# OAUTH — Google
# ============================================================

@app.get("/api/auth/google")
async def google_login(request: Request):
    return await oauth_google_login(request)


@app.get("/api/auth/google/callback", include_in_schema=False)
async def google_callback(code: str, state: str, request: Request):
    return await oauth_google_callback(code, state, request)


@app.get("/api/auth/me", response_model=schemas.UserOut)
async def get_me_endpoint(current_user: dict = Depends(get_current_user_profile)):
    return current_user


@app.put("/api/profile", response_model=schemas.UserOut)
async def update_profile_endpoint(payload: schemas.ProfileUpdateRequest, request: Request, current_user: dict = Depends(get_current_user_profile)):
    from .auth import update_profile_route
    return await update_profile_route(payload, request, current_user)


@app.post("/api/profile/change-password")
async def change_password_endpoint(payload: schemas.PasswordChangeRequest, request: Request, current_user: dict = Depends(get_current_user_profile)):
    from .auth import change_password as change_pw
    return await change_pw(payload, request, current_user)


@app.get("/api/profile/stats", response_model=schemas.AccountStats)
async def get_account_stats_endpoint(current_user: dict = Depends(get_current_user_profile)):
    from .auth import get_account_stats as get_stats
    return await get_stats(current_user)


@app.delete("/api/profile")
async def delete_account_endpoint(request: Request, current_user: dict = Depends(get_current_user_profile)):
    return await delete_account(request, current_user)


# ============================================================
# ACTIVITY LOG
# ============================================================

@app.get("/api/activity", response_model=List[schemas.ActivityLogOut])
async def list_activity_log(limit: int = 50, current_user: dict = Depends(get_current_user_profile)):
    return await get_activity_log(limit, current_user)


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
    current_user: dict = Depends(get_current_user_profile),
):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(payload.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters).")

    recent = await get_recent_chat_messages(current_user["id"], 10)
    history = [schemas.ConversationMessage(role=m["role"], content=m["content"]) for m in recent]
    if not history and payload.history:
        history = payload.history[-10:]

    reply = await chatbot.chatbot_response(payload.message, payload.location, history)

    now = _now()
    await insert_chat_message({"user_id": current_user["id"], "role": "user", "content": payload.message[:2000], "created_at": now})
    await insert_chat_message({"user_id": current_user["id"], "role": "bot", "content": reply[:5000], "created_at": now})

    return {"reply": reply, "response": reply}


@app.get("/api/chat/status")
async def get_chat_status(current_user: dict = Depends(get_current_user_profile)):
    return {"provider": chatbot.get_ai_provider(), "racing": True}


@app.get("/api/chat/history", response_model=List[schemas.ChatMessageOut])
async def list_chat_history(current_user: dict = Depends(get_current_user_profile), limit: int = 100):
    return await get_chat_history(current_user["id"], limit)


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
        if alias in q or q in alias:
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
        for disease_name, info in DISEASE_KNOWLEDGE.items():
            if q in disease_name or disease_name in q:
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

    for i, m_name in enumerate(med_names):
        lower = m_name.lower()
        resolved_name = DRUG_ALIASES.get(lower, lower)
        for alias, real in DRUG_ALIASES.items():
            if alias in lower or lower in alias:
                resolved_name = real
                break
        if "+" in resolved_name:
            parts = [p.strip() for p in resolved_name.split("+") if p.strip()]
            med_names[i:i+1] = parts
        else:
            med_names[i] = resolved_name

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
    {"name": "City General Hospital", "address": "123 Health Avenue, Downtown", "phone": "+91 9876543210", "distance": 1.2, "types": ["Hospital"], "available": True},
    {"name": "Apollo Medical Center", "address": "456 Wellness Road, Medical District", "phone": "+91 9876543211", "distance": 2.5, "types": ["Hospital"], "available": True},
    {"name": "MediHeal Clinic", "address": "789 Care Street, Central", "phone": "+91 9876543212", "distance": 1.8, "types": ["Clinic"], "available": True},
    {"name": "National Institute of Health", "address": "321 Research Boulevard, West End", "phone": "+91 9876543213", "distance": 3.0, "types": ["Hospital"], "available": True},
]

demo_pharmacies = [
    {"name": "MediPharm Pharmacy", "address": "123 Health Avenue, Downtown", "phone": "+91 9876543220", "distance": 0.5, "services": ["Home Delivery"]},
    {"name": "Wellness Drug Store", "address": "456 Wellness Road, Medical District", "phone": "+91 9876543221", "distance": 1.0, "services": ["Home Delivery"]},
    {"name": "24-Hour Health Plus", "address": "789 Care Street, Central", "phone": "+91 9876543222", "distance": 1.5, "services": ["24/7 Service", "Home Delivery"]},
    {"name": "GoodLife Medical Supplies", "address": "321 Research Boulevard, West End", "phone": "+91 9876543223", "distance": 2.0, "services": ["Medical Equipment"]},
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
    viewbox = _build_osm_viewbox(lat, lng, radius_km)
    params = {"format": "json", "q": place_type, "addressdetails": 1, "limit": 50, "bounded": 1, "viewbox": viewbox}
    headers = {"User-Agent": "MendlyHealthPlatform/1.0 (contact@mendlyhealth.com)", "Accept-Language": "en"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
        response.raise_for_status()
        return response.json()


async def _search_osm_by_name(query: str, place_type: str):
    params = {"format": "json", "q": f"{query} {place_type}", "addressdetails": 1, "limit": 20}
    headers = {"User-Agent": "MendlyHealthPlatform/1.0 (contact@mendlyhealth.com)", "Accept-Language": "en"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
            response.raise_for_status()
            results = response.json()
            if isinstance(results, list) and results:
                places = []
                for item in results:
                    raw_address = item.get("display_name", "")
                    address = ", ".join(raw_address.split(",")[:3]) if raw_address else "Address not available"
                    places.append({
                        "name": item.get("display_name", place_type).split(",")[0],
                        "address": address, "phone": "N/A", "distance": None,
                        "lat": float(item.get("lat", 0)), "lng": float(item.get("lon", 0)),
                        "types": [place_type.capitalize()], "available": True, "services": ["Name search"],
                    })
                return places
    except Exception as e:
        logger.warning(f"OSM name search failed: {e}")
    return []


async def get_nearby_places(lat: float, lng: float, place_type: str, radius: int = 10):
    type_query = "hospital" if place_type == "hospital" else "pharmacy"
    try:
        osm_results = await _query_osm_places(lat, lng, type_query, radius)
        if isinstance(osm_results, list) and osm_results:
            places = []
            for item in osm_results:
                distance = _haversine_distance(lat, lng, float(item.get("lat", lat)), float(item.get("lon", lng)))
                raw_address = item.get("display_name", "")
                address = ", ".join(raw_address.split(",")[:3]) if raw_address else "Address not available"
                places.append({
                    "name": item.get("display_name", type_query).split(",")[0],
                    "address": address, "phone": "N/A", "distance": round(distance, 1),
                    "types": [place_type.capitalize()], "available": True, "services": ["Near you"],
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
    if location.lat != 0 and location.lng != 0:
        hospitals = await get_nearby_places(location.lat, location.lng, "hospital")
        if hospitals:
            return {"hospitals": hospitals, "count": len(hospitals)}
    return {"hospitals": demo_hospitals, "count": len(demo_hospitals)}


@app.get("/api/emergency/hospitals")
async def get_hospitals():
    return demo_hospitals


@app.post("/api/emergency/hospitals/search")
async def search_hospitals(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    hospitals = []
    if request.lat != 0 and request.lng != 0:
        hospitals = await get_nearby_places(request.lat, request.lng, "hospital")
    if q:
        name_results = await _search_osm_by_name(request.query, "hospital")
        existing_names = {h["name"].lower() for h in hospitals}
        for nr in name_results:
            if nr["name"].lower() not in existing_names:
                hospitals.append(nr)
        hospitals = [h for h in hospitals if q in h["name"].lower() or q in h["address"].lower()]
    elif not hospitals:
        hospitals = demo_hospitals
    return {"hospitals": hospitals, "count": len(hospitals)}


@app.post("/api/emergency/pharmacies/nearby")
async def get_nearby_pharmacies(location: schemas.LocationRequest):
    if location.lat != 0 and location.lng != 0:
        pharmacies = await get_nearby_places(location.lat, location.lng, "pharmacy")
        if pharmacies:
            return {"pharmacies": pharmacies, "count": len(pharmacies)}
    return {"pharmacies": demo_pharmacies, "count": len(demo_pharmacies)}


@app.get("/api/emergency/pharmacies")
async def get_pharmacies():
    return demo_pharmacies


@app.post("/api/emergency/pharmacies/search")
async def search_pharmacies(request: schemas.LocationRequest):
    q = request.query.lower() if request.query else ""
    pharmacies = []
    if request.lat != 0 and request.lng != 0:
        pharmacies = await get_nearby_places(request.lat, request.lng, "pharmacy")
    if q:
        name_results = await _search_osm_by_name(request.query, "pharmacy")
        existing_names = {p["name"].lower() for p in pharmacies}
        for nr in name_results:
            if nr["name"].lower() not in existing_names:
                pharmacies.append(nr)
        pharmacies = [p for p in pharmacies if q in p["name"].lower() or q in p["address"].lower()]
    elif not pharmacies:
        pharmacies = demo_pharmacies
    return {"pharmacies": pharmacies, "count": len(pharmacies)}


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