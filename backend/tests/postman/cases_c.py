HDR = "pm.request.headers.add({key: 'X-Gateway-Key', value: 'mock-gateway-key'});"


# ---------- 08. Bán vé tại quầy ----------
def f_counter():
    f = Folder("08. Bán vé tại quầy (UC04)")
    f.add(
        *mk_trip("c", 16, 8, 250000),
        hold("Nhân viên giữ ghế 1,2", "tok_clerk", "c", [1, 2], expect=200),
        Req(
            "Khách hàng gọi API quầy → 403",
            "POST",
            "/counter/orders",
            tok="tok_cust",
            body=order_body("c", [1]),
            expect=403,
        ),
        Req(
            "Lập phiếu quầy cho khách vãng lai → 201, không gắn tài khoản",
            "POST",
            "/counter/orders",
            tok="tok_clerk",
            body=order_body("c", [1, 2], name="Khách vãng lai", phone="0922222222"),
            expect=201,
            tests=[
                js(
                    "kênh TAI_QUAY, không có account",
                    "j.channel === 'TAI_QUAY' && j.account_id === null",
                ),
                js("tổng 500.000", "j.total === 500000"),
                setv("c_order", "j.id"),
            ],
        ),
        Req(
            "Phiếu quầy: nhân viên khác ghế → 409 (ghế do người khác giữ)",
            "POST",
            "/counter/orders",
            tok="tok_clerk",
            body=order_body("c", [5], name="Khách", phone="0922222222"),
            expect=409,
        ),
        Req(
            "In vé khi chưa thanh toán → 409",
            "GET",
            "/counter/orders/@{c_order}/receipts",
            tok="tok_clerk",
            expect=409,
        ),
        Req(
            "Thanh toán VietQR → đang chờ, có mã QR",
            "POST",
            "/orders/@{c_order}/pay",
            tok="tok_clerk",
            body='{"method":"VIETQR"}',
            expect=200,
            tests=[js("đang xử lý + QR", "j.result === 'DANG_XU_LY' && !!j.qr_content")],
        ),
        Req(
            "Đổi sang TIỀN MẶT → thành công, VietQR cũ bị hủy",
            "POST",
            "/orders/@{c_order}/pay",
            tok="tok_clerk",
            body='{"method":"TIEN_MAT"}',
            expect=200,
            tests=[
                js("thành công", "j.result === 'THANH_CONG'"),
                js(
                    "thanh toán VietQR cũ DA_HUY",
                    "j.order.payments.map(p => p.status).join() === 'DA_HUY,THANH_CONG'",
                ),
            ],
        ),
        Req(
            "In vé giấy → 200, 2 vé có QR",
            "GET",
            "/counter/orders/@{c_order}/receipts",
            tok="tok_clerk",
            expect=200,
            tests=[
                js("2 vé", "j.receipts.length === 2"),
                js(
                    "có tên khách và QR",
                    "j.receipts[0].includes('Khách vãng lai') && j.receipts[0].includes('QR:')",
                ),
            ],
        ),
        Req(
            "In lại vé (máy in lỗi lần trước) → 200",
            "GET",
            "/counter/orders/@{c_order}/receipts",
            tok="tok_clerk",
            expect=200,
        ),
        Req(
            "Nhân viên quầy không xem được đơn trực tuyến của khách → 403",
            "GET",
            "/counter/orders/@{b_order}/receipts",
            tok="tok_clerk",
            expect=403,
        ),
        Req(
            "Đối soát quầy trong ngày → 200, có doanh thu tiền mặt",
            "GET",
            "/counter/orders",
            tok="tok_clerk",
            expect=200,
            tests=[
                js("≥ 1 đơn đã thu", "j.paid_orders >= 1 && j.tickets_sold >= 2"),
                js("doanh thu tiền mặt ≥ 500.000", "j.revenue_by_method.TIEN_MAT >= 500000"),
            ],
        ),
        hold("Khách đổi ý: giữ ghế 3", "tok_clerk", "c", [3], expect=200),
        Req(
            "Khách đổi ý: lập phiếu",
            "POST",
            "/counter/orders",
            tok="tok_clerk",
            body=order_body("c", [3], name="Khách", phone="0922222222"),
            expect=201,
            tests=[setv("c_order2", "j.id")],
        ),
        Req(
            "Khách đổi ý: hủy phiếu → nhả ghế ngay",
            "POST",
            "/orders/@{c_order2}/cancel-pending",
            tok="tok_clerk",
            expect=200,
            tests=[js("đã hủy", "j.status === 'DA_HUY'")],
        ),
        Req(
            "Ghế 3 trống lại (còn 22 ghế)",
            "GET",
            "/trips/@{c_trip}",
            expect=200,
            tests=[js("22 ghế trống", "j.available_seats === 22")],
        ),
        Req(
            "Thanh toán phiếu đã hủy → 409",
            "POST",
            "/orders/@{c_order2}/pay",
            tok="tok_clerk",
            body='{"method":"TIEN_MAT"}',
            expect=409,
        ),
        Req("Đối soát quầy: không đăng nhập → 401", "GET", "/counter/orders", expect=401),
    )
    return f


