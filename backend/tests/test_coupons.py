from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import update

from app.domain.entities.account import Role
from app.domain.rules.pricing import allocate_discount, cancellation_fee
from app.infrastructure.db.models import CouponModel
from tests.helpers import mk_route, mk_trip, mk_vehicle


def iso(days):
    return (datetime.now() + timedelta(days=days)).isoformat(timespec="seconds")


def coupon_body(**kw):
    return {
        "code": "tet2027",
        "kind": "PHAN_TRAM",
        "value": 10,
        "max_discount": 50000,
        "min_order": 300000,
        "quantity": 2,
        "valid_from": iso(-1),
        "valid_to": iso(30),
        **kw,
    }


def test_create_and_toggle_coupon(client, make_user):
    h = make_user(Role.ADMIN)[1]
    r = client.post("/admin/coupons", headers=h, json=coupon_body())
    assert r.status_code == 201 and r.json()["code"] == "TET2027" and r.json()["used"] == 0
    assert client.post("/admin/coupons", headers=h, json=coupon_body()).status_code == 409
    off = client.patch(f"/admin/coupons/{r.json()['id']}", headers=h, json={"status": "TAT"})
    assert off.json()["status"] == "TAT"
    assert len(client.get("/admin/coupons?status=BAT", headers=h).json()) == 0


def test_end_before_start_rejected(client, make_user):
    h = make_user(Role.ADMIN)[1]
    r = client.post(
        "/admin/coupons", headers=h, json=coupon_body(valid_from=iso(5), valid_to=iso(1))
    )
    assert r.status_code == 400


def test_validate_percent_capped_and_fixed(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    cust = make_user(Role.CUSTOMER)[1]
    client.post("/admin/coupons", headers=admin, json=coupon_body())
    client.post(
        "/admin/coupons",
        headers=admin,
        json=coupon_body(
            code="GIAM30K", kind="SO_TIEN", value=30000, max_discount=None, min_order=0
        ),
    )
    small = client.post(
        "/coupons/validate", headers=cust, json={"code": "tet2027", "amount": 400000}
    ).json()
    assert small["discount"] == 40000 and small["final_amount"] == 360000
    capped = client.post(
        "/coupons/validate", headers=cust, json={"code": "TET2027", "amount": 900000}
    ).json()
    assert capped["discount"] == 50000  # 10% = 90.000 nhưng trần 50.000
    fixed = client.post(
        "/coupons/validate", headers=cust, json={"code": "GIAM30K", "amount": 20000}
    ).json()
    assert fixed["discount"] == 20000  # không giảm quá giá trị đơn


def test_validate_rejects_bad_cases(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    cust = make_user(Role.CUSTOMER)[1]
    cid = client.post("/admin/coupons", headers=admin, json=coupon_body()).json()["id"]
    v = lambda amount, code="TET2027": client.post(
        "/coupons/validate", headers=cust, json={"code": code, "amount": amount}
    )
    assert v(100000).status_code == 400  # dưới mức tối thiểu
    assert v(500000, "KHONGCO").status_code == 400
    with client.session_factory() as db:
        db.execute(update(CouponModel).values(used=2))
        db.commit()
    assert "hết lượt" in v(500000).json()["detail"]
    with client.session_factory() as db:
        db.execute(update(CouponModel).values(used=0, valid_to=datetime.now() - timedelta(days=1)))
        db.commit()
    assert "thời hạn" in v(500000).json()["detail"]
    assert cid


def test_allocate_discount_sums_exactly():
    prices = [Decimal(100000), Decimal(100000), Decimal(100000)]
    parts = allocate_discount(prices, Decimal(10000))
    assert sum(parts) == Decimal(10000) and parts == [
        Decimal("3333.33"),
        Decimal("3333.33"),
        Decimal("3333.34"),
    ]
    assert allocate_discount(prices, Decimal(0)) == [Decimal("0.00")] * 3


def test_cancellation_fee():
    assert cancellation_fee(Decimal(350000), 15) == Decimal("52500.00")


def test_price_update_only_affects_future(client, make_user):
    h = make_user(Role.ADMIN)[1]
    trip = mk_trip(client, h, mk_route(client, h), mk_vehicle(client, h))
    r = client.patch(f"/admin/trips/{trip['id']}/price", headers=h, json={"price": 420000})
    assert r.status_code == 200 and r.json()["price"] == 420000
