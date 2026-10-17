# ---------- 04. Tuyến, chuyến, tra cứu ----------
def f_trips():
    f = Folder("04. Tuyến, chuyến xe & tra cứu (UC13 Quản lý chuyến, UC01 Tra cứu)")
    pre_date = """
const day = n => new Date(Date.now() + 7*3600*1000 + n*86400*1000).toISOString().slice(0,10);
pm.collectionVariables.set('tr_date', day(10));
pm.collectionVariables.set('tr_date_empty', day(11));
"""
    f.add(
        Req(
            "Tuyến: thêm tuyến mới → 201",
            "POST",
            "/admin/routes",
            tok="tok_admin",
            expect=201,
            body='{"origin":"Điểm-X-@{rid}","destination":"Điểm-Y-@{rid}","distance_km":50,"expected_minutes":45}',
            tests=[setv("route_other", "j.id")],
        ),
        Req(
            "Tuyến: trùng điểm đi - điểm đến → 409",
            "POST",
            "/admin/routes",
            tok="tok_admin",
            expect=409,
            body='{"origin":"Điểm-X-@{rid}","destination":"Điểm-Y-@{rid}"}',
        ),
        Req(
            "Tuyến: thời gian dự kiến quá ngắn → 422",
            "POST",
            "/admin/routes",
            tok="tok_admin",
            expect=422,
            body='{"origin":"A","destination":"B","expected_minutes":5}',
        ),
        Req(
            "Tuyến: ngừng hoạt động tuyến → 200",
            "PATCH",
            "/admin/routes/@{route_other}",
            tok="tok_admin",
            body='{"status":"NGUNG"}',
            expect=200,
        ),
        Req(
            "Chuyến: tạo trên tuyến đã ngừng → 400",
            "POST",
            "/admin/trips",
            tok="tok_admin",
            pre=pre_date,
            expect=400,
            body='{"route_id":@{route_other},"vehicle_id":@{veh_big},"departure_date":"@{tr_date}","departure_time":"08:00","price":100000}',
        ),
        Req(
            "Chuyến: tạo chuyến 08:00 → 201, đủ 24 ghế trống và điểm đón/trả",
            "POST",
            "/admin/trips",
            tok="tok_admin",
            expect=201,
            body='{"route_id":@{route_id},"vehicle_id":@{veh_big},"departure_date":"@{tr_date}","departure_time":"08:00","price":300000,"pickup_points":["Bến A","Bến B"],"dropoff_points":["Bến Đích"]}',
            tests=[
                js("24 ghế, đều trống", "j.total_seats === 24 && j.available_seats === 24"),
                js(
                    "2 điểm đón + 1 điểm trả",
                    "j.stops.filter(s => s.kind === 'DON').length === 2 && j.stops.filter(s => s.kind === 'TRA').length === 1",
                ),
                js("trạng thái MO_BAN", "j.status === 'MO_BAN'"),
                setv("tr_trip", "j.id"),
            ],
        ),
        Req(
            "Chuyến: ngày khởi hành trong quá khứ → 400",
            "POST",
            "/admin/trips",
            tok="tok_admin",
            expect=400,
            body='{"route_id":@{route_id},"vehicle_id":@{veh_big},"departure_date":"2020-01-01","departure_time":"08:00","price":300000}',
        ),
        Req(
            "Chuyến: xe trùng lịch (08:30, chuyến trước chạy 60 phút) → 409",
            "POST",
            "/admin/trips",
            tok="tok_admin",
            expect=409,
            body='{"route_id":@{route_id},"vehicle_id":@{veh_big},"departure_date":"@{tr_date}","departure_time":"08:30","price":300000}',
            tests=[js("nêu chuyến xung đột", "j.detail.includes('trùng lịch')")],
        ),
        Req(
            "Chuyến: cùng xe nhưng 12:00 (không chồng giờ) → 201",
            "POST",
            "/admin/trips",
            tok="tok_admin",
            expect=201,
            body='{"route_id":@{route_id},"vehicle_id":@{veh_big},"departure_date":"@{tr_date}","departure_time":"12:00","price":150000}',
            tests=[setv("tr_trip2", "j.id")],
        ),
        Req(
            "Chuyến: giá = 0 → 422",
            "POST",
            "/admin/trips",
            tok="tok_admin",
            expect=422,
            body='{"route_id":@{route_id},"vehicle_id":@{veh_big},"departure_date":"@{tr_date}","departure_time":"18:00","price":0}',
        ),
        Req(
            "Chuyến: xe không tồn tại → 404",
            "POST",
            "/admin/trips",
            tok="tok_admin",
            expect=404,
            body='{"route_id":@{route_id},"vehicle_id":999999,"departure_date":"@{tr_date}","departure_time":"18:00","price":100000}',
        ),
        Req(
            "Tra cứu: đúng điểm đi/đến/ngày → 200, có cả 2 chuyến (công khai, không cần đăng nhập)",
            "GET",
            "/trips/search?origin=Thử-A-@{rid}&destination=Thử-B-@{rid}&date=@{tr_date}",
            expect=200,
            tests=[
                js("2 chuyến", "j.items.length === 2"),
                js("sắp theo giờ", "j.items[0].departure_time < j.items[1].departure_time"),
                js("còn 24 ghế", "j.items[0].available_seats === 24"),
            ],
        ),
        Req(
            "Tra cứu: không phân biệt hoa thường và dấu → 200",
            "GET",
            "/trips/search?origin=THU-A-@{rid}&destination=thu-b-@{rid}&date=@{tr_date}",
            expect=200,
            tests=[js("vẫn thấy 2 chuyến", "j.items.length === 2")],
        ),
        Req(
            "Tra cứu: lọc buổi sáng → chỉ chuyến 08:00",
            "GET",
            "/trips/search?origin=Thử-A-@{rid}&destination=Thử-B-@{rid}&date=@{tr_date}&time_of_day=SANG",
            expect=200,
            tests=[
                js(
                    "1 chuyến đúng id",
                    "j.items.length === 1 && j.items[0].id === pm.collectionVariables.get('tr_trip')",
                )
            ],
        ),
        Req(
            "Tra cứu: lọc buổi chiều → chỉ chuyến 12:00",
            "GET",
            "/trips/search?origin=Thử-A-@{rid}&destination=Thử-B-@{rid}&date=@{tr_date}&time_of_day=CHIEU",
            expect=200,
            tests=[
                js("1 chuyến", "j.items.length === 1 && j.items[0].departure_time === '12:00:00'")
            ],
        ),
        Req(
            "Tra cứu: lọc giá tối đa 200.000 → chỉ chuyến 150.000",
            "GET",
            "/trips/search?origin=Thử-A-@{rid}&destination=Thử-B-@{rid}&date=@{tr_date}&max_price=200000",
            expect=200,
            tests=[
                js("1 chuyến giá 150000", "j.items.length === 1 && j.items[0].price === 150000")
            ],
        ),
        Req(
            "Tra cứu: ngày không có chuyến → thông báo + gợi ý ngày lân cận",
            "GET",
            "/trips/search?origin=Thử-A-@{rid}&destination=Thử-B-@{rid}&date=@{tr_date_empty}",
            expect=200,
            tests=[
                js("danh sách rỗng", "j.items.length === 0"),
                js("có thông báo", "j.message === 'Không tìm thấy chuyến xe phù hợp'"),
                js(
                    "gợi ý ngày có chuyến",
                    "j.suggested_dates.includes(pm.collectionVariables.get('tr_date'))",
                ),
            ],
        ),
        Req("Tra cứu: thiếu tham số bắt buộc → 422", "GET", "/trips/search?origin=A", expect=422),
        Req(
            "Chi tiết chuyến → 200, có điểm đón/trả",
            "GET",
            "/trips/@{tr_trip}",
            expect=200,
            tests=[js("có điểm dừng", "j.stops.length === 3")],
        ),
        Req(
            "Sơ đồ ghế → 200, 24 ghế đều TRONG",
            "GET",
            "/trips/@{tr_trip}/seats",
            expect=200,
            tests=[js("24 ghế trống", "j.length === 24 && j.every(s => s.state === 'TRONG')")],
        ),
        Req("Chi tiết chuyến không tồn tại → 404", "GET", "/trips/999999", expect=404),
        Req(
            "Sửa chuyến: đổi giờ sang 09:15 → 200",
            "PATCH",
            "/admin/trips/@{tr_trip}",
            tok="tok_admin",
            body='{"departure_time":"09:15"}',
            expect=200,
            tests=[js("giờ mới", "j.departure_time === '09:15:00'")],
        ),
        Req(
            "Sửa chuyến: đổi giờ chồng sang giờ chuyến kia → 409",
            "PATCH",
            "/admin/trips/@{tr_trip}",
            tok="tok_admin",
            body='{"departure_time":"12:10"}',
            expect=409,
        ),
        Req(
            "Sửa chuyến: đổi xe → 400",
            "PATCH",
            "/admin/trips/@{tr_trip}",
            tok="tok_admin",
            body='{"vehicle_id":@{veh_small}}',
            expect=400,
        ),
        Req(
            "Cập nhật giá chuyến → 200",
            "PATCH",
            "/admin/trips/@{tr_trip}/price",
            tok="tok_admin",
            body='{"price":350000}',
            expect=200,
            tests=[js("giá mới", "j.price === 350000")],
        ),
        Req(
            "Cập nhật giá = 0 → 422",
            "PATCH",
            "/admin/trips/@{tr_trip}/price",
            tok="tok_admin",
            body='{"price":0}',
            expect=422,
        ),
        Req(
            "Danh sách chuyến (Admin) lọc theo ngày và tuyến → 200",
            "GET",
            "/admin/trips?route_id=@{route_id}&date=@{tr_date}",
            tok="tok_admin",
            expect=200,
            tests=[js("2 chuyến", "j.length === 2")],
        ),
        Req(
            "Danh sách chuyến: khách hàng → 403", "GET", "/admin/trips", tok="tok_cust", expect=403
        ),
        Req(
            "Xe đang có chuyến: ngừng hoạt động → 400",
            "POST",
            "/admin/vehicles/@{veh_big}/deactivate",
            tok="tok_admin",
            expect=400,
        ),
        Req(
            "Xe đã có chuyến: sửa sơ đồ ghế → 400",
            "PUT",
            "/admin/vehicles/@{veh_big}/seats",
            tok="tok_admin",
            body='{"floors":1,"rows":3,"seats_per_row":2}',
            expect=400,
        ),
    )
    return f


