"""add business codes for routes, trips, orders, tickets, refunds

Revision ID: 0012
Revises: 0011
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column, select

from app.domain.rules.code_generator import (
    gen_order_code,
    gen_refund_code,
    gen_route_code,
    gen_ticket_code,
    gen_trip_code,
)

revision = "0012"
down_revision = "0011"


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)

    # 1. Thêm cột code nếu chưa có
    for tbl, length in [
        ("routes", 30),
        ("trips", 50),
        ("orders", 50),
        ("tickets", 50),
        ("refunds", 50),
    ]:
        cols = [c["name"] for c in insp.get_columns(tbl)]
        if "code" not in cols:
            op.add_column(tbl, sa.Column("code", sa.String(length=length), nullable=True))

    # 2. Backfill routes (tránh trùng lặp mã bằng cách gán thêm id cho bản ghi trùng)
    routes_t = table(
        "routes",
        column("id", sa.Integer),
        column("origin", sa.String),
        column("destination", sa.String),
        column("code", sa.String),
    )
    routes_rows = conn.execute(
        select(routes_t.c.id, routes_t.c.origin, routes_t.c.destination).order_by(routes_t.c.id)
    ).fetchall()
    routes_map = {}
    used_route_codes = set()
    for r_id, origin, dest in routes_rows:
        base_code = gen_route_code(origin, dest)
        if base_code not in used_route_codes:
            code = base_code
        else:
            code = gen_route_code(origin, dest, r_id)
        used_route_codes.add(code)
        routes_map[r_id] = code
        conn.execute(routes_t.update().where(routes_t.c.id == r_id).values(code=code))

    # 3. Backfill trips
    trips_t = table(
        "trips",
        column("id", sa.Integer),
        column("route_id", sa.Integer),
        column("departure_date", sa.Date),
        column("departure_time", sa.Time),
        column("code", sa.String),
    )
    trips_rows = conn.execute(
        select(
            trips_t.c.id,
            trips_t.c.route_id,
            trips_t.c.departure_date,
            trips_t.c.departure_time,
        ).order_by(trips_t.c.id)
    ).fetchall()
    used_trip_codes = set()
    for t_id, r_id, dep_date, dep_time in trips_rows:
        r_code = routes_map.get(r_id, "TRIP")
        base_code = gen_trip_code(r_code, dep_date, dep_time)
        if base_code not in used_trip_codes:
            code = base_code
        else:
            code = f"{base_code}-{t_id:02d}"
        used_trip_codes.add(code)
        conn.execute(trips_t.update().where(trips_t.c.id == t_id).values(code=code))

    # 4. Backfill orders
    orders_t = table(
        "orders",
        column("id", sa.Integer),
        column("created_at", sa.DateTime),
        column("code", sa.String),
    )
    orders_rows = conn.execute(select(orders_t.c.id, orders_t.c.created_at)).fetchall()
    for o_id, created_at in orders_rows:
        code = gen_order_code(created_at, o_id)
        conn.execute(orders_t.update().where(orders_t.c.id == o_id).values(code=code))

    # 5. Backfill tickets
    tickets_t = table(
        "tickets",
        column("id", sa.Integer),
        column("order_id", sa.Integer),
        column("code", sa.String),
    )
    tickets_rows = conn.execute(select(tickets_t.c.id, tickets_t.c.order_id)).fetchall()
    for tk_id, o_id in tickets_rows:
        row_o = conn.execute(select(orders_t.c.created_at).where(orders_t.c.id == o_id)).first()
        created_at = row_o[0] if row_o else sa.func.now()
        code = gen_ticket_code(created_at, tk_id)
        conn.execute(tickets_t.update().where(tickets_t.c.id == tk_id).values(code=code))

    # 6. Backfill refunds
    refunds_t = table(
        "refunds",
        column("id", sa.Integer),
        column("created_at", sa.DateTime),
        column("code", sa.String),
    )
    refunds_rows = conn.execute(select(refunds_t.c.id, refunds_t.c.created_at)).fetchall()
    for rf_id, created_at in refunds_rows:
        code = gen_refund_code(created_at, rf_id)
        conn.execute(refunds_t.update().where(refunds_t.c.id == rf_id).values(code=code))

    # 7. Sửa cột thành NOT NULL và tạo UNIQUE INDEX (MySQL yêu cầu existing_type)
    op.alter_column(
        "routes",
        "code",
        nullable=False,
        existing_type=sa.String(length=30),
    )
    op.create_index(op.f("ix_routes_code"), "routes", ["code"], unique=True)

    op.alter_column(
        "trips",
        "code",
        nullable=False,
        existing_type=sa.String(length=50),
    )
    op.create_index(op.f("ix_trips_code"), "trips", ["code"], unique=True)

    op.alter_column(
        "orders",
        "code",
        nullable=False,
        existing_type=sa.String(length=50),
    )
    op.create_index(op.f("ix_orders_code"), "orders", ["code"], unique=True)

    op.alter_column(
        "tickets",
        "code",
        nullable=False,
        existing_type=sa.String(length=50),
    )
    op.create_index(op.f("ix_tickets_code"), "tickets", ["code"], unique=True)

    op.alter_column(
        "refunds",
        "code",
        nullable=False,
        existing_type=sa.String(length=50),
    )
    op.create_index(op.f("ix_refunds_code"), "refunds", ["code"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_refunds_code"), table_name="refunds")
    op.drop_column("refunds", "code")

    op.drop_index(op.f("ix_tickets_code"), table_name="tickets")
    op.drop_column("tickets", "code")

    op.drop_index(op.f("ix_orders_code"), table_name="orders")
    op.drop_column("orders", "code")

    op.drop_index(op.f("ix_trips_code"), table_name="trips")
    op.drop_column("trips", "code")

    op.drop_index(op.f("ix_routes_code"), table_name="routes")
    op.drop_column("routes", "code")
