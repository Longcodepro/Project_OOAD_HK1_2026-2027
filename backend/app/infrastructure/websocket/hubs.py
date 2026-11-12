"""Hệ thống Quản lý Kết nối WebSocket theo mẫu thiết kế Observer / PubSub (OOAD).

Cung cấp hai Hub chính:
1. TripSeatHub: Phát thông báo thời gian thực về trạng thái ghế (giữ chỗ, nhả chỗ, thanh toán)
   tới tất cả các client đang xem sơ đồ ghế của chuyến xe đó.
2. OrderHub: Phát thông báo thời gian thực về trạng thái đơn hàng (đã thanh toán, bị hủy)
   tới client đang mở trang thanh toán / quét mã QR VietQR.
"""

from __future__ import annotations

import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger("app.websocket")


class TripSeatHub:
    """Subject quản lý danh sách Observer (WebSocket clients) đang quan sát chuyến xe."""

    def __init__(self) -> None:
        self._rooms: dict[int, set[WebSocket]] = {}

    async def connect(self, trip_id: int, ws: WebSocket) -> None:
        await ws.accept()
        if trip_id not in self._rooms:
            self._rooms[trip_id] = set()
        self._rooms[trip_id].add(ws)
        logger.info(f"WebSocket client connected to trip #{trip_id}. Total: {len(self._rooms[trip_id])}")

    def disconnect(self, trip_id: int, ws: WebSocket) -> None:
        if trip_id in self._rooms:
            self._rooms[trip_id].discard(ws)
            if not self._rooms[trip_id]:
                del self._rooms[trip_id]
        logger.info(f"WebSocket client disconnected from trip #{trip_id}")

    async def broadcast(self, trip_id: int, message: dict[str, Any]) -> None:
        """Phát thông điệp cập nhật trạng thái ghế đến tất cả client trong phòng."""
        clients = self._rooms.get(trip_id, set()).copy()
        if not clients:
            return
        dead: list[WebSocket] = []
        for ws in clients:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(trip_id, ws)

    async def broadcast_seat_held(self, trip_id: int, seat_id: int, hold_until: str | None = None) -> None:
        await self.broadcast(
            trip_id,
            {
                "event": "SEATS_HELD",
                "trip_id": trip_id,
                "seat_ids": [seat_id],
                "status": "held",
                "hold_until": hold_until,
            },
        )

    async def broadcast_seat_released(self, trip_id: int, seat_ids: list[int]) -> None:
        await self.broadcast(
            trip_id,
            {
                "event": "SEATS_RELEASED",
                "trip_id": trip_id,
                "seat_ids": seat_ids,
                "status": "available",
            },
        )

    async def broadcast_seats_booked(self, trip_id: int, seat_ids: list[int]) -> None:
        await self.broadcast(
            trip_id,
            {
                "event": "SEATS_BOOKED",
                "trip_id": trip_id,
                "seat_ids": seat_ids,
                "status": "booked",
            },
        )


class OrderHub:
    """Subject quản lý danh sách Observer đang theo dõi một đơn hàng cụ thể."""

    def __init__(self) -> None:
        self._rooms: dict[int, set[WebSocket]] = {}

    async def connect(self, order_id: int, ws: WebSocket) -> None:
        await ws.accept()
        if order_id not in self._rooms:
            self._rooms[order_id] = set()
        self._rooms[order_id].add(ws)
        logger.info(f"WebSocket client connected to order #{order_id}. Total: {len(self._rooms[order_id])}")

    def disconnect(self, order_id: int, ws: WebSocket) -> None:
        if order_id in self._rooms:
            self._rooms[order_id].discard(ws)
            if not self._rooms[order_id]:
                del self._rooms[order_id]
        logger.info(f"WebSocket client disconnected from order #{order_id}")

    async def broadcast(self, order_id: int, message: dict[str, Any]) -> None:
        clients = self._rooms.get(order_id, set()).copy()
        if not clients:
            return
        dead: list[WebSocket] = []
        for ws in clients:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(order_id, ws)

    async def broadcast_order_paid(self, order_id: int, order_code: str | None = None) -> None:
        await self.broadcast(
            order_id,
            {
                "event": "ORDER_PAID",
                "order_id": order_id,
                "order_code": order_code,
                "status": "DA_THANH_TOAN",
            },
        )

    async def broadcast_order_cancelled(self, order_id: int, reason: str = "") -> None:
        await self.broadcast(
            order_id,
            {
                "event": "ORDER_CANCELLED",
                "order_id": order_id,
                "status": "DA_HUY",
                "reason": reason,
            },
        )


# Singleton instances
trip_seat_hub = TripSeatHub()
order_hub = OrderHub()