# ---------- 05. Giữ chỗ ----------
def f_hold():
    f = Folder("05. Giữ chỗ tạm thời (UC20)")
    f.add(
        *mk_trip("h", 12, 8, 200000),
        hold(
            "Giữ 2 ghế → 200, đếm ngược 5 phút",
            "tok_cust",
            "h",
            [1, 2],
            expect=200,
            tests=[
                js("2 ghế", "j.seats.length === 2"),
                js("còn ~300 giây", "j.seconds_left > 280 && j.seconds_left <= 300"),
            ],
        ),
        Req(
            "Sơ đồ ghế: 2 ghế đang TAM_KHOA",
            "GET",
            "/trips/@{h_trip}/seats",
            expect=200,
            tests=[js("2 ghế bị giữ", "j.filter(s => s.state === 'TAM_KHOA').length === 2")],
        ),
        Req(
            "Chi tiết chuyến: ghế trống giảm còn 22",
            "GET",
            "/trips/@{h_trip}",
            expect=200,
            tests=[js("22 ghế trống", "j.available_seats === 22")],
        ),
        hold(
            "Khách khác giữ ghế đã bị giữ → 409 + danh sách ghế không khả dụng",
            "tok_cust2",
            "h",
            [1, 3],
            expect=409,
            tests=[
                js(
                    "báo ghế 1 không khả dụng",
                    "j.unavailable_seat_ids.includes(pm.collectionVariables.get('h_s1'))",
                )
            ],
        ),
        Req(
            "Giữ tất cả hoặc không gì: ghế 3 vẫn trống",
            "GET",
            "/trips/@{h_trip}",
            expect=200,
            tests=[js("vẫn 22 ghế trống", "j.available_seats === 22")],
        ),
        hold(
            "Nhân viên quầy giữ ghế đã bị khách giữ → 409 (chặn mọi kênh)",
            "tok_clerk",
            "h",
            [2],
            expect=409,
        ),
        hold("Nhân viên quầy giữ ghế khác → 200", "tok_clerk", "h", [4], expect=200),
        hold(
            "Giữ lại ghế mình đang giữ → 200 (không gia hạn)",
            "tok_cust",
            "h",
            [1],
            expect=200,
            tests=[js("vẫn 2 ghế", "j.seats.length === 2")],
        ),
        Req(
            "Xem ghế mình đang giữ → 200",
            "GET",
            "/trips/@{h_trip}/hold",
            tok="tok_cust",
            expect=200,
            tests=[js("2 ghế", "j.seats.length === 2")],
        ),
        Req(
            "Nhả 1 ghế → còn 1 ghế",
            "POST",
            "/trips/@{h_trip}/release",
            tok="tok_cust",
            body='{"seat_ids":[@{h_s1}]}',
            expect=200,
            tests=[js("còn 1 ghế", "j.seats.length === 1")],
        ),
        Req(
            "Nhả tất cả → không còn ghế giữ",
            "POST",
            "/trips/@{h_trip}/release",
            tok="tok_cust",
            expect=200,
            tests=[js("rỗng", "j.seats.length === 0")],
        ),
        hold("Giữ lại ghế 1 để thử ghế lạ → 200", "tok_cust", "h", [1], expect=200),
        Req(
            "Giữ ghế không thuộc chuyến này → 400",
            "POST",
            "/trips/@{h_trip}/hold",
            tok="tok_cust",
            body='{"seat_ids":[999999]}',
            expect=400,
        ),
        Req(
            "Giữ ghế: không chọn ghế nào → 422",
            "POST",
            "/trips/@{h_trip}/hold",
            tok="tok_cust",
            body='{"seat_ids":[]}',
            expect=422,
        ),
        Req(
            "Giữ ghế: không đăng nhập → 401",
            "POST",
            "/trips/@{h_trip}/hold",
            body='{"seat_ids":[@{h_s5}]}',
            expect=401,
        ),
        Req(
            "Giữ ghế: Admin không được bán vé → 403",
            "POST",
            "/trips/@{h_trip}/hold",
            tok="tok_admin",
            body='{"seat_ids":[@{h_s5}]}',
            expect=403,
        ),
        Req(
            "Giữ ghế: chuyến không tồn tại → 404",
            "POST",
            "/trips/999999/hold",
            tok="tok_cust",
            body='{"seat_ids":[1]}',
            expect=404,
        ),
    )
    return f