# ---------- 09. Vé: lịch sử & tra cứu ----------
def f_tickets():
    f = Folder("09. Lịch sử mua vé & tra cứu vé (UC07, UC23)")
    f.add(
        *mk_trip("t", 18, 8, 300000),
        *buy_online("t", [1, 2], "tok_cust2", "t_order", "t_ticket", phone="0966666666"),
        *buy_online("t", [3], "tok_cust", "t_order_other", "t_ticket_other", phone="0955555555"),
        Req(
            "Lịch sử: khách thấy đúng 2 vé của mình, mới nhất trước",
            "GET",
            "/me/tickets",
            tok="tok_cust2",
            expect=200,
            tests=[
                js(
                    "đúng 2 vé trên chuyến này",
                    "j.items.filter(i => i.trip_id === pm.collectionVariables.get('t_trip')).length === 2",
                ),
                js(
                    "trạng thái CHUA_DI, trả bằng MOMO",
                    "j.items.every(i => i.status === 'CHUA_DI' && i.payment_method === 'MOMO')",
                ),
                js(
                    "không có vé của người khác",
                    "!j.items.some(i => i.id === pm.collectionVariables.get('t_ticket_other'))",
                ),
            ],
        ),
        Req(
            "Lịch sử: lọc CHUA_DI → có",
            "GET",
            "/me/tickets?status=CHUA_DI",
            tok="tok_cust2",
            expect=200,
            tests=[js("có vé", "j.items.length >= 2")],
        ),
        Req(
            "Lịch sử: lọc DA_HUY → chưa có",
            "GET",
            "/me/tickets?status=DA_HUY",
            tok="tok_cust2",
            expect=200,
            tests=[js("rỗng", "j.items.length === 0")],
        ),
        Req(
            "Lịch sử: lọc DA_HOAN_THANH → chưa có (chuyến chưa chạy)",
            "GET",
            "/me/tickets?status=DA_HOAN_THANH",
            tok="tok_cust2",
            expect=200,
            tests=[js("rỗng", "j.items.length === 0")],
        ),
        Req(
            "Lịch sử: tài khoản chưa mua vé → danh sách rỗng kèm gợi ý",
            "GET",
            "/me/tickets",
            tok="tok_acc",
            expect=200,
            tests=[js("rỗng + thông báo", "j.items.length === 0 && !!j.message")],
        ),
        Req(
            "Lịch sử: Admin không dùng chức năng này → 403",
            "GET",
            "/me/tickets",
            tok="tok_admin",
            expect=403,
        ),
        Req("Lịch sử: không đăng nhập → 401", "GET", "/me/tickets", expect=401),
        Req(
            "Tra cứu theo mã QR (nhân viên) → 200",
            "GET",
            "/tickets/lookup?qr=@{t_qr}",
            tok="tok_clerk",
            expect=200,
            pre="",
            tests=[js("đúng vé", "j.length === 1")],
        ),
        Req(
            "Tra cứu theo SĐT hành khách: nhiều vé → danh sách",
            "GET",
            "/tickets/lookup?phone=0966666666",
            tok="tok_clerk",
            expect=200,
            tests=[
                js("2 vé trở lên", "j.length >= 2"),
                js("có ghế và tuyến", "!!j[0].seat_code && !!j[0].origin"),
            ],
        ),
        Req(
            "Tra cứu theo mã vé (Admin) → 200",
            "GET",
            "/tickets/lookup?ticket_id=@{t_ticket}",
            tok="tok_admin",
            expect=200,
            tests=[js("đúng vé", "j[0].id === pm.collectionVariables.get('t_ticket')")],
        ),
        Req(
            "Tra cứu: không thấy → 404",
            "GET",
            "/tickets/lookup?qr=khongtontai",
            tok="tok_clerk",
            expect=404,
        ),
        Req(
            "Tra cứu: không nhập tiêu chí → 400",
            "GET",
            "/tickets/lookup",
            tok="tok_clerk",
            expect=400,
        ),
        Req(
            "Tra cứu: khách hàng không được dùng → 403",
            "GET",
            "/tickets/lookup?phone=0966666666",
            tok="tok_cust",
            expect=403,
        ),
        Req(
            "Xem vé của mình → 200",
            "GET",
            "/tickets/@{t_ticket}",
            tok="tok_cust2",
            expect=200,
            tests=[
                js(
                    "có kênh và phương thức",
                    "j.channel === 'TRUC_TUYEN' && j.payment_method === 'MOMO'",
                )
            ],
        ),
        Req(
            "Xem vé của người khác → 403", "GET", "/tickets/@{t_ticket}", tok="tok_cust", expect=403
        ),
        Req("Admin xem mọi vé → 200", "GET", "/tickets/@{t_ticket}", tok="tok_admin", expect=200),
        Req("Xem vé không tồn tại → 404", "GET", "/tickets/999999", tok="tok_admin", expect=404),
    )
    # cần lưu mã QR của vé đầu để tra cứu: chèn vào request thanh toán cuối của buy_online
    pay_req = f.items[4]
    pay_req.tests.append(setv("t_qr", "j.order.tickets[0].qr_code"))
    return f


