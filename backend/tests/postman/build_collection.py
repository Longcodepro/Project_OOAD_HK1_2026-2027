"""Sinh file OOAD_API_Tests.postman_collection.json.  Chạy: python tests/postman/build_collection.py

Mỗi chức năng (use case) là một thư mục, mỗi trường hợp test là một request có sẵn khẳng định đạt/không đạt.
Collection tự dựng dữ liệu riêng (SĐT, xe, tuyến, chuyến ngẫu nhiên theo từng lần chạy) nên chạy lại nhiều lần được.
Điều kiện: backend đang chạy ở {{base_url}} và đã `python -m app.seed` (cần tài khoản Admin/nhân viên mẫu).
"""

import json
import pathlib

from dsl import Folder, Req, collection, js, setv, st  # noqa: F401 (một số tên chỉ dùng trong cases_*.py)

PW = "matkhau123"
OTP6 = "/^\\d{6}$/.test(j.mock_otp)"


# ---------- hàm dựng nhanh ----------
def login(name, tok, phone, pw, *, who=""):
    return Req(
        name,
        "POST",
        "/auth/login",
        body=f'{{"phone":"{phone}","password":"{pw}"}}',
        expect=200,
        tests=[js("có access_token", "!!j.access_token"), setv(tok, "j.access_token")],
        desc=who,
    )


def new_user(phone_var, tok_var, id_var=None, pw=PW):
    """OTP → đăng ký → đăng nhập (3 request) cho một khách hàng mới."""
    otp = phone_var + "_otp"
    reqs = [
        Req(
            f"Chuẩn bị {phone_var}: xin OTP",
            "POST",
            "/auth/register/otp",
            body='{"phone":"@{%s}"}' % phone_var,
            expect=200,
            tests=[setv(otp, "j.mock_otp")],
        ),
        Req(
            f"Chuẩn bị {phone_var}: đăng ký",
            "POST",
            "/auth/register",
            body='{"full_name":"Khách %s","phone":"@{%s}","password":"%s","otp":"@{%s}"}'
            % (phone_var, phone_var, pw, otp),
            expect=201,
        ),
        Req(
            f"Chuẩn bị {phone_var}: đăng nhập",
            "POST",
            "/auth/login",
            body='{"phone":"@{%s}","password":"%s"}' % (phone_var, pw),
            expect=200,
            tests=[setv(tok_var, "j.access_token")],
        ),
    ]
    if id_var:
        reqs.append(
            Req(
                f"Chuẩn bị {phone_var}: lấy id",
                "GET",
                "/auth/me",
                tok=tok_var,
                expect=200,
                tests=[setv(id_var, "j.id")],
            )
        )
    return reqs


def mk_trip(p, offset, hour, price, *, veh="veh_big", n_seats=6, minutes_ahead=None):
    """Tạo một chuyến riêng cho thư mục + lấy sơ đồ ghế (biến {p}_s1..)."""
    if minutes_ahead is None:
        pre = (
            f"const d = new Date(Date.now() + 7*3600*1000 + {offset}*86400*1000);\n"
            f"pm.collectionVariables.set('{p}_date', d.toISOString().slice(0,10));"
        )
        at = f"{hour:02d}:00"
        date = "@{%s_date}" % p
    else:  # chuyến sắp chạy: giờ VN hiện tại + n phút
        pre = (
            f"const d = new Date(Date.now() + 7*3600*1000 + {minutes_ahead}*60*1000);\n"
            f"pm.collectionVariables.set('{p}_date', d.toISOString().slice(0,10));\n"
            f"pm.collectionVariables.set('{p}_time', d.toISOString().slice(11,16));"
        )
        at = "@{%s_time}" % p
        date = "@{%s_date}" % p
    create = Req(
        f"Chuẩn bị {p}: tạo chuyến",
        "POST",
        "/admin/trips",
        tok="tok_admin",
        pre=pre,
        expect=201,
        body=(
            '{"route_id":@{route_id},"vehicle_id":@{%s},"departure_date":"%s","departure_time":"%s","price":%d,'
            '"pickup_points":["Bến A","Bến B"],"dropoff_points":["Bến Đích"]}'
        )
        % (veh, date, at, price),
        tests=[
            setv(f"{p}_trip", "j.id"),
            setv(f"{p}_pick", "j.stops.find(s => s.kind === 'DON').id"),
            setv(f"{p}_drop", "j.stops.find(s => s.kind === 'TRA').id"),
        ],
    )
    seats = Req(
        f"Chuẩn bị {p}: lấy ghế",
        "GET",
        f"/trips/@{{{p}_trip}}/seats",
        expect=200,
        tests=[setv(f"{p}_s{i + 1}", f"j[{i}].seat_id") for i in range(n_seats)],
    )
    return [create, seats]


