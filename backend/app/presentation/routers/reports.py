from datetime import date as date_type

from fastapi import APIRouter, Depends, Query, Response

from app.application.use_cases.reports import Report, ReportService
from app.domain.entities.account import Role
from app.domain.entities.booking import Channel
from app.infrastructure.export.reports import to_pdf, to_xlsx
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


@router.get(
    "",
    response_model=ReportOut,
    summary="Báo cáo doanh thu & tỷ lệ lấp đầy",
    description="Tổng hợp dữ liệu doanh thu gộp, hoàn hủy vé, doanh thu thuần (theo kênh bán, theo tuyến đường) và tỷ lệ lấp đầy ghế các chuyến xe trong khoảng thời gian chỉ định.",
)
def report(
    date_from: date_type = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)", examples=["2026-11-01"]),
    date_to: date_type = Query(..., description="Ngày kết thúc (YYYY-MM-DD)", examples=["2026-11-30"]),
    route_id: int | None = Query(None, description="Lọc theo ID tuyến xe (tùy chọn)", examples=[1]),
    channel: Channel | None = Query(None, description="Lọc theo kênh bán (TRUC_TUYEN hoặc TAI_QUAY)"),
    svc: ReportService = Depends(get_report_service),
):
    """Một bộ lọc (từ ngày – đến ngày, tuyến, kênh bán) áp lên toàn bộ số liệu thống kê."""
    return _out(svc.build(date_from, date_to, route_id, channel))


@router.get(
    "/export.csv",
    summary="Xuất báo cáo dạng CSV",
    description="Xuất báo cáo doanh thu theo tuyến xe ra định dạng CSV (mã hóa utf-8-sig kèm BOM để mở tiếng Việt không lỗi trên Microsoft Excel).",
)
def export_csv(
    date_from: date_type = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)", examples=["2026-11-01"]),
    date_to: date_type = Query(..., description="Ngày kết thúc (YYYY-MM-DD)", examples=["2026-11-30"]),
    route_id: int | None = Query(None, description="Lọc theo ID tuyến xe (tùy chọn)"),
    channel: Channel | None = Query(None, description="Lọc theo kênh bán (TRUC_TUYEN hoặc TAI_QUAY)"),
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


XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _file(content: bytes, media: str, name: str) -> Response:
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


@router.get(
    "/export.xlsx",
    summary="Xuất báo cáo dạng Excel (.xlsx)",
    description="Xuất file bảng tính Excel chứa 2 sheet: Doanh thu theo tuyến xe và Tỷ lệ lấp đầy chỗ theo tuyến đường.",
)
def export_xlsx(
    date_from: date_type = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)", examples=["2026-11-01"]),
    date_to: date_type = Query(..., description="Ngày kết thúc (YYYY-MM-DD)", examples=["2026-11-30"]),
    route_id: int | None = Query(None, description="Lọc theo ID tuyến xe (tùy chọn)"),
    channel: Channel | None = Query(None, description="Lọc theo kênh bán (TRUC_TUYEN hoặc TAI_QUAY)"),
    svc: ReportService = Depends(get_report_service),
):
    """Xuất báo cáo ra Excel (2 trang tính: doanh thu theo tuyến, tỷ lệ lấp đầy)."""
    rep = svc.build(date_from, date_to, route_id, channel)
    return _file(to_xlsx(rep), XLSX, f"bao-cao-{date_from}-{date_to}.xlsx")


@router.get(
    "/export.pdf",
    summary="Xuất báo cáo dạng PDF",
    description="Xuất tài liệu PDF trang trọng (khổ A4 ngang, phông chữ hỗ trợ tiếng Việt có dấu) phục vụ in ấn hoặc lưu trữ báo cáo định kỳ.",
)
def export_pdf(
    date_from: date_type = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)", examples=["2026-11-01"]),
    date_to: date_type = Query(..., description="Ngày kết thúc (YYYY-MM-DD)", examples=["2026-11-30"]),
    route_id: int | None = Query(None, description="Lọc theo ID tuyến xe (tùy chọn)"),
    channel: Channel | None = Query(None, description="Lọc theo kênh bán (TRUC_TUYEN hoặc TAI_QUAY)"),
    svc: ReportService = Depends(get_report_service),
):
    """Xuất báo cáo ra PDF (khổ A4 ngang, tiếng Việt có dấu)."""
    rep = svc.build(date_from, date_to, route_id, channel)
    return _file(to_pdf(rep), "application/pdf", f"bao-cao-{date_from}-{date_to}.pdf")