# ---------- 10. Hủy vé & hoàn tiền ----------
def f_cancel():
    f = Folder("10. Hủy vé & hoàn tiền (UC05, UC06, UC22)")
    f.add(
        *mk_trip("k", 20, 8, 400000),
        *buy_online("k", [1], "tok_cust", "k_order1", "k_ticket1"),
        *buy_online("k", [2], "tok_cust", "k_order2", "k_ticket2"),
        *buy_online("k", [3], "tok_cust2", "k_order3", "k_ticket3", method="ZALOPAY"),
        *buy_counter("k", [4], "k_order4", "k_ticket4"),
        Req(
            "Báo giá hủy: phí 15% → 60.000, nhận lại 340.000",
            "GET",
            "/tickets/@{k_ticket1}/cancel-quote",
            tok="tok_cust",
            expect=200,
            tests=[
                js("được hủy", "j.can_cancel === true"),
                js("phí 15% = 60.000", "j.fee_percent === 15 && j.fee === 60000"),
                js("nhận 340.000", "j.refund_amount === 340000"),
                js("hoàn về cổng thanh toán", "j.refund_method === 'CONG_THANH_TOAN'"),
            ],
        ),
        Req(
            "Báo giá hủy vé của người khác → 403",
            "GET",
            "/tickets/@{k_ticket1}/cancel-quote",
            tok="tok_cust2",
            expect=403,
        ),
        Req(
            "Hủy vé của người khác → 403",
            "POST",
            "/tickets/@{k_ticket1}/cancel",
            tok="tok_cust2",
            expect=403,
        ),
        Req("Hủy vé: không đăng nhập → 401", "POST", "/tickets/@{k_ticket1}/cancel", expect=401),
        Req(
            "Hủy vé còn > 24 giờ → hoàn 340.000, phí 60.000",
            "POST",
            "/tickets/@{k_ticket1}/cancel",
            tok="tok_cust",
            expect=200,
            tests=[
                js("đã hoàn", "j.status === 'DA_HOAN' && j.reason === 'KHACH_HUY_VE'"),
                js("số tiền", "j.amount === 340000 && j.fee === 60000"),
                js("có mã giao dịch hoàn", "j.transaction_id.startsWith('RF-')"),
            ],
        ),
        Req(
            "Hủy lần hai → 400", "POST", "/tickets/@{k_ticket1}/cancel", tok="tok_cust", expect=400
        ),
        Req(
            "Ghế được nhả ngay: còn 21 ghế trống (3 vé còn lại)",
            "GET",
            "/trips/@{k_trip}",
            expect=200,
            tests=[js("21 ghế trống (24 − 3 vé còn lại)", "j.available_seats === 21")],
        ),
        Req(
            "Đơn có 1 vé đã hủy → đơn đã hủy hết vé nên DA_HUY",
            "GET",
            "/orders/@{k_order1}",
            tok="tok_cust",
            expect=200,
            tests=[js("đơn DA_HUY", "j.status === 'DA_HUY'")],
        ),
        Req(
            "Lịch sử: vé đã hủy hiện ở bộ lọc DA_HUY",
            "GET",
            "/me/tickets?status=DA_HUY",
            tok="tok_cust",
            expect=200,
            tests=[
                js(
                    "có vé vừa hủy",
                    "j.items.some(i => i.id === pm.collectionVariables.get('k_ticket1'))",
                )
            ],
        ),
        Req(
            "Hủy khi cổng từ chối hoàn → vé VẪN hủy, lệnh hoàn chờ xử lý thủ công",
            "POST",
            "/tickets/@{k_ticket2}/cancel",
            tok="tok_cust",
            body='{"simulate":"fail_refund"}',
            expect=200,
            tests=[
                js("chờ xử lý thủ công", "j.status === 'CHO_XU_LY_THU_CONG' && !!j.error_note"),
                setv("k_refund_id", "j.id"),
            ],
        ),
        Req(
            "Vé đó đã hủy dù hoàn lỗi",
            "GET",
            "/tickets/@{k_ticket2}",
            tok="tok_cust",
            expect=200,
            tests=[js("DA_HUY", "j.status === 'DA_HUY'")],
        ),
        Req(
            "Vé trả tiền mặt: khách không hủy được online → 403",
            "POST",
            "/tickets/@{k_ticket4}/cancel",
            tok="tok_cust",
            expect=403,
        ),
        Req(
            "Quầy hủy vé tiền mặt → chi tiền mặt ngay, ghi nhân viên xử lý",
            "POST",
            "/counter/tickets/@{k_ticket4}/cancel",
            tok="tok_clerk",
            expect=200,
            tests=[
                js(
                    "hoàn tiền mặt",
                    "j.method === 'TIEN_MAT' && j.status === 'DA_HOAN' && j.processed_by !== null",
                ),
                js("340.000", "j.amount === 340000"),
            ],
        ),
        Req(
            "Quầy hủy giúp vé mua online → hoàn về cổng thanh toán",
            "POST",
            "/counter/tickets/@{k_ticket3}/cancel",
            tok="tok_clerk",
            expect=200,
            tests=[
                js(
                    "hoàn qua cổng",
                    "j.method === 'CONG_THANH_TOAN' && j.transaction_id.startsWith('RF-')",
                )
            ],
        ),
        Req(
            "Khách hàng gọi API hủy ở quầy → 403",
            "POST",
            "/counter/tickets/@{k_ticket3}/cancel",
            tok="tok_cust",
            expect=403,
        ),
        # còn < 24 giờ
        *mk_trip("ks", 0, 0, 300000, veh="veh_small", n_seats=2, minutes_ahead=90),
        *buy_online("ks", [1], "tok_cust", "ks_order", "ks_ticket"),
        Req(
            "Chuyến còn 1,5 giờ: báo giá → không được hủy",
            "GET",
            "/tickets/@{ks_ticket}/cancel-quote",
            tok="tok_cust",
            expect=200,
            tests=[
                js("không hủy được", "j.can_cancel === false"),
                js("nêu lý do 24 giờ", "j.reason.includes('24 giờ')"),
            ],
        ),
        Req(
            "Chuyến còn 1,5 giờ: hủy → 400",
            "POST",
            "/tickets/@{ks_ticket}/cancel",
            tok="tok_cust",
            expect=400,
        ),
        Req(
            "Báo giá vé không tồn tại → 404",
            "GET",
            "/tickets/999999/cancel-quote",
            tok="tok_cust",
            expect=404,
        ),
    )
    return f


# ---------- 11. Nhà xe hủy chuyến ----------
def f_tripcancel():
    f = Folder("11. Nhà xe hủy chuyến - hoàn 100% (UC13)")
    f.add(
        *mk_trip("x", 22, 8, 400000),
        *buy_online("x", [1, 2], "tok_cust", "x_order"),
        *buy_counter("x", [3], "x_order_cash"),
        hold("Có đơn đang chờ thanh toán: giữ ghế 4", "tok_cust2", "x", [4], expect=200),
        Req(
            "Có đơn đang chờ thanh toán: tạo đơn",
            "POST",
            "/orders",
            tok="tok_cust2",
            body=order_body("x", [4]),
            expect=201,
            tests=[setv("x_order_pending", "j.id")],
        ),
        Req(
            "Hủy chuyến: khách hàng → 403",
            "POST",
            "/admin/trips/@{x_trip}/cancel",
            tok="tok_cust",
            body='{"reason":"Thử xem sao"}',
            expect=403,
        ),
        Req(
            "Hủy chuyến: lý do quá ngắn → 422",
            "POST",
            "/admin/trips/@{x_trip}/cancel",
            tok="tok_admin",
            body='{"reason":"x"}',
            expect=422,
        ),
        Req(
            "Hủy chuyến không tồn tại → 404",
            "POST",
            "/admin/trips/999999/cancel",
            tok="tok_admin",
            body='{"reason":"Không có chuyến"}',
            expect=404,
        ),
        Req(
            "Admin hủy chuyến → hoàn 100% vé online, vé tiền mặt chờ chi tại quầy, đóng đơn chờ",
            "POST",
            "/admin/trips/@{x_trip}/cancel",
            tok="tok_admin",
            body='{"reason":"Sự cố bất khả kháng: bão"}',
            expect=200,
            tests=[
                js("hoàn 2 vé online", "j.tickets_refunded === 2 && j.total_refunded === 800000"),
                js("1 vé tiền mặt chờ xử lý", "j.refunds_pending_manual === 1"),
                js("đóng 1 đơn đang chờ", "j.pending_orders_closed === 1"),
            ],
        ),
        Req(
            "Chuyến chuyển DA_HUY, ghi lý do",
            "GET",
            "/trips/@{x_trip}",
            expect=200,
            tests=[
                js(
                    "đã hủy",
                    "j.status === 'DA_HUY' && j.cancel_reason === 'Sự cố bất khả kháng: bão'",
                )
            ],
        ),
        Req(
            "Đơn online của chuyến hủy → DA_HUY, vé hoàn 100%",
            "GET",
            "/orders/@{x_order}",
            tok="tok_cust",
            expect=200,
            tests=[js("đơn DA_HUY", "j.status === 'DA_HUY'")],
        ),
        Req(
            "Đơn chờ thanh toán cũng bị đóng",
            "GET",
            "/orders/@{x_order_pending}",
            tok="tok_cust2",
            expect=200,
            tests=[js("DA_HUY", "j.status === 'DA_HUY'")],
        ),
        Req(
            "Chuyến đã hủy: không giữ được ghế nữa → 400",
            "POST",
            "/trips/@{x_trip}/hold",
            tok="tok_cust",
            body='{"seat_ids":[@{x_s5}]}',
            expect=400,
        ),
        Req(
            "Chuyến đã hủy: không tra cứu thấy trong kết quả mở bán",
            "GET",
            "/trips/search?origin=Thử-A-@{rid}&destination=Thử-B-@{rid}&date=@{x_date}",
            expect=200,
            tests=[
                js(
                    "không có chuyến hủy",
                    "!j.items.some(t => t.id === pm.collectionVariables.get('x_trip'))",
                )
            ],
        ),
        Req(
            "Hủy chuyến lần hai → 409",
            "POST",
            "/admin/trips/@{x_trip}/cancel",
            tok="tok_admin",
            body='{"reason":"Hủy lần hai"}',
            expect=409,
        ),
        Req(
            "Sửa chuyến đã hủy → 400",
            "PATCH",
            "/admin/trips/@{x_trip}",
            tok="tok_admin",
            body='{"departure_time":"10:00"}',
            expect=400,
        ),
    )
    return f


