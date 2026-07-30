import time
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

WORKING_WINDOW = 20
EPISODIC_DAYS = 30

async def get_working_memory(session_id: str, messages: list) -> list:
    window = messages[-WORKING_WINDOW:] if len(messages) > WORKING_WINDOW else messages
    return window


async def get_episodic_memory(
    db: AsyncIOMotorDatabase, user_id: str, limit: int = 5
) -> list:
    cutoff = time.time() - (EPISODIC_DAYS * 86400)
    cursor = (
        db.sessions.find({"user_id": user_id, "created_at": {"$gte": cutoff}})
        .sort("created_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def get_summarized_memory(
    db: AsyncIOMotorDatabase, user_id: str
) -> Optional[dict]:
    return await db.memory_summaries.find_one(
        {"user_id": user_id}, sort=[("updated_at", -1)]
    )


async def save_summary(
    db: AsyncIOMotorDatabase, user_id: str, summary: str, topics: list
) -> None:
    await db.memory_summaries.update_one(
        {"user_id": user_id},
        {"$set": {"summary": summary, "topics": topics, "updated_at": time.time()}},
        upsert=True,
    )


async def assemble_context(
    db: AsyncIOMotorDatabase,
    user_id: str,
    session_id: str,
    current_messages: list,
    knowledge_base_entry: Optional[str] = None,
) -> str:
    context_parts = []

    profile = await db.users.find_one({"user_id": user_id})
    if profile:
        saved_items = profile.get("saved_medicines", [])
        if saved_items:
            context_parts.append(
                f"User has saved these medicines: {', '.join(saved_items[:5])}."
            )

    episodic = await get_episodic_memory(db, user_id)
    for session in episodic:
        if session.get("summary"):
            context_parts.append(f"[Past session] {session['summary']}")

    recent = get_working_memory(session_id, current_messages)
    if recent:
        formatted = "\n".join(
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}"
            for m in recent
        )
        context_parts.append(f"Recent conversation:\n{formatted}")

    if knowledge_base_entry:
        context_parts.append(f"Reference information:\n{knowledge_base_entry}")

    return "\n\n".join(context_parts)