# ---------- 06. Mã giảm giá ----------
def f_coupons():
    f = Folder("06. Giá vé & mã giảm giá (UC15, Admin)")
    pre = """
pm.collectionVariables.set('cp_code', 'P' + pm.collectionVariables.get('rid'));
pm.collectionVariables.set('cf_code', 'F' + pm.collectionVariables.get('rid'));
pm.collectionVariables.set('cp_from', new Date(Date.now() - 86400000).toISOString().slice(0,19));
pm.collectionVariables.set('cp_to', new Date(Date.now() + 30*86400000).toISOString().slice(0,19));
"""
    body_p = '{"code":"@{cp_code}","kind":"PHAN_TRAM","value":10,"max_discount":50000,"min_order":300000,"quantity":3,"valid_from":"@{cp_from}","valid_to":"@{cp_to}"}'
    body_f = '{"code":"@{cf_code}","kind":"SO_TIEN","value":30000,"min_order":0,"quantity":100,"valid_from":"@{cp_from}","valid_to":"@{cp_to}"}'
    f.add(
        Req(
            "Tạo mã giảm 10% (tối đa 50k, đơn từ 300k) → 201, mã tự viết hoa",
            "POST",
            "/admin/coupons",
            tok="tok_admin",
            pre=pre,
            body=body_p,
            expect=201,
            tests=[js("chưa dùng lượt nào", "j.used === 0"), setv("cp_id", "j.id")],
        ),
        Req(
            "Tạo mã trùng → 409",
            "POST",
            "/admin/coupons",
            tok="tok_admin",
            body=body_p.replace("@{cp_code}", "@{cp_code}"),
            expect=409,
        ),
        Req(
            "Tạo mã giảm số tiền cố định 30k → 201",
            "POST",
            "/admin/coupons",
            tok="tok_admin",
            body=body_f,
            expect=201,
            tests=[setv("cf_id", "j.id")],
        ),
        Req(
            "Tạo mã: hạn kết thúc trước hạn bắt đầu → 400",
            "POST",
            "/admin/coupons",
            tok="tok_admin",
            expect=400,
            body='{"code":"X@{rid}","kind":"SO_TIEN","value":1000,"quantity":1,"valid_from":"@{cp_to}","valid_to":"@{cp_from}"}',
        ),
        Req(
            "Tạo mã: giảm 150% → 400",
            "POST",
            "/admin/coupons",
            tok="tok_admin",
            expect=400,
            body='{"code":"Y@{rid}","kind":"PHAN_TRAM","value":150,"quantity":1,"valid_from":"@{cp_from}","valid_to":"@{cp_to}"}',
        ),
        Req(
            "Tạo mã: số lượng 0 → 422",
            "POST",
            "/admin/coupons",
            tok="tok_admin",
            expect=422,
            body='{"code":"Z@{rid}","kind":"SO_TIEN","value":1000,"quantity":0,"valid_from":"@{cp_from}","valid_to":"@{cp_to}"}',
        ),
        Req(
            "Danh sách mã → 200, thấy mã vừa tạo",
            "GET",
            "/admin/coupons",
            tok="tok_admin",
            expect=200,
            tests=[js("có mã", "j.some(c => c.code === pm.collectionVariables.get('cp_code'))")],
        ),
        Req(
            "Kiểm tra mã: 10% của 400.000 → giảm 40.000",
            "POST",
            "/coupons/validate",
            tok="tok_cust",
            body='{"code":"@{cp_code}","amount":400000}',
            expect=200,
            tests=[js("giảm 40k, còn 360k", "j.discount === 40000 && j.final_amount === 360000")],
        ),
        Req(
            "Kiểm tra mã: chạm trần 50.000 khi đơn 900.000",
            "POST",
            "/coupons/validate",
            tok="tok_cust",
            body='{"code":"@{cp_code}","amount":900000}',
            expect=200,
            tests=[js("giảm đúng 50k", "j.discount === 50000")],
        ),
        Req(
            "Kiểm tra mã: gõ thường vẫn nhận → 200",
            "POST",
            "/coupons/validate",
            tok="tok_cust",
            body='{"code":"@{cp_code}","amount":400000}'.replace("@{cp_code}", "p@{rid}"),
            expect=200,
        ),
        Req(
            "Kiểm tra mã: đơn dưới mức tối thiểu → 400",
            "POST",
            "/coupons/validate",
            tok="tok_cust",
            body='{"code":"@{cp_code}","amount":100000}',
            expect=400,
        ),
        Req(
            "Kiểm tra mã: mã không tồn tại → 400",
            "POST",
            "/coupons/validate",
            tok="tok_cust",
            body='{"code":"KHONGCO","amount":400000}',
            expect=400,
        ),
        Req(
            "Kiểm tra mã: số tiền cố định không vượt giá trị đơn → giảm tối đa bằng đơn",
            "POST",
            "/coupons/validate",
            tok="tok_cust",
            body='{"code":"@{cf_code}","amount":20000}',
            expect=200,
            tests=[js("giảm 20k, còn 0", "j.discount === 20000 && j.final_amount === 0")],
        ),
        Req(
            "Tắt mã (không xóa) → 200",
            "PATCH",
            "/admin/coupons/@{cf_id}",
            tok="tok_admin",
            body='{"status":"TAT"}',
            expect=200,
            tests=[js("đã tắt", "j.status === 'TAT'")],
        ),
        Req(
            "Kiểm tra mã đã tắt → 400",
            "POST",
            "/coupons/validate",
            tok="tok_cust",
            body='{"code":"@{cf_code}","amount":400000}',
            expect=400,
        ),
        Req(
            "Danh sách mã đang BẬT không còn mã vừa tắt",
            "GET",
            "/admin/coupons?status=BAT",
            tok="tok_admin",
            expect=200,
            tests=[
                js(
                    "không có mã tắt",
                    "!j.some(c => c.code === pm.collectionVariables.get('cf_code'))",
                )
            ],
        ),
        Req(
            "Bật lại mã → 200",
            "PATCH",
            "/admin/coupons/@{cf_id}",
            tok="tok_admin",
            body='{"status":"BAT"}',
            expect=200,
        ),
        Req(
            "Mã giảm giá: khách hàng không được tạo → 403",
            "POST",
            "/admin/coupons",
            tok="tok_cust",
            body=body_f,
            expect=403,
        ),
        Req(
            "Kiểm tra mã: Admin không dùng chức năng này → 403",
            "POST",
            "/coupons/validate",
            tok="tok_admin",
            body='{"code":"@{cp_code}","amount":400000}',
            expect=403,
        ),
    )
    return f