# ---------- 12. Quản lý đơn ----------
def f_adminorders():
    f = Folder("12. Quản lý đơn đặt vé & hoàn tiền thủ công (UC18)")
    f.add(
        Req(
            "Danh sách đơn → 200",
            "GET",
            "/admin/orders",
            tok="tok_admin",
            expect=200,
            tests=[
                js("có đơn", "j.items.length > 0"),
                js("đủ cột", "j.items[0].customer !== undefined && j.items[0].ticket_count > 0"),
            ],
        ),
        Req(
            "Lọc kênh TAI_QUAY → chỉ đơn quầy",
            "GET",
            "/admin/orders?channel=TAI_QUAY",
            tok="tok_admin",
            expect=200,
            tests=[
                js(
                    "toàn đơn quầy",
                    "j.items.length > 0 && j.items.every(i => i.channel === 'TAI_QUAY')",
                )
            ],
        ),
        Req(
            "Lọc theo trạng thái DA_THANH_TOAN → 200",
            "GET",
            "/admin/orders?status=DA_THANH_TOAN",
            tok="tok_admin",
            expect=200,
            tests=[js("đúng trạng thái", "j.items.every(i => i.status === 'DA_THANH_TOAN')")],
        ),
        Req(
            "Tìm theo mã vé → ra đúng đơn",
            "GET",
            "/admin/orders?ticket_id=@{b_ticket}",
            tok="tok_admin",
            expect=200,
            tests=[
                js(
                    "đơn đặt vé B",
                    "j.items.length === 1 && j.items[0].id === pm.collectionVariables.get('b_order')",
                )
            ],
        ),
        Req(
            "Tìm theo SĐT hành khách → có đơn",
            "GET",
            "/admin/orders?phone=0966666666",
            tok="tok_admin",
            expect=200,
            tests=[js("có đơn", "j.items.length >= 1")],
        ),
        Req(
            "Tìm theo khoảng ngày hôm nay → có đơn",
            "GET",
            "/admin/orders?date_from=@{rp_from}&date_to=@{rp_to}",
            tok="tok_admin",
            expect=200,
            pre="const d=n=>new Date(Date.now()+7*3600*1000+n*86400000).toISOString().slice(0,10);pm.collectionVariables.set('rp_from',d(0));pm.collectionVariables.set('rp_to',d(40));",
            tests=[js("có đơn", "j.items.length > 0")],
        ),
        Req(
            "Bộ lọc không khớp → danh sách rỗng kèm thông báo",
            "GET",
            "/admin/orders?order_id=999999",
            tok="tok_admin",
            expect=200,
            tests=[js("rỗng + thông báo", "j.items.length === 0 && !!j.message")],
        ),
        Req(
            "Chi tiết đơn online → vé, thanh toán",
            "GET",
            "/admin/orders/@{b_order}",
            tok="tok_admin",
            expect=200,
            tests=[js("2 vé, có thanh toán", "j.tickets.length === 2 && j.payments.length >= 1")],
        ),
        Req(
            "Chi tiết đơn quầy → có nhân viên bán",
            "GET",
            "/admin/orders/@{c_order}",
            tok="tok_admin",
            expect=200,
            tests=[js("có clerk_id", "j.clerk_id !== null")],
        ),
        Req(
            "Chi tiết đơn đã hoàn tiền → hiện lệnh hoàn",
            "GET",
            "/admin/orders/@{k_order1}",
            tok="tok_admin",
            expect=200,
            tests=[js("có lệnh hoàn", "j.refunds.length === 1")],
        ),
        Req(
            "Chi tiết đơn không tồn tại → 404",
            "GET",
            "/admin/orders/999999",
            tok="tok_admin",
            expect=404,
        ),
        Req(
            "Hàng đợi hoàn tiền thủ công → có 2 lệnh (cổng bị từ chối + tiền mặt chờ chi)",
            "GET",
            "/admin/refunds",
            tok="tok_admin",
            expect=200,
            tests=[
                js(
                    "chỉ lệnh chờ xử lý",
                    "j.length >= 2 && j.every(r => r.status === 'CHO_XU_LY_THU_CONG')",
                ),
                setv(
                    "rf_gateway",
                    "j.find(r => r.ticket_id === pm.collectionVariables.get('k_ticket2')).id",
                ),
                setv(
                    "rf_cash",
                    "j.find(r => r.method === 'TIEN_MAT' && r.reason === 'NHA_XE_HUY_CHUYEN').id",
                ),
            ],
        ),
        Req(
            "Xử lý lại hoàn qua cổng nhưng cổng vẫn từ chối → vẫn chờ, lưu lý do",
            "POST",
            "/admin/refunds/@{rf_gateway}/retry",
            tok="tok_admin",
            body='{"simulate":"fail_refund"}',
            expect=200,
            tests=[js("vẫn chờ", "j.status === 'CHO_XU_LY_THU_CONG' && !!j.error_note")],
        ),
        Req(
            "Xử lý lại hoàn qua cổng → thành công",
            "POST",
            "/admin/refunds/@{rf_gateway}/retry",
            tok="tok_admin",
            expect=200,
            tests=[js("đã hoàn", "j.status === 'DA_HOAN' && j.transaction_id.startsWith('RF-')")],
        ),
        Req(
            "Xác nhận đã chi tiền mặt (hủy chuyến) → DA_HOAN",
            "POST",
            "/admin/refunds/@{rf_cash}/retry",
            tok="tok_admin",
            expect=200,
            tests=[
                js("đã hoàn, ghi người xử lý", "j.status === 'DA_HOAN' && j.processed_by !== null")
            ],
        ),
        Req(
            "Xử lý lại lệnh đã hoàn → 409",
            "POST",
            "/admin/refunds/@{rf_gateway}/retry",
            tok="tok_admin",
            expect=409,
        ),
        Req(
            "Lệnh hoàn không tồn tại → 404",
            "POST",
            "/admin/refunds/999999/retry",
            tok="tok_admin",
            expect=404,
        ),
        Req(
            "Quầy/khách không xem được đơn quản trị → 403",
            "GET",
            "/admin/orders",
            tok="tok_clerk",
            expect=403,
        ),
        Req(
            "Khách không xem được hàng đợi hoàn tiền → 403",
            "GET",
            "/admin/refunds",
            tok="tok_cust",
            expect=403,
        ),
    )
    return f


