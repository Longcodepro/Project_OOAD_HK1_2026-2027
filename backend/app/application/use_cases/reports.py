import csv
import io
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from app.application.errors import BusinessRule
from app.application.ports.reports import ReportRepository
from app.domain.clock import vn_day_range_utc

ZERO = Decimal("0.00")


@dataclass
class RouteRevenue:
    route_id: int
    route: str
    gross: Decimal = ZERO
    refunded: Decimal = ZERO
    tickets_sold: int = 0
    tickets_cancelled: int = 0

    @property
    def net(self) -> Decimal:
        return self.gross - self.refunded


@dataclass
class RouteFill:
    route_id: int
    route: str
    sold: int = 0
    total: int = 0

    @property
    def rate(self) -> float:
        return round(self.sold / self.total, 4) if self.total else 0.0


@dataclass
class Report:
    date_from: date
    date_to: date
    gross: Decimal = ZERO
    refunded: Decimal = ZERO
    tickets_sold: int = 0
    tickets_cancelled: int = 0
    by_route: dict[int, RouteRevenue] = field(default_factory=dict)
    net_by_channel: dict[str, Decimal] = field(default_factory=dict)
    fill_by_route: dict[int, RouteFill] = field(default_factory=dict)
    trips: list = field(default_factory=list)

    @property
    def net(self) -> Decimal:
        return self.gross - self.refunded

    @property
    def cancel_rate(self) -> float:
        return round(self.tickets_cancelled / self.tickets_sold, 4) if self.tickets_sold else 0.0

    @property
    def occupancy(self) -> float:
        total = sum(f.total for f in self.fill_by_route.values())
        return round(sum(f.sold for f in self.fill_by_route.values()) / total, 4) if total else 0.0

    @property
    def empty(self) -> bool:
        return not (self.gross or self.refunded or self.tickets_sold or self.trips)


class ReportService:
    """UC17: thống kê doanh thu, vé bán/hủy, tỷ lệ lấp đầy. Chỉ đọc."""

    def __init__(self, repo: ReportRepository):
        self.repo = repo

    def build(
        self,
        date_from: date,
        date_to: date,
        route_id: int | None = None,
        channel: str | None = None,
    ) -> Report:
        if date_from > date_to:
            raise BusinessRule("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc")  # E1
        start, end = vn_day_range_utc(date_from, date_to)
        keep = lambda r: (
            (route_id is None or r.route_id == route_id)
            and (channel is None or r.channel == channel)
        )
        rep = Report(date_from, date_to)

        def route(r) -> RouteRevenue:
            return rep.by_route.setdefault(r.route_id, RouteRevenue(r.route_id, r.route))

        for r in filter(keep, self.repo.payments(start, end)):
            route(r).gross += r.amount
            rep.gross += r.amount
            rep.net_by_channel[r.channel] = rep.net_by_channel.get(r.channel, ZERO) + r.amount
        for r in filter(keep, self.repo.refunds(start, end)):
            route(r).refunded += r.amount
            route(r).tickets_cancelled += 1
            rep.refunded += r.amount
            rep.tickets_cancelled += 1
            rep.net_by_channel[r.channel] = rep.net_by_channel.get(r.channel, ZERO) - r.amount
        for r in filter(keep, self.repo.tickets_issued(start, end)):
            route(r).tickets_sold += 1
            rep.tickets_sold += 1
        if channel is None:  # lấp đầy tính theo chuyến, không phân theo kênh bán
            for tf in self.repo.trip_fill(date_from, date_to):
                if route_id is not None and tf.route_id != route_id:
                    continue
                f = rep.fill_by_route.setdefault(tf.route_id, RouteFill(tf.route_id, tf.route))
                f.sold += tf.sold
                f.total += tf.total
                rep.trips.append(tf)
        return rep

    def to_csv(self, rep: Report) -> str:
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["Từ ngày", rep.date_from, "Đến ngày", rep.date_to])
        w.writerow([])
        w.writerow(["Tuyến", "Doanh thu", "Đã hoàn", "Thực thu", "Vé bán", "Vé hủy"])
        for r in rep.by_route.values():
            w.writerow([r.route, r.gross, r.refunded, r.net, r.tickets_sold, r.tickets_cancelled])
        w.writerow(
            ["TỔNG", rep.gross, rep.refunded, rep.net, rep.tickets_sold, rep.tickets_cancelled]
        )
        w.writerow([])
        w.writerow(["Tuyến", "Ghế đã bán", "Tổng ghế", "Tỷ lệ lấp đầy"])
        for f in rep.fill_by_route.values():
            w.writerow([f.route, f.sold, f.total, f"{f.rate:.1%}"])
        return buf.getvalue()
