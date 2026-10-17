def is_strong_password(plain: str) -> bool:
    """Tối thiểu 8 ký tự (tối đa 72 vì giới hạn của bộ băm), có cả chữ và số."""
    return (
        8 <= len(plain) <= 72
        and any(c.isalpha() for c in plain)
        and any(c.isdigit() for c in plain)
    )