# ---------- 13. Tài khoản & phân quyền ----------
def f_adminusers():
    f = Folder("13. Quản lý tài khoản & phân quyền (UC16)")
    f.add(
        Req(
            "Lấy id Admin hiện tại",
            "GET",
            "/auth/me",
            tok="tok_admin",
            expect=200,
            tests=[setv("admin_id", "j.id")],
        ),
        Req(
            "Tạo nhân viên → 201, mật khẩu tạm 10 ký tự, buộc đổi mật khẩu",
            "POST",
            "/admin/users",
            tok="tok_admin",
            body='{"phone":"@{ph_staff}","full_name":"Nhân viên thử","role":"NHAN_VIEN_BAN_VE"}',
            expect=201,
            tests=[
                js(
                    "mật khẩu tạm",
                    "j.temp_password.length === 10 && j.must_change_password === true",
                ),
                setv("staff_id", "j.id"),
                setv("staff_temp", "j.temp_password"),
            ],
        ),
        Req(
            "Tạo nhân viên trùng SĐT → 409",
            "POST",
            "/admin/users",
            tok="tok_admin",
            body='{"phone":"@{ph_staff}","full_name":"Trùng","role":"ADMIN"}',
            expect=409,
        ),
        Req(
            "Tạo tài khoản vai trò KHACH_HANG → 400",
            "POST",
            "/admin/users",
            tok="tok_admin",
            body='{"phone":"0944444441","full_name":"Khách","role":"KHACH_HANG"}',
            expect=400,
        ),
        Req(
            "Tạo nhân viên: SĐT sai định dạng → 422",
            "POST",
            "/admin/users",
            tok="tok_admin",
            body='{"phone":"abc","full_name":"X","role":"ADMIN"}',
            expect=422,
        ),
        Req(
            "Nhân viên đăng nhập bằng mật khẩu tạm → bị buộc đổi",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_staff}","password":"@{staff_temp}"}',
            expect=200,
            tests=[
                js("must_change_password", "j.must_change_password === true"),
                setv("tok_staff", "j.access_token"),
            ],
        ),
        Req(
            "Nhân viên đổi mật khẩu lần đầu → 200",
            "POST",
            "/auth/password/change",
            tok="tok_staff",
            body='{"current_password":"@{staff_temp}","new_password":"nhanvien2026"}',
            expect=200,
            tests=[setv("tok_staff", "j.access_token")],
        ),
        Req(
            "Danh sách + tìm theo SĐT → 1 người",
            "GET",
            "/admin/users?q=@{ph_staff}",
            tok="tok_admin",
            expect=200,
            tests=[js("đúng 1", "j.length === 1 && j[0].role === 'NHAN_VIEN_BAN_VE'")],
        ),
        Req(
            "Lọc theo vai trò KHACH_HANG → toàn khách",
            "GET",
            "/admin/users?role=KHACH_HANG",
            tok="tok_admin",
            expect=200,
            tests=[js("toàn khách", "j.length > 0 && j.every(u => u.role === 'KHACH_HANG')")],
        ),
        Req(
            "Sửa tên nhân viên → 200",
            "PATCH",
            "/admin/users/@{staff_id}",
            tok="tok_admin",
            body='{"full_name":"Nhân viên đã sửa"}',
            expect=200,
            tests=[js("tên mới", "j.full_name === 'Nhân viên đã sửa'")],
        ),
        Req(
            "Chi tiết + nhật ký hoạt động → có thao tác tạo tài khoản",
            "GET",
            "/admin/users/@{staff_id}",
            tok="tok_admin",
            expect=200,
            tests=[
                js("có nhật ký tạo", "j.activity.some(a => a.action === 'TAO_TAI_KHOAN')"),
                js("có nhật ký đăng nhập", "j.activity.some(a => a.action === 'DANG_NHAP')"),
            ],
        ),
        Req(
            "Đổi vai trò nhân viên → ADMIN, phiên cũ bị thu hồi",
            "PATCH",
            "/admin/users/@{staff_id}",
            tok="tok_admin",
            body='{"role":"ADMIN"}',
            expect=200,
            tests=[js("vai trò mới", "j.role === 'ADMIN'")],
        ),
        Req(
            "Phiên cũ của nhân viên sau khi đổi quyền → 401",
            "GET",
            "/auth/me",
            tok="tok_staff",
            expect=401,
        ),
        Req(
            "Admin tự đổi vai trò của mình → 400",
            "PATCH",
            "/admin/users/@{admin_id}",
            tok="tok_admin",
            body='{"role":"NHAN_VIEN_BAN_VE"}',
            expect=400,
        ),
        Req(
            "Đổi khách hàng thành nhân viên → 400",
            "PATCH",
            "/admin/users/@{cust_id}",
            tok="tok_admin",
            body='{"role":"NHAN_VIEN_BAN_VE"}',
            expect=400,
        ),
        Req(
            "Đặt lại mật khẩu nhân viên → mật khẩu tạm mới",
            "POST",
            "/admin/users/@{staff_id}/reset-password",
            tok="tok_admin",
            expect=200,
            tests=[
                js(
                    "mật khẩu tạm + buộc đổi",
                    "j.temp_password.length === 10 && j.must_change_password === true",
                ),
                setv("staff_temp2", "j.temp_password"),
            ],
        ),
        Req(
            "Mật khẩu cũ của nhân viên không dùng được → 401",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_staff}","password":"nhanvien2026"}',
            expect=401,
        ),
        Req(
            "Đăng nhập bằng mật khẩu tạm mới → buộc đổi",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_staff}","password":"@{staff_temp2}"}',
            expect=200,
            tests=[js("buộc đổi", "j.must_change_password === true")],
        ),
        Req(
            "Admin tự khóa chính mình → 400",
            "POST",
            "/admin/users/@{admin_id}/lock",
            tok="tok_admin",
            expect=400,
        ),
        Req(
            "Khóa khách đang có vé chưa đi → cảnh báo, thu hồi phiên",
            "POST",
            "/admin/users/@{cust_id}/lock",
            tok="tok_admin",
            expect=200,
            tests=[
                js(
                    "khóa + cảnh báo vé chưa đi",
                    "j.status === 'KHOA' && j.warning.includes('vé chưa đi')",
                )
            ],
        ),
        Req("Khách bị khóa: token cũ → 401", "GET", "/auth/me", tok="tok_cust", expect=401),
        Req(
            "Khách bị khóa: đăng nhập → 403",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_cust}","password":"matkhau123"}',
            expect=403,
        ),
        Req(
            "Vé của khách bị khóa vẫn còn hiệu lực",
            "GET",
            "/admin/orders/@{b_order}",
            tok="tok_admin",
            expect=200,
            tests=[js("vẫn đã thanh toán", "j.status === 'DA_THANH_TOAN'")],
        ),
        Req(
            "Mở khóa khách → 200",
            "POST",
            "/admin/users/@{cust_id}/unlock",
            tok="tok_admin",
            expect=200,
            tests=[js("hoạt động", "j.status === 'HOAT_DONG'")],
        ),
        Req(
            "Khách đăng nhập lại được → 200",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_cust}","password":"matkhau123"}',
            expect=200,
            tests=[setv("tok_cust", "j.access_token")],
        ),
        Req(
            "Khóa tài khoản không tồn tại → 404",
            "POST",
            "/admin/users/999999/lock",
            tok="tok_admin",
            expect=404,
        ),
        Req(
            "Nhân viên quầy không xem được danh sách tài khoản → 403",
            "GET",
            "/admin/users",
            tok="tok_clerk",
            expect=403,
        ),
        Req(
            "Khách không tạo được nhân viên → 403",
            "POST",
            "/admin/users",
            tok="tok_cust",
            body='{"phone":"0944444442","full_name":"X","role":"ADMIN"}',
            expect=403,
        ),
    )
    return f


