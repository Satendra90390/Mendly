import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_profile(user_id: str) -> dict | None:
    result = supabase.table("profiles").select("*").eq("id", user_id).execute()
    return result.data[0] if result.data else None


def get_profile_by_email(email: str) -> dict | None:
    result = supabase.table("profiles").select("*").eq("email", email).execute()
    return result.data[0] if result.data else None


def get_profile_by_phone(phone: str) -> dict | None:
    result = supabase.table("profiles").select("*").eq("phone", phone).execute()
    return result.data[0] if result.data else None


def insert_profile(data: dict) -> dict:
    result = supabase.table("profiles").insert(data).execute()
    return result.data[0] if result.data else data


def update_profile(user_id: str, data: dict) -> dict:
    result = supabase.table("profiles").update(data).eq("id", user_id).execute()
    return result.data[0] if result.data else data


def delete_profile(user_id: str):
    supabase.table("profiles").delete().eq("id", user_id).execute()


def insert_activity_log(data: dict):
    supabase.table("activity_logs").insert(data).execute()


def get_activity_logs(user_id: str, limit: int = 50) -> list:
    result = (
        supabase.table("activity_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(min(limit, 200))
        .execute()
    )
    return result.data or []


def delete_activity_logs(user_id: str):
    supabase.table("activity_logs").delete().eq("user_id", user_id).execute()


def count_rows(table: str, user_id: str) -> int:
    result = supabase.table(table).select("id", count="exact").eq("user_id", user_id).execute()
    return result.count or 0


def insert_chat_message(data: dict):
    supabase.table("chat_messages").insert(data).execute()


def get_chat_history(user_id: str, limit: int = 100) -> list:
    result = (
        supabase.table("chat_messages")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(min(limit, 200))
        .execute()
    )
    return list(reversed(result.data or []))


def get_recent_chat_messages(user_id: str, limit: int = 10) -> list:
    result = (
        supabase.table("chat_messages")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(reversed(result.data or []))


def delete_chat_messages(user_id: str):
    supabase.table("chat_messages").delete().eq("user_id", user_id).execute()


def insert_saved_search(data: dict) -> dict:
    result = supabase.table("saved_searches").insert(data).execute()
    return result.data[0] if result.data else data


def get_saved_searches(user_id: str) -> list:
    result = (
        supabase.table("saved_searches")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def delete_saved_search(item_id: int, user_id: str) -> bool:
    result = (
        supabase.table("saved_searches")
        .delete()
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    return True
