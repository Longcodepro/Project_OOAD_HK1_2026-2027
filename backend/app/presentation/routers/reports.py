from datetime import date as date_type

from fastapi import APIRouter, Depends, Response

from app.application.use_cases.reports import Report, ReportService
from app.domain.entities.account import Role
from app.domain.entities.booking import Channel
from app.presentation.deps import get_report_service, require_roles
from app.presentation.schemas.reports import ReportOut, RouteFillOut, RouteRevenueOut, TripFillOut

router = APIRouter(
    prefix="/admin/reports",
    tags=["admin: thống kê & báo cáo"],
    dependencies=[Depends(require_roles(Role.ADMIN))],
)


def _out(r: Report) -> ReportOut:
    return ReportOut(
        date_from=r.date_from,
        date_to=r.date_to,
        gross=r.gross,
        refunded=r.refunded,
        net=r.net,
        net_by_channel=r.net_by_channel,
        tickets_sold=r.tickets_sold,
        tickets_cancelled=r.tickets_cancelled,
        cancel_rate=r.cancel_rate,
        occupancy=r.occupancy,
        by_route=[
            RouteRevenueOut(
                route_id=x.route_id,
                route=x.route,
                gross=x.gross,
                refunded=x.refunded,
                net=x.net,
                tickets_sold=x.tickets_sold,
                tickets_cancelled=x.tickets_cancelled,
            )
            for x in r.by_route.values()
        ],
        fill_by_route=[
            RouteFillOut(
                route_id=x.route_id, route=x.route, sold=x.sold, total=x.total, rate=x.rate
            )
            for x in r.fill_by_route.values()
        ],
        trips=[
            TripFillOut(
                trip_id=t.trip_id,
                route=t.route,
                departure_at=t.departure_at,
                sold=t.sold,
                total=t.total,
                rate=round(t.sold / t.total, 4) if t.total else 0.0,
            )
            for t in r.trips
        ],
        message="Không có dữ liệu trong kỳ này" if r.empty else None,
    )


@router.get("", response_model=ReportOut)
def report(
    date_from: date_type,
    date_to: date_type,
    route_id: int | None = None,
    channel: Channel | None = None,
    svc: ReportService = Depends(get_report_service),
):
    """Một bộ lọc (từ ngày – đến ngày, tuyến, kênh bán) áp lên cả ba báo cáo."""
    return _out(svc.build(date_from, date_to, route_id, channel))


@router.get("/export.csv")
def export_csv(
    date_from: date_type,
    date_to: date_type,
    route_id: int | None = None,
    channel: Channel | None = None,
    svc: ReportService = Depends(get_report_service),
):
    """Xuất báo cáo dạng CSV (mở được bằng Excel; có BOM để không lỗi tiếng Việt)."""
    text = svc.to_csv(svc.build(date_from, date_to, route_id, channel))
    return Response(
        content=text.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="bao-cao-{date_from}-{date_to}.csv"'
        },
    )