# ---------- 14. Báo cáo ----------
def f_reports():
    f = Folder("14. Thống kê & báo cáo (UC17)")
    pre = """
const d = n => new Date(Date.now() + 7*3600*1000 + n*86400000).toISOString().slice(0,10);
pm.collectionVariables.set('rp_from', d(0));
pm.collectionVariables.set('rp_to', d(40));
"""
    q = "date_from=@{rp_from}&date_to=@{rp_to}"
    f.add(
        Req(
            "Báo cáo tổng hợp → 200",
            "GET",
            f"/admin/reports?{q}",
            tok="tok_admin",
            pre=pre,
            expect=200,
            tests=[
                js("thực thu = bán − hoàn", "Math.abs(j.net - (j.gross - j.refunded)) < 0.01"),
                js("có doanh thu và vé bán", "j.gross > 0 && j.tickets_sold > 0"),
                js("tỷ lệ hủy trong [0,1]", "j.cancel_rate >= 0 && j.cancel_rate <= 1"),
                js("tỷ lệ lấp đầy trong [0,1]", "j.occupancy >= 0 && j.occupancy <= 1"),
                js(
                    "có tuyến thử trong báo cáo",
                    "j.by_route.some(r => r.route === 'Thử-A-' + pm.collectionVariables.get('rid') + ' - Thử-B-' + pm.collectionVariables.get('rid'))",
                ),
                js(
                    "doanh thu tách theo kênh",
                    "j.net_by_channel.TRUC_TUYEN !== undefined && j.net_by_channel.TAI_QUAY !== undefined",
                ),
                setv("rp_gross", "j.gross"),
            ],
        ),
        Req(
            "Lọc theo tuyến → chỉ còn 1 tuyến ở cả 3 báo cáo",
            "GET",
            f"/admin/reports?{q}&route_id=@{{route_id}}",
            tok="tok_admin",
            expect=200,
            tests=[
                js("1 tuyến doanh thu", "j.by_route.length === 1"),
                js("1 tuyến lấp đầy", "j.fill_by_route.length === 1"),
                js("chuyến thuộc tuyến này", "j.trips.every(t => t.route.startsWith('Thử-A-'))"),
            ],
        ),
        Req(
            "Lọc theo kênh TAI_QUAY → chỉ doanh thu quầy",
            "GET",
            f"/admin/reports?{q}&channel=TAI_QUAY",
            tok="tok_admin",
            expect=200,
            tests=[
                js("chỉ kênh quầy", "Object.keys(j.net_by_channel).join() === 'TAI_QUAY'"),
                js("không vượt tổng", "j.gross <= pm.collectionVariables.get('rp_gross')"),
            ],
        ),
        Req(
            "Báo cáo có hoàn tiền: có vé hủy",
            "GET",
            f"/admin/reports?{q}",
            tok="tok_admin",
            expect=200,
            tests=[js("đã hoàn > 0 và vé hủy > 0", "j.refunded > 0 && j.tickets_cancelled > 0")],
        ),
        Req(
            "Khoảng ngày sai (từ > đến) → 400",
            "GET",
            "/admin/reports?date_from=2026-12-31&date_to=2026-01-01",
            tok="tok_admin",
            expect=400,
        ),
        Req(
            "Kỳ không có dữ liệu → số 0 kèm thông báo",
            "GET",
            "/admin/reports?date_from=2099-01-01&date_to=2099-01-02",
            tok="tok_admin",
            expect=200,
            tests=[js("rỗng", "j.gross === 0 && j.by_route.length === 0 && !!j.message")],
        ),
        Req("Thiếu tham số ngày → 422", "GET", "/admin/reports", tok="tok_admin", expect=422),
        Req(
            "Xuất CSV → 200, mở bằng Excel",
            "GET",
            f"/admin/reports/export.csv?{q}",
            tok="tok_admin",
            expect=200,
            tests=[
                js("là CSV", "pm.response.headers.get('Content-Type').startsWith('text/csv')"),
                js("có dòng TỔNG", "pm.response.text().includes('TỔNG')"),
            ],
        ),
        Req(
            "Báo cáo: nhân viên quầy → 403",
            "GET",
            f"/admin/reports?{q}",
            tok="tok_clerk",
            expect=403,
        ),
        Req("Báo cáo: khách hàng → 403", "GET", f"/admin/reports?{q}", tok="tok_cust", expect=403),
        Req("Xuất CSV: không đăng nhập → 401", "GET", f"/admin/reports/export.csv?{q}", expect=401),
    )
    return f


