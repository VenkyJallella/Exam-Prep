"""WebSocket support for real-time features.

Provides:
- Timer sync for test sessions
- Live leaderboard updates
- Notification delivery
"""
import json
import logging
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from jose import jwt, JWTError
from app.config import settings

router = APIRouter()
logger = logging.getLogger("examprep.ws")


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info("WebSocket connected: user=%s (total=%d)", user_id, len(self.active_connections))

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info("WebSocket disconnected: user=%s", user_id)

    async def send_personal(self, user_id: str, message: dict):
        """Send message to a specific user."""
        if user_id in self.active_connections:
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def broadcast(self, message: dict):
        """Send message to all connected users."""
        for user_id, connections in self.active_connections.items():
            for ws in connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


def _authenticate_ws(token: str) -> str | None:
    """Authenticate WebSocket connection via JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload.get("sub")
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    user_id = _authenticate_ws(token)
    if not user_id:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type == "timer_sync":
                    # Echo back server time for sync
                    from datetime import datetime, timezone
                    await websocket.send_json({
                        "type": "timer_sync",
                        "server_time": datetime.now(timezone.utc).isoformat(),
                        "client_time": message.get("client_time"),
                    })

                elif msg_type == "subscribe":
                    channel = message.get("channel")
                    await websocket.send_json({
                        "type": "subscribed",
                        "channel": channel,
                    })

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


# Helper function for other services to send notifications
async def notify_user(user_id: str, event: str, data: dict):
    """Send a real-time notification to a user."""
    await manager.send_personal(user_id, {"type": event, "data": data})


async def notify_leaderboard_update():
    """Broadcast leaderboard update to all connected users."""
    await manager.broadcast({"type": "leaderboard_update"})
