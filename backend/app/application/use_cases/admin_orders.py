from app.application.errors import NotFound
from app.application.ports.booking import BookingRepository
from app.domain.entities.booking import Channel, OrderAggregate, OrderStatus


class AdminOrderService:
    """UC18: Admin xem/lọc đơn đặt vé của cả hai kênh. Không hủy đơn ở đây (việc hủy ở UC05/06/13)."""

    def __init__(self, repo: BookingRepository):
        self.repo = repo

    def search(
        self,
        status: OrderStatus | None = None,
        channel: Channel | None = None,
        date_from=None,
        date_to=None,
        phone: str | None = None,
        order_id: int | None = None,
        ticket_id: int | None = None,
    ) -> list[OrderAggregate]:
        return self.repo.search_orders(
            status, channel, date_from, date_to, phone, order_id, ticket_id
        )

    def get(self, order_id: int) -> OrderAggregate:
        agg = self.repo.get_order(order_id)
        if agg is None:
            raise NotFound("Không tìm thấy đơn")
        return agg