# ---------- 15. Hệ thống ----------
def f_system():
    f = Folder("15. Hệ thống: sức khỏe, tài liệu API, phân trang")
    f.add(
        Req("Health check → 200, DB đang chạy", "GET", "/health", expect=200, tests=[js("DB up", "j.status === 'ok' && j.database === 'up'")]),
        Req("Swagger UI → 200", "GET", "/docs", expect=200),
        Req("OpenAPI → 200, có đủ nhóm endpoint", "GET", "/openapi.json", expect=200,
            tests=[js("có login, orders, reports", "!!j.paths['/auth/login'] && !!j.paths['/orders'] && !!j.paths['/admin/reports']"), js("nhiều endpoint", "Object.keys(j.paths).length >= 40")]),
        Req("Phân trang: limit=2 → đúng 2 dòng, header X-Total-Count", "GET", "/admin/users?limit=2&offset=0", tok="tok_admin", expect=200,
            tests=[js("2 dòng", "j.length === 2"), js("có tổng số", "parseInt(pm.response.headers.get('X-Total-Count')) >= 3"), setv("pg_first", "j[0].id")]),
        Req("Phân trang: offset=1 → dòng đầu đổi", "GET", "/admin/users?limit=2&offset=1", tok="tok_admin", expect=200,
            tests=[js("khác trang trước", "j[0].id !== pm.collectionVariables.get('pg_first')")]),
        Req("Phân trang: limit=0 → 422", "GET", "/admin/users?limit=0", tok="tok_admin", expect=422),
        Req("Phân trang: limit=501 → 422", "GET", "/admin/users?limit=501", tok="tok_admin", expect=422),
        Req("Đơn quản trị có tổng số khớp bộ lọc", "GET", "/admin/orders?limit=1", tok="tok_admin", expect=200, tests=[js("1 dòng, total ≥ 1", "j.items.length === 1 && j.total >= 1")]),
        Req("Route không tồn tại → 404", "GET", "/khong-co-route", expect=404),
    )
    return f


