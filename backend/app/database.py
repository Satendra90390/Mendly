import os
import ssl
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional, List, Dict, Any
from datetime import datetime

# Load .env file from backend directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is required")

tls_context = ssl.create_default_context()

client = AsyncIOMotorClient(
    MONGODB_URI,
    tls=True,
    tlsAllowInvalidCertificates=False,
    tlsAllowInvalidHostnames=False,
    connectTimeoutMS=30000,
    serverSelectionTimeoutMS=30000,
)
db = client["mendly"]

users = db["users"]
chat_messages = db["chat_messages"]
saved_searches = db["saved_searches"]
activity_logs = db["activity_logs"]


async def init_indexes():
    await users.create_index("email", unique=True)
    await users.create_index("phone", unique=True, sparse=True)  # sparse allows multiple nulls
    await chat_messages.create_index("user_id")
    await chat_messages.create_index([("user_id", 1), ("created_at", -1)])
    await saved_searches.create_index("user_id")
    await activity_logs.create_index("user_id")
    await activity_logs.create_index([("user_id", 1), ("created_at", -1)])


def _to_str_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def _obj_id(user_id: str) -> ObjectId:
    return ObjectId(user_id)


async def get_profile(user_id: str) -> Optional[dict]:
    doc = await users.find_one({"_id": _obj_id(user_id)})
    return _to_str_id(doc) if doc else None


async def get_profile_by_email(email: str) -> Optional[dict]:
    doc = await users.find_one({"email": email.lower()})
    return _to_str_id(doc) if doc else None


async def get_profile_by_phone(phone: str) -> Optional[dict]:
    doc = await users.find_one({"phone": phone})
    return _to_str_id(doc) if doc else None


async def insert_profile(data: dict) -> dict:
    data = {k: v for k, v in data.items() if v is not None}
    data["created_at"] = datetime.utcnow()
    data["last_login"] = datetime.utcnow()
    result = await users.insert_one(data)
    data["_id"] = result.inserted_id
    return _to_str_id(data)


async def update_profile(user_id: str, data: dict) -> dict:
    data["last_login"] = datetime.utcnow()
    await users.update_one({"_id": _obj_id(user_id)}, {"$set": data})
    return await get_profile(user_id)


async def delete_profile(user_id: str):
    await users.delete_one({"_id": _obj_id(user_id)})


async def insert_activity_log(data: dict):
    data["created_at"] = datetime.utcnow()
    await activity_logs.insert_one(data)


async def get_activity_logs(user_id: str, limit: int = 50) -> List[dict]:
    cursor = activity_logs.find({"user_id": _obj_id(user_id)}).sort("created_at", -1).limit(limit)
    return [_to_str_id(doc) async for doc in cursor]


async def delete_activity_logs(user_id: str):
    await activity_logs.delete_many({"user_id": _obj_id(user_id)})


async def count_rows(collection: str, user_id: str) -> int:
    coll = db[collection]
    return await coll.count_documents({"user_id": _obj_id(user_id)})


async def insert_chat_message(data: dict):
    data["user_id"] = _obj_id(data["user_id"])
    data["created_at"] = datetime.utcnow()
    await chat_messages.insert_one(data)


async def get_chat_history(user_id: str, limit: int = 100) -> List[dict]:
    cursor = chat_messages.find({"user_id": _obj_id(user_id)}).sort("created_at", -1).limit(limit)
    docs = [_to_str_id(doc) async for doc in cursor]
    return list(reversed(docs))


async def get_recent_chat_messages(user_id: str, limit: int = 10) -> List[dict]:
    cursor = chat_messages.find({"user_id": _obj_id(user_id)}).sort("created_at", -1).limit(limit)
    docs = [_to_str_id(doc) async for doc in cursor]
    return list(reversed(docs))


async def delete_chat_messages(user_id: str):
    await chat_messages.delete_many({"user_id": _obj_id(user_id)})


async def insert_saved_search(data: dict) -> dict:
    data["user_id"] = _obj_id(data["user_id"])
    data["created_at"] = datetime.utcnow()
    result = await saved_searches.insert_one(data)
    data["_id"] = result.inserted_id
    return _to_str_id(data)


async def get_saved_searches(user_id: str) -> List[dict]:
    cursor = saved_searches.find({"user_id": _obj_id(user_id)}).sort("created_at", -1)
    return [_to_str_id(doc) async for doc in cursor]


async def delete_saved_search(item_id: int, user_id: str) -> bool:
    result = await saved_searches.delete_one({"_id": ObjectId(item_id), "user_id": _obj_id(user_id)})
    return result.deleted_count > 0