# ---------- 07. Đặt vé online ----------
def f_booking():
    f = Folder("07. Đặt vé trực tuyến & thanh toán (UC02, UC21)")
    f.add(
        *mk_trip("b", 14, 8, 400000, n_seats=8),
        Req(
            "Đặt vé khi CHƯA giữ chỗ → 409",
            "POST",
            "/orders",
            tok="tok_cust",
            body=order_body("b", [1]),
            expect=409,
        ),
        hold("Giữ ghế 1,2", "tok_cust", "b", [1, 2], expect=200),
        Req(
            "Đặt vé: ghế do người khác giữ → 409",
            "POST",
            "/orders",
            tok="tok_cust2",
            body=order_body("b", [1]),
            expect=409,
        ),
        Req(
            "Đặt vé: SĐT hành khách sai → 422",
            "POST",
            "/orders",
            tok="tok_cust",
            expect=422,
            body=order_body("b", [1], phone="123"),
        ),
        Req(
            "Đặt vé: điểm đón không thuộc chuyến → 400",
            "POST",
            "/orders",
            tok="tok_cust",
            expect=400,
            body='{"trip_id":@{b_trip},"items":[{"seat_id":@{b_s1},"passenger_name":"A","passenger_phone":"0911111111","pickup_stop_id":999999}]}',
        ),
        Req(
            "Đặt vé: không đăng nhập → 401",
            "POST",
            "/orders",
            body=order_body("b", [1]),
            expect=401,
        ),
        Req(
            "Đặt vé 2 ghế kèm mã giảm 10% → 201, 800k giảm 50k (trần)",
            "POST",
            "/orders",
            tok="tok_cust",
            body=order_body("b", [1, 2], coupon="@{cp_code}"),
            expect=201,
            tests=[
                js("tổng 750.000", "j.total === 750000 && j.discount === 50000"),
                js(
                    "giảm chia đều các vé",
                    "j.tickets[0].discount + j.tickets[1].discount === 50000",
                ),
                js(
                    "vé chờ thanh toán, chưa có mã QR",
                    "j.status === 'CHO_THANH_TOAN' && j.tickets.every(t => t.status === 'CHO_THANH_TOAN' && !t.qr_code)",
                ),
                js("có hạn giữ chỗ", "!!j.hold_until"),
                js("có tên điểm đón", "j.tickets[0].pickup_name === 'Bến A'"),
                setv("b_order", "j.id"),
            ],
        ),
        Req(
            "Thanh toán: tiền mặt cho đơn online → 400",
            "POST",
            "/orders/@{b_order}/pay",
            tok="tok_cust",
            body='{"method":"TIEN_MAT"}',
            expect=400,
        ),
        Req(
            "Thanh toán: người khác thanh toán đơn → 403",
            "POST",
            "/orders/@{b_order}/pay",
            tok="tok_cust2",
            body='{"method":"MOMO"}',
            expect=403,
        ),
        Req(
            "Xem đơn của người khác → 403", "GET", "/orders/@{b_order}", tok="tok_cust2", expect=403
        ),
        Req(
            "Thanh toán thẻ bị từ chối → đơn vẫn chờ, cho thử lại",
            "POST",
            "/orders/@{b_order}/pay",
            tok="tok_cust",
            body='{"method":"THE","simulate":"fail"}',
            expect=200,
            tests=[
                js("thất bại", "j.result === 'THAT_BAI'"),
                js("đơn vẫn CHO_THANH_TOAN", "j.order.status === 'CHO_THANH_TOAN'"),
            ],
        ),
        Req(
            "Thanh toán lại bằng MoMo → thành công, phát vé có mã QR",
            "POST",
            "/orders/@{b_order}/pay",
            tok="tok_cust",
            body='{"method":"MOMO"}',
            expect=200,
            tests=[
                js("thành công", "j.result === 'THANH_CONG' && j.order.status === 'DA_THANH_TOAN'"),
                js(
                    "vé CHUA_DI có QR khác nhau",
                    "j.order.tickets.every(t => t.status === 'CHUA_DI' && t.qr_code.length >= 16) && j.order.tickets[0].qr_code !== j.order.tickets[1].qr_code",
                ),
                js(
                    "2 lần thanh toán: thất bại rồi thành công",
                    "j.order.payments.map(p => p.status).join() === 'THAT_BAI,THANH_CONG'",
                ),
                setv("b_ticket", "j.order.tickets[0].id"),
            ],
        ),
        Req(
            "Thanh toán lần hai cho đơn đã trả → 409",
            "POST",
            "/orders/@{b_order}/pay",
            tok="tok_cust",
            body='{"method":"MOMO"}',
            expect=409,
        ),
        Req(
            "Sơ đồ ghế: 2 ghế đã bán",
            "GET",
            "/trips/@{b_trip}/seats",
            expect=200,
            tests=[js("2 ghế DA_BAN", "j.filter(s => s.state === 'DA_BAN').length === 2")],
        ),
        Req(
            "Mã giảm giá: lượt dùng tăng lên 1",
            "GET",
            "/admin/coupons",
            tok="tok_admin",
            expect=200,
            tests=[
                js(
                    "used = 1",
                    "j.find(c => c.code === pm.collectionVariables.get('cp_code')).used === 1",
                )
            ],
        ),
        Req(
            "Đặt ghế đã bán → 409",
            "POST",
            "/orders",
            tok="tok_cust2",
            body=order_body("b", [1]),
            expect=409,
        ),
        # VietQR + webhook
        hold("VietQR: giữ ghế 3", "tok_cust", "b", [3], expect=200),
        Req(
            "VietQR: tạo đơn",
            "POST",
            "/orders",
            tok="tok_cust",
            body=order_body("b", [3]),
            expect=201,
            tests=[setv("b_order_qr", "j.id")],
        ),
        Req(
            "VietQR: trả về mã QR, giao dịch đang xử lý",
            "POST",
            "/orders/@{b_order_qr}/pay",
            tok="tok_cust",
            body='{"method":"VIETQR"}',
            expect=200,
            tests=[
                js(
                    "đang xử lý + có QR",
                    "j.result === 'DANG_XU_LY' && j.qr_content.startsWith('MOCKQR|')",
                ),
                setv("b_txn", "j.order.payments[0].transaction_id"),
            ],
        ),
        Req(
            "Webhook thiếu khóa cổng → 403",
            "POST",
            "/payments/webhook",
            body='{"transaction_id":"@{b_txn}","status":"SUCCESS"}',
            expect=403,
        ),
        Req(
            "Webhook báo thành công → vé được phát",
            "POST",
            "/payments/webhook",
            body='{"transaction_id":"@{b_txn}","status":"SUCCESS"}',
            expect=200,
            pre="pm.request.headers.add({key: 'X-Gateway-Key', value: 'mock-gateway-key'});",
            tests=[
                js("đơn đã thanh toán", "j.status === 'DA_THANH_TOAN'"),
                setv("b_qr1", "j.tickets[0].qr_code"),
            ],
        ),
        Req(
            "Webhook gọi lại lần hai → vẫn 200, không phát vé lần nữa (idempotent)",
            "POST",
            "/payments/webhook",
            body='{"transaction_id":"@{b_txn}","status":"SUCCESS"}',
            expect=200,
            pre="pm.request.headers.add({key: 'X-Gateway-Key', value: 'mock-gateway-key'});",
            tests=[
                js(
                    "1 thanh toán, mã QR không đổi",
                    "j.payments.length === 1 && j.tickets[0].qr_code === pm.collectionVariables.get('b_qr1')",
                )
            ],
        ),
        Req(
            "Webhook: mã giao dịch lạ → 404",
            "POST",
            "/payments/webhook",
            body='{"transaction_id":"KHONG-CO","status":"SUCCESS"}',
            expect=404,
            pre="pm.request.headers.add({key: 'X-Gateway-Key', value: 'mock-gateway-key'});",
        ),
        # bỏ đơn
        hold("Bỏ đơn: giữ ghế 4", "tok_cust", "b", [4], expect=200),
        Req(
            "Bỏ đơn: tạo đơn kèm mã giảm",
            "POST",
            "/orders",
            tok="tok_cust",
            body=order_body("b", [4], coupon="@{cp_code}"),
            expect=201,
            tests=[setv("b_order_drop", "j.id")],
        ),
        Req(
            "Bỏ đơn chưa thanh toán → ghế được nhả",
            "POST",
            "/orders/@{b_order_drop}/cancel-pending",
            tok="tok_cust",
            expect=200,
            tests=[js("đơn đã hủy", "j.status === 'DA_HUY'")],
        ),
        Req(
            "Bỏ đơn: ghế 4 trống lại",
            "GET",
            "/trips/@{b_trip}",
            expect=200,
            tests=[js("còn 21 ghế trống (24 − 3 đã bán)", "j.available_seats === 21")],
        ),
        Req(
            "Bỏ đơn: lượt dùng mã được trả lại (vẫn 1)",
            "GET",
            "/admin/coupons",
            tok="tok_admin",
            expect=200,
            tests=[
                js(
                    "used = 1",
                    "j.find(c => c.code === pm.collectionVariables.get('cp_code')).used === 1",
                )
            ],
        ),
        Req(
            "Danh sách đơn của tôi → 200",
            "GET",
            "/orders",
            tok="tok_cust",
            expect=200,
            tests=[js("có đơn", "j.length >= 3")],
        ),
        Req("Xem đơn không tồn tại → 404", "GET", "/orders/999999", tok="tok_cust", expect=404),
    )
    return f
