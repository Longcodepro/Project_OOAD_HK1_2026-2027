import unicodedata


def norm(s: str) -> str:
    """Chuẩn hóa để so khớp tên địa điểm: không phân biệt hoa/thường và dấu ('ha noi' = 'Hà Nội')."""
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn").casefold().strip()
