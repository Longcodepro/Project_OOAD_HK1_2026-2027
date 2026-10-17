from app.domain.entities.fleet import Seat


def generate_layout(floors: int, rows: int, seats_per_row: int) -> list[Seat]:
    """Sinh sơ đồ ghế: mỗi tầng đánh số liên tục, tầng 1 mang chữ A, tầng 2 mang chữ B.

    Ví dụ giường nằm 2 tầng, 10 hàng, 3 ghế/hàng → A01..A30 và B01..B30.
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
