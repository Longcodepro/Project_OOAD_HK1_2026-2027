from app.domain.entities.fleet import Seat


def generate_layout(floors: int, rows: int, seats_per_row: int) -> list[Seat]:
    """Sinh danh sách ghế và sơ đồ bố trí ghế ngồi cho xe khách.

    Mục đích:
        Tự động tạo ra danh sách đối tượng Seat (ghế) dựa trên cấu trúc hình học của xe:
        số tầng, số hàng mỗi tầng, và số ghế trong mỗi hàng.

    Quy tắc nghiệp vụ:
        1. Tiền tố phân biệt tầng:
           - Tầng 1: Sử dụng tiền tố 'A' (Floor 1).
           - Tầng 2: Sử dụng tiền tố 'B' (Floor 2).
        2. Đánh số thứ tự ghế liên tục trên mỗi tầng:
           - Số ghế được đánh số tăng dần từ 01 đến (rows * seats_per_row) cho mỗi tầng.
           - Định dạng số ghế: có 2 chữ số (ví dụ: A01, A02, ..., B01, B02...).
        3. Tọa độ ma trận hàng và cột (row_no, col_no):
           - row_no chạy từ 1 đến rows (thứ tự từ đầu xe xuống đuôi xe).
           - col_no chạy từ 1 đến seats_per_row (thứ tự từ trái sang phải).

    Ví dụ:
        Xe giường nằm 2 tầng, 10 hàng, 3 ghế/hàng (tổng 60 ghế):
        - Tầng 1: A01 -> A30 (floor=1, row=1..10, col=1..3)
        - Tầng 2: B01 -> B30 (floor=2, row=1..10, col=1..3)

    Args:
        floors: Số tầng của xe (thường là 1 cho xe ghế ngồi, 2 cho xe giường nằm/limousine).
        rows: Số hàng ghế trên mỗi tầng.
        seats_per_row: Số ghế bố trí trên một hàng ngang.

    Returns:
        Danh sách các thực thể Seat đã được định hình mã ghế, tầng, hàng, cột.
    """
    seats = []
    for floor in range(1, floors + 1):
        prefix = "AB"[floor - 1]
        n = 0
        for row in range(1, rows + 1):
            for col in range(1, seats_per_row + 1):
                n += 1
                seats.append(Seat(code=f"{prefix}{n:02d}", floor=floor, row_no=row, col_no=col))
    return seats
