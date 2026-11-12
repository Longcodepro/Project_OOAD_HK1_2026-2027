"""WebSocket Router phục vụ đồng bộ dữ liệu thời gian thực (Real-time).

Theo thiết kế OOAD (Observer Pattern):
- `/ws/trips/{trip_id}`: Cho phép các trình duyệt theo dõi trực tiếp trạng thái các ghế
  trên chuyến xe (ghế đang giữ, ghế vừa nhả, ghế vừa bán).
- `/ws/orders/{order_id}`: Cho phép màn hình checkout theo dõi tức thì khi khách hàng
  quét mã QR VietQR hoặc thanh toán thành công để tự động chuyển trang.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.infrastructure.websocket.hubs import order_hub, trip_seat_hub

logger = logging.getLogger("app.websocket")
router = APIRouter(tags=["kết nối thời gian thực (websocket)"])


@router.websocket("/ws/trips/{trip_id}")
async def ws_trip_seats(websocket: WebSocket, trip_id: int) -> None:
    """Kênh WebSocket lắng nghe biến động sơ đồ ghế của chuyến xe #{trip_id}."""
    await trip_seat_hub.connect(trip_id, websocket)
    try:
        await websocket.send_json(
            {
                "event": "CONNECTED",
                "trip_id": trip_id,
                "message": f"Đã kết nối phòng theo dõi thời gian thực chuyến #{trip_id}",
            }
        )
        while True:
            # Lắng nghe ping / message từ client (nếu có)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "PONG"})
    except WebSocketDisconnect:
        trip_seat_hub.disconnect(trip_id, websocket)
    except Exception as exc:
        logger.warning(f"Lỗi kết nối ws_trip_seats #{trip_id}: {exc}")
        trip_seat_hub.disconnect(trip_id, websocket)


@router.websocket("/ws/orders/{order_id}")
async def ws_order_status(websocket: WebSocket, order_id: int) -> None:
    """Kênh WebSocket lắng nghe trạng thái đơn hàng #{order_id} (thanh toán VietQR / hủy đơn)."""
    await order_hub.connect(order_id, websocket)
    try:
        await websocket.send_json(
            {
                "event": "CONNECTED",
                "order_id": order_id,
                "message": f"Đã kết nối phòng theo dõi đơn hàng #{order_id}",
            }
        )
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "PONG"})
    except WebSocketDisconnect:
        order_hub.disconnect(order_id, websocket)
    except Exception as exc:
        logger.warning(f"Lỗi kết nối ws_order_status #{order_id}: {exc}")
        order_hub.disconnect(order_id, websocket)