def hold(name, tok, p, seats, **kw):
    ids = ",".join("@{%s_s%d}" % (p, s) for s in seats)
    return Req(
        name, "POST", f"/trips/@{{{p}_trip}}/hold", tok=tok, body='{"seat_ids":[%s]}' % ids, **kw
    )


def order_body(p, seats, *, coupon=None, name="Khách A", phone="0911111111", stops=True):
    items = []
    for s in seats:
        extra = (
            ',"pickup_stop_id":@{%s_pick},"dropoff_stop_id":@{%s_drop}' % (p, p) if stops else ""
        )
        items.append(
            '{"seat_id":@{%s_s%d},"passenger_name":"%s","passenger_phone":"%s"%s}'
            % (p, s, name, phone, extra)
        )
    c = f',"coupon_code":"{coupon}"' if coupon else ""
    return '{"trip_id":@{%s_trip},"items":[%s]%s}' % (p, ",".join(items), c)


def buy_online(
    p, seats, tok, order_var, ticket_var=None, method="MOMO", prefix="Chuẩn bị", phone="0911111111"
):
    """Giữ chỗ → đặt đơn → thanh toán (3 request) và lưu id đơn / id vé đầu tiên."""
    rs = [
        hold(f"{prefix}: giữ ghế", tok, p, seats, expect=200),
        Req(
            f"{prefix}: tạo đơn",
            "POST",
            "/orders",
            tok=tok,
            body=order_body(p, seats, phone=phone),
            expect=201,
            tests=[setv(order_var, "j.id")],
        ),
        Req(
            f"{prefix}: thanh toán",
            "POST",
            "/orders/@{%s}/pay" % order_var,
            tok=tok,
            body='{"method":"%s"}' % method,
            expect=200,
            tests=[js("thanh toán thành công", "j.result === 'THANH_CONG'")]
            + ([setv(ticket_var, "j.order.tickets[0].id")] if ticket_var else []),
        ),
    ]
    return rs


def buy_counter(p, seats, order_var, ticket_var=None, method="TIEN_MAT", prefix="Chuẩn bị"):
    return [
        hold(f"{prefix}: nhân viên giữ ghế", "tok_clerk", p, seats, expect=200),
        Req(
            f"{prefix}: lập phiếu quầy",
            "POST",
            "/counter/orders",
            tok="tok_clerk",
            body=order_body(p, seats, name="Khách vãng lai", phone="0922222222"),
            expect=201,
            tests=[setv(order_var, "j.id")],
        ),
        Req(
            f"{prefix}: thu tiền",
            "POST",
            "/orders/@{%s}/pay" % order_var,
            tok="tok_clerk",
            body='{"method":"%s"}' % method,
            expect=200,
            tests=[js("thanh toán thành công", "j.result === 'THANH_CONG'")]
            + ([setv(ticket_var, "j.order.tickets[0].id")] if ticket_var else []),
        ),
    ]


exec(open(pathlib.Path(__file__).with_name("cases_a.py"), encoding="utf-8").read())
exec(open(pathlib.Path(__file__).with_name("cases_b.py"), encoding="utf-8").read())
exec(open(pathlib.Path(__file__).with_name("cases_c.py"), encoding="utf-8").read())

FOLDERS = [
    f_setup,
    f_auth,
    f_account,
    f_fleet,
    f_trips,
    f_hold,
    f_coupons,
    f_booking,
    f_counter,
    f_tickets,
    f_cancel,
    f_tripcancel,
    f_adminorders,
    f_adminusers,
    f_reports,
    f_system,
]  # noqa: F821

DESC = """Bộ test API cho backend đặt vé xe khách. Mỗi thư mục = một chức năng (use case), mỗi request = một trường hợp.
Chạy cả bộ: Collection Runner (hoặc `newman run`). Chạy lẻ một thư mục để thử riêng một chức năng.
Thư mục 00 phải chạy trước (đăng nhập và dựng dữ liệu riêng cho lần chạy này). Cần `python -m app.seed` trước đó."""

if __name__ == "__main__":
    col = collection(
        "OOAD - Test API theo chức năng",
        DESC,
        [f() for f in FOLDERS],
        {"base_url": "http://localhost:8000", "tok_fake": "abc.def.ghi"},
    )
    out = pathlib.Path(__file__).with_name("OOAD_API_Tests.postman_collection.json")
    out.write_text(json.dumps(col, ensure_ascii=False, indent=2), encoding="utf-8")
    n = sum(len(f["item"]) for f in col["item"])
    print(f"Đã ghi {out.name}: {len(col['item'])} thư mục, {n} request")
