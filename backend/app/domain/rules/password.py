def is_strong_password(plain: str) -> bool:
    """Kiểm tra chính sách độ mạnh của mật khẩu người dùng.

    Mục đích:
        Bảo vệ an toàn tài khoản khách hàng, nhân viên và quản trị viên,
        ngăn ngừa các cuộc tấn công đoán mật khẩu hoặc từ điển.

    Quy tắc nghiệp vụ:
        1. Độ dài tối thiểu: 8 ký tự.
        2. Độ dài tối đa: 72 ký tự (giới hạn an toàn của thuật toán băm bcrypt).
        3. Phải chứa ít nhất 1 chữ cái (isalpha).
        4. Phải chứa ít nhất 1 chữ số (isdigit).

    Args:
        plain: Mật khẩu dạng văn bản thô người dùng nhập vào.

    Returns:
        True nếu mật khẩu thỏa mãn chính sách, False nếu không đạt chuẩn.
    """
    return (
        8 <= len(plain) <= 72
        and any(c.isalpha() for c in plain)
        and any(c.isdigit() for c in plain)
    )
