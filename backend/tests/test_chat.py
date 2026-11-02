import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_flow(async_client: AsyncClient):
    """Test sending text message, photo sharing, reading history, and marking read."""
    # 1. Send text message
    text_payload = {
        "sender_index": 0,
        "content": "Hey love, thinking of you! ❤️",
        "message_type": "text",
    }
    res = await async_client.post("/api/couple/chat/messages", json=text_payload)
    assert res.status_code == 200
    created_msg = res.json()
    assert created_msg["content"] == "Hey love, thinking of you! ❤️"
    assert created_msg["sender_index"] == 0
    assert created_msg["message_type"] == "text"
    assert created_msg["is_read"] is False

    # 2. Share a photo
    photo_payload = {
        "sender_index": 1,
        "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        "caption": "Look at this view from my window!",
    }
    photo_res = await async_client.post("/api/couple/chat/upload-photo", json=photo_payload)
    assert photo_res.status_code == 200
    photo_msg = photo_res.json()
    assert photo_msg["message_type"] == "image"
    assert photo_msg["content"] == "Look at this view from my window!"
    assert photo_msg["image_url"] == "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    assert photo_msg["sender_index"] == 1

    # 3. Get message history
    history_res = await async_client.get("/api/couple/chat/messages")
    assert history_res.status_code == 200
    history = history_res.json()
    assert isinstance(history, list)
    assert len(history) >= 2

    # 4. Mark read
    read_res = await async_client.post("/api/couple/chat/mark-read?reader_index=0")
    assert read_res.status_code == 200
    read_data = read_res.json()
    assert read_data["status"] == "ok"

    # 5. Clean up test messages
    from app.core.database import get_session_factory
    from app.models.couple import ChatMessage
    from sqlalchemy import delete

    factory = get_session_factory()
    async with factory() as s:
        await s.execute(delete(ChatMessage).where(ChatMessage.id.in_([created_msg["id"], photo_msg["id"]])))
        await s.commit()