# ---------- 16. Bổ sung: đổi lịch/đổi xe, hoàn tiền muộn, tham số hệ thống, đổi SĐT ----------
def f_extras():
    f = Folder("16. Đổi lịch & đổi xe, hoàn tiền muộn, tham số hệ thống, đổi SĐT")
    f.add(
        # --- đổi lịch / đổi xe khi đã bán vé ---
        *mk_trip("e", 26, 8, 300000, n_seats=6),
        *buy_online("e", [1, 6], "tok_cust", "e_order", "e_ticket"),
        Req("Đổi giờ chuyến đã bán vé → 200, báo SMS 2 vé", "PATCH", "/admin/trips/@{e_trip}", tok="tok_admin", body='{"departure_time":"09:30"}', expect=200,
            tests=[js("báo 2 hành khách", "j.notified_passengers === 2"), js("giờ mới", "j.departure_time === '09:30:00'")]),
        Req("Chỉ đổi ghi chú → không báo ai", "PATCH", "/admin/trips/@{e_trip}", tok="tok_admin", body='{"note":"Đón sớm 15 phút"}', expect=200, tests=[js("không báo", "j.notified_passengers === 0")]),
        Req("Đổi sang xe nhỏ (4 ghế) khi ghế A06 đang bán → 400 nêu ghế thiếu", "PATCH", "/admin/trips/@{e_trip}", tok="tok_admin", body='{"vehicle_id":@{veh_small}}', expect=400,
            tests=[js("nêu ghế A06", "j.detail.includes('A06')")]),
        Req("Tạo xe lớn thứ hai (24 ghế) để đổi", "POST", "/admin/vehicles", tok="tok_admin", expect=201,
            body='{"plate":"T@{rid}X","vehicle_type_id":@{vtype_id},"layout":{"floors":1,"rows":6,"seats_per_row":4}}', tests=[setv("veh_big2", "j.id")]),
        Req("Đổi sang xe lớn thứ hai khi đã bán vé → 200, báo SMS", "PATCH", "/admin/trips/@{e_trip}", tok="tok_admin", body='{"vehicle_id":@{veh_big2}}', expect=200,
            tests=[js("báo 2 vé, vẫn 22 ghế trống", "j.notified_passengers === 2 && j.available_seats === 22")]),
        Req("Vé vẫn giữ đúng mã ghế trên xe mới", "GET", "/orders/@{e_order}", tok="tok_cust", expect=200,
            tests=[js("ghế A01 và A06, biển số mới", "j.tickets.map(t => t.seat_code).sort().join() === 'A01,A06' && j.tickets[0].plate === 'T' + pm.collectionVariables.get('rid') + 'X'")]),
        # --- hoàn tiền khi tiền về muộn ---
        *mk_trip("l", 28, 8, 250000, n_seats=3),
        hold("Quầy giữ ghế cho khách quét VietQR", "tok_clerk", "l", [1], expect=200),
        Req("Lập phiếu quầy", "POST", "/counter/orders", tok="tok_clerk", body=order_body("l", [1], name="Khách", phone="0922222222"), expect=201, tests=[setv("l_order", "j.id")]),
        Req("Chọn VietQR → chờ thanh toán", "POST", "/orders/@{l_order}/pay", tok="tok_clerk", body='{"method":"VIETQR"}', expect=200,
            tests=[setv("l_txn", "j.order.payments[0].transaction_id")]),
        Req("Khách đổi ý trả tiền mặt → đơn thanh toán xong, mã VietQR bị hủy", "POST", "/orders/@{l_order}/pay", tok="tok_clerk", body='{"method":"TIEN_MAT"}', expect=200, tests=[js("thành công", "j.result === 'THANH_CONG'")]),
        Req("Cổng báo tiền VietQR về muộn → đơn vẫn hợp lệ, tự hoàn khoản VietQR", "POST", "/payments/webhook", body='{"transaction_id":"@{l_txn}","status":"SUCCESS"}', expect=200,
            pre=HDR, tests=[js("đơn vẫn đã thanh toán", "j.status === 'DA_THANH_TOAN'")]),
        Req("Admin thấy lệnh hoàn THANH_TOAN_QUA_HAN đã hoàn xong", "GET", "/admin/orders/@{l_order}", tok="tok_admin", expect=200,
            tests=[js("1 lệnh hoàn 250.000, không phí", "j.refunds.length === 1 && j.refunds[0].reason === 'THANH_TOAN_QUA_HAN' && j.refunds[0].amount === 250000 && j.refunds[0].fee === 0"),
                   js("đã hoàn", "j.refunds[0].status === 'DA_HOAN' && j.refunds[0].transaction_id.startsWith('RF-')")]),
        Req("Webhook báo lại lần hai → không hoàn thêm lần nữa", "POST", "/payments/webhook", body='{"transaction_id":"@{l_txn}","status":"SUCCESS"}', expect=200, pre=HDR,
            tests=[js("vẫn 1 thanh toán hủy→thành công", "j.payments.length === 2")]),
        Req("Chi tiết đơn: vẫn chỉ 1 lệnh hoàn", "GET", "/admin/orders/@{l_order}", tok="tok_admin", expect=200, tests=[js("1 lệnh", "j.refunds.length === 1")]),
        # --- tham số hệ thống ---
        *mk_trip("p", 30, 8, 400000, n_seats=3),
        *buy_online("p", [1], "tok_cust", "p_order", "p_ticket"),
        Req("Tham số hệ thống: Admin xem danh sách → 200", "GET", "/admin/settings", tok="tok_admin", expect=200,
            tests=[js("đủ tham số", "['THOI_GIAN_GIU_CHO_PHUT','PHI_HUY_PHAN_TRAM','DANG_NHAP_SAI_TOI_DA','OTP_HIEU_LUC_GIAY'].every(n => j.some(s => s.name === n))")]),
        Req("Báo giá hủy với phí 15% → 60.000", "GET", "/tickets/@{p_ticket}/cancel-quote", tok="tok_cust", expect=200, tests=[js("phí 60.000", "j.fee === 60000")]),
        Req("Admin đổi phí hủy sang 20% → 200", "PATCH", "/admin/settings/PHI_HUY_PHAN_TRAM", tok="tok_admin", body='{"value":20}', expect=200, tests=[js("giá trị mới", "j.value === '20'")]),
        Req("Báo giá hủy lại → phí 20% = 80.000 (áp dụng ngay)", "GET", "/tickets/@{p_ticket}/cancel-quote", tok="tok_cust", expect=200, tests=[js("phí 80.000", "j.fee_percent === 20 && j.fee === 80000")]),
        Req("Khôi phục phí hủy 15% → 200", "PATCH", "/admin/settings/PHI_HUY_PHAN_TRAM", tok="tok_admin", body='{"value":15}', expect=200),
        Req("Tham số ngoài khoảng cho phép → 400", "PATCH", "/admin/settings/PHI_HUY_PHAN_TRAM", tok="tok_admin", body='{"value":101}', expect=400),
        Req("Tham số không tồn tại → 404", "PATCH", "/admin/settings/KHONG_CO", tok="tok_admin", body='{"value":1}', expect=404),
        Req("Khách không xem được tham số → 403", "GET", "/admin/settings", tok="tok_cust", expect=403),
        # --- đổi số điện thoại ---
        Req("Đổi SĐT: số mới trùng số hiện tại → 400", "POST", "/auth/phone/otp", tok="tok_acc", body='{"new_phone":"@{ph_acc}"}', expect=400),
        Req("Đổi SĐT: số mới đã có tài khoản khác → 409", "POST", "/auth/phone/otp", tok="tok_acc", body='{"new_phone":"@{ph_cust}"}', expect=409),
        Req("Đổi SĐT: không đăng nhập → 401", "POST", "/auth/phone/otp", body='{"new_phone":"@{ph_acc_new}"}', expect=401),
        Req("Đổi SĐT: gửi OTP tới số mới → 200", "POST", "/auth/phone/otp", tok="tok_acc", body='{"new_phone":"@{ph_acc_new}"}', expect=200, tests=[setv("otp_phone", "j.mock_otp")]),
        Req("Đổi SĐT: sai mật khẩu → 400", "POST", "/auth/phone/change", tok="tok_acc", body='{"new_phone":"@{ph_acc_new}","otp":"@{otp_phone}","password":"saimatkhau1"}', expect=400),
        Req("Đổi SĐT: OTP sai → 400", "POST", "/auth/phone/change", tok="tok_acc", body='{"new_phone":"@{ph_acc_new}","otp":"000000","password":"matkhaumoi8"}', expect=400),
        Req("Đổi SĐT: thành công → 200, cấp token mới", "POST", "/auth/phone/change", tok="tok_acc", body='{"new_phone":"@{ph_acc_new}","otp":"@{otp_phone}","password":"matkhaumoi8"}', expect=200,
            tests=[setv("tok_acc_old", "pm.collectionVariables.get('tok_acc')"), setv("tok_acc", "j.access_token")]),
        Req("Đổi SĐT: phiên cũ bị thu hồi → 401", "GET", "/auth/me", tok="tok_acc_old", expect=401),
        Req("Đổi SĐT: token mới thấy số mới", "GET", "/auth/me", tok="tok_acc", expect=200, tests=[js("số mới", "j.phone === pm.collectionVariables.get('ph_acc_new')")]),
        Req("Đổi SĐT: số cũ không đăng nhập được nữa → 401", "POST", "/auth/login", body='{"phone":"@{ph_acc}","password":"matkhaumoi8"}', expect=401),
        Req("Đổi SĐT: đăng nhập bằng số mới → 200", "POST", "/auth/login", body='{"phone":"@{ph_acc_new}","password":"matkhaumoi8"}', expect=200),
    )
    return f
